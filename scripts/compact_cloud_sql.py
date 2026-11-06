"""Consolidate v1's 22 active tables into ten; preserve old tables in a private schema."""
import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from sqlalchemy import CheckConstraint, func, inspect, select, text
from sqlalchemy.schema import CreateColumn

from app.sql_database import metadata, make_engine, jobs, revisions, states, profiles, runtime_records
from app import relational_schema as s
from app import relational_v1_storage as old
from app.relational_storage import (cutover_lock_key, get_profile, read_states,
    insert_rows, put_compact_snapshot, get_snapshot, write_state_value)
from scripts.normalize_cloud_sql import qualified

LEGACY = [jobs, revisions, states, profiles, runtime_records]


def source_schema(db):
    return db.get_execution_options().get('schema_translate_map', {}).get(None, 'public')


def archive_schema(db):
    schema = source_schema(db)
    return 'storage_archive' if schema == 'public' else schema + '_archive'


def prepare(engine, roles=()):
    with engine.begin() as db:
        metadata.create_all(db, tables=s.CURRENT_TABLES)
        inspector = inspect(db)
        for table in (s.account_profiles, s.state_versions, s.snapshots):
            existing = {c['name'] for c in inspector.get_columns(table.name, schema=source_schema(db))}
            for column in table.c:
                if column.name not in existing:
                    definition = str(CreateColumn(column).compile(dialect=db.dialect))
                    db.execute(text(f'ALTER TABLE {qualified(db, table.name)} ADD COLUMN {definition}'))
            checks = {c['name'] for c in inspector.get_check_constraints(table.name, schema=source_schema(db))}
            for constraint in table.constraints:
                if isinstance(constraint, CheckConstraint) and constraint.name and constraint.name not in checks:
                    name = db.dialect.identifier_preparer.quote_identifier(constraint.name)
                    db.execute(text(f'ALTER TABLE {qualified(db, table.name)} ADD CONSTRAINT {name} CHECK ({constraint.sqltext})'))
        quote = db.dialect.identifier_preparer.quote_identifier
        for role in roles:
            for table in s.CURRENT_TABLES:
                access = 'SELECT' if table is s.schema_versions else 'SELECT, INSERT, UPDATE, DELETE'
                db.execute(text(f'GRANT {access} ON TABLE {qualified(db, table.name)} TO {quote(role)}'))


def source_values(raw):
    """Reconstruct all old HTTP records in memory; no per-snapshot SQL queries."""
    provider_rows = raw[s.account_providers.name]
    account_profiles = {}
    for row in raw[s.account_profiles.name]:
        providers = sorted([p for p in provider_rows if p['uid'] == row['uid']], key=lambda p: p['position'])
        account_profiles[row['uid']] = dict(displayName=row['display_name'], photoURL=row['photo_url'],
            email=row['email'], createdAt=row['created_at'].isoformat(), updatedAt=row['updated_at'].isoformat(),
            providers=[p['provider'] for p in providers])
    account_states = {}
    for row in raw[s.state_versions.name]:
        uid, key = row['uid'], row['key']
        table = old.state_table(key)
        children = sorted([r for r in raw[table.name] if r['uid'] == uid and r['state_key'] == key], key=lambda r: r.get('position', 0))
        if key.startswith('progress-'):
            child, = children
            value = dict(elapsed=child['elapsed_seconds'], scrollTop=child['scroll_top'], bpm=child['bpm'])
        elif key in old.MEMBERSHIPS:
            value = [r[old.MEMBERSHIPS[key][1]] for r in children]
            if key == 'checkins':
                value = [d.isoformat() for d in value]
        elif key == 'practice-favorites':
            value = [f'{r["song_id"]}:{r["arrangement_id"]}' for r in children]
        else:
            value = [r['arrangement_id'] for r in children]
        account_states.setdefault(uid, {})[key] = dict(value=value, version=row['version'])
    snapshots = {}
    for root in raw[s.snapshots.name]:
        value = old.join_fields(root, s.SNAPSHOT_FIELDS)
        for path in root['sections']:
            table = (old.LIST_SECTIONS | old.OBJECT_SECTIONS)[path]
            children = sorted([r for r in raw[table.name] if r['snapshot_id'] == root['snapshot_id']
                and ('section' not in table.c or r['section'] == path)], key=lambda r: r.get('position', 0))
            values = [old.join_fields(r, table.info['field_mapping']) for r in children]
            old.set_section(value, path, values if path in old.LIST_SECTIONS else values[0])
        snapshots[root['snapshot_id']] = value
    return account_profiles, account_states, snapshots


