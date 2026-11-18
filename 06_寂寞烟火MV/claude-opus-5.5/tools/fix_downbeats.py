"""Correct the pre-chorus downbeat phase in song.json.

Evidence (see plan.md section 1): the bass stem hits at 0.57 / 4.57 / 8.58 s and the drum backbeat
(snare every 2 s at 9.54 + 2k) put the real bar heads on the 0.54 + 2k grid. listen.py placed the
four pre-chorus bar heads at 2.04 / 4.04 / 6.04 / 7.54 (half a bar off, plus a 3-beat and a 2-beat bar)
because there are no drums before 7.5 s. From 8.54 s on its grid is already correct and unchanged.
Also relabels the sections: 0-8.54 = pre-chorus tail (铺垫), 8.54-end = chorus (副歌).
"""
import json, shutil
from pathlib import Path
root = Path(__file__).resolve().parents[1]
f = root / 'song.json'
orig = root / 'song.orig.json'
if not orig.exists(): shutil.copy2(f, orig)
S = json.loads(orig.read_text(encoding='utf-8'))
beats = S['beats']
good = [d for d in S['downbeats'] if d >= 8.5]
first = good[0]
pre = []
t = first - S['bar']
while t > beats[0] - 0.05:
    b = min(beats, key=lambda x: abs(x - t))      # snap to the measured beat
    pre.insert(0, round(b, 4)); t -= S['bar']
S['downbeats'] = pre + good
S['first_downbeat'] = S['downbeats'][0]
secs = S['sections']
for s in secs:
    s['kind'] = '副歌' if s['t0'] >= first - 0.01 else '铺垫'
secs[0]['t0'] = 0.0
secs[0]['bars'] = len(pre)
S['big'] = [c for c in S['big'] if c['t'] >= first - 0.01]
for c in S['big']:
    c['at'] = 'bar%d' % (S['downbeats'].index(min(S['downbeats'], key=lambda d: abs(d - c['t']))) + 1)
S['downbeat_fix'] = 'pre-chorus bar heads moved to the 0.54+2k grid (bass onsets 0.57/4.57/8.58 s); see tools/fix_downbeats.py'
f.write_text(json.dumps(S, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print('downbeats', [round(d, 2) for d in S['downbeats']])
print('sections', [(round(s['t0'], 2), round(s['t1'], 2), s['kind']) for s in secs])
print('big', S['big'])
