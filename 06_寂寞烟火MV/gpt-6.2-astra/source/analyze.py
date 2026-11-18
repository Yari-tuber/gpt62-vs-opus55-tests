"""Measure the supplied excerpt. All runtime files stay under the project."""
import os
import sys
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORK = ROOT / '_work'
WORK.mkdir(exist_ok=True)
for k in ('TEMP','TMP','TMPDIR','XDG_CACHE_HOME','HF_HOME','TORCH_HOME','TORCHINDUCTOR_CACHE_DIR','NUMBA_CACHE_DIR','MPLCONFIGDIR'):
    os.environ[k] = str(WORK)
os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', PYTHONDONTWRITEBYTECODE='1',
                  CUDA_CACHE_DISABLE='1', TOKENIZERS_PARALLELISM='false')
sys.dont_write_bytecode = True
import numpy as np
from scipy import signal, ndimage

lines = '''□□□□□□□□□□□□
□□□□□□□□□□
□□□□□□□□□□
□□□□□□□
□□□□□
□□□□□□
□□□□□□□□□□
□□□□□□□□□□
□□□□□□
□□□□□'''.splitlines()

def features():
    raw = subprocess.check_output(['ffmpeg','-v','error','-i',str(ROOT/'song.mp3'),'-ar','24000','-ac','1','-f','f32le','pipe:1'])
    x=np.frombuffer(raw,'<f4')
    frames=np.lib.stride_tricks.sliding_window_view(np.pad(x,1024),2048)[::240]
    s=np.abs(np.fft.rfft(frames*np.hanning(2048)))
    f=np.fft.rfftfreq(2048,1/24000)
    def band(lo,hi):
        z=np.sqrt(np.mean(s[:,(f>=lo)&(f<hi)]**2,axis=1))
        return np.clip((z-np.percentile(z,6))/(np.percentile(z,97)-np.percentile(z,6)),0,1.4)
    diff=np.maximum(0,np.diff(np.log1p(s),axis=0,prepend=np.log1p(s[:1])))
    d=np.mean(diff[:,f<9500],axis=1)
    d=np.maximum(0,d-ndimage.median_filter(d,25)*.82)
    peaks=signal.find_peaks(d,distance=12,prominence=.015)[0]
    # Estimate the eighth/quarter pulse by a contrast-weighted onset comb.
    best=(0,0,0)
    for step in np.arange(.42,.62,.0005):
        v=np.sum(d*np.exp(2j*np.pi*np.arange(len(d))*.01/step))
        if abs(v)>best[0]: best=(abs(v),step,np.angle(v)*step/(2*np.pi)%step)
    fields=dict(dt=.01, beat_period=best[1],beat_phase=best[2],hits=(peaks*.01).round(3).tolist(),
                bass=band(35,175).round(3).tolist(), treble=band(2100,9500).round(3).tolist())
    (ROOT/'source'/'music.json').write_text(json.dumps(fields,separators=(',',':')),encoding='utf8')
    print('Grid',best,'onsets',peaks*.01,flush=True)

def align():
    sys.path.insert(0,os.environ.get('QWEN_SUBTITLE_HOME','F:/AI-Tools/Qwen3-Subtitle'))
    import align_subtitles as a
    a._configure_runtime=lambda:None
    import torch
    y,_=a._decode_audio(ROOT/'vocals.wav')
    proc,model,_=a._load_model(lambda s:print(s,flush=True))
    with torch.inference_mode():
        inputs,words=proc.prepare_forced_aligner_inputs(audio=y,transcript=''.join(lines),language='Chinese')
        inputs=inputs.to('cuda',torch.bfloat16)
        pred=model(**inputs)
        stamps=proc.decode_forced_alignment(logits=pred.logits,input_ids=inputs['input_ids'],word_lists=words,timestamp_token_id=model.config.timestamp_token_id)[0]
    out=[]
    i=0
    for line in lines:
        chunk=stamps[i:i+len(line)]
        assert ''.join(s['text'] for s in chunk)==line
        out.append(dict(line=line,starts=[s['start_time'] for s in chunk],ends=[s['end_time'] for s in chunk]))
        i+=len(line)
    (ROOT/'source'/'singing.json').write_text(json.dumps(out,ensure_ascii=False,indent=1),encoding='utf8')
    print(out,flush=True)

if __name__=='__main__':
    features()
    align()
