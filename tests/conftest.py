"""Cloud SQL tests own a disposable schema, never real users or jobs."""
import os
from uuid import uuid4

import pytest
from sqlalchemy import text


@pytest.fixture
def relational_database():
    if os.environ.get('FYP_SQL_INTEGRATION') != '1':
        pytest.skip('requires PostgreSQL credentials with CREATE SCHEMA permission')
    from app.sql_database import make_engine, metadata
    from app import relational_schema  # Register the new tables.
    engine = make_engine()
    schema = 'relational_test_' + uuid4().hex
    translated = engine.execution_options(schema_translate_map={None: schema})
    try:
        with engine.begin() as db:
            db.execute(text(f'CREATE SCHEMA "{schema}"'))
        metadata.create_all(translated)
        yield translated
    finally:
        with engine.begin() as db:
            db.execute(text(f'DROP SCHEMA IF EXISTS "{schema}" CASCADE'))
        engine.dispose()
        connector = getattr(engine, 'cloud_sql_connector', None)
        if connector:
            connector.close()
