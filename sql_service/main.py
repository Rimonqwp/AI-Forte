"""Firebase-authenticated account storage API. No browser database credentials."""
import json
import math
import re
from contextlib import asynccontextmanager
from datetime import date, datetime, timezone

import firebase_admin
from firebase_admin import auth
from fastapi import Depends, FastAPI, HTTPException, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert

from app.sql_database import make_engine, metadata, profiles, states
from app import relational_schema as relational
from app.relational_storage import (relational_enabled, read_state_value, write_state_value,
                                    put_profile, get_profile)


@asynccontextmanager
async def lifespan(app):
    if not firebase_admin._apps:
        firebase_admin.initialize_app(options={'projectId': 'puyadao-75dd0'})
    app.state.engine = make_engine()
    metadata.create_all(app.state.engine)
    yield
    app.state.engine.dispose()
    connector = getattr(app.state.engine, 'cloud_sql_connector', None)
    if connector:
        connector.close()


app = FastAPI(title='谱芽岛数据服务', lifespan=lifespan)


def identity(request: Request):
    scheme, _, token = request.headers.get('authorization', '').partition(' ')
    if scheme.lower() != 'bearer' or not token:
        raise HTTPException(401, '需要登录身份。')
    try:
        return auth.verify_id_token(token, check_revoked=True)
    except (ValueError, firebase_admin.exceptions.FirebaseError):
        raise HTTPException(401, '登录身份已失效。') from None


def valid_key(key):
    return key in ('favorites', 'likes', 'completed', 'checkins', 'practice-favorites') or bool(
        re.fullmatch(r'arrangements-[a-zA-Z0-9_-]{1,100}|progress-[a-zA-Z0-9_-]{1,160}', key))


def validate_state(key, value):
    if not valid_key(key):
        raise HTTPException(422, '不支持的记录类型。')
    if key.startswith('progress-'):
        bounds = {'elapsed': (0, 86400), 'scrollTop': (0, 1000000), 'bpm': (40, 180)}
        if not isinstance(value, dict) or value.keys() != bounds.keys() or any(
            type(value[k]) not in (int, float) or not math.isfinite(value[k]) or not lo <= value[k] <= hi
            for k, (lo, hi) in bounds.items()):
            raise HTTPException(422, '练习进度参数无效。')
    elif not isinstance(value, list) or len(value) > 1000:
        raise HTTPException(422, '记录最多包含 1000 项。')
    else:
        if any(not isinstance(item, str) or not 1 <= len(item) <= 200 for item in value):
            raise HTTPException(422, '记录必须包含有效的文字编号。')
        if len(set(value)) != len(value):
            raise HTTPException(422, '记录编号不能重复。')
        if key == 'checkins':
            try:
                if any(date.fromisoformat(item).isoformat() != item for item in value):
                    raise ValueError()
            except ValueError:
                raise HTTPException(422, '打卡日期必须是有效的 YYYY-MM-DD。') from None
        if key == 'practice-favorites' and any(':' not in item or not all(item.split(':', 1)) for item in value):
            raise HTTPException(422, '编配收藏需要歌曲和版本编号。')
    if len(json.dumps(value, ensure_ascii=False).encode()) > 256000:
        raise HTTPException(413, '记录过大。')


class StateWrite(BaseModel):
    model_config = ConfigDict(extra='forbid')
    version: int = Field(ge=0)
    value: object


@app.get('/api/account/health')
def health(request: Request):
    with request.app.state.engine.connect() as db:
        db.execute(text('SELECT 1'))
        normalized = relational_enabled(db)
    return {'storage': 'cloud-sql', 'schema': 'relational-v1' if normalized else 'legacy-json', 'ok': True}


@app.get('/api/account/state')
def list_states(request: Request, user=Depends(identity)):
    with request.app.state.engine.begin() as db:
        if relational_enabled(db):
            rows = db.execute(select(relational.state_versions.c.key).where(
                relational.state_versions.c.uid == user['uid']).order_by(relational.state_versions.c.key)
                .with_for_update(read=True)).all()
            return [{'key': r.key, 'value': read_state_value(db, user['uid'], r.key)} for r in rows]
        rows = db.execute(select(states.c.key, states.c.body).where(states.c.uid == user['uid']))
        return [{'key': r.key, 'value': json.loads(r.body)} for r in rows]


