"""One durable local queue, cloud execution reconciliation and artifact import."""
import json
import os
import re
import shutil
import subprocess
import threading
import time
import uuid
import wave
from pathlib import Path

import imageio_ffmpeg
import requests
import yt_dlp

from app.song_api import regenerate
from app.song_store import TERMINAL
from cloud.music import select_melody
from cloud.objects import Objects, digest


class SongManager:
    def __init__(self, store, previous):
        self.store, self.previous = store, previous
        self.stop_event = threading.Event()
        self.thread = None

    def start(self):
        if self.thread and self.thread.is_alive(): return
        self.stop_event.clear()
        self.thread = threading.Thread(target=self.loop, daemon=True, name='song-queue')
        self.thread.start()

    def token(self):
        exe = shutil.which('gcloud')
        if not exe: raise RuntimeError('未找到 gcloud，请配置 Google Cloud CLI。')
        result = subprocess.run([exe, 'auth', 'print-access-token'], capture_output=True, text=True, timeout=60)
        if result.returncode: raise RuntimeError('Google Cloud 登录失效，请运行 gcloud auth login。')
        return result.stdout.strip()

    def config(self):
        bucket = os.environ.get('SONG_BUCKET', '')
        resource = os.environ.get('SONG_JOB_RESOURCE', '')
        if not re.fullmatch(r'[a-z0-9][a-z0-9._-]{1,220}', bucket) or not re.fullmatch(r'projects/[^/]+/locations/[^/]+/jobs/[^/]+', resource):
            raise RuntimeError('整曲模式尚未部署：请设置 SONG_BUCKET 和 SONG_JOB_RESOURCE，参阅 README。')
        return bucket, resource

    def api(self, method, path, **kwargs):
        r = requests.request(method, 'https://run.googleapis.com/v2/'+path,
                             headers={'Authorization': 'Bearer '+self.token()}, timeout=(30, 90), **kwargs)
        r.raise_for_status()
        return r.json()

    def create(self, request):
        self.config()
        job_id = uuid.uuid4().hex
        job = {'id': job_id, 'schema_version': 2, 'stage': 'queued', 'message': '已排队',
               'source_url': request.url, 'start': 0. if request.mode == 'full' else request.start,
               'duration': request.duration, 'request': request.model_dump(), 'revision': 0,
               'attempt': uuid.uuid4().hex, 'notes': [], 'warnings': [], 'overrides': [],
               'dual_enabled': os.environ.get('SONG_DUAL_VALIDATED', '0') == '1',
               'muscriptor_enabled': os.environ.get('SONG_MUSCRIPTOR_VALIDATED', '0') == '1'}
        self.store.create(job)
        self.start()
        return {'id': job_id}

    def loop(self):
        # OS lock survives individual step exceptions and is released on process exit.
        # A second uvicorn process may serve the same SQLite state but cannot dispatch.
        self.queue_lock = (self.store.root/'queue.lock').open('a+b')
        self.queue_lock.seek(0); self.queue_lock.write(b'0'); self.queue_lock.flush()
        locked = False
        while not self.stop_event.is_set():
            if not locked:
                try:
                    self.queue_lock.seek(0)
                    if os.name == 'nt':
                        import msvcrt
                        msvcrt.locking(self.queue_lock.fileno(), msvcrt.LK_NBLCK, 1)
                    else:
                        import fcntl
                        fcntl.flock(self.queue_lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    locked = True
                except OSError:
                    self.stop_event.wait(5)
                    continue
            pending = [j for j in self.store.list() if j['stage'] not in TERMINAL]
            if pending:
                job = pending[0]
                try: self.step(job)
                except FileNotFoundError:
                    self.store.update(job['id'], stage='error', uploaded=False,
                                      message='云端文件已过期或不存在；重试会从本机音频重新上传。')
                except (requests.RequestException, OSError) as exc:
                    # Transient monitoring errors do not discard execution identity.
                    self.store.update(job['id'], message='连接暂时中断，将重新查询；可以关闭页面。', last_error=type(exc).__name__)
                except Exception as exc:
                    self.store.update(job['id'], stage='error', message=str(exc) if isinstance(exc, (RuntimeError, ValueError)) else '整曲处理失败，请检查服务日志。')
                    print('Song task error:', type(exc).__name__, str(exc), flush=True)
            self.stop_event.wait(5)
        self.queue_lock.close()

    def prepare(self, job, objects):
        folder = self.store.root/job['id']; folder.mkdir(exist_ok=True)
        original = folder/'original.wav'
        if not original.exists():
            self.store.update(job['id'], stage='downloading', message='正在下载并检查完整音频')
            req = job['request']
            prior = self.previous(req['reuse_job_id']) if req.get('reuse_job_id') else None
            prior_audio = self.store.root/(req.get('reuse_job_id') or '')/'original.wav'
            if prior and prior_audio.is_file() and job['start'] == prior['start'] and (req['mode'] == 'segment' and abs(req['duration']-prior['duration']) < .1):
                shutil.copyfile(prior_audio, original)
                title = prior.get('title', '复用音频')
            else:
                opts = {'format': 'bestaudio/best', 'outtmpl': str(folder/'source.%(ext)s'), 'noplaylist': True,
                        'quiet': True, 'no_warnings': True, 'socket_timeout': 30, 'retries': 2, 'js_runtimes': {'node': {}}}
                with yt_dlp.YoutubeDL(opts) as downloader:
                    info = downloader.extract_info(job['source_url'], download=False)
                    length = info.get('duration')
                    if info.get('is_live') or info.get('live_status') in ('is_live', 'is_upcoming'):
                        raise RuntimeError('不支持直播或预告视频。')
                    if not length: raise RuntimeError('无法确认视频长度，请选择有明确时长的视频。')
                    if req['mode'] == 'full' and length > 600: raise RuntimeError('整曲最长支持 10 分钟，请选择片段。')
                    if job['start'] >= length: raise RuntimeError('开始时间超出视频长度。')
                    downloader.download([job['source_url']])
                source = next(folder.glob('source.*'))
                seconds = length if req['mode'] == 'full' else min(req['duration'], length-job['start'])
                subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-nostdin', '-v', 'error', '-ss', str(job['start']), '-i', str(source),
                                '-t', str(seconds), '-ac', '2', '-ar', '44100', '-c:a', 'pcm_s16le', '-y', str(folder/'preparing.wav')], check=True, timeout=600)
                (folder/'preparing.wav').replace(original)
                for p in folder.glob('source.*'): p.unlink()
                title = info.get('title', 'YouTube 音频')
            with wave.open(str(original)) as w: duration = w.getnframes()/w.getframerate()
            if not 1 <= duration <= 600.1: raise RuntimeError('没有可处理的音频，或时长超出 10 分钟。')
            self.store.update(job['id'], duration=duration, title=title)
        if self.store.get(job['id'])['stage'] == 'cancelled': return
        with wave.open(str(original)) as w: duration = w.getnframes()/w.getframerate()
        self.store.update(job['id'], stage='uploading', duration=duration, message='正在上传整曲音频')
        input_info = objects.upload(f'{job["id"]}/input.wav', original)
        objects.put(f'{job["id"]}/request.json', {'schema_version': 2, 'id': job['id'], 'duration': duration, 'input': input_info})
        self.store.update(job['id'], uploaded=True)

    def find_execution(self, resource, attempt):
        token = None
        while True:
            page = self.api('GET', resource+'/executions', params={'pageSize': 100, **({'pageToken': token} if token else {})})
            for execution in page.get('executions', []):
                if any(e.get('name') == 'SONG_ATTEMPT' and e.get('value') == attempt
                       for c in execution.get('template', {}).get('containers', []) for e in c.get('env', [])):
                    return execution
            token = page.get('nextPageToken')
            if not token: return None

    def step(self, job):
        bucket, resource = self.config()
        objects = Objects(bucket, self.token)
        if not job.get('uploaded'):
            self.prepare(job, objects)
            return
        execution = None
        if job.get('execution'):
            execution = self.api('GET', job['execution'])
        else:
            execution = self.find_execution(resource, job['attempt'])
            if execution:
                self.store.update(job['id'], execution=execution['name'])
            elif not job.get('submit_intent'):
                # Persist BEFORE sending a side-effectful request. Unknown outcomes are reconciled only.
                self.store.update(job['id'], submit_intent=time.time(), stage='submitted', message='已提交云端，等待执行')
                operation = self.api('POST', resource+':run', json={'overrides': {'containerOverrides': [{'env': [
                    {'name': 'SONG_ID', 'value': job['id']}, {'name': 'SONG_ATTEMPT', 'value': job['attempt']}]}]}})
                self.store.update(job['id'], operation=operation.get('name'))
                return
            elif time.time()-job['submit_intent'] > 600:
                raise RuntimeError('提交结果无法确认。未重复启动云端任务；请检查 Cloud Run 执行记录后重试。')
            if not execution and job.get('operation'):
                operation = self.api('GET', job['operation'])
                if operation.get('done') and operation.get('error'):
                    raise RuntimeError('云端拒绝执行：'+operation['error'].get('message', '请检查配额与权限。'))
        status = objects.read(f'{job["id"]}/status.json')
        if status and status.get('attempt') == job['attempt']:
            self.store.update(job['id'], stage='analyzing', message=status.get('message', '正在分析'), progress=status.get('progress'), warnings=status.get('warnings', []))
        manifest = objects.read(f'{job["id"]}/manifest.json')
        if manifest and manifest.get('attempt') == job['attempt'] and (not execution or not execution.get('cancelledCount')):
            self.finish(job, objects, manifest)
            return
        if execution and execution.get('completionTime') and not execution.get('succeededCount'):
            raise RuntimeError('云端执行未完成分析，请重试以复用检查点。')

    def finish(self, job, objects, manifest):
        self.store.update(job['id'], stage='importing', message='正在校验分轨结果并生成指弹谱')
        folder = self.store.root/job['id']
        for artifact in manifest['artifacts']:
            relative = Path(artifact['path'])
            if relative.is_absolute() or '..' in relative.parts: raise ValueError('无效产物路径。')
            if artifact['path'] != 'analysis.json' and not re.fullmatch(r'tracks/[a-z0-9_-]+\.flac', artifact['path']):
                raise ValueError('未知产物类型。')
            if artifact['path'] == 'analysis.json': relative = Path('analyses')/f'{job["attempt"]}.json'
            target = folder/relative
            if not target.resolve().is_relative_to(folder.resolve()): raise ValueError('产物路径越界。')
            if target.is_file() and digest(target) == artifact['sha256']: continue
            objects.download(artifact['key'], target, artifact)
        analysis_file = f'analyses/{job["attempt"]}.json'
        path = folder/analysis_file
        if not path.exists(): path = folder/'analysis.json'  # Legacy import fixtures only.
        raw = json.loads(path.read_text(encoding='utf-8'))
        latest = self.store.get(job['id'])
        if latest['stage'] == 'cancelled': return
        melody = select_melody(raw['tracks'], latest['duration'], latest.get('overrides', []), latest['dual_enabled'],
                               latest.get('muscriptor_enabled', False))
        # Explicit reuse keeps user pitches and positions in the original-video time range.
        prior_id = latest['request'].get('reuse_job_id')
        prior = self.previous(prior_id) if prior_id else None
        if prior and not latest.get('revision'):
            offset = prior['start']-latest['start']
            a, b = max(0, offset), min(latest['duration'], offset+prior['duration'])
            melody = [n for n in melody if n['end'] <= a or n['start'] >= b]
            melody += [dict(n, id=n.get('id') or uuid.uuid4().hex, start=n['start']+offset,
                            end=n['end']+offset, original_pitch=n['pitch'], locked_position=True)
                       for n in prior.get('notes', []) if 0 <= n['start']+offset < n['end']+offset <= latest['duration']]
            melody.sort(key=lambda n: n['start'])
        warnings = list(raw.get('warnings', []))
        if latest.get('revision', 0) > 0:
            melody = latest['melody']
            warnings.append('分析已恢复；已保留当前旋律修订。可按段恢复自动选轨以使用新候选。')
        latest.update(melody=melody, analysis_file=analysis_file if path.name != 'analysis.json' else 'analysis.json',
                      settings=latest.get('settings', {'density': 'rich', 'slides': True, 'legato': True, 'vocal_focus': True}),
                      accompaniment=raw.get('accompaniment'), rhythm_info=raw.get('rhythm_info'),
                      warnings=warnings, original_url=f'/api/jobs/{job["id"]}/original',
                      vocal_url=f'/api/jobs/{job["id"]}/tracks/htdemucs_ft-vocals/audio' if any(t['id'] == 'htdemucs_ft-vocals' for t in raw['tracks']) else None)
        latest = regenerate(latest, raw)
        latest.update(stage='partial' if raw.get('warnings') else 'done', message='已生成初稿，请对照原曲核对。')
        self.store.update(job['id'], **{k: v for k, v in latest.items() if k != 'id'})

    def cancel(self, job_id):
        job = self.store.get(job_id)
        if job['stage'] in TERMINAL: return job
        job = self.store.update(job_id, stage='cancelled', message='已取消；正在通知云端停止')
        bucket, resource = self.config()
        Objects(bucket, self.token).put(f'{job_id}/cancel.json', {'attempt': job['attempt']})
        execution = self.api('GET', job['execution']) if job.get('execution') else self.find_execution(resource, job['attempt'])
        if execution and not execution.get('completionTime'): self.api('POST', execution['name']+':cancel', json={})
        return self.store.update(job_id, message='已取消')

    def retry(self, job_id):
        job = self.store.get(job_id)
        _, resource = self.config()
        old = self.find_execution(resource, job['attempt']) if job.get('submit_intent') else None
        if old and not old.get('completionTime'):
            if job['stage'] == 'cancelled': raise RuntimeError('云端正在停止旧执行，请稍后重试。')
            return self.store.update(job_id, stage='analyzing', execution=old['name'], message='已重新关联现有执行')
        # Ambiguous submissions must not be blindly replayed.
        if job.get('submit_intent') and not old and not job.get('operation'):
            raise RuntimeError('提交状态不明确，请先在 Cloud Run 确认执行记录；系统不会重复计费启动。')
        result = self.store.update(job_id, stage='queued', attempt=uuid.uuid4().hex,
                                   submit_intent=None, operation=None, execution=None,
                                   uploaded=False if job.get('files_cleaned') else job.get('uploaded', False),
                                   files_cleaned=False, message='已排队，将复用分析检查点')
        self.start()
        return result
