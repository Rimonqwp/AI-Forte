"""Compact-schema preservation and bounded account API work on real PostgreSQL."""
import json
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, func, inspect, select, text
from sqlalchemy.exc import DBAPIError

from app import relational_schema as s
from app import relational_v1_storage as old
from app.relational_storage import get_profile, get_snapshot, put_snapshot, read_states, storage_version
from scripts.compact_cloud_sql import migrate, prepare


def seed(engine):
    profile = dict(displayName='同学', photoURL='', email='student@example.com', providers=['google.com'],
        createdAt='2026-11-04T16:40:49.388000+00:00', updatedAt='2026-11-06T13:31:09.783850+00:00')
    states = {'favorites': ['star', 'sunny'], 'practice-favorites': ['star:piano-easy'], 'likes': [],
        'completed': ['基础知识'], 'checkins': ['2026-11-06'], 'arrangements-star': ['piano-easy'],
        'progress-star-piano-easy': {'elapsed': 3.5, 'scrollTop': 20, 'bpm': 96}}
    note = dict(start=.1, end=.8, pitch=64, string=1, fret=0, evidence={'score': .9})
    value = dict(id='test-job', title='测试乐曲', stage='done', revision=1, notes=[note],
        melody=[], overrides=[{'start': 0, 'end': 1, 'track_id': None}],
        request={'url': 'https://example.com', 'mode': 'full', 'reuse_job_id': None},
        settings={'density': 'rich', 'slides': True},
        arrangement={'melody': [note], 'extras': [], 'events': [note], 'slides': [], 'settings': {'legato': False}},
        accompaniment={'bpm': 96, 'chords': [{'label': 'C', 'start': 0, 'end': 2, 'frets': [0, 1, 0, 2, 3, -1]}],
            'strums': [{'time': 0, 'end': .5, 'direction': 'down', 'velocity': .7}]},
        slides=[{'from': 0, 'to': 1, 'start': .8, 'end': 1, 'semitones': 2}])
    with engine.begin() as db:
        db.execute(s.schema_versions.insert().values(version=1, applied_at='test'))
        old.put_profile(db, 'member', profile)
        for key, item in states.items():
            db.execute(s.state_versions.insert().values(uid='member', key=key, version=3))
            old.write_state_value(db, 'member', key, item)
        snapshot = old.put_snapshot(db, value)
        db.execute(s.transcription_jobs.insert().values(id='test-job', stage='done', created=1, snapshot_id=snapshot))
    return profile, states, value, snapshot


def test_compaction_preserves_records_and_archives_retired_tables(relational_database, tmp_path):
    engine = relational_database
    profile, states, value, snapshot = seed(engine)
    prepare(engine)
    result = migrate(engine, tmp_path / 'backup')
    assert result['active_tables'] == 10 and result['archived_tables'] == 19
    assert migrate(engine, tmp_path / 'unused') == {'already_applied': True}
    schema = engine.get_execution_options()['schema_translate_map'][None]
    with engine.begin() as db:
        assert storage_version(db) == 2
        assert get_profile(db, 'member') == profile
        assert {key: record['value'] for key, record in read_states(db, 'member').items()} == states
        assert all(record['version'] == 3 for record in read_states(db, 'member').values())
        assert get_snapshot(db, snapshot) == value
        assert set(inspect(db).get_table_names(schema=schema)) == {t.name for t in s.CURRENT_TABLES}
        assert len(inspect(db).get_table_names(schema=schema + '_archive')) == 19
        assert db.execute(select(s.account_items.c.checkin_date).where(s.account_items.c.state_key == 'checkins')).scalar_one() == date(2026, 11, 6)
        assert db.execute(select(s.snapshots.c.request_mode)).scalar_one() == 'full'
        replacement = {'id': value['id'], 'stage': 'done', 'notes': [], 'settings': None, 'request': {}}
        put_snapshot(db, replacement, snapshot)
        assert get_snapshot(db, snapshot) == replacement
    with pytest.raises(DBAPIError, match='Read-only migration archive'):
        with engine.begin() as db:
            db.execute(text(f'DELETE FROM "{schema}_archive".account_providers'))


def test_failed_compaction_rolls_back_and_keeps_v1_available(relational_database, tmp_path, monkeypatch):
    import scripts.compact_cloud_sql as migration
    engine = relational_database
    profile, states, value, snapshot = seed(engine)
    monkeypatch.setattr(migration, 'get_snapshot', lambda db, key: {})
    with pytest.raises(ValueError, match='round-trip mismatch'):
        migrate(engine, tmp_path / 'backup')
    with engine.begin() as db:
        assert storage_version(db) == 1
        assert old.get_snapshot(db, snapshot) == value
        assert db.execute(select(func.count()).select_from(s.account_items)).scalar_one() == 0
        assert db.execute(select(func.count()).select_from(s.transcription_events)).scalar_one() == 0


