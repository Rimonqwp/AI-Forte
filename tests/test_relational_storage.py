"""Real PostgreSQL checks for normalization, online cutover and data preservation."""
import json
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError

from app import relational_schema as s
from app.relational_storage import put_snapshot, get_snapshot


def example_job():
    note = dict(id='note-1', start=0.1, end=0.8, pitch=64, original_pitch=64,
        string=1, fret=0, confidence=.95, uncertain=False, uncertainty_reasons=[],
        evidence={'stability': .9, 'raw_score': .95}, custom_model_detail={'value': 1})
    return dict(id='normalization-test', stage='done', revision=2, duration=30,
        title='测试乐曲', source_url='https://example.com/audio', vocal_url=None,
        warnings=[], notes=[note], melody=[], overrides=[{'start': 2, 'end': 3, 'track_id': None}],
        request={'url': 'https://example.com/audio', 'mode': 'segment', 'include_intro': True, 'reuse_job_id': None},
        settings={'density': 'rich', 'slides': True, 'legato': False},
        arrangement={'melody': [note], 'extras': [], 'events': [note], 'slides': [],
                     'settings': {'density': 'rich'}, 'future_version': 4},
        accompaniment={'bpm': 90, 'chords': [{'start': 0, 'end': 2, 'label': 'C', 'frets': [-1, 3, 2, 0, 1, 0]}],
            'strums': [{'time': 0, 'end': 1, 'direction': 'down', 'chord': 'C', 'velocity': .7, 'frets': []}]},
        slides=[{'from': 0, 'to': 1, 'start': .8, 'end': 1, 'semitones': 2}],
        ai_review={'kept_extra_ids': [], 'reason': '保持主旋律'}, future_metadata={'ok': True})


def activate(engine):
    with engine.begin() as db:
        db.execute(s.schema_versions.insert().values(version=1, applied_at='test'))


def client_for(engine, user):
    from sql_service.main import app, identity
    app.state.engine = engine
    app.dependency_overrides[identity] = lambda: user
    return TestClient(app)


def test_snapshot_roundtrip_and_queryable_columns(relational_database):
    engine = relational_database
    value = example_job()
    with engine.begin() as db:
        key = put_snapshot(db, value)
        assert get_snapshot(db, key) == value
        row = db.execute(select(s.snapshots).where(s.snapshots.c.snapshot_id == key)).mappings().one()
        assert row['title'] == '测试乐曲' and row['duration_seconds'] == 30
        assert 'title' not in row['extensions'] and 'notes' not in row['extensions']
        assert 'melody' not in row['extensions']['arrangement']
        rows = db.execute(select(s.transcription_notes.c.pitch, s.transcription_notes.c.string_number,
            s.transcription_notes.c.fret).where(s.transcription_notes.c.snapshot_id == key)).all()
        assert rows == [(64, 1, 0)] * 3
        assert db.execute(select(s.transcription_chords.c.label)).scalar_one() == 'C'
        # Replacing a snapshot removes old children and optional scalar values.
        replacement = {'id': value['id'], 'stage': 'done', 'notes': [], 'settings': None, 'arrangement': None}
        put_snapshot(db, replacement, key)
        assert get_snapshot(db, key) == replacement
        assert db.execute(select(func.count()).select_from(s.transcription_notes)).scalar_one() == 0


def test_all_account_tables_and_empty_state(relational_database):
    from sql_service.main import app
    engine = relational_database
    activate(engine)
    user = {'uid': 'member', 'firebase': {'sign_in_provider': 'anonymous'}}
    client = client_for(engine, user)
    values = {'favorites': ['sunny', 'star'], 'practice-favorites': ['star:piano-easy'],
        'checkins': ['2026-11-06', '2026-11-05'], 'likes': ['post-1'],
        'completed': ['认识基础知识'], 'arrangements-star': ['piano-easy'],
        'progress-star-piano-easy': {'elapsed': 1.25, 'scrollTop': 12.5, 'bpm': 96}}
    try:
        for key, value in values.items():
            response = client.put(f'/api/account/state/{key}', json={'value': value, 'version': 0})
            assert response.status_code == 200, response.text
            assert client.get(f'/api/account/state/{key}').json() == {'value': value, 'version': 1}
        assert {r['key']: r['value'] for r in client.get('/api/account/state').json()} == values
        assert client.put('/api/account/state/favorites', json={'value': [], 'version': 1}).status_code == 200
        assert client.get('/api/account/state/favorites').json() == {'value': [], 'version': 2}
        with engine.connect() as db:
            assert db.execute(select(func.count()).select_from(s.song_favorites)).scalar_one() == 0
            assert db.execute(select(s.practice_progress.c.practice_key)).scalar_one() == 'star-piano-easy'
        user['uid'] = 'another-member'
        assert client.get('/api/account/state').json() == []
    finally:
        app.dependency_overrides.clear()


def test_concurrent_cas_and_profile_creation(relational_database):
    from sql_service.main import app
    from app.relational_storage import get_profile
    engine = relational_database
    activate(engine)
    client = client_for(engine, {'uid': 'member', 'email': 'verified@example.com',
        'firebase': {'sign_in_provider': 'google.com', 'identities': {'google.com': ['provider-id']}}})
    try:
        assert client.put('/api/account/state/favorites', json={'value': ['star'], 'version': 0}).status_code == 200
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda value: client.put('/api/account/state/favorites',
                json={'value': [value], 'version': 1}), ['sunny', 'rice']))
        assert sorted(r.status_code for r in results) == [200, 409]
        winner = next(r.json()['value'] for r in results if r.status_code == 200)
        assert client.get('/api/account/state/favorites').json() == {'value': winner, 'version': 2}
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda name: client.put('/api/account/profile',
                json={'displayName': name, 'photoURL': ''}), ['甲', '乙']))
        assert all(r.status_code == 200 for r in results)
        with engine.connect() as db:
            value = get_profile(db, 'member')
        assert value['providers'] == ['google.com']
        assert value['email'] == 'verified@example.com'
    finally:
        app.dependency_overrides.clear()


