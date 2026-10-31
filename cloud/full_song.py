"""Checkpointed Cloud Run Job entrypoint. No web request stays open."""
import importlib.metadata
import json
import os
import subprocess
import tempfile
import time
try:
    import resource
except ImportError:  # Local Windows smoke tests; production worker is Linux.
    resource = None
from pathlib import Path
from functools import lru_cache

import numpy as np
import requests

try:
    from .objects import Objects
    from .music import INSTRUMENT_STEMS, chunks, crosscheck, merge_chunks
    from .harmony import analyze_backing
except ImportError:
    from objects import Objects
    from music import INSTRUMENT_STEMS, chunks, crosscheck, merge_chunks
    from harmony import analyze_backing

MODELS = {'htdemucs_ft': ('vocals', 'bass', 'drums', 'other'),
          'htdemucs_6s': ('vocals', 'bass', 'drums', 'other', 'piano', 'guitar')}
GUITARS = ['acoustic_guitar', 'clean_electric_guitar', 'distorted_electric_guitar']
# Full mix with every instrument, and the six-stem guitar restricted to guitar groups.
MUSCRIPTOR_PASSES = {'muscriptor': None, 'muscriptor_stem': GUITARS}
# Model output carries no per-note score; ranking prior for normalize(), tuned via evaluate_song.py.
MUSCRIPTOR_PRIOR = .85


@lru_cache(maxsize=1)
def pitch_model():
    from basic_pitch import ICASSP_2022_MODEL_PATH
    from basic_pitch.inference import Model
    return Model(ICASSP_2022_MODEL_PATH)


def metadata_token():
    r = requests.get('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
                     headers={'Metadata-Flavor': 'Google'}, timeout=10)
    r.raise_for_status()
    return r.json()['access_token']


def run(args):
    p = subprocess.run(args, capture_output=True, text=True, timeout=10800)
    if p.returncode: raise RuntimeError(p.stderr[-1500:])


def transcribe(path, stem):
    import librosa
    from basic_pitch.inference import predict
    audio, sr = librosa.load(path, sr=22050, mono=True)
    if not len(audio) or np.sqrt(np.mean(audio**2)) < .001: return []
    _, _, predicted = predict(str(path), pitch_model())
    basic = [{'start': float(s), 'end': float(e), 'pitch': int(p), 'confidence': float(c),
              'method': 'basic-pitch', 'velocity': int(np.clip(c*110, 35, 110))} for s, e, p, c, _ in predicted]
    events = basic
    if stem in ('vocals', 'bass'):
        try:
            fmin, fmax = ('C2', 'C6') if stem == 'vocals' else ('E1', 'C4')
            f0, voiced, probability = librosa.pyin(audio, sr=sr, fmin=librosa.note_to_hz(fmin),
                                                   fmax=librosa.note_to_hz(fmax), frame_length=4096 if stem == 'bass' else 2048, hop_length=256)
            valid = voiced & np.isfinite(f0) & (probability >= .3)
            pitches = np.full(len(f0), -1, int)
            pitches[valid] = np.rint(librosa.hz_to_midi(f0[valid])).astype(int)
            # Fill tiny tracker dropouts only when both ends support the same pitch.
            for i in range(1, len(pitches)-3):
                if pitches[i] == -1:
                    for gap in (1, 2, 3):
                        if pitches[i-1] >= 0 and pitches[i+gap] == pitches[i-1]:
                            pitches[i:i+gap] = pitches[i-1]; break
            onsets = librosa.onset.onset_detect(y=audio, sr=sr, hop_length=256, units='frames')
            attacks = set(int(x) for x in onsets)
            contour = []
            i = 0
            while i < len(pitches):
                j = i+1
                while j < len(pitches) and pitches[j] == pitches[i] and not (j in attacks and j-i >= 8): j += 1
                if pitches[i] >= 0 and (j-i)*256/sr >= .095:
                    score = float(np.nanmedian(probability[i:j]))
                    contour.append({'start': i*256/sr, 'end': min(len(audio)/sr, j*256/sr), 'pitch': int(pitches[i]),
                                    'confidence': score, 'spectral_support': score, 'method': 'pyin-onset',
                                    'onset_supported': i in attacks, 'uncertain': score < .5,
                                    'basic_agreement': any(n['pitch'] == pitches[i] and abs(n['start']-i*256/sr) < .15 for n in basic)})
                i = j
            if contour: events = contour
        except Exception as exc:
            print('Pitch contour fallback:', stem, type(exc).__name__, flush=True)
    # Fundamental support, rather than the raw Basic Pitch score alone.
    spectrum = np.abs(librosa.stft(audio, n_fft=4096, hop_length=256))
    frequencies = librosa.fft_frequencies(sr=sr, n_fft=4096)
    for n in events:
        lo, hi = max(0, int(n['start']*sr/256)), min(spectrum.shape[1], int(n['end']*sr/256)+1)
        frame = np.mean(spectrum[:, lo:hi], axis=1) if hi > lo else np.zeros(len(frequencies))
        f = librosa.midi_to_hz(n['pitch'])
        band = (frequencies >= f*.96) & (frequencies <= f*1.04)
        if not np.any(band): band[np.argmin(abs(frequencies-f))] = True
        ratio = float(np.max(frame[band])/(np.max(frame)+1e-9))
        n['spectral_support'] = min(float(n.get('spectral_support', n['confidence'])), ratio)
        n['audio_rms'] = float(np.sqrt(np.mean(audio[int(n['start']*sr):max(int(n['start']*sr)+1, int(n['end']*sr))]**2)))
    return events


