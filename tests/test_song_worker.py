import copy
import json
from pathlib import Path

import numpy as np
import soundfile as sf
import pytest

import cloud.full_song as worker
from cloud.objects import digest


class FakeObjects:
    def __init__(self, root): self.root = root
    def path(self, key): return self.root/key
    def read(self, key):
        p = self.path(key)
        return json.loads(p.read_text()) if p.exists() else None
    def put(self, key, value):
        p = self.path(key); p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(value))
    def upload(self, key, source):
        p = self.path(key); p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(Path(source).read_bytes())
        return {'key': key, 'sha256': digest(p), 'size': p.stat().st_size}
    def download(self, key, target, expected=None):
        target = Path(target); target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(self.path(key).read_bytes())


@pytest.mark.parametrize('fail_six', [False, True])
def test_cloud_worker_checkpoints_reused_and_independent_models(tmp_path, monkeypatch, fail_six):
    objects = FakeObjects(tmp_path/'objects')
    source = tmp_path/'input.wav'
    sf.write(source, np.full((44100*2, 2), .1, np.float32), 44100)
    info = objects.upload('job/input.wav', source)
    objects.put('job/request.json', {'duration': 2, 'input': info})
    calls = []
    def run(args):
        if 'demucs' in args:
            model = args[args.index('-n')+1]; calls.append(model)
            if fail_six and model == 'htdemucs_6s': raise RuntimeError('model unavailable')
            cut = Path(args[-1]); output = Path(args[args.index('-o')+1])/model/cut.stem
            output.mkdir(parents=True, exist_ok=True)
            for stem in worker.MODELS[model]:
                sf.write(output/f'{stem}.wav', np.full((44100*2, 2), .1, np.float32), 44100)
        else:
            Path(args[-1]).write_bytes(source.read_bytes())
    monkeypatch.setattr(worker, 'run', run)
    monkeypatch.setattr(worker, 'transcribe', lambda path, stem: [{'start': .2, 'end': 1.2, 'pitch': 43 if stem=='bass' else 64, 'confidence': .9}])
    monkeypatch.setattr(worker, 'analyze_backing', lambda *_: None)
    monkeypatch.setattr(worker.importlib.metadata, 'version', lambda _: '4.0.1')
    for attempt in ('one', 'two'):
        work = tmp_path/attempt; work.mkdir()
        worker.process(objects, 'job', attempt, work)
        manifest = objects.read('job/manifest.json')
        assert manifest['attempt'] == attempt
        raw = objects.read('job/analysis.json')
        assert len(raw['tracks']) == (4 if fail_six else 10)
        assert bool(raw['warnings']) == fail_six
        assert all(not t['notes'] for t in raw['tracks'] if t['stem'] == 'drums')
        if not fail_six: assert any(n['crosscheck'] == 'agreement' for t in raw['tracks'] for n in t['notes'])
        for artifact in manifest['artifacts']:
            assert digest(objects.path(artifact['key'])) == artifact['sha256']
    assert calls == (['htdemucs_ft', 'htdemucs_6s', 'htdemucs_6s'] if fail_six else ['htdemucs_ft', 'htdemucs_6s'])


