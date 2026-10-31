"""Durable jobs and compare-and-swap revisions. SQLite is local only."""
import copy
import json
import sqlite3
import time
from pathlib import Path

TERMINAL = ('done', 'partial', 'error', 'cancelled')


class Conflict(ValueError):
    pass


class SongStore:
    def __init__(self, root):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)
        self.path = self.root/'jobs.sqlite3'
        with self.connect() as db:
            db.executescript('''CREATE TABLE IF NOT EXISTS jobs
                (id TEXT PRIMARY KEY, state TEXT NOT NULL, created REAL NOT NULL, body TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS revisions
                (job_id TEXT NOT NULL, revision INTEGER NOT NULL, body TEXT NOT NULL,
                 PRIMARY KEY(job_id,revision));''')

    def connect(self):
        db = sqlite3.connect(self.path, timeout=30)
        db.execute('PRAGMA journal_mode=WAL')
        return db

    def get(self, job_id):
        with self.connect() as db:
            row = db.execute('SELECT body FROM jobs WHERE id=?', (job_id,)).fetchone()
        return json.loads(row[0]) if row else None

    def list(self):
        with self.connect() as db:
            return [json.loads(r[0]) for r in db.execute('SELECT body FROM jobs ORDER BY created')]

    def create(self, job):
        with self.connect() as db:
            db.execute('INSERT INTO jobs VALUES(?,?,?,?)',
                       (job['id'], job['stage'], time.time(), json.dumps(job)))

    def update(self, job_id, **fields):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT body FROM jobs WHERE id=?', (job_id,)).fetchone()
            if not row: raise KeyError(job_id)
            job = json.loads(row[0])
            # Cancellation is terminal even when a concurrent poll completes.
            if job['stage'] == 'cancelled' and fields.get('stage') != 'queued': return job
            job.update(fields)
            db.execute('UPDATE jobs SET state=?,body=? WHERE id=?',
                       (job['stage'], json.dumps(job), job_id))
        return job

    def revise(self, job_id, expected, change):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            job = json.loads(db.execute('SELECT body FROM jobs WHERE id=?', (job_id,)).fetchone()[0])
            if job.get('revision', 0) != expected: raise Conflict('结果已在另一页面更新，请重新加载。')
            db.execute('INSERT OR IGNORE INTO revisions VALUES(?,?,?)', (job_id, expected, json.dumps(job)))
            draft = copy.deepcopy(job)
            draft.pop('ai_review', None)
            draft.pop('undo_cursor', None)
            updated = change(draft)
            updated['revision'] = expected+1
            db.execute('UPDATE jobs SET body=? WHERE id=?', (json.dumps(updated), job_id))
        return updated

    def prior(self, job_id, before):
        with self.connect() as db:
            row = db.execute('SELECT body FROM revisions WHERE job_id=? AND revision<? ORDER BY revision DESC LIMIT 1', (job_id, before)).fetchone()
        return json.loads(row[0]) if row else None
