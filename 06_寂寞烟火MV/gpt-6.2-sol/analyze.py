"""Measure the supplied tracks and align their lyrics with local models."""

import argparse
import json
import os
from pathlib import Path
import subprocess

import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks

ROOT = Path(__file__).resolve().parent
WORK = ROOT / ".mv-work"
MODELS = Path("F:/AI-Tools/Qwen3-Subtitle/models")
RATE = 16000


def decode(name, rate=RATE):
    pcm = subprocess.check_output([
        "ffmpeg", "-v", "error", "-i", str(ROOT / name), "-ac", "1",
        "-ar", str(rate), "-f", "f32le", "-",
    ])
    return np.frombuffer(pcm, dtype=np.float32).copy()


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def measure():
    music = decode("song.mp3")
    vocals = decode("vocals.wav")
    hop, size = 160, 2048
    windows = np.lib.stride_tricks.sliding_window_view(np.pad(music, size // 2), size)[::hop]
    magnitude = np.abs(np.fft.rfft(windows * np.hanning(size), axis=1))
    spectrum = np.fft.rfftfreq(size, 1 / RATE)
    flux = np.maximum(np.diff(np.log1p(magnitude), axis=0, prepend=0), 0)
    onset = (
        0.65 * flux[:, (spectrum >= 38) & (spectrum <= 160)].mean(axis=1)
        + 0.35 * flux[:, (spectrum >= 1400) & (spectrum <= 5000)].mean(axis=1)
    )
    onset = gaussian_filter1d(onset, 1.2)
    base = gaussian_filter1d(onset, 16)
    novelty = np.maximum(onset - 0.82 * base, 0)
    peaks, _ = find_peaks(novelty, distance=13, prominence=np.percentile(novelty, 66))
    sample_times = np.arange(0, 40.55, .04)

    def envelope(samples, smooth):
        energy = np.sqrt(gaussian_filter1d(samples ** 2, smooth))
        return np.clip(energy / max(np.percentile(energy, 92), 1e-8), 0, 1.3)

    bass = magnitude[:, (spectrum >= 38) & (spectrum <= 155)].mean(axis=1)
    bass = np.clip(gaussian_filter1d(bass, 4) / np.percentile(bass, 93), 0, 1.3)
    sample_at = np.arange(len(music)) / RATE
    vocal_at = np.arange(len(vocals)) / RATE
    report = {
        "songSamples44100": len(decode("song.mp3", 44100)),
        "vocalSamples44100": len(decode("vocals.wav", 44100)),
        "step": .04,
        "energy": np.round(np.interp(sample_times, sample_at, envelope(music, 1850)), 3).tolist(),
        "voice": np.round(np.interp(sample_times, vocal_at, envelope(vocals, 650)), 3).tolist(),
        "bass": np.round(np.interp(sample_times, np.arange(len(bass)) / 100, bass), 3).tolist(),
        "onsets": [[round(p / 100, 2), round(float(novelty[p] / novelty[peaks].max()), 3)]
                   for p in peaks],
    }
    write_json(WORK / "audio.json", report)
    print({k: v for k, v in report.items() if isinstance(v, int)}, flush=True)
    print("strong onsets", [time for time, strength in report["onsets"] if strength > .36], flush=True)
    print("quarter-second vocal levels", [
        round(float(np.sqrt(np.mean(vocals[i:i + 4000] ** 2))), 3)
        for i in range(0, len(vocals), 4000)
    ], flush=True)


def run_model(mode):
    for name in ("HF_HOME", "HF_HUB_CACHE", "TORCH_HOME", "XDG_CACHE_HOME",
                 "NUMBA_CACHE_DIR", "CUDA_CACHE_PATH", "TEMP", "TMP", "TMPDIR"):
        os.environ[name] = str(WORK)
    os.environ.update(HF_HUB_OFFLINE="1", TRANSFORMERS_OFFLINE="1",
                      HF_HUB_DISABLE_TELEMETRY="1", TOKENIZERS_PARALLELISM="false")

    import torch
    from transformers import AutoModelForTokenClassification, AutoProcessor, Qwen3ASRForConditionalGeneration

    waveform = decode("vocals.wav")
    model_path = MODELS / ("Qwen3-ASR-0.6B-hf" if mode == "transcribe" else "Qwen3-ForcedAligner-0.6B-hf")
    processor = AutoProcessor.from_pretrained(model_path, local_files_only=True)
    model_class = Qwen3ASRForConditionalGeneration if mode == "transcribe" else AutoModelForTokenClassification
    model = model_class.from_pretrained(model_path, local_files_only=True,
                                       dtype=torch.bfloat16, attn_implementation="sdpa").to("cuda").eval()
    if mode == "transcribe":
        chunks = []
        for begin, end in [(0, 14), (13, 28), (27, 41)]:
            inputs = processor.apply_transcription_request(
                audio=waveform[begin * RATE:end * RATE], language="Chinese",
            ).to("cuda", torch.bfloat16)
            with torch.inference_mode():
                result = model.generate(**inputs, max_new_tokens=220, do_sample=False, logits_to_keep=1)
            parsed = processor.decode(result[:, inputs["input_ids"].shape[1]:], return_format="parsed")[0]
            chunks.append({"start": begin, "end": end, "text": parsed["transcription"]})
        write_json(WORK / "transcribed.json", chunks)
        print(json.dumps(chunks, ensure_ascii=False), flush=True)
        return

    lines = [line.strip() for line in (WORK / "lyrics.txt").read_text(encoding="utf-8").splitlines() if line.strip()]
    inputs, groups = processor.prepare_forced_aligner_inputs(
        audio=waveform, transcript="\n".join(lines), language="Chinese",
    )
    inputs = inputs.to("cuda", torch.bfloat16)
    with torch.inference_mode():
        result = model(**inputs)
    units = processor.decode_forced_alignment(
        logits=result.logits, input_ids=inputs["input_ids"], word_lists=groups,
        timestamp_token_id=model.config.timestamp_token_id,
    )[0]
    write_json(WORK / "aligned.json", units)
    print(units, flush=True)


def assemble():
    audio = json.loads((WORK / "audio.json").read_text(encoding="utf-8"))
    units = json.loads((WORK / "aligned.json").read_text(encoding="utf-8"))
    lines = (WORK / "lyrics.txt").read_text(encoding="utf-8").splitlines()
    cues, cursor = [], 0
    for text in lines:
        words = units[cursor:cursor + len(text)]
        if "".join(word["text"] for word in words) != text:
            raise ValueError(f"Alignment text mismatch at line {len(cues) + 1}")
        cues.append({
            "text": text,
            "start": round(max(0, words[0]["start_time"] - .10), 2),
            "end": round(words[-1]["end_time"] + .26, 2),
            "marks": [round(word["start_time"], 2) for word in words]
        })
        cursor += len(text)
    if cursor != len(units):
        raise ValueError("Unmapped syllables in alignment output")
    # The final sung vowel trails past the aligner's last short vowel window.
    tail = np.flatnonzero(np.asarray(audio["voice"]) > .15)
    cues[-1]["end"] = round(min(40.52, tail[-1] * audio["step"] + .33), 2)
    for left, right in zip(cues, cues[1:]):
        left["end"] = min(left["end"], right["start"])
    payload = json.dumps({"audio": audio, "cues": cues}, ensure_ascii=False, separators=(",", ":"))
    (ROOT / "timeline.js").write_text(f"window.filmTiming = {payload};\n", encoding="utf-8")
    print(json.dumps([[cue["start"], cue["end"]] for cue in cues]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["measure", "transcribe", "align", "assemble"])
    args = parser.parse_args()
    WORK.mkdir(exist_ok=True)
    if args.mode == "measure":
        measure()
    elif args.mode == "assemble":
        assemble()
    else:
        run_model(args.mode)
