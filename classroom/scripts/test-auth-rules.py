"""Simulate account access rules through the Firebase Rules API; writes no records.

Requires GOOGLE_OAUTH_ACCESS_TOKEN with firebaserules.rulesets.test permission.
"""
import json
import os
from pathlib import Path
import urllib.request

project = os.environ.get('GOOGLE_CLOUD_PROJECT', 'puyadao-75dd0')
stamp = '2026-11-04T15:00:00Z'
profile = {
    'displayName': '测试同学', 'email': 'member@example.com', 'photoURL': '',
    'providers': ['google.com'], 'createdAt': stamp, 'updatedAt': stamp,
}


def case(uid, provider, path, expected, method='get', data=None, existing=None):
    request = {
        'path': '/databases/(default)/documents/' + path, 'method': method, 'time': stamp,
        'auth': {'uid': uid, 'token': {'email': 'member@example.com', 'firebase': {'sign_in_provider': provider}}} if uid else None,
    }
    if data is not None:
        request['resource'] = {'data': data}
    return {'expectation': expected, 'request': request, 'resource': {'data': existing} if existing else None}


cases = [
    case('member', 'google.com', 'users/member', 'ALLOW'),
    case('other', 'google.com', 'users/member', 'DENY'),
    case('member', 'anonymous', 'users/member', 'DENY'),
    case(None, None, 'users/member', 'DENY'),
    case('guest', 'anonymous', 'visitors/guest/state/favorites', 'ALLOW'),
    case('member', 'google.com', 'visitors/member/state/favorites', 'ALLOW'),
    case('other', 'google.com', 'visitors/member/state/favorites', 'DENY'),
    case('member', 'google.com', 'users/member', 'ALLOW', 'create', profile),
    case('member', 'google.com', 'users/member', 'ALLOW', 'update', profile, profile),
    case('member', 'anonymous', 'users/member', 'DENY', 'create', profile),
    case('other', 'google.com', 'users/member', 'DENY', 'create', profile),
    case('member', 'google.com', 'users/member', 'DENY', 'create', {**profile, 'role': 'admin'}),
    case('member', 'google.com', 'users/member', 'DENY', 'create', {**profile, 'email': 'forged@example.com'}),
    case('member', 'google.com', 'users/member', 'DENY', 'update', {**profile, 'createdAt': '2026-11-03T15:00:00Z'}, profile),
]
source = (Path(__file__).resolve().parent.parent / 'firestore.rules').read_text()
request = urllib.request.Request(
    f'https://firebaserules.googleapis.com/v1/projects/{project}:test',
    data=json.dumps({'source': {'files': [{'name': 'firestore.rules', 'content': source}]}, 'testSuite': {'testCases': cases}}).encode(),
    headers={'Authorization': 'Bearer ' + os.environ['GOOGLE_OAUTH_ACCESS_TOKEN'], 'Content-Type': 'application/json', 'x-goog-user-project': project},
)
with urllib.request.urlopen(request, timeout=60) as response:
    result = json.load(response)
assert not any(issue.get('severity') == 'ERROR' for issue in result.get('issues', [])), result
results = result.get('testResults', [])
assert len(results) == len(cases), result
for index, outcome in enumerate(results):
    assert outcome['state'] == 'SUCCESS', (index + 1, cases[index], outcome)
print(f'PASS: {len(cases)} account profile and per-user state rule checks; no records written.')
