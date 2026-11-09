"""Real SQL/HTTP checks for catalog, identity, ownership and community persistence."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.pool import StaticPool

from sql_service import content_schema as s
from sql_service.content import seed_catalog
from sql_service.main import app


@pytest.fixture(params=['sqlite', 'postgresql'])
def content_database(request):
    if request.param == 'postgresql':
        engine = request.getfixturevalue('relational_database')
        s.metadata.create_all(engine)
    else:
        engine = create_engine('sqlite://', poolclass=StaticPool, connect_args={'check_same_thread': False})

        @event.listens_for(engine, 'connect')
        def foreign_keys(connection, _):
            connection.execute('PRAGMA foreign_keys=ON')

        s.metadata.create_all(engine)
    seed_catalog(engine)
    yield engine
    if request.param == 'sqlite':
        engine.dispose()


@pytest.fixture
def client(content_database, monkeypatch):
    from sql_service.main import auth
    users = {
        'alice': {'uid': 'alice', 'name': '小雨', 'firebase': {'sign_in_provider': 'google.com'}},
        'bob': {'uid': 'bob', 'name': '阿泽', 'firebase': {'sign_in_provider': 'password'}},
        'guest': {'uid': 'guest', 'firebase': {'sign_in_provider': 'anonymous'}},
    }

    def verify(token, **_):
        if token not in users:
            raise ValueError('invalid token')
        return users[token]

    monkeypatch.setattr(auth, 'verify_id_token', verify)
    app.state.engine = content_database
    yield TestClient(app)


BASE = '/api/account/content'
ALICE = {'Authorization': 'Bearer alice'}
BOB = {'Authorization': 'Bearer bob'}
GUEST = {'Authorization': 'Bearer guest'}


def publish(client, **changes):
    response = client.post(BASE + '/posts', headers=ALICE, json={
        'title': '晴天和弦怎样练习', 'body': '每天慢练十五分钟，大家有什么练习建议？',
        'song_id': 'sunny', 'category': '练习方法', **changes})
    assert response.status_code == 201, response.text
    return response.json()['id']


def test_catalog_search_filter_and_idempotent_seed(client, content_database):
    data = client.get(BASE + '/catalog').json()
    assert len(data['songs']) == 13
    assert len(data['versions']) == 104
    assert all(v['demo'] for v in data['versions'])
    assert client.get(BASE + '/songs', params={'q': ' 周 杰 伦 '}).json()['total'] == 10
    assert client.get(BASE + '/songs', params={'q': '晴天'}).json()['items'][0]['id'] == 'sunny'
    assert client.get(BASE + '/songs', params={'q': '%'}).json()['total'] == 0
    page = client.get(BASE + '/songs', params={'type': '吉他谱', 'limit': 2, 'offset': 1}).json()
    assert page['total'] == 13 and len(page['items']) == 2
    assert client.get(BASE + '/songs', params={'sort': 'bogus'}).status_code == 422
    assert client.get(BASE + '/songs/missing').status_code == 404
    assert len(client.get(BASE + '/songs/sunny').json()['versions']) == 8
    with content_database.begin() as db:
        db.execute(s.songs.update().where(s.songs.c.id == 'sunny').values(title='保留人工修改'))
    seed_catalog(content_database)
    assert client.get(BASE + '/songs/sunny').json()['song']['title'] == '保留人工修改'


def test_login_validation_and_unknown_targets(client):
    payload = {'title': '有效的讨论标题', 'body': '这里是一段超过十个字的讨论内容。', 'category': '练习方法'}
    assert client.post(BASE + '/posts', json=payload).status_code == 401
    assert client.post(BASE + '/posts', headers=GUEST, json=payload).status_code == 403
    assert client.post(BASE + '/posts', headers=ALICE, json={**payload, 'uid': 'bob'}).status_code == 422
    assert client.post(BASE + '/posts', headers=ALICE, json={**payload, 'title': '     '}).status_code == 422
    assert client.post(BASE + '/posts', headers=ALICE, json={**payload, 'category': 'unknown'}).status_code == 422
    assert client.post(BASE + '/posts', headers=ALICE, json={**payload, 'song_id': 'missing'}).status_code == 404
    assert client.get(BASE + '/posts', headers={'Authorization': 'Bearer bad'}).status_code == 401


def test_post_reply_quote_reactions_ownership_and_cascades(client, content_database):
    post_id = publish(client)
    other_id = publish(client, song_id='rice')
    path = BASE + '/posts/' + post_id
    assert client.get(BASE + '/posts', params={'song_id': 'sunny'}).json()['total'] == 1
    assert client.get(path).json()['author'] == '小雨'
    assert 'uid' not in client.get(path).json()
    first = client.post(path + '/comments', headers=ALICE, json={'text': '先从慢速开始'}).json()['id']
    child = client.post(path + '/comments', headers=BOB, json={'text': '谢谢你的建议', 'parent_id': first}).json()['id']
    assert client.post(BASE + '/posts/' + other_id + '/comments', headers=ALICE,
                       json={'text': '跨帖子引用', 'parent_id': first}).status_code == 422
    assert client.post(path + '/comments', headers=ALICE, json={'text': '   '}).status_code == 422
    for _ in range(2):
        assert client.put(path + '/like', headers=BOB, json={'active': True}).json() == {'active': True, 'count': 1}
        assert client.put(path + '/bookmark', headers=BOB, json={'active': True}).status_code == 200
    assert client.get(path, headers=BOB).json()['liked'] is True
    assert client.get(path, headers=ALICE).json()['liked'] is False
    assert client.get(path, headers=BOB).json()['saved'] is True
    assert client.get(path).json()['comments'] == 2
    replies = client.get(path + '/comments', headers=ALICE, params={'limit': 1, 'offset': 1}).json()
    assert replies['total'] == 2 and replies['items'][0]['to'] == '小雨'
    assert client.delete(path, headers=BOB).status_code == 403
    assert client.delete(BASE + '/comments/' + first, headers=BOB).status_code == 403
    assert client.put(BASE + '/comments/' + first + '/like', headers=BOB, json={'active': True}).json()['count'] == 1
    assert client.delete(BASE + '/comments/' + first, headers=ALICE).status_code == 200
    assert client.get(path + '/comments').json()['items'][0]['parent_id'] is None
    assert client.delete(path, headers=ALICE).status_code == 200
    assert client.get(path).status_code == 404
    with content_database.connect() as db:
        for table in (s.comments, s.post_likes, s.comment_likes, s.bookmarks):
            assert db.scalar(select(func.count()).select_from(table)) == 0