def seed_legacy(engine, job=None):
    from app.sql_database import states, jobs, revisions, profiles, runtime_records
    value = job or example_job()
    profile = dict(displayName='同学', photoURL='', email='student@example.com', providers=['google.com'],
        createdAt='2026-11-04T16:40:49.388000+00:00', updatedAt='2026-11-06T13:31:09.783850+00:00')
    with engine.begin() as db:
        db.execute(states.insert().values(uid='member', key='favorites', body='["star"]', version=4))
        db.execute(states.insert().values(uid='member', key='practice-favorites', body='[]', version=2))
        db.execute(profiles.insert().values(uid='member', body=json.dumps(profile)))
        db.execute(jobs.insert().values(id=value['id'], state=value['stage'], created=123.4, body=json.dumps(value)))
        db.execute(revisions.insert().values(job_id=value['id'], revision=1, body=json.dumps(dict(value, revision=1))))
        db.execute(runtime_records.insert().values(job_id='legacy-result', kind='result', body=json.dumps(value)))


def test_atomic_cutover_backup_archives_and_live_writes(relational_database, tmp_path):
    from app.sql_database import states
    from scripts.normalize_cloud_sql import migrate, export_rows, verify_import
    from sql_service.main import app
    engine = relational_database
    seed_legacy(engine)
    client = client_for(engine, {'uid': 'member'})
    try:
        assert client.get('/api/account/state/favorites').json() == {'value': ['star'], 'version': 4}
        assert migrate(engine)['preflight']['states'] == 2
        backup = tmp_path / 'backup'
        result = migrate(engine, backup, apply=True)
        assert result['applied'] == {'profiles': 1, 'states': 2, 'jobs': 1, 'revisions': 1, 'runtime_records': 1}
        snapshot = backup / 'legacy-snapshot.json'
        assert snapshot.stat().st_mode & 0o777 == 0o600
        with engine.begin() as db:
            verify_import(db, export_rows(db))
        assert client.get('/api/account/health').json()['schema'] == 'relational-v1'
        assert client.get('/api/account/state/practice-favorites').json() == {'value': [], 'version': 2}
        assert client.put('/api/account/state/favorites', json={'value': ['rice'], 'version': 4}).status_code == 200
        assert migrate(engine, tmp_path / 'unused', apply=True) == {'already_applied': True}
        assert client.get('/api/account/state/favorites').json() == {'value': ['rice'], 'version': 5}
        with pytest.raises(DBAPIError, match='Storage migrated'):
            with engine.begin() as db:
                db.execute(states.update().values(body='[]'))
        with engine.connect() as db:
            assert db.execute(select(states.c.body).where(states.c.key == 'favorites')).scalar_one() == '["star"]'
    finally:
        app.dependency_overrides.clear()


def test_failed_cutover_rolls_back_every_destination(relational_database, tmp_path):
    from scripts.normalize_cloud_sql import migrate
    from app.sql_database import jobs
    engine = relational_database
    job = example_job()
    job['notes'][0]['pitch'] = 128
    seed_legacy(engine, job)
    with pytest.raises(DBAPIError) as error:
        migrate(engine, tmp_path / 'backup', apply=True)
    assert error.value.orig.args[0]['C'] == '23514'
    with engine.connect() as db:
        for table in s.RELATIONAL_TABLES:
            assert db.execute(select(func.count()).select_from(table)).scalar_one() == 0
        assert db.execute(select(func.count()).select_from(jobs)).scalar_one() == 1


def test_failed_job_edit_preserves_history_and_children(relational_database, tmp_path):
    from app.postgres_song_store import PostgresSongStore
    activate(relational_database)
    store = PostgresSongStore(tmp_path, engine=relational_database)
    value = example_job()
    store.create(value)
    def bad_edit(job):
        job['notes'][0]['pitch'] = 200
        return job
    with pytest.raises(DBAPIError) as error:
        store.revise(value['id'], 2, bad_edit)
    assert error.value.orig.args[0]['C'] == '23514'
    assert store.get(value['id']) == value
    assert store.prior(value['id'], 3) is None


def test_old_profile_snapshot_never_overwrites_new_edits(relational_database, tmp_path):
    from scripts.migrate_cloud_sql import transfer
    from app.relational_storage import put_profile, get_profile
    engine = relational_database
    activate(engine)
    value = dict(displayName='同学', photoURL='', email='student@example.com', providers=['google.com'],
        createdAt='2026-11-04T16:40:49.388000+00:00', updatedAt='2026-11-06T13:31:09.783850+00:00')
    snapshot = tmp_path / 'profile.json'
    snapshot.write_text(json.dumps({'profiles': [{'uid': 'member', 'body': json.dumps(value)}]}))
    transfer(snapshot, apply=True, tables=['profiles'], engine=engine)
    transfer(snapshot, apply=True, tables=['profiles'], engine=engine)
    changed = dict(value, displayName='最新名字')
    with engine.begin() as db:
        put_profile(db, 'member', changed)
    with pytest.raises(RuntimeError, match='Destination mismatch'):
        transfer(snapshot, apply=True, tables=['profiles'], engine=engine)
    with engine.connect() as db:
        assert get_profile(db, 'member') == changed