def archive_retired(db, roles):
    quote = db.dialect.identifier_preparer.quote_identifier
    archive = quote(archive_schema(db))
    db.execute(text(f'CREATE SCHEMA {archive}'))
    db.execute(text(f'''CREATE FUNCTION {archive}.reject_writes() RETURNS trigger LANGUAGE plpgsql AS $guard$
        BEGIN RAISE EXCEPTION 'Read-only migration archive' USING ERRCODE='55000'; END $guard$'''))
    inspector = inspect(db)
    for table in s.RETIRED_TABLES + LEGACY:
        name = qualified(db, table.name)
        # Archived children must not be changed by ON DELETE CASCADE from live rows.
        for fk in inspector.get_foreign_keys(table.name, schema=source_schema(db)):
            db.execute(text(f'ALTER TABLE {name} DROP CONSTRAINT {quote(fk["name"])}'))
        db.execute(text(f'CREATE OR REPLACE TRIGGER archive_read_only BEFORE INSERT OR UPDATE OR DELETE '
            f'ON {name} FOR EACH ROW EXECUTE FUNCTION {archive}.reject_writes()'))
        for role in roles:
            db.execute(text(f'REVOKE ALL ON TABLE {name} FROM {quote(role)}'))
        db.execute(text(f'ALTER TABLE {name} SET SCHEMA {archive}'))
    db.execute(text(f"COMMENT ON SCHEMA {archive} IS 'Private, read-only pre-consolidation archives; not active application tables.'"))


def migrate(engine, backup, roles=()):
    with engine.begin() as db:
        db.execute(text("SET LOCAL lock_timeout = '30s'"))
        db.execute(text('SELECT pg_advisory_xact_lock(:key)'), {'key': cutover_lock_key(db)})
        versions = set(db.execute(select(s.schema_versions.c.version)).scalars())
        if 2 in versions:
            return {'already_applied': True}
        if 1 not in versions:
            raise ValueError('Apply relational v1 before consolidation')
        names = ', '.join(qualified(db, t.name) for t in s.RELATIONAL_TABLES + LEGACY)
        db.execute(text(f'LOCK TABLE {names} IN SHARE ROW EXCLUSIVE MODE'))
        raw = {t.name: [dict(r) for r in db.execute(select(t)).mappings()] for t in s.RELATIONAL_TABLES + LEGACY}
        account_profiles, account_states, snapshots = source_values(raw)
        backup.mkdir(parents=True, exist_ok=False, mode=0o700)
        path = backup / 'relational-v1.json'
        with path.open('x') as output:
            os.chmod(path, 0o600)
            json.dump(raw, output, ensure_ascii=False, default=lambda value: value.isoformat())
            output.flush()
            os.fsync(output.fileno())
        if db.execute(select(s.account_items.c.uid).limit(1)).first() or db.execute(select(s.transcription_events.c.snapshot_id).limit(1)).first():
            raise ValueError('Non-empty consolidation destination; refusing to overwrite')
        # This connection alone uses v2 while the global cutover lock is held.
        db.info['storage_version'] = (db.get_transaction(), 2)
        for uid, value in account_profiles.items():
            db.execute(s.account_profiles.update().where(s.account_profiles.c.uid == uid).values(providers=value['providers']))
        for uid, records in account_states.items():
            for key, record in records.items():
                write_state_value(db, uid, key, record['value'])
        for snapshot, value in snapshots.items():
            put_compact_snapshot(db, value, snapshot, preserve_notes=True)
        for uid, value in account_profiles.items():
            if get_profile(db, uid) != value:
                raise ValueError('Profile round-trip mismatch')
        for uid, records in account_states.items():
            if read_states(db, uid) != records:
                raise ValueError('State round-trip mismatch')
        for snapshot, value in snapshots.items():
            if get_snapshot(db, snapshot) != value:
                raise ValueError('Snapshot round-trip mismatch')
        archive_retired(db, roles)
        db.execute(s.schema_versions.insert().values(version=2, applied_at=datetime.now(timezone.utc).isoformat()))
        return {'active_tables': len(s.CURRENT_TABLES), 'archived_tables': len(s.RETIRED_TABLES) + len(LEGACY),
            'profiles': len(account_profiles), 'state_groups': sum(map(len, account_states.values())), 'snapshots': len(snapshots)}


