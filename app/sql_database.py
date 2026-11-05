"""Shared PostgreSQL schema and bounded Cloud SQL connection pool."""
import os
from sqlalchemy import (Column, Float, Integer, MetaData, Table, Text, create_engine)

metadata = MetaData()
jobs = Table('jobs', metadata, Column('id', Text, primary_key=True),
             Column('state', Text, nullable=False), Column('created', Float, nullable=False),
             Column('body', Text, nullable=False))
revisions = Table('revisions', metadata, Column('job_id', Text, primary_key=True),
                  Column('revision', Integer, primary_key=True), Column('body', Text, nullable=False))
states = Table('visitor_states', metadata, Column('uid', Text, primary_key=True),
               Column('key', Text, primary_key=True), Column('body', Text, nullable=False),
               Column('version', Integer, nullable=False, default=1))
profiles = Table('user_profiles', metadata, Column('uid', Text, primary_key=True),
                 Column('body', Text, nullable=False))
runtime_records = Table('runtime_records', metadata, Column('job_id', Text, primary_key=True),
                        Column('kind', Text, primary_key=True), Column('body', Text, nullable=False))


def make_engine():
    url = os.environ.get('DATABASE_URL')
    if url:
        if not url.startswith('postgresql'):
            raise ValueError('DATABASE_URL must use PostgreSQL')
        return create_engine(url, pool_pre_ping=True, pool_size=3, max_overflow=2)
    from google.cloud.sql.connector import Connector
    connector = Connector(refresh_strategy='LAZY')
    def connect():
        return connector.connect(
            os.environ['INSTANCE_CONNECTION_NAME'], 'pg8000',
            user=os.environ['DB_USER'], db=os.environ.get('DB_NAME', 'puyadao'),
            enable_iam_auth=os.environ.get('DB_IAM_AUTH', 'true').lower() == 'true',
            **({'password': os.environ['DB_PASSWORD']} if os.environ.get('DB_PASSWORD') else {}))
    engine = create_engine('postgresql+pg8000://', creator=connect,
                           pool_pre_ping=True, pool_size=3, max_overflow=2)
    # Keep the connector alive for the lifetime of the engine.
    engine.cloud_sql_connector = connector
    return engine
