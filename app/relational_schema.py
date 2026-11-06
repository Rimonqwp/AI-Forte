"""Queryable relational storage; the original five JSON tables are cutover archives.

All children belong to a versioned state or transcription snapshot. JSONB is used
only for open-ended model evidence/extensions, never for whole business records.
"""
from sqlalchemy import (ARRAY, JSON, Boolean, CheckConstraint, Column, Date, DateTime,
                        Float, ForeignKey, ForeignKeyConstraint, Index, Integer,
                        Table, Text, UniqueConstraint)
from sqlalchemy.dialects.postgresql import JSONB
from app.sql_database import metadata

json_type = JSON().with_variant(JSONB(), 'postgresql')
schema_versions = Table('storage_schema_versions', metadata,
    Column('version', Integer, primary_key=True), Column('applied_at', Text, nullable=False))

account_profiles = Table('account_profiles', metadata,
    Column('uid', Text, primary_key=True), Column('display_name', Text, nullable=False),
    Column('photo_url', Text, nullable=False), Column('email', Text, nullable=False),
    Column('created_at', DateTime(timezone=True), nullable=False),
    Column('updated_at', DateTime(timezone=True), nullable=False))
account_providers = Table('account_providers', metadata,
    Column('uid', Text, ForeignKey('account_profiles.uid', ondelete='CASCADE'), primary_key=True),
    Column('position', Integer, primary_key=True), Column('provider', Text, nullable=False),
    UniqueConstraint('uid', 'provider'))
state_versions = Table('account_state_versions', metadata,
    Column('uid', Text, primary_key=True), Column('key', Text, primary_key=True),
    Column('version', Integer, nullable=False), CheckConstraint('version > 0'))


def state_table(name, *columns, checks=()):
    return Table(name, metadata,
        Column('uid', Text, primary_key=True), Column('state_key', Text, primary_key=True),
        *columns, ForeignKeyConstraint(['uid', 'state_key'],
            ['account_state_versions.uid', 'account_state_versions.key'], ondelete='CASCADE'), *checks)


song_favorites = state_table('song_favorites', Column('position', Integer, primary_key=True),
    Column('song_id', Text, nullable=False), checks=(UniqueConstraint('uid', 'song_id'),))
arrangement_favorites = state_table('arrangement_favorites', Column('position', Integer, primary_key=True),
    Column('song_id', Text, nullable=False), Column('arrangement_id', Text, nullable=False),
    checks=(UniqueConstraint('uid', 'song_id', 'arrangement_id'),))
post_likes = state_table('post_likes', Column('position', Integer, primary_key=True),
    Column('post_id', Text, nullable=False), checks=(UniqueConstraint('uid', 'post_id'),))
course_completions = state_table('course_completions', Column('position', Integer, primary_key=True),
    Column('course_id', Text, nullable=False), checks=(UniqueConstraint('uid', 'course_id'),))
daily_checkins = state_table('daily_checkins', Column('position', Integer, primary_key=True),
    Column('checkin_date', Date, nullable=False), checks=(UniqueConstraint('uid', 'checkin_date'),))
arrangement_selections = state_table('arrangement_selections', Column('position', Integer, primary_key=True),
    Column('arrangement_id', Text, nullable=False),
    checks=(UniqueConstraint('uid', 'state_key', 'arrangement_id'),))
practice_progress = state_table('practice_progress',
    Column('practice_key', Text, nullable=False), Column('elapsed_seconds', Float, nullable=False),
    Column('scroll_top', Float, nullable=False), Column('bpm', Float, nullable=False), checks=(
        CheckConstraint('elapsed_seconds >= 0 AND elapsed_seconds <= 86400'),
        CheckConstraint('scroll_top >= 0 AND scroll_top <= 1000000'),
        CheckConstraint('bpm >= 40 AND bpm <= 180')))