def test_batch_delta_conditional_reads_compression_and_isolation(relational_database):
    from sql_service.main import app, identity
    engine = relational_database
    with engine.begin() as db:
        db.execute(s.schema_versions.insert().values(version=2, applied_at='test'))
    user = {'uid': 'member', 'firebase': {'sign_in_provider': 'anonymous'}}
    app.state.engine = engine
    app.dependency_overrides[identity] = lambda: user
    client = TestClient(app)
    statements = []
    def record(db, cursor, statement, parameters, context, executemany):
        statements.append(statement)
    event.listen(engine, 'before_cursor_execute', record)
    values = [f'song-{i:04d}-example-title' for i in range(1000)]
    try:
        assert client.put('/api/account/state/favorites', json={'value': values, 'version': 0}).status_code == 200
        response = client.get('/api/account/state/favorites', headers={'Accept-Encoding': 'gzip'})
        assert response.json() == {'value': values, 'version': 1}
        assert response.headers['Content-Encoding'] == 'gzip'
        assert int(response.headers['Content-Length']) < len(response.content) // 2
        assert response.headers['Cache-Control'] == 'private, no-cache'
        assert 'Authorization' in response.headers['Vary']
        etag = response.headers['ETag']
        statements.clear()
        conditional = client.get('/api/account/state/favorites', headers={'If-None-Match': etag})
        assert conditional.status_code == 304 and not conditional.content
        assert not any('account_items' in sql for sql in statements)
        statements.clear()
        conditional = client.get('/api/account/state/favorites', headers={'X-State-If-None-Match': etag})
        assert conditional.status_code == 200 and conditional.json() == {'notModified': True}
        assert conditional.headers['Cache-Control'] == 'private, no-store'
        assert not any('account_items' in sql for sql in statements)
        statements.clear()
        keys = ['favorites', 'likes', 'checkins', 'completed', 'progress-star-piano']
        batch = client.post('/api/account/state:batchGet', json={'keys': keys})
        assert batch.status_code == 200 and batch.json()['states'][0]['value'] == values
        assert len(statements) == 4, statements  # gate (2) + state rows + item rows
        assert client.post('/api/account/state:batchGet', json={'keys': ['favorites'] * 2}).status_code == 422
        assert client.post('/api/account/state:batchGet', json={'keys': ['favorites'] * 33}).status_code == 422
        assert client.post('/api/account/state:batchGet', json={'keys': ['admin']}).status_code == 422
        with engine.connect() as db:
            before = dict(db.execute(select(s.account_items.c.target_id, s.account_items.c.position)).all())
        statements.clear()
        patched = client.patch('/api/account/state/favorites', json={'version': 1, 'add': ['new-song'], 'remove': [values[0]]})
        assert patched.json() == {'version': 2}
        inserts = [sql for sql in statements if sql.startswith('INSERT') and 'account_items' in sql]
        assert len(inserts) == 1 and inserts[0].count('VALUES') == 1
        with engine.connect() as db:
            after = dict(db.execute(select(s.account_items.c.target_id, s.account_items.c.position)).all())
        assert all(after[value] == before[value] for value in values[1:])
        assert after['new-song'] == 1000
        assert client.patch('/api/account/state/favorites', json={'version': 1, 'add': [], 'remove': []}).status_code == 409
        assert client.patch('/api/account/state/favorites', json={'version': 2, 'add': ['overflow'], 'remove': []}).status_code == 422
        assert client.get('/api/account/state/favorites').json()['version'] == 2
        assert client.patch('/api/account/state/progress-star', json={'version': 0, 'add': [], 'remove': []}).status_code == 422
        assert client.patch('/api/account/state/checkins', json={'version': 0, 'add': ['2026-02-30']}).status_code == 422
        assert client.put('/api/account/state/progress-star-piano', json={'version': 0, 'value': {'elapsed': 2, 'scrollTop': 4, 'bpm': 96}}).status_code == 200
        user['uid'] = 'another-member'
        other = client.get('/api/account/state/favorites', headers={'If-None-Match': etag})
        assert other.status_code == 200 and other.json() == {'version': 0} and other.headers['ETag'] != etag
        assert client.post('/api/account/state:batchGet', json={'keys': ['favorites']}).json() == {'states': [{'key': 'favorites', 'version': 0}]}
    finally:
        app.dependency_overrides.clear()
        event.remove(engine, 'before_cursor_execute', record)
