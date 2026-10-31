"""Create an explicitly synthetic 10-minute task for UI/performance smoke tests.

Does not invoke cloud services or claim transcription quality. Stored in .runtime.
"""
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import numpy as np
import soundfile as sf
from app.song_store import SongStore
from app.song_api import regenerate
from cloud.music import normalize, select_melody


def main():
    root = Path(__file__).resolve().parent.parent/'.runtime'
    store = SongStore(root); job_id = uuid.uuid4().hex
    folder = root/job_id; (folder/'tracks').mkdir(parents=True)
    duration, sr = 600, 8000
    samples = np.zeros(duration*sr, np.float32)
    tracks = []
    for stem, model in [('vocals', 'htdemucs_ft'), ('bass', 'htdemucs_ft'), ('piano', 'htdemucs_6s')]:
        tid = model+'-'+stem
        notes = [{'start': float(i), 'end': i+.65, 'pitch': (43 if stem == 'bass' else 64)+i%5,
                  'confidence': .9} for i in range(0, duration, 1 if stem == 'vocals' else 2)]
        for n in notes:
            a, b = int(n['start']*sr), int(n['end']*sr)
            t = np.arange(b-a)/sr
            samples[a:b] = .12*np.sin(2*np.pi*440*2**((n['pitch']-69)/12)*t)*np.exp(-4*t)
        sf.write(folder/'tracks'/f'{tid}.flac', samples, sr)
        tracks.append({'id': tid, 'stem': stem, 'model': model, 'notes': normalize(notes, tid, duration)})
        samples.fill(0)
    sf.write(folder/'original.wav', samples, sr)
    raw = {'tracks': tracks, 'warnings': ['合成界面测试数据：不是实际歌曲识别结果。']}
    (folder/'analysis.json').write_text(json.dumps(raw), encoding='utf-8')
    job = regenerate({'id': job_id, 'schema_version': 2, 'stage': 'done', 'revision': 0,
                      'start': 0, 'duration': duration, 'title': '合成验收样例 · 10 分钟（非歌曲识别）',
                      'melody': select_melody(tracks, duration), 'original_url': f'/api/jobs/{job_id}/original',
                      'settings': {'density': 'rich', 'slides': True, 'legato': True},
                      'warnings': raw['warnings'], 'dual_enabled': False, 'message': '合成测试任务'}, raw)
    store.create(job)
    print(job_id)


if __name__ == '__main__': main()
