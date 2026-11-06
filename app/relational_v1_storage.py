"""Lossless adapters between existing HTTP payloads and normalized SQL rows."""
import copy
import hashlib
import json
from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert

from app import relational_schema as s

CUTOVER_LOCK = 718290641
NOTE_SECTIONS = ('notes', 'melody', 'extras', 'arrangement.melody', 'arrangement.extras', 'arrangement.events')
LIST_SECTIONS = {
    **{path: s.transcription_notes for path in NOTE_SECTIONS},
    'overrides': s.transcription_overrides,
    'slides': s.transcription_slides, 'arrangement.slides': s.transcription_slides,
    'accompaniment.chords': s.transcription_chords, 'accompaniment.strums': s.transcription_strums,
}
OBJECT_SECTIONS = {'request': s.transcription_requests,
    'settings': s.transcription_settings, 'arrangement.settings': s.transcription_settings}
MEMBERSHIPS = {'favorites': (s.song_favorites, 'song_id'),
    'likes': (s.post_likes, 'post_id'), 'completed': (s.course_completions, 'course_id'),
    'checkins': (s.daily_checkins, 'checkin_date')}


def insert_rows(db, table, rows):
    # pg8000 executemany sends separate statements. Explicit multi-VALUES avoids
    # one Cloud SQL network round trip per note in a full-song transcription.
    for offset in range(0, len(rows), 200):
        db.execute(table.insert().values(rows[offset:offset + 200]))


def cutover_lock_key(db):
    schema = db.get_execution_options().get('schema_translate_map', {}).get(None)
    return int.from_bytes(hashlib.sha256(schema.encode()).digest()[:7], 'big') if schema else CUTOVER_LOCK


def relational_enabled(db):
    # All new readers/writers participate in an atomic, online cutover. The
    # migrator takes the exclusive counterpart before copying legacy records.
    db.execute(text('SELECT pg_advisory_xact_lock_shared(:key)'), {'key': cutover_lock_key(db)})
    return db.execute(select(s.schema_versions.c.version).where(s.schema_versions.c.version == 1)).first() is not None


def state_table(key):
    if key in MEMBERSHIPS:
        return MEMBERSHIPS[key][0]
    if key == 'practice-favorites':
        return s.arrangement_favorites
    if key.startswith('progress-'):
        return s.practice_progress
    if key.startswith('arrangements-'):
        return s.arrangement_selections
    raise ValueError(f'Unsupported state key: {key}')


def write_state_value(db, uid, key, value):
    """Replace children after locking/updating their CAS parent in this transaction."""
    table = state_table(key)
    db.execute(table.delete().where(table.c.uid == uid, table.c.state_key == key))
    if key.startswith('progress-'):
        db.execute(table.insert().values(uid=uid, state_key=key, practice_key=key[9:],
            elapsed_seconds=value['elapsed'], scroll_top=value['scrollTop'], bpm=value['bpm']))
        return
    rows = []
    for position, item in enumerate(value):
        row = dict(uid=uid, state_key=key, position=position)
        if key in MEMBERSHIPS:
            column = MEMBERSHIPS[key][1]
            row[column] = date.fromisoformat(item) if key == 'checkins' else item
        elif key == 'practice-favorites':
            row['song_id'], row['arrangement_id'] = item.split(':', 1)
        else:
            row['arrangement_id'] = item
        rows.append(row)
    if rows:
        insert_rows(db, table, rows)


def read_state_value(db, uid, key):
    table = state_table(key)
    query = select(table).where(table.c.uid == uid, table.c.state_key == key)
    if key.startswith('progress-'):
        row = db.execute(query).mappings().one()
        return dict(elapsed=row['elapsed_seconds'], scrollTop=row['scroll_top'], bpm=row['bpm'])
    rows = db.execute(query.order_by(table.c.position)).mappings().all()
    if key in MEMBERSHIPS:
        values = [row[MEMBERSHIPS[key][1]] for row in rows]
        return [d.isoformat() for d in values] if key == 'checkins' else values
    if key == 'practice-favorites':
        return [f'{r["song_id"]}:{r["arrangement_id"]}' for r in rows]
    return [r['arrangement_id'] for r in rows]


def put_profile(db, uid, value):
    expected = {'displayName', 'photoURL', 'email', 'providers', 'createdAt', 'updatedAt'}
    if set(value) != expected:
        raise ValueError('Unexpected profile fields; migration aborted without discarding data')
    columns = dict(uid=uid, display_name=value['displayName'], photo_url=value['photoURL'],
        email=value['email'], created_at=datetime.fromisoformat(value['createdAt']),
        updated_at=datetime.fromisoformat(value['updatedAt']))
    db.execute(insert(s.account_profiles).values(**columns).on_conflict_do_update(
        index_elements=[s.account_profiles.c.uid], set_={k: v for k, v in columns.items() if k != 'uid'}))
    db.execute(s.account_providers.delete().where(s.account_providers.c.uid == uid))
    if value['providers']:
        insert_rows(db, s.account_providers, [dict(uid=uid, position=i, provider=p) for i, p in enumerate(value['providers'])])


def get_profile(db, uid):
    row = db.execute(select(s.account_profiles).where(s.account_profiles.c.uid == uid).with_for_update(read=True)).mappings().first()
    if row is None:
        return None
    providers = list(db.execute(select(s.account_providers.c.provider).where(
        s.account_providers.c.uid == uid).order_by(s.account_providers.c.position)).scalars())
    return dict(displayName=row['display_name'], photoURL=row['photo_url'], email=row['email'],
        createdAt=row['created_at'].isoformat(), updatedAt=row['updated_at'].isoformat(), providers=providers)


