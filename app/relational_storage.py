"""Compact relational storage, with a v1 adapter for an atomic rolling upgrade."""
import json
from datetime import date, datetime
from uuid import uuid4

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert

from app import relational_schema as s
from app import relational_v1_storage as v1

CUTOVER_LOCK = v1.CUTOVER_LOCK
cutover_lock_key = v1.cutover_lock_key
insert_rows = v1.insert_rows
split_fields = v1.split_fields
join_fields = v1.join_fields
take_section = v1.take_section
set_section = v1.set_section
NOTE_SECTIONS = v1.NOTE_SECTIONS
EVENT_SECTIONS = tuple(k for k in v1.LIST_SECTIONS if k not in NOTE_SECTIONS)


def storage_version(db):
    cached = db.info.get('storage_version')
    if cached and db.in_transaction() and cached[0] is db.get_transaction():
        return cached[1]
    # Separate statements are intentional: after waiting for cutover, the marker
    # must be read with a new READ COMMITTED snapshot.
    db.execute(text('SELECT pg_advisory_xact_lock_shared(:key)'), {'key': cutover_lock_key(db)})
    version = db.execute(select(s.schema_versions.c.version).order_by(s.schema_versions.c.version.desc()).limit(1)).scalar_one_or_none() or 0
    db.info['storage_version'] = (db.get_transaction(), version)
    return version


def relational_enabled(db):
    return storage_version(db) > 0


def item_columns(key, item):
    columns = dict(target_id=None, related_id=None, checkin_date=None)
    if key == 'checkins':
        columns['checkin_date'] = date.fromisoformat(item)
    elif key == 'practice-favorites':
        columns['target_id'], columns['related_id'] = item.split(':', 1)
    else:
        columns['target_id'] = item
    return columns


def item_value(key, row):
    if key == 'checkins':
        return row['checkin_date'].isoformat()
    if key == 'practice-favorites':
        return f'{row["target_id"]}:{row["related_id"]}'
    return row['target_id']


def write_state_value(db, uid, key, value):
    if storage_version(db) < 2:
        return v1.write_state_value(db, uid, key, value)
    if key.startswith('progress-'):
        db.execute(s.state_versions.update().where(s.state_versions.c.uid == uid, s.state_versions.c.key == key)
            .values(elapsed_seconds=value['elapsed'], scroll_top=value['scrollTop'], bpm=value['bpm']))
        return
    table = s.account_items
    db.execute(table.delete().where(table.c.uid == uid, table.c.state_key == key))
    insert_rows(db, table, [dict(uid=uid, state_key=key, position=i, **item_columns(key, value)) for i, value in enumerate(value)])


def read_states(db, uid, keys=None):
    """Two data queries for any number of keys, including all progress records."""
    mode = storage_version(db)
    query = select(s.state_versions).where(s.state_versions.c.uid == uid)
    if keys is not None:
        if not keys:
            return {}
        query = query.where(s.state_versions.c.key.in_(keys))
    parents = db.execute(query.order_by(s.state_versions.c.key).with_for_update(read=True)).mappings().all()
    return values_for_rows(db, uid, parents, mode)


def values_for_rows(db, uid, parents, mode=None):
    mode = storage_version(db) if mode is None else mode
    if mode < 2:
        return {r['key']: dict(version=r['version'], value=v1.read_state_value(db, uid, r['key'])) for r in parents}
    result = {}
    for row in parents:
        key = row['key']
        value = dict(elapsed=row['elapsed_seconds'], scrollTop=row['scroll_top'], bpm=row['bpm']) if key.startswith('progress-') else []
        result[key] = dict(value=value, version=row['version'])
    item_keys = [key for key in result if not key.startswith('progress-')]
    if item_keys:
        rows = db.execute(select(s.account_items).where(s.account_items.c.uid == uid,
            s.account_items.c.state_key.in_(item_keys)).order_by(s.account_items.c.state_key, s.account_items.c.position)).mappings()
        for row in rows:
            result[row['state_key']]['value'].append(item_value(row['state_key'], row))
    return result


def read_state_value(db, uid, key):
    return read_states(db, uid, [key])[key]['value']


def patch_state_value(db, uid, key, additions, removals, validate):
    """Caller holds the state CAS row lock. Only changed item rows are written."""
    if storage_version(db) < 2:
        current = v1.read_state_value(db, uid, key)
        value = [x for x in current if x not in removals]
        value.extend(x for x in additions if x not in value)
        validate(key, value)
        v1.write_state_value(db, uid, key, value)
        return
    table = s.account_items
    rows = db.execute(select(table).where(table.c.uid == uid, table.c.state_key == key)
        .order_by(table.c.position)).mappings().all()
    current = [item_value(key, row) for row in rows]
    survivors = [x for x in current if x not in removals]
    added = [x for x in additions if x not in survivors]
    validate(key, survivors + added)
    deleted_positions = [r['position'] for r in rows if item_value(key, r) in removals]
    if deleted_positions:
        db.execute(table.delete().where(table.c.uid == uid, table.c.state_key == key, table.c.position.in_(deleted_positions)))
    offset = max((r['position'] for r in rows), default=-1) + 1
    insert_rows(db, table, [dict(uid=uid, state_key=key, position=offset + i, **item_columns(key, value)) for i, value in enumerate(added)])


