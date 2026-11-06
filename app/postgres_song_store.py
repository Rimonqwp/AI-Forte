"""Cloud SQL job storage with row locks and optimistic editing revisions."""
import copy
import json
import time
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from app.song_store import Conflict
from app.sql_database import jobs, revisions, metadata, make_engine
from app import relational_schema as relational
from app.relational_storage import relational_enabled, put_snapshot, get_snapshot


class PostgresSongStore:
    def __init__(self, root, engine=None):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.engine = engine if engine is not None else make_engine()
        metadata.create_all(self.engine, tables=relational.CURRENT_TABLES)

    def get(self, job_id):
        with self.engine.connect() as db:
            if relational_enabled(db):
                snapshot = db.execute(select(relational.transcription_jobs.c.snapshot_id).where(
                    relational.transcription_jobs.c.id == job_id).with_for_update(read=True)).scalar_one_or_none()
                return get_snapshot(db, snapshot) if snapshot else None
            body = db.execute(select(jobs.c.body).where(jobs.c.id == job_id)).scalar_one_or_none()
        return json.loads(body) if body else None

    def list(self):
        with self.engine.connect() as db:
            if relational_enabled(db):
                snapshots = list(db.execute(select(relational.transcription_jobs.c.snapshot_id)
                    .order_by(relational.transcription_jobs.c.created).with_for_update(read=True)).scalars())
                return [get_snapshot(db, snapshot) for snapshot in snapshots]
            return [json.loads(r[0]) for r in db.execute(select(jobs.c.body).order_by(jobs.c.created))]

    def create(self, job):
        with self.engine.begin() as db:
            if relational_enabled(db):
                snapshot = put_snapshot(db, job)
                db.execute(relational.transcription_jobs.insert().values(
                    id=job['id'], stage=job['stage'], created=time.time(), snapshot_id=snapshot))
                return
            db.execute(jobs.insert().values(id=job['id'], state=job['stage'], created=time.time(), body=json.dumps(job)))

    def _locked(self, db, job_id, normalized=False):
        if normalized:
            snapshot = db.execute(select(relational.transcription_jobs.c.snapshot_id).where(
                relational.transcription_jobs.c.id == job_id).with_for_update()).scalar_one_or_none()
            if snapshot is None:
                raise KeyError(job_id)
            return get_snapshot(db, snapshot), snapshot
        body = db.execute(select(jobs.c.body).where(jobs.c.id == job_id).with_for_update()).scalar_one_or_none()
        if body is None:
            raise KeyError(job_id)
        return json.loads(body), None

    def _save(self, db, job_id, job, snapshot):
        if snapshot:
            put_snapshot(db, job, snapshot)
            db.execute(relational.transcription_jobs.update().where(relational.transcription_jobs.c.id == job_id)
                .values(stage=job['stage']))
        else:
            db.execute(jobs.update().where(jobs.c.id == job_id).values(state=job['stage'], body=json.dumps(job)))

    def update(self, job_id, **fields):
        with self.engine.begin() as db:
            job, snapshot = self._locked(db, job_id, relational_enabled(db))
            if job['stage'] == 'cancelled' and fields.get('stage') != 'queued':
                return job
            job.update(fields)
            self._save(db, job_id, job, snapshot)
        return job

    def revise(self, job_id, expected, change):
        with self.engine.begin() as db:
            job, snapshot = self._locked(db, job_id, relational_enabled(db))
            if job.get('revision', 0) != expected:
                raise Conflict('结果已在另一页面更新，请重新加载。')
            if snapshot:
                existing = db.execute(select(relational.transcription_revisions.c.snapshot_id).where(
                    relational.transcription_revisions.c.job_id == job_id,
                    relational.transcription_revisions.c.revision == expected)).first()
                if existing is None:
                    history = put_snapshot(db, job)
                    db.execute(relational.transcription_revisions.insert().values(job_id=job_id, revision=expected, snapshot_id=history))
            else:
                db.execute(insert(revisions).values(job_id=job_id, revision=expected, body=json.dumps(job)).on_conflict_do_nothing())
            draft = copy.deepcopy(job)
            draft.pop('ai_review', None)
            draft.pop('undo_cursor', None)
            updated = change(draft)
            updated['revision'] = expected + 1
            self._save(db, job_id, updated, snapshot)
        return updated

    def prior(self, job_id, before):
        with self.engine.connect() as db:
            if relational_enabled(db):
                snapshot = db.execute(select(relational.transcription_revisions.c.snapshot_id).where(
                    relational.transcription_revisions.c.job_id == job_id,
                    relational.transcription_revisions.c.revision < before)
                    .order_by(relational.transcription_revisions.c.revision.desc()).limit(1)).scalar_one_or_none()
                return get_snapshot(db, snapshot) if snapshot else None
            body = db.execute(select(revisions.c.body).where(revisions.c.job_id == job_id, revisions.c.revision < before)
                              .order_by(revisions.c.revision.desc()).limit(1)).scalar_one_or_none()
        return json.loads(body) if body else None
