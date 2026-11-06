"""Prepare, verify and atomically migrate the live JSON archives to relational tables.

Run --prepare (DDL/grants), deploy the compatible API, then --apply --backup DIR.
The default is read-only preflight. No source rows/tables are deleted.
"""
import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import func, select, text

from app.sql_database import jobs, revisions, states, profiles, runtime_records, metadata, make_engine
from app import relational_schema as s
from app.relational_storage import cutover_lock_key, import_legacy_row, get_imported_row

LEGACY_TABLES = [('profiles', profiles), ('states', states), ('jobs', jobs),
                 ('revisions', revisions), ('runtime_records', runtime_records)]


def qualified(db, name):
    schema = db.get_execution_options().get('schema_translate_map', {}).get(None, 'public')
    quote = db.dialect.identifier_preparer.quote_identifier
    return f'{quote(schema)}.{quote(name)}'


def export_rows(db):
    return {name: [dict(row) for row in db.execute(select(table)).mappings()] for name, table in LEGACY_TABLES}


def validate_source(data):
    from sql_service.main import validate_state
    for row in data['states']:
        validate_state(row['key'], json.loads(row['body']))
    job_ids = {row['id'] for row in data['jobs']}
    if any(row['job_id'] not in job_ids for row in data['revisions']):
        raise ValueError('Orphan revision: no source data has been changed')
    for row in data['jobs']:
        if json.loads(row['body'])['stage'] != row['state']:
            raise ValueError('Job stage mismatch')


def verify_import(db, data):
    for name, rows in data.items():
        for row in rows:
            if get_imported_row(db, name, row) != json.loads(row['body']):
                raise ValueError(f'Round-trip mismatch in {name}; transaction rolled back')
    return {name: len(rows) for name, rows in data.items()}


def prepare(engine, roles=()):
    # Create only the new tables; leave all existing tables/constraints untouched.
    with engine.begin() as db:
        metadata.create_all(db, tables=s.RELATIONAL_TABLES)
        for _, table in LEGACY_TABLES:
            db.execute(text(f"COMMENT ON TABLE {qualified(db, table.name)} IS "
                "'Legacy JSON archive. Active business data uses relational tables after storage_schema_versions v1.'"))
        quote = db.dialect.identifier_preparer.quote_identifier
        for role in roles:
            for table in s.RELATIONAL_TABLES:
                privileges = 'SELECT' if table is s.schema_versions else 'SELECT, INSERT, UPDATE, DELETE'
                db.execute(text(f'GRANT {privileges} ON TABLE {qualified(db, table.name)} TO {quote(role)}'))


def freeze_legacy(db):
    # Old Cloud Run revisions / old local processes fail explicitly instead of
    # silently writing to an archive after cutover. New code uses the marker.
    function = qualified(db, 'reject_legacy_json_write')
    marker = qualified(db, s.schema_versions.name)
    db.execute(text(f'''CREATE OR REPLACE FUNCTION {function}() RETURNS trigger
        LANGUAGE plpgsql AS $guard$
        BEGIN
            IF EXISTS (SELECT 1 FROM {marker} WHERE version = 1) THEN
                RAISE EXCEPTION 'Storage migrated to relational tables; reload the data service'
                    USING ERRCODE = '55000';
            END IF;
            RETURN NEW;
        END $guard$'''))
    for _, table in LEGACY_TABLES:
        name = qualified(db, table.name)
        db.execute(text(f'CREATE OR REPLACE TRIGGER archive_read_only BEFORE INSERT OR UPDATE OR DELETE '
            f'ON {name} FOR EACH ROW EXECUTE FUNCTION {function}()'))


def migrate(engine, backup=None, apply=False):
    with engine.begin() as db:
        db.execute(text("SET LOCAL lock_timeout = '30s'"))
        db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': cutover_lock_key(db)})
        if db.execute(select(s.schema_versions.c.version).where(s.schema_versions.c.version == 1)).first():
            return {'already_applied': True}
        # Block legacy writers too; new clients wait on the advisory lock above.
        names = ', '.join(qualified(db, table.name) for _, table in LEGACY_TABLES)
        db.execute(text(f'LOCK TABLE {names} IN SHARE ROW EXCLUSIVE MODE'))
        data = export_rows(db)
        validate_source(data)
        if not apply:
            return {'preflight': {name: len(rows) for name, rows in data.items()}}
        if backup is None:
            raise ValueError('A new private backup directory is required')
        # Refuse to overwrite a previous backup; write while source locks are held.
        backup.mkdir(parents=True, exist_ok=False, mode=0o700)
        path = backup / 'legacy-snapshot.json'
        with path.open('x', encoding='utf-8') as output:
            os.chmod(path, 0o600)
            json.dump(data, output, ensure_ascii=False, indent=2)
            output.flush()
            os.fsync(output.fileno())
        for table in s.RELATIONAL_TABLES:
            if db.execute(select(func.count()).select_from(table)).scalar_one():
                raise ValueError(f'Non-empty destination {table.name}; refusing to overwrite')
        for name, rows in data.items():
            for row in rows:
                import_legacy_row(db, name, row)
        counts = verify_import(db, data)
        freeze_legacy(db)
        db.execute(s.schema_versions.insert().values(version=1, applied_at=datetime.now(timezone.utc).isoformat()))
        return {'applied': counts}


def verify_archive(engine):
    with engine.begin() as db:
        # Live account state may have changed since migration. Only immutable
        # archives/jobs that haven't been edited can still equal the old source.
        counts = {t.name: db.execute(select(func.count()).select_from(t)).scalar_one() for t in s.RELATIONAL_TABLES}
        active = db.execute(select(s.schema_versions.c.version).where(s.schema_versions.c.version == 1)).first() is not None
        return {'active': active, 'tables': counts}


def rehearse(engine, backup):
    """Run the complete migration on an isolated copy of actual live source rows."""
    schema = 'relational_rehearsal_' + uuid4().hex
    translated = engine.execution_options(schema_translate_map={None: schema})
    with engine.begin() as db:
        names = ', '.join(qualified(db, table.name) for _, table in LEGACY_TABLES)
        db.execute(text("SET LOCAL lock_timeout = '30s'"))
        db.execute(text(f'LOCK TABLE {names} IN SHARE MODE'))
        data = export_rows(db)
    try:
        with engine.begin() as db:
            db.execute(text(f'CREATE SCHEMA "{schema}"'))
        metadata.create_all(translated)
        with translated.begin() as db:
            for name, table in LEGACY_TABLES:
                if data[name]:
                    db.execute(table.insert().values(data[name]))
        return migrate(translated, backup, apply=True)
    finally:
        with engine.begin() as db:
            db.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group()
    action.add_argument('--prepare', action='store_true')
    action.add_argument('--apply', action='store_true')
    action.add_argument('--verify', action='store_true')
    action.add_argument('--rehearse', action='store_true')
    parser.add_argument('--backup', type=Path)
    parser.add_argument('--grant-role', action='append', default=[])
    args = parser.parse_args()
    if (args.apply or args.rehearse) and not args.backup:
        parser.error('--apply/--rehearse requires --backup DIR')
    engine = make_engine()
    try:
        if args.prepare:
            prepare(engine, args.grant_role)
            print('Prepared relational tables and grants')
        elif args.rehearse:
            print(json.dumps(rehearse(engine, args.backup)))
        else:
            print(json.dumps(verify_archive(engine) if args.verify else migrate(engine, args.backup, args.apply)))
    finally:
        engine.dispose()
        connector = getattr(engine, 'cloud_sql_connector', None)
        if connector:
            connector.close()


if __name__ == '__main__':
    main()
