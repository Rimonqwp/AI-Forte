"""Opt-in integration checks against an isolated set of rows in PostgreSQL."""
import os
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

pytestmark = pytest.mark.skipif(os.environ.get('FYP_SQL_INTEGRATION') != '1', reason='requires Cloud SQL credentials')


@pytest.fixture
def database():
    from app.sql_database import make_engine
    engine = make_engine()
    yield engine
    engine.dispose()
    connector = getattr(engine, 'cloud_sql_connector', None)
    if connector:
        connector.close()


def test_job_revision_concurrency_and_cancellation(database, tmp_path):
    from app.postgres_song_store import PostgresSongStore
    from app.song_store import Conflict
    from app.sql_database import jobs, revisions
    store = PostgresSongStore(tmp_path, engine=database)
    job_id = 'sql-test-' + uuid4().hex
    try:
        store.create({'id': job_id, 'stage': 'done', 'revision': 0})
        def revise():
            try:
                return store.revise(job_id, 0, lambda job: dict(job, edited=True))
            except Conflict:
                return None
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: revise(), range(2)))
        assert sum(result is not None for result in results) == 1
        assert store.get(job_id)['revision'] == 1
        assert store.prior(job_id, 1)['revision'] == 0
        def fail(job):
            raise RuntimeError('rollback')
        with pytest.raises(RuntimeError):
            store.revise(job_id, 1, fail)
        assert store.get(job_id)['revision'] == 1
        assert store.prior(job_id, 2)['revision'] == 0
        store.update(job_id, stage='cancelled')
        assert store.update(job_id, stage='done')['stage'] == 'cancelled'
        assert store.update(job_id, stage='queued')['stage'] == 'queued'
    finally:
        with database.begin() as db:
            db.execute(delete(revisions).where(revisions.c.job_id == job_id))
            db.execute(delete(jobs).where(jobs.c.id == job_id))


def test_account_isolation_conflicts_and_profile(database):
    from sql_service.main import app, identity
    from app.sql_database import states, profiles
    first, other = 'sql-test-' + uuid4().hex, 'sql-test-' + uuid4().hex
    user = {'uid': first, 'email': 'verified@example.com', 'firebase': {
        'sign_in_provider': 'google.com', 'identities': {'email': ['verified@example.com'], 'google.com': ['123']}}}
    app.state.engine = database
    app.dependency_overrides[identity] = lambda: user
    client = TestClient(app)
    try:
        assert client.put('/api/account/state/favorites', json={'value': ['star'], 'version': 0}).status_code == 200
        assert client.put('/api/account/state/favorites', json={'value': [], 'version': 0}).status_code == 409
        assert client.put('/api/account/state/favorites', json={'value': ['sunny'], 'version': 1}).status_code == 200
        profile = {'displayName': '同学', 'photoURL': ''}
        assert client.put('/api/account/profile', json=profile).status_code == 200
        with database.connect() as db:
            import json
            saved = json.loads(db.execute(select(profiles.c.body).where(profiles.c.uid == first)).scalar_one())
        assert saved['email'] == 'verified@example.com'
        assert saved['providers'] == ['google.com']
        assert client.put('/api/account/profile', json={**profile, 'displayName': '新名字'}).status_code == 200
        with database.connect() as db:
            changed = json.loads(db.execute(select(profiles.c.body).where(profiles.c.uid == first)).scalar_one())
        assert changed['createdAt'] == saved['createdAt']
        user = {'uid': other, 'firebase': {'sign_in_provider': 'anonymous'}}
        assert client.get('/api/account/state/favorites').json() == {'version': 0}
        assert client.get('/api/account/state').json() == []
        assert client.put('/api/account/profile', json=profile).status_code == 403
    finally:
        app.dependency_overrides.clear()
        with database.begin() as db:
            db.execute(delete(states).where(states.c.uid.in_([first, other])))
            db.execute(delete(profiles).where(profiles.c.uid.in_([first, other])))


def test_legacy_metadata_persists_in_sql_without_local_json(database, tmp_path):
    from app.runtime_records import RuntimeRecords
    records = RuntimeRecords(tmp_path, engine=database)
    job_id = 'sql-test-' + uuid4().hex
    try:
        records.write(job_id, 'result', {'notes': [60]})
        assert RuntimeRecords(tmp_path, engine=database).read(job_id, 'result') == {'notes': [60]}
        records.write(job_id, 'result', {'notes': [62]})
        assert records.read(job_id, 'result') == {'notes': [62]}
        assert not (tmp_path / job_id / 'result.json').exists()
        records.delete(job_id, 'result')
        assert records.read(job_id, 'result') is None
    finally:
        records.delete(job_id, 'result')


def test_migration_is_idempotent_and_never_overwrites_a_live_record(database, tmp_path):
    import json
    from scripts.migrate_cloud_sql import transfer
    from app.runtime_records import RuntimeRecords
    records = RuntimeRecords(tmp_path, engine=database)
    job_id = 'sql-test-' + uuid4().hex
    snapshot = tmp_path / 'snapshot.json'
    snapshot.write_text(json.dumps({'runtime_records': [{'job_id': job_id, 'kind': 'result', 'body': '{"notes":[60]}'}]}))
    try:
        transfer(snapshot, apply=True, tables=['runtime_records'])
        transfer(snapshot, apply=True, tables=['runtime_records'])
        records.write(job_id, 'result', {'notes': [62]})
        with pytest.raises(RuntimeError, match='Destination mismatch'):
            transfer(snapshot, apply=True, tables=['runtime_records'])
        assert records.read(job_id, 'result') == {'notes': [62]}
    finally:
        records.delete(job_id, 'result')
