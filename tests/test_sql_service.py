import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sql_service.main import app, validate_state


@pytest.mark.parametrize('key,value', [
    ('favorites', ['star']), ('progress-star-v1', {'elapsed': 1, 'scrollTop': 0, 'bpm': 80}),
])
def test_valid_values(key, value):
    validate_state(key, value)


@pytest.mark.parametrize('key,value', [
    ('admin', []), ('favorites', {}), ('completed', [0] * 1001),
    ('progress-star-v1', {'elapsed': True, 'scrollTop': 0, 'bpm': 80}),
    ('progress-star-v1', {'elapsed': 0, 'scrollTop': 0, 'bpm': 181}),
    ('progress-star-v1', {'elapsed': float('nan'), 'scrollTop': 0, 'bpm': 80}),
    ('progress-star-v1', {'elapsed': 0, 'scrollTop': 0, 'bpm': 80, 'uid': 'other'}),
])
def test_invalid_values(key, value):
    with pytest.raises(HTTPException):
        validate_state(key, value)


def test_unauthenticated_requests_are_rejected_before_database_access():
    client = TestClient(app)
    assert client.get('/api/account/state').status_code == 401
    assert client.get('/api/account/state/favorites').status_code == 401
    assert client.put('/api/account/state/favorites', json={'version': 0, 'value': []}).status_code == 401
