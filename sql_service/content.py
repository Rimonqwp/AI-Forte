"""Database-backed public catalog and authenticated community endpoints."""
import json
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from . import content_schema as s

CATEGORIES = {'乐谱选择', '练习方法', '学歌指导', '指法技巧', '演奏分享',
              '钢琴演奏', '吉他弹唱', '尤克里里', '翻唱', '合奏', '比赛作品', '学习交流'}


def normalize(value):
    return ''.join(unicodedata.normalize('NFKC', value).lower().split())


def now():
    return datetime.now(timezone.utc).isoformat()


def insert_once(db, table, values):
    insert = pg_insert if db.dialect.name == 'postgresql' else sqlite_insert
    db.execute(insert(table).values(**values).on_conflict_do_nothing())


def seed_catalog(engine):
    """Explicit idempotent import: never replace edits or invent community activity."""
    data = json.loads(Path(__file__).with_name('catalog_seed.json').read_text(encoding='utf-8'))
    song_rows, version_rows = [], []
    with engine.begin() as db:
        for position, item in enumerate(data['songs']):
            row = {key: item.get(key) for key in ('id', 'title', 'artist', 'instrument', 'cover', 'date', 'badge', 'color')}
            row.update(level=item.get('level', 2), key=item.get('key', 'C'), bpm=item.get('bpm', 80),
                tags=item.get('tags', []), types=item.get('types', ['五线谱', '简谱', '和弦谱', item['instrument'] + '谱']),
                style=item.get('style', '流行'), language=item.get('language', '华语'),
                home=item.get('home', False), demo=True, position=position,
                search_text=normalize(' '.join([item['title'], item['artist'], item['instrument'], '五线谱 简谱 和弦谱 乐谱'])))
            song_rows.append(row)
            for version in data['versions']:
                row = {key: version.get(key, '') for key in ('id', 'performanceId', 'author', 'avatar', 'instrument', 'type', 'key', 'subtitle', 'badge', 'description', 'sheet')}
                row.update(song_id=item['id'], level=version['level'], certified=version.get('certified', False),
                    authorLevel=version.get('authorLevel'), demo=True, created_at=now())
                version_rows.append(row)
        insert = pg_insert if db.dialect.name == 'postgresql' else sqlite_insert
        db.execute(insert(s.songs).values(song_rows).on_conflict_do_nothing())
        db.execute(insert(s.arrangements).values(version_rows).on_conflict_do_nothing())


def require_row(db, table, target_id, lock=False):
    query = select(table).where(table.c.id == target_id)
    if lock:
        query = query.with_for_update()
    row = db.execute(query).mappings().first()
    if row is None:
        raise HTTPException(404, '内容不存在或已删除。')
    return dict(row)


def require_owner(row, user):
    if row['uid'] != user['uid']:
        raise HTTPException(403, '只能修改自己发布的内容。')


class CleanBody(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)


class PostWrite(CleanBody):
    title: str = Field(min_length=5, max_length=100)
    body: str = Field(min_length=10, max_length=5000)
    category: str
    song_id: str | None = Field(default=None, max_length=100)

    @field_validator('category')
    @classmethod
    def category_known(cls, value):
        if value not in CATEGORIES:
            raise ValueError('讨论分类无效')
        return value


class CommentWrite(CleanBody):
    text: str = Field(min_length=1, max_length=2000)
    parent_id: str | None = Field(default=None, max_length=100)


class Toggle(CleanBody):
    active: bool = Field(strict=True)