def split_fields(value, mapping):
    if not isinstance(value, dict):
        raise ValueError('Expected a record object')
    extensions = copy.deepcopy(value)
    columns = {column: extensions.pop(field, None) for field, (column, _) in mapping.items()}
    return dict(columns, present_fields=[k for k in mapping if k in value], extensions=extensions)


def join_fields(row, mapping):
    value = copy.deepcopy(row['extensions'])
    value.update({field: row[column] for field, (column, _) in mapping.items() if field in row['present_fields']})
    return value


def take_section(document, path):
    parent = document
    parts = path.split('.')
    for part in parts[:-1]:
        parent = parent.get(part) if isinstance(parent, dict) else None
    if isinstance(parent, dict) and parts[-1] in parent:
        return True, parent.pop(parts[-1])
    return False, None


def set_section(document, path, value):
    parent = document
    parts = path.split('.')
    for part in parts[:-1]:
        parent = parent.setdefault(part, {})
    parent[parts[-1]] = value


def put_snapshot(db, value, snapshot_id=None):
    snapshot_id = snapshot_id or uuid4().hex
    root = split_fields(value, s.SNAPSHOT_FIELDS)
    sections, children = [], {}
    for path, table in {**LIST_SECTIONS, **OBJECT_SECTIONS}.items():
        found, content = take_section(root['extensions'], path)
        # Explicit null is metadata; it must not become an empty list/object.
        if not found:
            continue
        if content is None:
            set_section(root['extensions'], path, None)
            continue
        sections.append(path)
        items = content if path in LIST_SECTIONS else [content]
        if not isinstance(items, list):
            raise ValueError(f'Expected list at {path}')
        rows = children.setdefault(table, [])
        for position, item in enumerate(items):
            row = dict(snapshot_id=snapshot_id, **split_fields(item, table.info['field_mapping']))
            if 'section' in table.c:
                row['section'] = path
            if 'position' in table.c:
                row['position'] = position
            rows.append(row)
    # Root upsert takes a row lock before changing children; readers hold FOR SHARE.
    root.update(snapshot_id=snapshot_id, sections=sections)
    db.execute(insert(s.snapshots).values(**root).on_conflict_do_update(
        index_elements=[s.snapshots.c.snapshot_id], set_={k: v for k, v in root.items() if k != 'snapshot_id'}))
    for table in set(LIST_SECTIONS.values()) | set(OBJECT_SECTIONS.values()):
        db.execute(table.delete().where(table.c.snapshot_id == snapshot_id))
        if children.get(table):
            insert_rows(db, table, children[table])
    return snapshot_id


def get_snapshot(db, snapshot_id):
    root = db.execute(select(s.snapshots).where(s.snapshots.c.snapshot_id == snapshot_id)
        .with_for_update(read=True)).mappings().one()
    document = join_fields(root, s.SNAPSHOT_FIELDS)
    # Fetch each child table once, even when multiple note sections are present.
    rows_by_table = {}
    for path in root['sections']:
        table = (LIST_SECTIONS | OBJECT_SECTIONS)[path]
        if table not in rows_by_table:
            query = select(table).where(table.c.snapshot_id == snapshot_id)
            if 'position' in table.c:
                query = query.order_by(table.c.position)
            rows_by_table[table] = db.execute(query).mappings().all()
        rows = [r for r in rows_by_table[table] if 'section' not in table.c or r['section'] == path]
        values = [join_fields(row, table.info['field_mapping']) for row in rows]
        set_section(document, path, values if path in LIST_SECTIONS else values[0])
    return document


def import_legacy_row(db, name, row):
    """Import one legacy row into new tables. Caller owns locking/validation."""
    value = json.loads(row['body'])
    if name == 'profiles':
        put_profile(db, row['uid'], value)
    elif name == 'states':
        db.execute(s.state_versions.insert().values(uid=row['uid'], key=row['key'], version=row['version']))
        write_state_value(db, row['uid'], row['key'], value)
    else:
        snapshot_id = put_snapshot(db, value)
        if name == 'jobs':
            db.execute(s.transcription_jobs.insert().values(id=row['id'], stage=row['state'], created=row['created'], snapshot_id=snapshot_id))
        elif name == 'revisions':
            db.execute(s.transcription_revisions.insert().values(job_id=row['job_id'], revision=row['revision'], snapshot_id=snapshot_id))
        elif name == 'runtime_records':
            db.execute(s.transcription_records.insert().values(job_id=row['job_id'], kind=row['kind'], snapshot_id=snapshot_id))
        else:
            raise ValueError(name)


def get_imported_row(db, name, row):
    if name == 'profiles':
        return get_profile(db, row['uid'])
    if name == 'states':
        current = db.execute(select(s.state_versions.c.version).where(
            s.state_versions.c.uid == row['uid'], s.state_versions.c.key == row['key'])).scalar_one_or_none()
        if current is None:
            return None
        if current != row['version']:
            raise RuntimeError('Destination mismatch: state version')
        return read_state_value(db, row['uid'], row['key'])
    table = {'jobs': s.transcription_jobs, 'revisions': s.transcription_revisions,
             'runtime_records': s.transcription_records}[name]
    conditions = [table.c[c.name] == row[c.name] for c in table.primary_key]
    snapshot_id = db.execute(select(table.c.snapshot_id).where(*conditions)).scalar_one_or_none()
    return get_snapshot(db, snapshot_id) if snapshot_id else None