# API field -> SQL column/type. Presence distinguishes missing keys from explicit
# nulls, preserving old clients, undo history and legacy exports exactly.
SNAPSHOT_FIELDS = {
    'id': ('job_id', Text), 'stage': ('stage', Text), 'title': ('title', Text),
    'message': ('message', Text), 'source_url': ('source_url', Text),
    'start': ('start_seconds', Float), 'duration': ('duration_seconds', Float),
    'revision': ('revision', Integer), 'schema_version': ('schema_version', Integer),
    'attempt': ('attempt', Text), 'submit_intent': ('submit_intent', Float),
    'operation': ('operation', Text), 'execution': ('execution', Text),
    'uploaded': ('uploaded', Boolean), 'files_cleaned': ('files_cleaned', Boolean),
    'dual_enabled': ('dual_enabled', Boolean), 'muscriptor_enabled': ('muscriptor_enabled', Boolean),
    'analysis_file': ('analysis_file', Text), 'last_error': ('last_error', Text),
    'original_url': ('original_url', Text), 'vocal_url': ('vocal_url', Text),
    'backing_url': ('backing_url', Text), 'reused_job_id': ('reused_job_id', Text),
    'refined_from': ('refined_from', Text), 'undo_cursor': ('undo_cursor', Integer),
    'legato_enabled': ('legato_enabled', Boolean), 'warnings': ('warnings', ARRAY(Text)),
}
NOTE_FIELDS = {
    'id': ('note_id', Text), 'start': ('start_seconds', Float), 'end': ('end_seconds', Float),
    'pitch': ('pitch', Integer), 'original_pitch': ('original_pitch', Integer),
    'model_pitch': ('model_pitch', Integer), 'string': ('string_number', Integer),
    'fret': ('fret', Integer), 'octave_shift': ('octave_shift', Integer),
    'velocity': ('velocity', Float), 'confidence': ('confidence', Float),
    'quality': ('quality', Float), 'track_id': ('track_id', Text),
    'source_note_id': ('source_note_id', Text), 'source': ('source', Text),
    'method': ('method', Text), 'role': ('role', Text), 'origin': ('origin', Text),
    'uncertain': ('uncertain', Boolean), 'refined': ('refined', Boolean),
    'locked_position': ('locked_position', Boolean), 'truncated': ('truncated', Boolean),
    'accent': ('accent', Boolean), 'under_vocal': ('under_vocal', Boolean),
    'uncertainty_reasons': ('uncertainty_reasons', ARRAY(Text)),
}
REQUEST_FIELDS = {
    'url': ('source_url', Text), 'start': ('start_seconds', Float),
    'duration': ('duration_seconds', Float), 'mode': ('mode', Text),
    'pipeline_version': ('pipeline_version', Integer), 'include_intro': ('include_intro', Boolean),
    'reuse_job_id': ('reuse_job_id', Text),
}
SETTING_FIELDS = {'density': ('density', Text), 'slides': ('slides', Boolean),
    'legato': ('legato', Boolean), 'vocal_focus': ('vocal_focus', Boolean)}


def fields(mapping):
    return [Column(column, kind) for column, kind in mapping.values()]


snapshots = Table('transcription_snapshots', metadata,
    Column('snapshot_id', Text, primary_key=True), *fields(SNAPSHOT_FIELDS),
    Column('present_fields', ARRAY(Text), nullable=False),
    Column('sections', ARRAY(Text), nullable=False),
    Column('extensions', json_type, nullable=False))
transcription_jobs = Table('transcription_jobs', metadata,
    Column('id', Text, primary_key=True), Column('stage', Text, nullable=False),
    Column('created', Float, nullable=False),
    Column('snapshot_id', Text, ForeignKey('transcription_snapshots.snapshot_id'), nullable=False, unique=True))
Index('ix_transcription_jobs_stage_created', transcription_jobs.c.stage, transcription_jobs.c.created)
transcription_revisions = Table('transcription_revisions', metadata,
    Column('job_id', Text, ForeignKey('transcription_jobs.id', ondelete='CASCADE'), primary_key=True),
    Column('revision', Integer, primary_key=True),
    Column('snapshot_id', Text, ForeignKey('transcription_snapshots.snapshot_id'), nullable=False, unique=True))
transcription_records = Table('transcription_records', metadata,
    Column('job_id', Text, primary_key=True), Column('kind', Text, primary_key=True),
    Column('snapshot_id', Text, ForeignKey('transcription_snapshots.snapshot_id'), nullable=False, unique=True))


def snapshot_child(name, mapping, scoped=False, ordered=False, checks=()):
    return Table(name, metadata,
        Column('snapshot_id', Text, ForeignKey('transcription_snapshots.snapshot_id', ondelete='CASCADE'), primary_key=True),
        *([Column('section', Text, primary_key=True)] if scoped else []),
        *([Column('position', Integer, primary_key=True)] if ordered else []),
        *fields(mapping), Column('present_fields', ARRAY(Text), nullable=False),
        Column('extensions', json_type, nullable=False), *checks, info={'field_mapping': mapping})


transcription_notes = snapshot_child('transcription_notes', NOTE_FIELDS, scoped=True, ordered=True,
    checks=(CheckConstraint('pitch IS NULL OR (pitch >= 0 AND pitch <= 127)'),))
