"""Render the original deterministic Canvas drawings and mux the supplied song."""

import argparse
import base64
from contextlib import contextmanager
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parent
WORK = ROOT / ".mv-work"
FPS = 60
SECONDS = 40.520
FRAMES = round(SECONDS * FPS)
WIDTH, HEIGHT = 1920, 1080
CHROME = Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Google/Chrome/Application/chrome.exe"


@contextmanager
def open_film(profile):
    WORK.mkdir(exist_ok=True)
    for key in ("TMP", "TEMP", "TMPDIR", "CUDA_CACHE_PATH"):
        os.environ[key] = str(WORK)
    from playwright.sync_api import sync_playwright

    with sync_playwright() as api:
        browser = api.chromium.launch_persistent_context(
            str(WORK / profile), executable_path=str(CHROME), headless=True,
            viewport={"width": WIDTH, "height": HEIGHT},
            args=["--disable-background-networking", "--disable-component-update",
                  "--no-default-browser-check", "--disable-crash-reporter",
                  "--disable-gpu-shader-disk-cache", "--disable-breakpad",
                  "--host-resolver-rules=MAP * ~NOTFOUND",
                  "--disable-features=MediaRouter,OptimizationHints,Translate"],
        )
        try:
            page = browser.pages[0]
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            browser.route("http://**/*", lambda route: route.abort())
            browser.route("https://**/*", lambda route: route.abort())
            page.goto((ROOT / "index.html").as_uri() + "?render=1", wait_until="load")
            if errors:
                raise RuntimeError(errors)
            if not page.evaluate("filmReady"):
                raise RuntimeError("Canvas did not finish initializing")
            yield page
            if errors:
                raise RuntimeError(errors)
        finally:
            browser.close()


