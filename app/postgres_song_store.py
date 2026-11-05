"""Cloud SQL job storage with row locks and optimistic editing revisions."""
import copy
import json
import time
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from app.song_store import Conflict
from app.sql_database import jobs, revisions, metadata, make_engine


class PostgresSongStore:
    def __init__(self, root, engine=None):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.engine = engine if engine is not None else make_engine()
        metadata.create_all(self.engine)

    def get(self, job_id):
        with self.engine.connect() as db:
            body = db.execute(select(jobs.c.body).where(jobs.c.id == job_id)).scalar_one_or_none()
        return json.loads(body) if body else None

    def list(self):
        with self.engine.connect() as db:
            return [json.loads(r[0]) for r in db.execute(select(jobs.c.body).order_by(jobs.c.created))]

    def create(self, job):
        with self.engine.begin() as db:
            db.execute(jobs.insert().values(id=job['id'], state=job['stage'], created=time.time(), body=json.dumps(job)))

    def _locked(self, db, job_id):
        body = db.execute(select(jobs.c.body).where(jobs.c.id == job_id).with_for_update()).scalar_one_or_none()
        if body is None:
            raise KeyError(job_id)
        return json.loads(body)

    def update(self, job_id, **fields):
        with self.engine.begin() as db:
            job = self._locked(db, job_id)
            if job['stage'] == 'cancelled' and fields.get('stage') != 'queued':
                return job
            job.update(fields)
            db.execute(jobs.update().where(jobs.c.id == job_id).values(state=job['stage'], body=json.dumps(job)))
        return job

    def revise(self, job_id, expected, change):
        with self.engine.begin() as db:
            job = self._locked(db, job_id)
            if job.get('revision', 0) != expected:
                raise Conflict('结果已在另一页面更新，请重新加载。')
            db.execute(insert(revisions).values(job_id=job_id, revision=expected, body=json.dumps(job)).on_conflict_do_nothing())
            draft = copy.deepcopy(job)
            draft.pop('ai_review', None)
            draft.pop('undo_cursor', None)
            updated = change(draft)
            updated['revision'] = expected + 1
            db.execute(jobs.update().where(jobs.c.id == job_id).values(state=updated['stage'], body=json.dumps(updated)))
        return updated

    def prior(self, job_id, before):
        with self.engine.connect() as db:
            body = db.execute(select(revisions.c.body).where(revisions.c.job_id == job_id, revisions.c.revision < before)
                              .order_by(revisions.c.revision.desc()).limit(1)).scalar_one_or_none()
        return json.loads(body) if body else None
