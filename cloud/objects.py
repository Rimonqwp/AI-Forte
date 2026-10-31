"""Private GCS JSON API, with streamed transfers and generation guards."""
import hashlib
import json
from pathlib import Path
from urllib.parse import quote
import requests


class Objects:
    def __init__(self, bucket, token):
        self.bucket, self.token = bucket, token

    def request(self, method, url, **kw):
        headers = kw.pop('headers', {})
        headers['Authorization'] = 'Bearer '+self.token()
        response = requests.request(method, url, headers=headers, timeout=(30, 300), **kw)
        if response.status_code != 404: response.raise_for_status()
        return response

    def url(self, key):
        return f'https://storage.googleapis.com/storage/v1/b/{self.bucket}/o/{quote(key, safe="")}'

    def read(self, key):
        r = self.request('GET', self.url(key), params={'alt': 'media'})
        return None if r.status_code == 404 else r.json()

    def put(self, key, data):
        return self.request('POST', f'https://storage.googleapis.com/upload/storage/v1/b/{self.bucket}/o',
                            params={'uploadType': 'media', 'name': key}, data=json.dumps(data).encode(),
                            headers={'Content-Type': 'application/json'}).json()

    def upload(self, key, path):
        # Resumable protocol keeps large WAV uploads out of a single media POST.
        path = Path(path)
        init = self.request('POST', f'https://storage.googleapis.com/upload/storage/v1/b/{self.bucket}/o',
                            params={'uploadType': 'resumable', 'name': key}, json={},
                            headers={'X-Upload-Content-Length': str(path.stat().st_size), 'X-Upload-Content-Type': 'application/octet-stream'})
        with path.open('rb') as stream:
            # Session URL is an authenticated upload capability; never log it.
            result = requests.put(init.headers['Location'], data=stream,
                                  headers={'Content-Length': str(path.stat().st_size)}, timeout=(30, 900))
            result.raise_for_status()
        return {'key': key, 'size': path.stat().st_size, 'sha256': digest(path)}

    def download(self, key, path, expected=None):
        path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(path.suffix+'.part')
        r = self.request('GET', self.url(key), params={'alt': 'media'}, stream=True)
        if r.status_code == 404: raise FileNotFoundError(key)
        try:
            with temporary.open('wb') as out:
                for chunk in r.iter_content(1024*1024): out.write(chunk)
            if expected and (temporary.stat().st_size != expected['size'] or digest(temporary) != expected['sha256']):
                raise ValueError('云端产物校验失败。')
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
            r.close()


def digest(path):
    h = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()