def harmonic_support(path, notes):
    """Strongest of the first three partials against the loudest bin in the note's own
    register, so chord tones and weak guitar fundamentals are not judged against the whole mix."""
    import librosa
    audio, sr = librosa.load(path, sr=22050, mono=True)
    if not len(audio) or not notes: return []
    spectrum = np.abs(librosa.stft(audio, n_fft=4096, hop_length=256))
    frequencies = librosa.fft_frequencies(sr=sr, n_fft=4096)
    out = []
    for n in notes:
        lo, hi = max(0, int(n['start']*sr/256)), min(spectrum.shape[1], int(n['end']*sr/256)+1)
        frame = np.mean(spectrum[:, lo:hi], axis=1) if hi > lo else np.zeros(len(frequencies))
        f = float(librosa.midi_to_hz(n['pitch']))
        partial = max(float(np.max(frame[(frequencies >= k*f*.97) & (frequencies <= k*f*1.03)], initial=0.))
                      for k in (1, 2, 3))
        region = frame[(frequencies >= f*.5) & (frequencies <= f*4.2)]
        ratio = partial/(float(np.max(region, initial=0.))+1e-9)
        out.append(dict(n, confidence=MUSCRIPTOR_PRIOR, spectral_support=min(1., .4+ratio),
                        method='muscriptor', velocity=80, uncertain=ratio < .2,
                        uncertainty_reasons=['weak_audio_support'] if ratio < .2 else []))
    return out


def muscriptor(jobs, work):
    """{name: (audio, instrument groups or None)} -> {name: notes}, one model load per call.

    Runs in its own interpreter: MuScriptor needs torch>=2.3 / numpy>=2, Basic Pitch does not.
    """
    plan = [{'input': str(path), 'instruments': groups, 'output': str(work/f'muscriptor-{name}.json')}
            for name, (path, groups) in jobs.items()]
    (work/'muscriptor-plan.json').write_text(json.dumps(plan), encoding='utf-8')
    run([os.environ['MUSCRIPTOR_PYTHON'], str(Path(__file__).with_name('muscriptor_runner.py')),
         str(work/'muscriptor-plan.json')])
    result = {}
    for name, (path, _) in jobs.items():
        data = json.loads((work/f'muscriptor-{name}.json').read_text(encoding='utf-8'))
        result[name] = {'version': data['version'], 'notes': harmonic_support(path, data['notes'])}
    return result