@app.get('/api/account/state/{key}')
def read_state(key: str, request: Request, user=Depends(identity)):
    if not valid_key(key):
        raise HTTPException(422, '不支持的记录类型。')
    with request.app.state.engine.begin() as db:
        if relational_enabled(db):
            version = db.execute(select(relational.state_versions.c.version).where(
                relational.state_versions.c.uid == user['uid'], relational.state_versions.c.key == key)
                .with_for_update(read=True)).scalar_one_or_none()
            return {'value': read_state_value(db, user['uid'], key), 'version': version} if version else {'version': 0}
        row = db.execute(select(states.c.body, states.c.version).where(states.c.uid == user['uid'], states.c.key == key)).first()
    return {'value': json.loads(row.body), 'version': row.version} if row else {'version': 0}


@app.put('/api/account/state/{key}')
def write_state(key: str, body: StateWrite, request: Request, user=Depends(identity)):
    validate_state(key, body.value)
    with request.app.state.engine.begin() as db:
        if relational_enabled(db):
            table = relational.state_versions
            if body.version == 0:
                result = db.execute(insert(table).values(uid=user['uid'], key=key, version=1)
                    .on_conflict_do_nothing().returning(table.c.version)).first()
            else:
                result = db.execute(table.update().where(table.c.uid == user['uid'], table.c.key == key,
                    table.c.version == body.version).values(version=body.version + 1).returning(table.c.version)).first()
            if result is None:
                raise HTTPException(409, '记录已更新，请重新读取。')
            write_state_value(db, user['uid'], key, body.value)
            return {'value': body.value, 'version': result.version}
        values = dict(uid=user['uid'], key=key, body=json.dumps(body.value), version=body.version + 1)
        if body.version == 0:
            result = db.execute(insert(states).values(**values).on_conflict_do_nothing().returning(states.c.version)).first()
        else:
            result = db.execute(states.update().where(states.c.uid == user['uid'], states.c.key == key,
                                                      states.c.version == body.version)
                                .values(body=values['body'], version=values['version']).returning(states.c.version)).first()
        if result is None:
            raise HTTPException(409, '记录已更新，请重新读取。')
    return {'value': body.value, 'version': result.version}


class ProfileWrite(BaseModel):
    model_config = ConfigDict(extra='forbid')
    displayName: str = Field(max_length=100)
    photoURL: str = Field(max_length=2000)


@app.put('/api/account/profile')
def save_profile(body: ProfileWrite, request: Request, user=Depends(identity)):
    if user.get('firebase', {}).get('sign_in_provider') == 'anonymous':
        raise HTTPException(403, '访客没有正式账号资料。')
    now = datetime.now(timezone.utc).isoformat()
    # The email and providers come from the verified token, never the request body.
    value = dict(displayName=body.displayName, photoURL=body.photoURL, email=user.get('email', ''),
                 providers=list(user.get('firebase', {}).get('identities', {}).keys() - {'email'}),
                 createdAt=now, updatedAt=now)
    with request.app.state.engine.begin() as db:
        normalized = relational_enabled(db)
        # Serialize profile creation too, preserving createdAt under concurrent requests.
        db.execute(text('SELECT pg_advisory_xact_lock(hashtextextended(:uid, 0))'), {'uid': user['uid']})
        if normalized:
            current = get_profile(db, user['uid'])
            if current:
                value['createdAt'] = current['createdAt']
            put_profile(db, user['uid'], value)
            return {'ok': True}
        current = db.execute(select(profiles.c.body).where(profiles.c.uid == user['uid'])).scalar_one_or_none()
        if current:
            value['createdAt'] = json.loads(current)['createdAt']
        db.execute(insert(profiles).values(uid=user['uid'], body=json.dumps(value))
                   .on_conflict_do_update(index_elements=[profiles.c.uid], set_={'body': json.dumps(value)}))
    return {'ok': True}