Index('ix_transcription_notes_pitch_time', transcription_notes.c.pitch, transcription_notes.c.start_seconds)
transcription_requests = snapshot_child('transcription_requests', REQUEST_FIELDS)
transcription_settings = snapshot_child('transcription_settings', SETTING_FIELDS, scoped=True)
transcription_overrides = snapshot_child('transcription_overrides', {
    'start': ('start_seconds', Float), 'end': ('end_seconds', Float), 'track_id': ('track_id', Text)}, ordered=True)
transcription_slides = snapshot_child('transcription_slides', {
    'from': ('from_note', Integer), 'to': ('to_note', Integer),
    'start': ('start_seconds', Float), 'end': ('end_seconds', Float),
    'semitones': ('semitones', Integer)}, scoped=True, ordered=True)
transcription_chords = snapshot_child('transcription_chords', {
    'start': ('start_seconds', Float), 'end': ('end_seconds', Float), 'label': ('label', Text),
    'frets': ('frets', ARRAY(Integer)), 'uncertain': ('uncertain', Boolean),
    'reduced': ('reduced', Boolean), 'source_labels': ('source_labels', ARRAY(Text))}, ordered=True)
transcription_strums = snapshot_child('transcription_strums', {
    'time': ('time_seconds', Float), 'end': ('end_seconds', Float),
    'direction': ('direction', Text), 'chord': ('chord', Text),
    'frets': ('frets', ARRAY(Integer)), 'velocity': ('velocity', Float)}, ordered=True)

RELATIONAL_TABLES = [t for t in metadata.sorted_tables if t.name not in
    {'jobs', 'revisions', 'visitor_states', 'user_profiles', 'runtime_records'}]

# v2 keeps ten active tables. The definitions above for the fourteen retired
# tables exist only so the migration/rolling-deployment adapter can read v1.
account_profiles.append_column(Column('providers', ARRAY(Text), nullable=False, server_default='{}'))
for column in (Column('elapsed_seconds', Float), Column('scroll_top', Float), Column('bpm', Float)):
    state_versions.append_column(column)
state_versions.append_constraint(CheckConstraint('elapsed_seconds IS NULL OR (elapsed_seconds >= 0 AND elapsed_seconds <= 86400)', name='state_elapsed_bounds'))
state_versions.append_constraint(CheckConstraint('scroll_top IS NULL OR (scroll_top >= 0 AND scroll_top <= 1000000)', name='state_scroll_bounds'))
state_versions.append_constraint(CheckConstraint('bpm IS NULL OR (bpm >= 40 AND bpm <= 180)', name='state_bpm_bounds'))

account_items = state_table('account_items', Column('position', Integer, primary_key=True),
    Column('target_id', Text), Column('related_id', Text), Column('checkin_date', Date), checks=(
        CheckConstraint('position >= 0'),
        CheckConstraint("(state_key = 'checkins' AND checkin_date IS NOT NULL AND target_id IS NULL AND related_id IS NULL) OR "
            "(state_key = 'practice-favorites' AND target_id IS NOT NULL AND related_id IS NOT NULL AND checkin_date IS NULL) OR "
            "(state_key <> 'checkins' AND state_key <> 'practice-favorites' AND target_id IS NOT NULL AND related_id IS NULL AND checkin_date IS NULL)"),
        UniqueConstraint('uid', 'state_key', 'target_id', 'related_id', 'checkin_date', postgresql_nulls_not_distinct=True)))

EMBEDDED_FIELDS = {
    'request': ('request', REQUEST_FIELDS),
    'settings': ('settings', SETTING_FIELDS),
    'arrangement.settings': ('arrangement_settings', SETTING_FIELDS),
}
for prefix, mapping in EMBEDDED_FIELDS.values():
    for column, kind in mapping.values():
        snapshots.append_column(Column(f'{prefix}_{column}', kind))
    snapshots.append_column(Column(f'{prefix}_present_fields', ARRAY(Text)))
    snapshots.append_column(Column(f'{prefix}_extensions', json_type))

EVENT_FIELDS = {}
for table in (transcription_overrides, transcription_slides, transcription_chords, transcription_strums):
    EVENT_FIELDS.update(table.info['field_mapping'])
transcription_events = snapshot_child('transcription_events', EVENT_FIELDS, scoped=True, ordered=True)

CURRENT_TABLES = [schema_versions, account_profiles, state_versions, account_items,
    snapshots, transcription_jobs, transcription_revisions, transcription_records,
    transcription_notes, transcription_events]
RETIRED_TABLES = [t for t in RELATIONAL_TABLES if t not in CURRENT_TABLES]