def blend(stems, descriptors, duration, output, sr=44100):
    """Weighted overlap-add; process one stem at a time to bound peak memory."""
    import soundfile as sf
    length = round(duration*sr)
    total = np.zeros((length, 2), np.float32)
    weights = np.zeros(length, np.float32)
    for path, chunk in zip(stems, descriptors):
        data, rate = sf.read(path, dtype='float32', always_2d=True)
        if rate != sr: raise ValueError('Separated sample rate differs from input')
        data = np.repeat(data, 2, axis=1) if data.shape[1] == 1 else data[:, :2]
        start = round(chunk['start']*sr)
        count = min(len(data), length-start)
        w = np.ones(count, np.float32)
        left = round((chunk['core_start']-chunk['start'])*sr)
        right = min(count, round((chunk['end']-chunk['core_end'])*sr))
        if left: w[:min(left, count)] = np.linspace(0, 1, min(left, count))
        if right: w[-right:] = np.linspace(1, 0, right)
        total[start:start+count] += data[:count]*w[:, None]
        weights[start:start+count] += w
    total /= np.maximum(weights[:, None], 1e-9)
    sf.write(output, total, sr, subtype='PCM_16')


def process(objects, job_id, attempt, work):
    started = time.monotonic()
    prefix = job_id+'/'
    request = objects.read(prefix+'request.json')
    if not request or not 1 <= request['duration'] <= 600.1: raise ValueError('Invalid task request')
    duration = request['duration']
    descriptors = list(chunks(duration))
    warnings, tracks, artifacts = [], [], []
    source = work/'original.wav'
    objects.download(prefix+'input.wav', source, request['input'])

    def check_cancel():
        cancelled = objects.read(prefix+'cancel.json')
        if cancelled and cancelled.get('attempt') == attempt: raise InterruptedError('Cancelled')

    def status(message, done, total):
        check_cancel()
        objects.put(prefix+'status.json', {'attempt': attempt, 'message': message,
                                          'progress': {'completed': done, 'total': total}, 'warnings': warnings})

    use_muscriptor = bool(os.environ.get('MUSCRIPTOR_PYTHON'))
    total_steps = len(descriptors)*(sum(1+len([s for s in stems if s != 'drums']) for stems in MODELS.values())
                                    + use_muscriptor)
    completed = 0
    stem_paths = {}
    for model, stems in MODELS.items():
        available = {stem: [] for stem in stems}
        parts = {stem: [] for stem in stems if stem != 'drums'}
        for chunk in descriptors:
            index = chunk['index']
            base = f'{prefix}checkpoints/v1/{request["input"]["sha256"]}/{model}/{index}/'
            cut = work/f'clip-{index}.wav'
            if not cut.exists():
                run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', str(chunk['start']), '-i', str(source),
                     '-t', str(chunk['end']-chunk['start']), '-c:a', 'pcm_s16le', '-y', str(cut)])
            status(f'{model} · 区间 {index+1}/{len(descriptors)} · 分离', completed, total_steps)
            separated = objects.read(base+'separation.json')
            try:
                if separated:
                    paths = {}
                    try:
                        for stem, artifact in separated.items():
                            path = work/f'{model}-{index}-{stem}.wav'
                            objects.download(artifact['key'], path, artifact)
                            paths[stem] = path
                    except (FileNotFoundError, ValueError):
                        separated = None
                if not separated:
                    run(['python', '-m', 'demucs', '-n', model, '-d', 'cpu', '--shifts', '1',
                         '-o', str(work/'separated'), str(cut)])
                    paths = {stem: work/'separated'/model/cut.stem/f'{stem}.wav' for stem in stems}
                    separated = {stem: objects.upload(base+stem+'.wav', path) for stem, path in paths.items()}
                    objects.put(base+'separation.json', separated)
                completed += 1
                for stem in stems:
                    available[stem].append((paths[stem], chunk))
                    stem_paths[model, stem, index] = paths[stem]
                    if stem == 'drums': continue
                    status(f'{model} · {stem} · 区间 {index+1}/{len(descriptors)} · 转录', completed, total_steps)
                    cached = objects.read(base+stem+'-notes.json')
                    if cached is None:
                        cached = {'notes': transcribe(paths[stem], stem)}
                        objects.put(base+stem+'-notes.json', cached)
                    parts[stem].append((chunk, cached['notes']))
                    completed += 1
            except InterruptedError: raise
            except Exception as exc:
                warnings.append(f'{model} 区间 {index+1} 分析不完整：{type(exc).__name__}')
                print('Chunk failed:', model, index, str(exc), flush=True)
        for stem, entries in available.items():
            if not entries: continue
            track_id = f'{model}-{stem}'
            target = work/'tracks'/f'{track_id}.flac'; target.parent.mkdir(exist_ok=True)
            blend([x[0] for x in entries], [x[1] for x in entries], duration, target)
            artifact = objects.upload(prefix+f'tracks/{track_id}.flac', target)
            artifacts.append(dict(artifact, path=f'tracks/{track_id}.flac'))
            tracks.append({'id': track_id, 'model': model, 'stem': stem,
                           'notes': merge_chunks(parts.get(stem, []), track_id, duration),
                           'audio_file': f'tracks/{track_id}.flac', 'missing_chunks': len(descriptors)-len(entries)})
    if not tracks: raise RuntimeError('No source separation model succeeded')
    versions = set()
    if use_muscriptor:
        weights = os.environ.get('MUSCRIPTOR_MODEL', 'large')
        parts = {name: [] for name in MUSCRIPTOR_PASSES}
        for chunk in descriptors:
            index = chunk['index']
            base = f'{prefix}checkpoints/v1/{request["input"]["sha256"]}/muscriptor-{weights}/{index}/'
            status(f'MuScriptor · 区间 {index+1}/{len(descriptors)} · 转录', completed, total_steps)
            jobs = {'muscriptor': (work/f'clip-{index}.wav', None)}
            if ('htdemucs_6s', 'guitar', index) in stem_paths:
                jobs['muscriptor_stem'] = (stem_paths['htdemucs_6s', 'guitar', index], GUITARS)
            try:
                cached = objects.read(base+'notes.json')
                if cached is None or set(jobs)-set(cached):
                    cached = muscriptor(jobs, work)
                    objects.put(base+'notes.json', cached)
                for name, value in cached.items():
                    parts[name].append((chunk, value['notes']))
                    versions.add(value['version'])
            except InterruptedError: raise
            except Exception as exc:
                warnings.append(f'MuScriptor 区间 {index+1} 转录不完整：{type(exc).__name__}')
                print('MuScriptor chunk failed:', index, str(exc), flush=True)
            completed += 1
        audio = {t['stem']: t['audio_file'] for t in reversed(tracks)}  # Prefer four-stem audio.
        for model, entries in parts.items():
            if not entries: continue
            by_stem = {}
            for chunk, notes in entries:
                for stem in {INSTRUMENT_STEMS.get(n['instrument'], 'other') for n in notes} - {'drums'}:
                    by_stem.setdefault(stem, []).append(
                        (chunk, [n for n in notes if INSTRUMENT_STEMS.get(n['instrument'], 'other') == stem]))
            for stem, stem_parts in sorted(by_stem.items()):
                track_id = f'{model}-{stem}'
                tracks.append({'id': track_id, 'model': model, 'stem': stem,
                               'notes': merge_chunks(stem_parts, track_id, duration),
                               'audio_file': audio.get(stem), 'missing_chunks': len(descriptors)-len(entries)})
    crosscheck(tracks)
    status('正在核对原曲和声与整曲节拍', completed, total_steps)
    accompaniment, rhythm = None, None
    primary = [t for t in tracks if t['model'] == 'htdemucs_ft' and t['stem'] != 'vocals']
    if primary:
        import soundfile as sf
        backing = np.zeros((round(duration*44100), 2), np.float32)
        for t in primary:
            data, _ = sf.read(work/t['audio_file'], dtype='float32', always_2d=True)
            backing[:len(data)] += data
        path = work/'backing.wav'; sf.write(path, backing, 44100, subtype='PCM_16')
        try: accompaniment = analyze_backing(path, source)
        except Exception as exc: warnings.append('和弦分析不可用：'+type(exc).__name__)
    try:
        import librosa
        audio, sr = librosa.load(source, sr=22050, mono=True)
        envelope = librosa.onset.onset_strength(y=audio, sr=sr)
        drum_track = next((t for t in tracks if t['model'] == 'htdemucs_ft' and t['stem'] == 'drums'), None)
        drum_onsets = []
        if drum_track:
            drums, _ = librosa.load(work/drum_track['audio_file'], sr=sr, mono=True)
            drum_envelope = librosa.onset.onset_strength(y=drums, sr=sr)
            drum_onsets = list(map(float, librosa.onset.onset_detect(onset_envelope=drum_envelope, sr=sr, units='time')))
            length = min(len(envelope), len(drum_envelope))
            envelope = .7*envelope[:length]/max(float(np.max(envelope)), 1e-9)+.3*drum_envelope[:length]/max(float(np.max(drum_envelope)), 1e-9)
        tempo, beats = librosa.beat.beat_track(onset_envelope=envelope, sr=sr, units='time', trim=False)
        intervals = np.diff(beats)
        regularity = max(0., 1-float(np.std(intervals)/(np.mean(intervals)+1e-9))) if len(intervals) else 0.
        rhythm = {'bpm': float(np.asarray(tempo).reshape(-1)[0]), 'beats': list(map(float, beats)),
                  'regularity': regularity, 'drum_onsets': drum_onsets, 'method': 'mix-drum-onset'}
    except Exception as exc: warnings.append('节拍分析不可用：'+type(exc).__name__)
    result = {'schema_version': 2, 'duration': duration, 'tracks': tracks, 'accompaniment': accompaniment,
              'rhythm_info': rhythm, 'warnings': warnings, 'chunks': descriptors,
              'metrics': {'elapsed_seconds': time.monotonic()-started,
                          'peak_rss_bytes': resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*1024 if resource else None,
                          'artifact_bytes': sum(a['size'] for a in artifacts)},
              'models': {m: {'package': importlib.metadata.version('demucs'), 'weights': m, 'device': 'cpu', 'shifts': 1} for m in MODELS}}
    if versions:
        result['models']['muscriptor'] = {'package': ','.join(sorted(versions)),
                                          'weights': os.environ.get('MUSCRIPTOR_MODEL', 'large')}
    path = work/'analysis.json'; path.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    artifacts.append(dict(objects.upload(prefix+'analysis.json', path), path='analysis.json'))
    check_cancel()
    objects.put(prefix+'manifest.json', {'schema_version': 2, 'attempt': attempt, 'artifacts': artifacts})
    status('分析已完成，等待本机导入', total_steps, total_steps)


if __name__ == '__main__':
    import re
    job_id, attempt = os.environ['SONG_ID'], os.environ['SONG_ATTEMPT']
    if not re.fullmatch('[0-9a-f]{32}', job_id) or not re.fullmatch('[0-9a-f]{32}', attempt): raise ValueError('Invalid task ID')
    with tempfile.TemporaryDirectory(prefix='song-') as folder:
        process(Objects(os.environ['SONG_BUCKET'], metadata_token), job_id, attempt, Path(folder))
