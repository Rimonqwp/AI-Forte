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
            with self.engine.connect() as db:
                body = db.execute(select(table.c.body).where(table.c.job_id == job_id, table.c.kind == kind)).scalar_one_or_none()
            return json.loads(body) if body is not None else None
        try:
            return json.loads((self.root / job_id / f'{kind}.json').read_text(encoding='utf-8'))
        except (OSError, ValueError):
            return None

    def write(self, job_id, kind, value):
        if self.engine is not None:
            from sqlalchemy.dialects.postgresql import insert
            from app.sql_database import runtime_records as table
            body = json.dumps(value, ensure_ascii=False)
            with self.engine.begin() as db:
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
            from app.sql_database import runtime_records as table
            with self.engine.begin() as db:
                db.execute(table.delete().where(table.c.job_id == job_id, table.c.kind == kind))
        else:
            (self.root / job_id / f'{kind}.json').unlink(missing_ok=True)
