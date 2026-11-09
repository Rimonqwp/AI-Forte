"""Add the catalog/community tables and import existing demo scores without overwriting rows."""
import argparse
from sqlalchemy import func, select, text
from app.sql_database import make_engine
from sql_service.content import seed_catalog
from sql_service.content_schema import metadata


def prepare(engine, roles=()):
    metadata.create_all(engine)
    seed_catalog(engine)
    with engine.begin() as db:
        quote = db.dialect.identifier_preparer.quote
        for role in roles:
            for table in metadata.sorted_tables:
                db.execute(text(f'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {quote(table.name)} TO {quote(role)}'))
        return {table.name: db.scalar(select(func.count()).select_from(table)) for table in metadata.sorted_tables}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--grant-role', action='append', default=[])
    args = parser.parse_args()
    engine = make_engine()
    try:
        print(prepare(engine, args.grant_role))
    finally:
        engine.dispose()
        connector = getattr(engine, 'cloud_sql_connector', None)
        if connector:
            connector.close()