def test_muscriptor_pass_checkpointed_mapped_to_stems_and_failure_isolated(tmp_path, monkeypatch):
    objects = FakeObjects(tmp_path/'objects')
    source = tmp_path/'input.wav'
    sf.write(source, np.full((44100*2, 2), .1, np.float32), 44100)
    objects.put('job/request.json', {'duration': 2, 'input': objects.upload('job/input.wav', source)})
    plans, fail = [], {'on': False}
    def run(args):
        if 'demucs' in args:
            model = args[args.index('-n')+1]
            cut = Path(args[-1]); output = Path(args[args.index('-o')+1])/model/cut.stem
            output.mkdir(parents=True, exist_ok=True)
            for stem in worker.MODELS[model]:
                sf.write(output/f'{stem}.wav', np.full((44100*2, 2), .1, np.float32), 44100)
        elif args[1].endswith('muscriptor_runner.py'):
            if fail['on']: raise RuntimeError('weights missing')
            plan = json.loads(Path(args[2]).read_text()); plans.append(plan)
            for job in plan:
                notes = [{'start': .2, 'end': 1.2, 'pitch': 64, 'instrument': 'acoustic_guitar'},
                         {'start': .3, 'end': .4, 'pitch': 36, 'instrument': 'drums'}]
                if job['instruments'] is None:
                    notes += [{'start': .5, 'end': 1., 'pitch': 40, 'instrument': 'electric_bass'},
                              {'start': .5, 'end': 1., 'pitch': 72, 'instrument': 'synth_lead'}]
                Path(job['output']).write_text(json.dumps({'version': '0.4.0', 'notes': notes}))
        else:
            Path(args[-1]).write_bytes(source.read_bytes())
    monkeypatch.setenv('MUSCRIPTOR_PYTHON', '/opt/muscriptor/bin/python')
    monkeypatch.setattr(worker, 'run', run)
    monkeypatch.setattr(worker, 'transcribe', lambda path, stem: [{'start': .2, 'end': 1.2, 'pitch': 64, 'confidence': .9}])
    monkeypatch.setattr(worker, 'harmonic_support', lambda path, notes: [dict(n, confidence=.85, spectral_support=1.) for n in notes])
    monkeypatch.setattr(worker, 'analyze_backing', lambda *_: None)
    monkeypatch.setattr(worker.importlib.metadata, 'version', lambda _: '4.0.1')
    for attempt in ('one', 'two'):
        work = tmp_path/attempt; work.mkdir()
        worker.process(objects, 'job', attempt, work)
    assert len(plans) == 1 and [j['instruments'] for j in plans[0]] == [None, worker.GUITARS]
    raw = objects.read('job/analysis.json')
    found = {t['id']: t for t in raw['tracks'] if t['model'].startswith('muscriptor')}
    assert set(found) == {'muscriptor-guitar', 'muscriptor-bass', 'muscriptor-other', 'muscriptor_stem-guitar'}
    assert found['muscriptor-guitar']['audio_file'] == 'tracks/htdemucs_6s-guitar.flac'
    assert found['muscriptor-bass']['audio_file'] == 'tracks/htdemucs_ft-bass.flac'
    assert [n['crosscheck'] for n in found['muscriptor-guitar']['notes']] == ['agreement']
    assert raw['models']['muscriptor'] == {'package': '0.4.0', 'weights': 'large'}
    assert not raw['warnings']
    # A failed MuScriptor run keeps the Demucs result and reports the gap.
    fail['on'] = True
    objects.put('job/request.json', {'duration': 2, 'input': dict(objects.read('job/request.json')['input'], sha256='f'*64)})
    work = tmp_path/'three'; work.mkdir()
    worker.process(objects, 'job', 'three', work)
    raw = objects.read('job/analysis.json')
    assert not any(t['model'].startswith('muscriptor') for t in raw['tracks'])
    assert any('MuScriptor' in w for w in raw['warnings'])


def test_harmonic_support_keeps_chord_tones_and_flags_absent_pitch(tmp_path):
    sr = 22050
    t = np.arange(sr)/sr
    chord = sum(np.sin(2*np.pi*f*t)*a for f, a in ((261.63, 1.), (329.63, .5), (392., .4)))
    path = tmp_path/'chord.wav'; sf.write(path, chord.astype(np.float32)*.2, sr)
    notes = worker.harmonic_support(path, [{'start': 0, 'end': 1, 'pitch': p, 'instrument': 'acoustic_guitar'} for p in (60, 64, 67, 70)])
    assert [n['uncertain'] for n in notes] == [False, False, False, True]
    assert all(n['spectral_support'] >= .8 for n in notes[:3])


def test_muscriptor_runner_writes_notes_without_drums(tmp_path, monkeypatch):
    import sys, types
    import cloud.muscriptor_runner as runner
    class Start:
        def __init__(self, pitch, instrument): self.pitch, self.start_time, self.instrument = pitch, .5, instrument
    class End:
        def __init__(self, start): self.start_event, self.end_time = start, 1.
    calls = []
    class Model:
        @classmethod
        def load_model(cls, weights): calls.append(weights); return cls()
        def transcribe(self, path, instruments=None, cfg_coef=1.):
            calls.append((path, instruments, cfg_coef))
            return [Start(64, 'acoustic_guitar'), End(Start(64, 'acoustic_guitar')), End(Start(36, 'drums'))]
    monkeypatch.setitem(sys.modules, 'muscriptor', types.SimpleNamespace(NoteEndEvent=End, TranscriptionModel=Model))
    monkeypatch.setattr(runner.importlib.metadata, 'version', lambda _: '0.4.0')
    monkeypatch.setenv('MUSCRIPTOR_WEIGHTS', '/opt/w/model.safetensors')
    plan = tmp_path/'plan.json'
    plan.write_text(json.dumps([{'input': 'a.wav', 'instruments': ['acoustic_guitar'], 'output': str(tmp_path/'a.json')}]))
    runner.main(plan)
    assert calls == ['/opt/w/model.safetensors', ('a.wav', ['acoustic_guitar'], 1.)]
    assert json.loads((tmp_path/'a.json').read_text()) == {'version': '0.4.0', 'notes': [
        {'start': .5, 'end': 1., 'pitch': 64, 'instrument': 'acoustic_guitar'}]}