def rehearse(engine, backup):
    with engine.begin() as db:
        db.execute(text('SELECT pg_advisory_xact_lock_shared(:key)'), {'key': cutover_lock_key(db)})
        if db.execute(select(s.schema_versions.c.version).where(s.schema_versions.c.version == 2)).first():
            return {'already_applied': True}
        db.execute(text("SET LOCAL lock_timeout = '30s'"))
        names = ', '.join(qualified(db, t.name) for t in s.RELATIONAL_TABLES + LEGACY)
        db.execute(text(f'LOCK TABLE {names} IN SHARE MODE'))
        raw = {t.name: [dict(r) for r in db.execute(select(t)).mappings()] for t in s.RELATIONAL_TABLES + LEGACY}
    schema = 'compact_rehearsal_' + uuid4().hex
    translated = engine.execution_options(schema_translate_map={None: schema})
    try:
        with engine.begin() as db:
            db.execute(text(f'CREATE SCHEMA "{schema}"'))
        metadata.create_all(translated)
        with translated.begin() as db:
            for table in metadata.sorted_tables:
                if table.name in raw:
                    insert_rows(db, table, raw[table.name])
        return migrate(translated, backup)
    finally:
        with engine.begin() as db:
            db.execute(text(f'DROP SCHEMA IF EXISTS "{schema}_archive" CASCADE'))
            db.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))


def verify(engine):
    with engine.connect() as db:
        tables = inspect(db).get_table_names(schema=source_schema(db))
        counts = {table.name: db.execute(select(func.count()).select_from(table)).scalar_one() for table in s.CURRENT_TABLES}
        return {'version': db.execute(select(s.schema_versions.c.version).order_by(s.schema_versions.c.version.desc()).limit(1)).scalar_one(),
            'active_tables': tables, 'rows': counts,
            'archived_tables': inspect(db).get_table_names(schema=archive_schema(db))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--prepare', action='store_true')
    action.add_argument('--apply', action='store_true')
    action.add_argument('--rehearse', action='store_true')
    action.add_argument('--verify', action='store_true')
    parser.add_argument('--backup', type=Path)
    parser.add_argument('--grant-role', action='append', default=[])
    args = parser.parse_args()
    if (args.apply or args.rehearse) and not args.backup:
        parser.error('--apply/--rehearse requires --backup DIR')
    engine = make_engine()
    try:
        if args.prepare:
            prepare(engine, args.grant_role)
            print('Prepared compact schema and grants')
        elif args.rehearse:
            print(json.dumps(rehearse(engine, args.backup)))
        elif args.verify:
            print(json.dumps(verify(engine)))
        else:
            print(json.dumps(migrate(engine, args.backup, args.grant_role)))
    finally:
        engine.dispose()
        if getattr(engine, 'cloud_sql_connector', None):
            engine.cloud_sql_connector.close()


if __name__ == '__main__':
    main()