def create_router(identity):
    router = APIRouter(prefix='/api/account/content', tags=['曲库与社区'])

    def optional_identity(request: Request):
        return identity(request) if request.headers.get('authorization') else None

    def member(user=Depends(identity)):
        if user.get('firebase', {}).get('sign_in_provider') == 'anonymous':
            raise HTTPException(403, '请先登录账号再参与社区。')
        return user

    def author(user):
        return (user.get('name') or '音乐同学')[:100]

    def summary(db, rows, user):
        if not rows:
            return []
        ids = [row['id'] for row in rows]
        counts = dict(db.execute(select(s.comments.c.post_id, func.count()).where(s.comments.c.post_id.in_(ids)).group_by(s.comments.c.post_id)).all())
        likes = dict(db.execute(select(s.post_likes.c.target_id, func.count()).where(s.post_likes.c.target_id.in_(ids)).group_by(s.post_likes.c.target_id)).all())
        liked, saved = set(), set()
        if user:
            liked = set(db.scalars(select(s.post_likes.c.target_id).where(s.post_likes.c.uid == user['uid'], s.post_likes.c.target_id.in_(ids))))
            saved = set(db.scalars(select(s.bookmarks.c.target_id).where(s.bookmarks.c.uid == user['uid'], s.bookmarks.c.target_id.in_(ids))))
        return [{key: value for key, value in dict(row, excerpt=row['body'][:180],
            likes=likes.get(row['id'], 0), comments=counts.get(row['id'], 0),
            liked=row['id'] in liked, saved=row['id'] in saved,
            owned=bool(user and row['uid'] == user['uid'])).items() if key != 'uid'} for row in rows]

    @router.get('/catalog')
    def catalog(request: Request):
        with request.app.state.engine.connect() as db:
            songs = [dict(row) for row in db.execute(select(s.songs).order_by(s.songs.c.position, s.songs.c.id)).mappings()]
            versions = [dict(row) for row in db.execute(select(s.arrangements).order_by(s.arrangements.c.song_id, s.arrangements.c.id)).mappings()]
        for song in songs:
            song.pop('search_text', None)
        return {'songs': songs, 'versions': versions}

    @router.get('/songs')
    def search_songs(request: Request, q: str = Query('', max_length=120),
                     type: str = Query('全部', max_length=30), sort: str = '综合推荐',
                     limit: int = Query(30, ge=1, le=100), offset: int = Query(0, ge=0, le=100000)):
        query = select(s.songs)
        if normalize(q):
            query = query.where(s.songs.c.search_text.contains(normalize(q), autoescape=True))
        if type != '全部':
            query = query.where(select(s.arrangements.c.id).where(s.arrangements.c.song_id == s.songs.c.id,
                (s.arrangements.c.type == type) | (s.arrangements.c.instrument + '谱' == type)).exists())
        popularity = select(func.count()).select_from(s.posts).where(s.posts.c.song_id == s.songs.c.id).scalar_subquery()
        order = {'难度从低到高': s.songs.c.level.asc(), '难度从高到低': s.songs.c.level.desc(),
                 '最新上传': s.songs.c.position.desc(), '综合推荐': s.songs.c.position.asc(),
                 '最热门': popularity.desc()}
        if sort not in order:
            raise HTTPException(422, '排序方式无效。')
        with request.app.state.engine.connect() as db:
            total = db.scalar(select(func.count()).select_from(query.subquery()))
            items = [dict(row) for row in db.execute(query.order_by(order[sort], s.songs.c.id).limit(limit).offset(offset)).mappings()]
        for item in items:
            item.pop('search_text', None)
        return {'items': items, 'total': total, 'offset': offset, 'limit': limit}

    @router.get('/songs/{song_id}')
    def song_detail(song_id: str, request: Request):
        with request.app.state.engine.connect() as db:
            song = require_row(db, s.songs, song_id)
            song.pop('search_text', None)
            versions = [dict(row) for row in db.execute(select(s.arrangements).where(s.arrangements.c.song_id == song_id)).mappings()]
            count = db.scalar(select(func.count()).select_from(s.posts).where(s.posts.c.song_id == song_id))
        return {'song': song, 'versions': versions, 'discussionCount': count}

    @router.get('/posts')
    def list_posts(request: Request, song_id: str | None = None, category: str | None = None,
                   q: str = Query('', max_length=120), limit: int = Query(20, ge=1, le=100),
                   offset: int = Query(0, ge=0, le=100000), user=Depends(optional_identity)):
        query = select(s.posts)
        if song_id:
            query = query.where(s.posts.c.song_id == song_id)
        if category:
            query = query.where(s.posts.c.category == category)
        if q.strip():
            query = query.where(s.posts.c.title.contains(q.strip(), autoescape=True) | s.posts.c.body.contains(q.strip(), autoescape=True))
        with request.app.state.engine.connect() as db:
            total = db.scalar(select(func.count()).select_from(query.subquery()))
            rows = db.execute(query.order_by(s.posts.c.created_at.desc(), s.posts.c.id.desc()).limit(limit).offset(offset)).mappings().all()
            return {'items': summary(db, rows, user), 'total': total, 'offset': offset, 'limit': limit}

    @router.post('/posts', status_code=201)
    def publish(body: PostWrite, request: Request, user=Depends(member)):
        row = dict(body.model_dump(), id=uuid4().hex, uid=user['uid'], author=author(user), created_at=now(), updated_at=now())
        with request.app.state.engine.begin() as db:
            if body.song_id:
                require_row(db, s.songs, body.song_id)
            db.execute(s.posts.insert().values(**row))
            return summary(db, [row], user)[0]

    @router.get('/posts/{post_id}')
    def get_post(post_id: str, request: Request, user=Depends(optional_identity)):
        with request.app.state.engine.connect() as db:
            return summary(db, [require_row(db, s.posts, post_id)], user)[0]

    @router.delete('/posts/{post_id}')
    def delete_post(post_id: str, request: Request, user=Depends(member)):
        with request.app.state.engine.begin() as db:
            require_owner(require_row(db, s.posts, post_id, lock=True), user)
            db.execute(s.posts.delete().where(s.posts.c.id == post_id))
        return {'deleted': True}

    @router.get('/posts/{post_id}/comments')
    def list_comments(post_id: str, request: Request, limit: int = Query(50, ge=1, le=100),
                      offset: int = Query(0, ge=0, le=100000), user=Depends(optional_identity)):
        with request.app.state.engine.connect() as db:
            require_row(db, s.posts, post_id)
            query = select(s.comments).where(s.comments.c.post_id == post_id)
            total = db.scalar(select(func.count()).select_from(query.subquery()))
            rows = db.execute(query.order_by(s.comments.c.created_at, s.comments.c.id).limit(limit).offset(offset)).mappings().all()
            ids = [r['id'] for r in rows]
            likes = dict(db.execute(select(s.comment_likes.c.target_id, func.count()).where(s.comment_likes.c.target_id.in_(ids)).group_by(s.comment_likes.c.target_id)).all())
            liked = set(db.scalars(select(s.comment_likes.c.target_id).where(s.comment_likes.c.uid == user['uid'], s.comment_likes.c.target_id.in_(ids)))) if user else set()
            parents = {r['id']: r['author'] for r in db.execute(
                select(s.comments.c.id, s.comments.c.author).where(
                    s.comments.c.id.in_([r['parent_id'] for r in rows if r['parent_id']]))).mappings()}
            items = [{k: v for k, v in dict(row, likes=likes.get(row['id'], 0), liked=row['id'] in liked,
                owned=bool(user and row['uid'] == user['uid']), to=parents.get(row['parent_id'], '')).items() if k != 'uid'} for row in rows]
        return {'items': items, 'total': total, 'offset': offset, 'limit': limit}

    @router.post('/posts/{post_id}/comments', status_code=201)
    def reply(post_id: str, body: CommentWrite, request: Request, user=Depends(member)):
        with request.app.state.engine.begin() as db:
            require_row(db, s.posts, post_id, lock=True)
            if body.parent_id:
                parent = require_row(db, s.comments, body.parent_id, lock=True)
                if parent['post_id'] != post_id:
                    raise HTTPException(422, '引用的回复不属于当前帖子。')
            row = dict(id=uuid4().hex, post_id=post_id, uid=user['uid'], author=author(user),
                text=body.text, parent_id=body.parent_id, created_at=now())
            db.execute(s.comments.insert().values(**row))
        return {'id': row['id']}

    @router.delete('/comments/{comment_id}')
    def delete_comment(comment_id: str, request: Request, user=Depends(member)):
        with request.app.state.engine.begin() as db:
            require_owner(require_row(db, s.comments, comment_id, lock=True), user)
            db.execute(s.comments.delete().where(s.comments.c.id == comment_id))
        return {'deleted': True}

    def toggle(db, table, target, target_id, user, active):
        require_row(db, target, target_id, lock=True)
        if active:
            insert_once(db, table, {'uid': user['uid'], 'target_id': target_id})
        else:
            db.execute(table.delete().where(table.c.uid == user['uid'], table.c.target_id == target_id))
        count = db.scalar(select(func.count()).select_from(table).where(table.c.target_id == target_id))
        return {'active': active, 'count': count}

    @router.put('/posts/{post_id}/like')
    def like_post(post_id: str, body: Toggle, request: Request, user=Depends(member)):
        with request.app.state.engine.begin() as db:
            return toggle(db, s.post_likes, s.posts, post_id, user, body.active)

    @router.put('/comments/{comment_id}/like')
    def like_comment(comment_id: str, body: Toggle, request: Request, user=Depends(member)):
        with request.app.state.engine.begin() as db:
            return toggle(db, s.comment_likes, s.comments, comment_id, user, body.active)

    @router.put('/posts/{post_id}/bookmark')
    def bookmark(post_id: str, body: Toggle, request: Request, user=Depends(member)):
        with request.app.state.engine.begin() as db:
            return toggle(db, s.bookmarks, s.posts, post_id, user, body.active)

    return router
