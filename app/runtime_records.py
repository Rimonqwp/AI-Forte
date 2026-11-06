"""Legacy result/review metadata uses SQL when configured; media stays in files."""
import json
import os
from pathlib import Path
from uuid import uuid4


class RuntimeRecords:
    def __init__(self, root, engine=None):
        self.root, self.engine = Path(root), engine

    def read(self, job_id, kind):
        if self.engine is not None:
            from sqlalchemy import select
            from app.sql_database import runtime_records as table
            from app.relational_schema import transcription_records
            from app.relational_storage import relational_enabled, get_snapshot
            with self.engine.connect() as db:
                if relational_enabled(db):
                    snapshot = db.execute(select(transcription_records.c.snapshot_id).where(
                        transcription_records.c.job_id == job_id, transcription_records.c.kind == kind)
                        .with_for_update(read=True)).scalar_one_or_none()
                    return get_snapshot(db, snapshot) if snapshot else None
                body = db.execute(select(table.c.body).where(table.c.job_id == job_id, table.c.kind == kind)).scalar_one_or_none()
            return json.loads(body) if body is not None else None
        try:
            return json.loads((self.root / job_id / f'{kind}.json').read_text(encoding='utf-8'))
        except (OSError, ValueError):
            return None

    def write(self, job_id, kind, value):
        if self.engine is not None:
            from sqlalchemy import select, text
            from sqlalchemy.dialects.postgresql import insert
            from app.sql_database import runtime_records as table
            from app.relational_schema import transcription_records
            from app.relational_storage import relational_enabled, put_snapshot
            body = json.dumps(value, ensure_ascii=False)
            with self.engine.begin() as db:
                if relational_enabled(db):
                    db.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:key, 1))'), {'key': f'{job_id}/{kind}'})
                    current = db.execute(select(transcription_records.c.snapshot_id).where(
                        transcription_records.c.job_id == job_id, transcription_records.c.kind == kind)).scalar_one_or_none()
                    snapshot = put_snapshot(db, value, current)
                    if current is None:
                        db.execute(transcription_records.insert().values(job_id=job_id, kind=kind, snapshot_id=snapshot))
                    return
                db.execute(insert(table).values(job_id=job_id, kind=kind, body=body).on_conflict_do_update(
                    index_elements=[table.c.job_id, table.c.kind], set_={'body': body}))
        else:
            target = self.root / job_id / f'{kind}.json'
            temporary = target.with_name(f'.{kind}-{uuid4().hex}.tmp')
            try:
                temporary.write_text(json.dumps(value, ensure_ascii=False), encoding='utf-8')
                os.replace(temporary, target)
            finally:
                temporary.unlink(missing_ok=True)

    def delete(self, job_id, kind):
        if self.engine is not None:
            from sqlalchemy import text
            from app.sql_database import runtime_records as table
            from app.relational_schema import transcription_records, snapshots
            from app.relational_storage import relational_enabled
            with self.engine.begin() as db:
                if relational_enabled(db):
                    db.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:key, 1))'), {'key': f'{job_id}/{kind}'})
                    snapshot = db.execute(transcription_records.delete().where(
                        transcription_records.c.job_id == job_id, transcription_records.c.kind == kind)
                        .returning(transcription_records.c.snapshot_id)).scalar_one_or_none()
                    if snapshot:
                        db.execute(snapshots.delete().where(snapshots.c.snapshot_id == snapshot))
                    return
                db.execute(table.delete().where(table.c.job_id == job_id, table.c.kind == kind))
        else:
            (self.root / job_id / f'{kind}.json').unlink(missing_ok=True)