def contact_sheet(page):
    from PIL import Image, ImageDraw
    from io import BytesIO

    times = [1.95, 5.7, 9.85, 13.25, 17.5, 19.15, 22.94, 25.18, 27.2, 29.34, 31.22, 33.72, 35.64, 37.35, 39.29]
    sheet = Image.new("RGB", (1440, 5 * 295), "#161d2a")
    labels = ImageDraw.Draw(sheet)
    for index, at in enumerate(times):
        frame = page.evaluate("""at => {
            drawFrame(at);
            return document.querySelector('#film').toDataURL('image/jpeg', 0.96).split(',')[1];
        }""", at)
        shot = Image.open(BytesIO(base64.b64decode(frame))).resize((478, 269), Image.Resampling.LANCZOS)
        x, y = (index % 3) * 480, (index // 3) * 295
        sheet.paste(shot, (x, y))
        labels.text((x + 9, y + 273), f"{at:05.2f} s", fill="#e5d8cf")
    sheet.save(WORK / "review.jpg", quality=94)


OPEN_ENCODER = """async ([width, height, fps]) => {
    if (typeof VideoEncoder === 'undefined') return null;
    const common = {codec: 'avc1.64002A', width, height, framerate: fps, bitrate: 30000000,
        bitrateMode: 'variable', latencyMode: 'realtime', avc: {format: 'annexb'}};
    const hw = {...common, hardwareAcceleration: 'prefer-hardware'};
    const opts = await VideoEncoder.isConfigSupported(hw);
    if (!opts.supported) return null;
    window.encodedChunks = [];
    window.encodeError = null;
    window.filmEncoder = new VideoEncoder({
        output(chunk) {
            const bytes = new Uint8Array(chunk.byteLength);
            chunk.copyTo(bytes);
            encodedChunks.push(bytes);
        },
        error(error) { window.encodeError = String(error); }
    });
    filmEncoder.configure(opts.config);
    return opts.config;
}"""

ENCODE_BATCH = """async ([first, end, fps]) => {
    const canvas = document.getElementById('film');
    for (let i = first; i < end; i++) {
        drawFrame(i / fps);
        const timestamp = Math.round(i * 1e6 / fps);
        const frame = new VideoFrame(canvas, {timestamp,
            duration: Math.round((i + 1) * 1e6 / fps) - timestamp, alpha: 'discard'});
        filmEncoder.encode(frame, {keyFrame: i % (2 * fps) === 0});
        frame.close();
        if (filmEncoder.encodeQueueSize > 6) await filmEncoder.flush();
        if (window.encodeError) throw new Error(window.encodeError);
    }
    await filmEncoder.flush();
    const chunks = encodedChunks.splice(0);
    if (chunks.length !== end - first) throw new Error('Unexpected encoder frame count');
    return chunks.map(bytes => {
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 24576) {
            binary += String.fromCharCode(...bytes.subarray(offset, offset + 24576));
        }
        return btoa(binary);
    });
}"""


def encode_webcodecs(page, raw, frames):
    config = page.evaluate(OPEN_ENCODER, [WIDTH, HEIGHT, FPS])
    if not config:
        return False
    started = time.monotonic()
    with raw.open("wb") as stream:
        for first in range(0, frames, 24):
            end = min(frames, first + 24)
            chunks = page.evaluate(ENCODE_BATCH, [first, end, FPS])
            for chunk in chunks:
                stream.write(base64.b64decode(chunk))
            if first % 240 == 0 or end == frames:
                print(f"{end}/{frames} frames in {time.monotonic() - started:.1f}s", flush=True)
    page.evaluate("filmEncoder.close()")
    return True


def mux_options(frames):
    duration = SECONDS if frames == FRAMES else frames / FPS
    return ["-map", "0:v:0", "-map", "1:a:0",
            "-c:a", "aac", "-b:a", "320k",
            "-t", f"{duration:.9f}", "-movflags", "+faststart",
            "-metadata", "title=寂寞烟火", "-metadata", "artist=蓝心羽"]


def encode_ffmpeg(page, output, frames):
    command = ["ffmpeg", "-hide_banner", "-loglevel", "warning", "-y",
               "-f", "image2pipe", "-framerate", str(FPS), "-vcodec", "mjpeg", "-i", "-",
               "-i", str(ROOT / "song.mp3"),
               "-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p",
               "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-tune", "film",
               "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
               *mux_options(frames), str(output)]
    started = time.monotonic()
    with subprocess.Popen(command, stdin=subprocess.PIPE) as pipe:
        try:
            for first in range(0, frames, 6):
                end = min(frames, first + 6)
                batch = page.evaluate("""([first, end, fps]) => {
                    const canvas = document.getElementById('film'), encoded = [];
                    for (let i = first; i < end; i++) {
                        drawFrame(i / fps);
                        encoded.push(canvas.toDataURL('image/jpeg', 0.984).split(',')[1]);
                    }
                    return encoded;
                }""", [first, end, FPS])
                for data in batch:
                    pipe.stdin.write(base64.b64decode(data))
                if first % 120 == 0 or end == frames:
                    print(f"{end}/{frames} frames in {time.monotonic() - started:.1f}s", flush=True)
        finally:
            pipe.stdin.close()
        if pipe.wait():
            raise RuntimeError("FFmpeg render failed")


def render(page, output, frames, method):
    raw = WORK / "canvas.h264"
    if method != "ffmpeg":
        try:
            if encode_webcodecs(page, raw, frames):
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-fflags", "+genpts",
                                "-r", str(FPS), "-i", str(raw), "-i", str(ROOT / "song.mp3"),
                                "-c:v", "copy", *mux_options(frames), str(output)], check=True)
                return
        except Exception as error:
            print(f"WebCodecs encoder unavailable: {error}", flush=True)
            if method == "webcodecs":
                raise
        if method == "webcodecs":
            raise RuntimeError("H.264 WebCodecs encoder unavailable")
    encode_ffmpeg(page, output, frames)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--samples", action="store_true")
    parser.add_argument("--test", action="store_true")
    parser.add_argument("--method", choices=("auto", "ffmpeg", "webcodecs"), default="auto")
    args = parser.parse_args()
    with open_film("review-profile" if args.samples else "render-profile") as page:
        if args.samples:
            contact_sheet(page)
        else:
            pending = WORK / ("trial.mp4" if args.test else "rendered.mp4")
            render(page, pending, 120 if args.test else FRAMES, args.method)
            if not args.test:
                pending.replace(ROOT / "mv.mp4")