def put_profile(db, uid, value):
    if storage_version(db) < 2:
        return v1.put_profile(db, uid, value)
    expected = {'displayName', 'photoURL', 'email', 'providers', 'createdAt', 'updatedAt'}
    if set(value) != expected:
        raise ValueError('Unexpected profile fields')
    columns = dict(uid=uid, display_name=value['displayName'], photo_url=value['photoURL'], email=value['email'],
        providers=value['providers'], created_at=datetime.fromisoformat(value['createdAt']), updated_at=datetime.fromisoformat(value['updatedAt']))
    db.execute(insert(s.account_profiles).values(**columns).on_conflict_do_update(index_elements=[s.account_profiles.c.uid],
        set_={k: v for k, v in columns.items() if k != 'uid'}))


def get_profile(db, uid):
    if storage_version(db) < 2:
        return v1.get_profile(db, uid)
    row = db.execute(select(s.account_profiles).where(s.account_profiles.c.uid == uid).with_for_update(read=True)).mappings().first()
    return dict(displayName=row['display_name'], photoURL=row['photo_url'], email=row['email'], providers=row['providers'],
        createdAt=row['created_at'].isoformat(), updatedAt=row['updated_at'].isoformat()) if row else None


def put_snapshot(db, value, snapshot_id=None):
    if storage_version(db) < 2:
        return v1.put_snapshot(db, value, snapshot_id)
    return put_compact_snapshot(db, value, snapshot_id)


def put_compact_snapshot(db, value, snapshot_id=None, preserve_notes=False):
    snapshot_id = snapshot_id or uuid4().hex
    root = split_fields(value, s.SNAPSHOT_FIELDS)
    sections = []
    children = {s.transcription_notes: [], s.transcription_events: []}
    for path in NOTE_SECTIONS + EVENT_SECTIONS:
        found, content = take_section(root['extensions'], path)
        if not found:
            continue
        if content is None:
            set_section(root['extensions'], path, None)
            continue
        if not isinstance(content, list):
            raise ValueError(f'Expected list at {path}')
        sections.append(path)
        table = s.transcription_notes if path in NOTE_SECTIONS else s.transcription_events
        children[table].extend(dict(snapshot_id=snapshot_id, section=path, position=i,
            **split_fields(item, table.info['field_mapping'])) for i, item in enumerate(content))
    for path, (prefix, mapping) in s.EMBEDDED_FIELDS.items():
        # Clear all optional embedded columns on replacement.
        embedded = split_fields({}, mapping)
        found, content = take_section(root['extensions'], path)
        if found and content is not None:
            embedded = split_fields(content, mapping)
            sections.append(path)
        elif found:
            set_section(root['extensions'], path, None)
        root.update({f'{prefix}_{column}': item for column, item in embedded.items()})
    root.update(snapshot_id=snapshot_id, sections=sections)
    db.execute(insert(s.snapshots).values(**root).on_conflict_do_update(index_elements=[s.snapshots.c.snapshot_id],
        set_={k: v for k, v in root.items() if k != 'snapshot_id'}))
    for table, rows in children.items():
        if preserve_notes and table is s.transcription_notes:
            continue
        db.execute(table.delete().where(table.c.snapshot_id == snapshot_id))
        insert_rows(db, table, rows)
    return snapshot_id


def get_snapshot(db, snapshot_id):
    if storage_version(db) < 2:
        return v1.get_snapshot(db, snapshot_id)
    root = db.execute(select(s.snapshots).where(s.snapshots.c.snapshot_id == snapshot_id).with_for_update(read=True)).mappings().one()
    value = join_fields(root, s.SNAPSHOT_FIELDS)
    children = {}
    for path in root['sections']:
        if path in s.EMBEDDED_FIELDS:
            prefix, mapping = s.EMBEDDED_FIELDS[path]
            row = {key[len(prefix) + 1:]: content for key, content in root.items() if key.startswith(prefix + '_')}
            set_section(value, path, join_fields(row, mapping))
            continue
        table = s.transcription_notes if path in NOTE_SECTIONS else s.transcription_events
        if table not in children:
            children[table] = db.execute(select(table).where(table.c.snapshot_id == snapshot_id).order_by(table.c.position)).mappings().all()
        set_section(value, path, [join_fields(row, table.info['field_mapping']) for row in children[table] if row['section'] == path])
    return value


def import_legacy_row(db, name, row):
    if storage_version(db) < 2:
        return v1.import_legacy_row(db, name, row)
    value = json.loads(row['body'])
    if name == 'profiles':
        put_profile(db, row['uid'], value)
    elif name == 'states':
        db.execute(s.state_versions.insert().values(uid=row['uid'], key=row['key'], version=row['version']))
        write_state_value(db, row['uid'], row['key'], value)
    else:
        snapshot = put_snapshot(db, value)
        table = {'jobs': s.transcription_jobs, 'revisions': s.transcription_revisions, 'runtime_records': s.transcription_records}[name]
        fields = {c.name: row[c.name] for c in table.primary_key}
        if name == 'jobs':
            fields.update(stage=row['state'], created=row['created'])
        db.execute(table.insert().values(**fields, snapshot_id=snapshot))


def get_imported_row(db, name, row):
    if name == 'profiles':
        return get_profile(db, row['uid'])
    if name == 'states':
        current = read_states(db, row['uid'], [row['key']]).get(row['key'])
        if current is None:
            return None
        if current['version'] != row['version']:
            raise RuntimeError('Destination mismatch: state version')
        return current['value']
    table = {'jobs': s.transcription_jobs, 'revisions': s.transcription_revisions, 'runtime_records': s.transcription_records}[name]
    snapshot = db.execute(select(table.c.snapshot_id).where(*[table.c[c.name] == row[c.name] for c in table.primary_key])).scalar_one_or_none()
    return get_snapshot(db, snapshot) if snapshot else None
