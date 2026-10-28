"""Private Cloud Run audio inference endpoint. One request per instance."""
import base64
import json
import os
import queue
import subprocess
import tempfile
import threading
import wave
from pathlib import Path

import numpy as np
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.responses import StreamingResponse

app = FastAPI()
MAX_BYTES = 12 * 1024 * 1024

try:
    from .harmony import analyze_backing
    from .intro import find_vocal_start, safe_vocal_boundary, select_intro_lead
except ImportError:
    from harmony import analyze_backing
    from intro import find_vocal_start, safe_vocal_boundary, select_intro_lead


def event(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n'


def keepalive_stream(events, interval=10):
    """Keep the streaming response alive while CPU-heavy inference blocks."""
    pending = queue.Queue()
    finished = object()
    def produce():
        try:
            for item in events:
                pending.put(item)
        finally:
            pending.put(finished)
    threading.Thread(target=produce, daemon=True).start()
    while True:
        try:
            item = pending.get(timeout=interval)
        except queue.Empty:
            yield event({'stage':'heartbeat'})
            continue
        if item is finished:
            return
        yield item



def refine_pitch(events, vocal_path):
    """Cross-check uncertain Basic Pitch notes against a monophonic pYIN contour."""
    import librosa
    audio, sr = librosa.load(str(vocal_path), sr=22050, mono=True)
    if not len(audio) or not events:
        return events
    f0, voiced, probability = librosa.pyin(audio, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C6'), sr=sr, frame_length=2048, hop_length=256)
    times = librosa.frames_to_time(np.arange(len(f0)), sr=sr, hop_length=256)
    for note in events:
        note['refined'] = False
        note['uncertain'] = False
        strong = note['confidence'] >= .60
        select = (times >= note['start'] + .02) & (times <= note['end'] - .02) & voiced & np.isfinite(f0)
        pitches = librosa.hz_to_midi(f0[select])
        if len(pitches) < 6:
            note['uncertain'] = not strong
            continue
        confidence = float(np.median(probability[select]))
        target = int(round(float(np.median(pitches))))
        agreement = float(np.mean(np.abs(pitches - target) <= .5))
        differs = abs(target - note['pitch']) >= 1
        note['uncertain'] = ((not strong and (confidence < .30 or agreement < .70 or differs)) or (strong and confidence >= .50 and agreement >= .70 and differs))
        if not strong and confidence >= .30 and 1 <= abs(target - note['pitch']) <= 4 and agreement >= .70:
            note['model_pitch'] = note['pitch']
            note['pitch'] = target
            note['refined'] = True
            note['uncertain'] = False
    return events



def contour_to_notes(f0, voiced, probability, sample_rate=22050, hop_length=256):
    """Extract stable sung pitches; ignore pitch slides and short unvoiced gaps."""
    f0 = np.asarray(f0, dtype=float)
    voiced = np.asarray(voiced, dtype=bool)
    probability = np.asarray(probability, dtype=float)
    valid = voiced & np.isfinite(f0) & (f0 > 0) & (probability >= .30)
    pitches = np.full(len(f0), -1, dtype=int)
    pitches[valid] = np.rint(69 + 12 * np.log2(f0[valid] / 440.0)).astype(int)
    # Connect tiny tracking dropouts only when pitch is the same on both sides.
    i = 1
    while i < len(pitches) - 1:
        if pitches[i] != -1:
            i += 1
            continue
        j = i
        while j < len(pitches) and pitches[j] == -1:
            j += 1
        if j - i <= 3 and j < len(pitches) and pitches[i - 1] == pitches[j] and pitches[j] >= 0:
            pitches[i:j] = pitches[j]
        i = j
    notes = []
    i = 0
    while i < len(pitches):
        j = i + 1
        while j < len(pitches) and pitches[j] == pitches[i]:
            j += 1
        duration = (j - i) * hop_length / sample_rate
        if pitches[i] >= 0 and duration >= .095:
            segment_prob = probability[i:j][valid[i:j]]
            confidence = float(np.median(segment_prob)) if len(segment_prob) else 0.0
            notes.append({'start': i * hop_length / sample_rate, 'end': j * hop_length / sample_rate,
                          'pitch': int(pitches[i]), 'confidence': confidence, 'uncertain': confidence < .5,
                          'refined': False})
        i = j
    return notes


def melody_from_vocal(vocal_path):
    import librosa
    audio, sr = librosa.load(str(vocal_path), sr=22050, mono=True)
    if not len(audio):
        return []
    f0, voiced, probability = librosa.pyin(audio, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C6'), sr=sr, frame_length=2048, hop_length=256)
    return contour_to_notes(f0, voiced, probability, sample_rate=sr, hop_length=256)

def process(path, temporary, include_intro=False, intro_end=None, reuse_voice=False):
    try:
        yield event({'stage': 'separating'})
        # Demucs normalizes by the input standard deviation; silence otherwise produces NaNs.
        with wave.open(str(path), 'rb') as original:
            input_samples = np.frombuffer(original.readframes(original.getnframes()), dtype='<i2').astype(np.float32) / 32768
        if not input_samples.size or float(np.sqrt(np.mean(input_samples ** 2))) <= 0.001:
            yield event({'stage': 'transcribing'})
            yield event({'result': {'vocals': base64.b64encode(path.read_bytes()).decode('ascii'), 'notes': []}})
            return
        cmd = ['python', '-m', 'demucs', '-n', 'htdemucs']
        if not include_intro:
            cmd += ['--two-stems', 'vocals']
        cmd += ['-d', 'cpu', '--shifts', '1', '-o', str(temporary / 'separated'), str(path)]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1200)
        vocal = temporary / 'separated' / 'htdemucs' / 'clip' / 'vocals.wav'
        if proc.returncode or not vocal.exists():
            print('Demucs error:', proc.stderr[-4000:], flush=True)
            yield event({'error': '人声分离失败，请检查云端服务日志。'})
            return
        yield event({'stage': 'transcribing'})
        with wave.open(str(vocal), 'rb') as f:
            samples = np.frombuffer(f.readframes(f.getnframes()), dtype='<i2').astype(np.float32) / 32768
        notes = []
        # Avoid hallucinating notes on silent input.
        if not reuse_voice and samples.size and float(np.sqrt(np.mean(samples ** 2))) > 0.001:
            from basic_pitch.inference import predict
            _, _, events = predict(str(vocal))
            notes = [{'start': float(start), 'end': float(end), 'pitch': int(pitch), 'confidence': float(amplitude)} for start, end, pitch, amplitude, _ in events]
            try:
                contour_notes = melody_from_vocal(vocal)
                if contour_notes:
                    notes = contour_notes
                else:
                    print('No stable vocal pitch contour; retaining Basic Pitch result.', flush=True)
            except Exception as exc:
                # Keep the model result when the pitch tracker cannot run.
                print('Vocal pitch tracking unavailable:', repr(exc), flush=True)
        for note in notes:
            note['source'] = 'vocal'
        backing = vocal.with_name('no_vocals.wav')
        intro_info = None
        if include_intro:
            yield event({'stage': 'instrumental'})
            try:
                # Four stems give Basic Pitch a cleaner instrumental source.
                other = vocal.with_name('other.wav')
                bass = vocal.with_name('bass.wav')
                drums = vocal.with_name('drums.wav')
                if not all(p.exists() for p in (other,bass,drums)):
                    raise RuntimeError('instrumental stems unavailable')
                mixed = subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(other),'-i',str(bass),'-i',str(drums),
                    '-filter_complex','[0:a][1:a][2:a]amix=inputs=3:duration=longest:normalize=0',
                    '-c:a','pcm_s16le','-y',str(backing)],capture_output=True,text=True,timeout=120)
                if mixed.returncode or not backing.exists():
                    raise RuntimeError('cannot reconstruct backing')
                import librosa
                audio, sr = librosa.load(str(path),sr=22050,mono=True)
                vocal_audio, _ = librosa.load(str(vocal),sr=sr,mono=True)
                duration = len(audio)/sr
                if intro_end is not None:
                    boundary = min(duration, intro_end)
                    boundary_source = 'previous_melody'
                else:
                    detected = find_vocal_start(notes,vocal_audio,audio,sr)
                    # Preserve uncertain vocal candidates rather than replacing them.
                    boundary, boundary_source = safe_vocal_boundary(notes, detected, duration)
                instrumental = []
                if boundary >= .3:
                    excerpt = temporary / 'intro.wav'
                    cut = subprocess.run(['ffmpeg','-nostdin','-v','error','-i',str(other),'-t',str(boundary),'-y',str(excerpt)],capture_output=True,text=True,timeout=120)
                    if cut.returncode:
                        raise RuntimeError('cannot cut instrumental intro')
                    from basic_pitch.inference import predict
                    _, _, intro_events = predict(str(excerpt))
                    instrumental = select_intro_lead([{'start':s,'end':e,'pitch':p,'confidence':a} for s,e,p,a,_ in intro_events],boundary)
                notes = instrumental + [n for n in notes if n['end'] > boundary]
                intro_info = {'state':'detected' if instrumental else 'empty', 'end':boundary,
                              'boundary_source':boundary_source, 'count':len(instrumental)}
            except Exception as exc:
                print('Instrumental intro unavailable:',repr(exc),flush=True)
                intro_info = {'state':'failed','count':0}
        yield event({'stage': 'accompaniment'})
        accompaniment = None
        try:
            if backing.exists():
                accompaniment = analyze_backing(backing, reference_path=path)
        except Exception as exc:
            print('Accompaniment analysis unavailable:', repr(exc), flush=True)
        result = {'vocals': base64.b64encode(vocal.read_bytes()).decode('ascii'), 'notes': notes, 'accompaniment': accompaniment, 'intro_info':intro_info}
        if backing.exists():
            result['backing'] = base64.b64encode(backing.read_bytes()).decode('ascii')
        yield event({'result': result})
    except Exception as exc:
        print('Inference error:', repr(exc), flush=True)
        yield event({'error': '云端音频处理失败，请检查 Cloud Run 日志后重试。'})
    finally:
        import shutil
        shutil.rmtree(temporary, ignore_errors=True)


@app.get('/health')
def health():
    return {'status': 'ok'}


@app.post('/process')
async def infer(audio: UploadFile = File(...), include_intro: bool = Form(False),
                intro_end: float | None = Form(None, ge=0, le=60), reuse_voice: bool = Form(False)):
    temporary = Path(tempfile.mkdtemp(prefix='melody-'))
    path = temporary / 'clip.wav'
    size = 0
    with path.open('wb') as target:
        while True:
            chunk = await audio.read(1024 * 1024)
            if not chunk: break
            size += len(chunk)
            if size > MAX_BYTES:
                import shutil
                shutil.rmtree(temporary, ignore_errors=True)
                return StreamingResponse(iter([event({'error': '音频片段超过大小限制。'})]), media_type='application/x-ndjson')
            target.write(chunk)
    return StreamingResponse(keepalive_stream(process(path, temporary, include_intro, intro_end, reuse_voice)), media_type='application/x-ndjson', headers={'Cache-Control': 'no-store'})
