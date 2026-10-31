import json
from pathlib import Path
from types import SimpleNamespace

from app.song_manager import SongManager
from app.song_store import SongStore
from cloud.objects import digest


def setup(tmp_path):
    store = SongStore(tmp_path)
    job = {'id': 'a'*32, 'attempt': 'b'*32, 'stage': 'queued', 'schema_version': 2,
           'uploaded': True, 'revision': 0, 'duration': 60, 'request': {},
           'start': 0, 'dual_enabled': False}
    store.create(job)
    return store, job, SongManager(store, lambda _: None)


def test_unknown_submission_is_not_sent_twice(tmp_path, monkeypatch):
    store, job, manager = setup(tmp_path)
    monkeypatch.setattr(manager, 'config', lambda: ('bucket', 'projects/p/locations/r/jobs/j'))
    monkeypatch.setattr(manager, 'find_execution', lambda *_: None)
    calls = []
    def api(method, path, **kwargs):
        calls.append(method)
        if method == 'POST': raise TimeoutError('ambiguous submission')
        return {}
    monkeypatch.setattr(manager, 'api', api)
    class Objects:
        def __init__(self, *_): pass
        def read(self, *_): return None
    monkeypatch.setattr('app.song_manager.Objects', Objects)
    try: manager.step(job)
    except TimeoutError: pass
    assert store.get(job['id'])['submit_intent']
    manager.step(store.get(job['id']))
    assert calls == ['POST']


def test_import_validates_artifacts_and_persists_final_state(tmp_path):
    store, job, manager = setup(tmp_path)
    path = tmp_path/'cloud.json'
    path.write_text(json.dumps({'tracks': [], 'warnings': [], 'rhythm_info': None}))
    artifact = {'key': 'result', 'path': 'analysis.json', 'sha256': digest(path), 'size': path.stat().st_size}
    class Objects:
        def download(self, key, target, expected):
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(path.read_bytes())
    manager.finish(job, Objects(), {'artifacts': [artifact]})
    assert SongStore(tmp_path).get(job['id'])['stage'] == 'done'
    assert store.get(job['id'])['notes'] == []


def test_manifest_cannot_escape_task_directory(tmp_path):
    store, job, manager = setup(tmp_path)
    import pytest
    with pytest.raises(ValueError):
        manager.finish(job, None, {'artifacts': [{'path': '../escape'}]})


def test_cancelled_import_cannot_become_done(tmp_path):
    store, job, manager = setup(tmp_path)
    store.update(job['id'], stage='cancelled')
    folder = tmp_path/job['id']; folder.mkdir()
    (folder/'analysis.json').write_text('{"tracks": []}')
    manager.finish(job, None, {'artifacts': []})
    assert store.get(job['id'])['stage'] == 'cancelled'
