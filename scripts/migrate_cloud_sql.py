"""Export first, then import/verify without overwriting any destination records.

Run as python -m scripts.migrate_cloud_sql --help from the repository root.
Credentials use ADC; source files and Firestore documents are never deleted.
"""
import argparse
import json
import sqlite3
import shutil
import tempfile
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from app.sql_database import jobs, revisions, states, profiles, runtime_records, metadata, make_engine
from app.relational_storage import relational_enabled, import_legacy_row, get_imported_row


def export(folder, runtime):
    from google.cloud import firestore
    folder.mkdir(parents=True, exist_ok=False)
    client = firestore.Client(project='puyadao-75dd0')
    data = {'profiles': [], 'states': [], 'jobs': [], 'revisions': [], 'runtime_records': [], 'firestore_source': []}
    for doc in client.collection('users').stream():
        data['firestore_source'].append({'path': doc.reference.path, 'data': doc.to_dict()})
        data['profiles'].append({'uid': doc.id, 'body': json.dumps(doc.to_dict(), default=lambda x: x.isoformat(), ensure_ascii=False)})
    # list_documents includes missing visitor parents with existing state children.
    for visitor in client.collection('visitors').list_documents():
        for doc in visitor.collection('state').stream():
            data['firestore_source'].append({'path': doc.reference.path, 'data': doc.to_dict()})
            data['states'].append({'uid': visitor.id, 'key': doc.id,
                                   'body': json.dumps(doc.to_dict()['value'], ensure_ascii=False), 'version': 1})
    source = runtime / 'jobs.sqlite3'
    if source.exists():
        # SMB volumes may not implement SQLite's locking/shared-memory protocol.
        # Copy a quiescent DB + WAL to a local filesystem, then use SQLite backup.
        files = [p for p in (source, Path(str(source) + '-wal')) if p.exists()]
        before = [(p.stat().st_size, p.stat().st_mtime_ns) for p in files]
        with tempfile.TemporaryDirectory(prefix='puyadao-sqlite-') as temporary:
            local = Path(temporary)
            for path in files:
                shutil.copy2(path, local / path.name)
            if before != [(p.stat().st_size, p.stat().st_mtime_ns) for p in files]:
                raise RuntimeError('SQLite changed during export; stop the source writer and retry')
            with sqlite3.connect(local / source.name) as db, sqlite3.connect(local / 'backup.sqlite3') as backup:
                db.backup(backup)
                if backup.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
                    raise RuntimeError('SQLite integrity check failed')
                backup.row_factory = sqlite3.Row
                for table in ('jobs', 'revisions'):
                    data[table] = [dict(row) for row in backup.execute(f'SELECT * FROM {table}')]
            shutil.copy2(local / 'backup.sqlite3', folder / 'jobs.sqlite3')
    for kind in ('result', 'ai-fingerstyle-review'):
        for path in sorted(runtime.glob(f'*/{kind}.json')):
            body = path.read_text(encoding='utf-8')
            json.loads(body)  # Abort on a damaged source instead of silently dropping it.
            data['runtime_records'].append({'job_id': path.parent.name, 'kind': kind, 'body': body})
    snapshot = folder / 'snapshot.json'
    snapshot.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=lambda x: x.isoformat()))
    snapshot.chmod(0o600)
    print('Exported:', {name: len(rows) for name, rows in data.items()})
    return snapshot


def transfer(snapshot, apply=False, baseline=None, tables=None, engine=None):
    data = json.loads(snapshot.read_text())
    previous = json.loads(baseline.read_text()) if baseline else {}
    owns_engine = engine is None
    engine = make_engine() if owns_engine else engine
    try:
        if apply:
            metadata.create_all(engine)
        with engine.begin() as db:
            normalized = relational_enabled(db)
            for name, table in (('jobs', jobs), ('revisions', revisions), ('states', states), ('profiles', profiles), ('runtime_records', runtime_records)):
                if tables and name not in tables:
                    continue
                for row in data.get(name, []):
                    if normalized:
                        # Old snapshot files remain importable, but never write to
                        # the frozen JSON archives after relational cutover.
                        if name == 'profiles':
                            db.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:uid, 0))'), {'uid': row['uid']})
                        current = get_imported_row(db, name, row)
                        if current is None and apply:
                            import_legacy_row(db, name, row)
                            current = get_imported_row(db, name, row)
                        if current != json.loads(row['body']):
                            raise RuntimeError(f'Destination mismatch: {name}; import rolled back')
                        continue
                    if apply:
                        db.execute(insert(table).values(**row).on_conflict_do_nothing())
                    key = [table.c[col.name] == row[col.name] for col in table.primary_key]
                    current = db.execute(select(table).where(*key)).mappings().one_or_none()
                    # A preflight import may be refreshed only if SQL still exactly
                    # matches that prior snapshot. Never overwrite post-cutover edits.
                    if apply and baseline and current is not None:
                        old = next((r for r in previous.get(name, []) if all(r[c.name] == row[c.name] for c in table.primary_key)), None)
                        if old and all(json.loads(current[k]) == json.loads(v) if k == 'body' else current[k] == v for k, v in old.items()):
                            db.execute(table.update().where(*key).values(**row))
                            current = db.execute(select(table).where(*key)).mappings().one()
                    if current is None or any(
                        json.loads(current[k]) != json.loads(v) if k == 'body' else current[k] != v
                        for k, v in row.items()):
                        raise RuntimeError(f'Destination mismatch: {name} {tuple(row[c.name] for c in table.primary_key)}; import rolled back')
                print(f'Verified {name}: {len(data.get(name, []))}')
    finally:
        if owns_engine:
            engine.dispose()
            connector = getattr(engine, 'cloud_sql_connector', None)
            if connector:
                connector.close()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--export', type=Path, help='Create a new backup directory; no SQL writes')
    parser.add_argument('--snapshot', type=Path, help='Existing snapshot to import or verify')
    parser.add_argument('--apply', action='store_true', help='Import missing rows, then verify in the same transaction')
    parser.add_argument('--baseline', type=Path, help='Refresh a preflight import only where SQL still matches this earlier snapshot')
    parser.add_argument('--tables', nargs='+', choices=['jobs', 'revisions', 'states', 'profiles', 'runtime_records'], help='Import/verify only these tables, for an incremental migration')
    parser.add_argument('--runtime', type=Path, default=Path('.runtime'))
    args = parser.parse_args()
    if bool(args.export) == bool(args.snapshot) or (args.export and args.apply):
        parser.error('Choose --export DIR or --snapshot FILE [--apply]')
    if args.export:
        export(args.export, args.runtime)
    else:
        transfer(args.snapshot, args.apply, args.baseline, args.tables)


if __name__ == '__main__':
    main()
