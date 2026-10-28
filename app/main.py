import base64
import json
import os
import re
import shutil
import subprocess
import threading
import uuid
import wave
from pathlib import Path
from urllib.parse import urlparse

import imageio_ffmpeg
import requests
import yt_dlp
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, SecretStr

from app.tablature import to_tab
from app.intro_refinement import refine_intro
from app.vocal_timing import beat_grid, refine_vocal_timing
from app.fingerstyle_evidence import analyze_backing as analyze_fingerstyle_backing
from app.ai_fingerstyle import request_review, ReviewError

ROOT = Path(__file__).resolve().parent.parent
RUNTIME = ROOT / '.runtime'
RUNTIME.mkdir(exist_ok=True)
app = FastAPI(title='Melody to TAB')
app.mount('/static', StaticFiles(directory=ROOT / 'app/static'), name='static')
jobs = {}
fingerstyle_cache = {}
lock = threading.Lock()


class JobRequest(BaseModel):
    url: str
    start: float = Field(default=0, ge=0, le=86400, allow_inf_nan=False)
    duration: float = Field(default=30, ge=5, le=60, allow_inf_nan=False)
    include_intro: bool = True
    reuse_job_id: str | None = None


def valid_youtube_url(url):
    p = urlparse(url)
    return p.scheme in ('http', 'https') and (p.hostname or '').lower() in ('youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be') and not p.username and not p.password and p.port in (None, 80, 443)


def update(job_id, **fields):
    with lock:
        jobs[job_id].update(fields)
        snapshot = dict(jobs[job_id])
    if snapshot['stage'] in ('done', 'error'):
        (RUNTIME / job_id / 'result.json').write_text(json.dumps(snapshot, ensure_ascii=False), encoding='utf-8')


def find_job(job_id):
    if not re.fullmatch(r'[0-9a-f]{32}', job_id):
        return None
    with lock:
        job = jobs.get(job_id)
        if job:
            return dict(job)
    path = RUNTIME / job_id / 'result.json'
    try:
        return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        return None


def run_job(job_id, request):
    folder = RUNTIME / job_id
    folder.mkdir(mode=0o700)
    try:
        previous = find_job(request.reuse_job_id) if request.reuse_job_id else None
        endpoint = os.environ.get('CLOUD_RUN_URL', '').rstrip('/')
        if not endpoint or urlparse(endpoint).scheme != 'https' or not (urlparse(endpoint).hostname or '').endswith('.run.app'):
            raise RuntimeError('尚未配置私有 Cloud Run 服务。请按照 README 完成云端部署，并设置 CLOUD_RUN_URL。')
        gcloud = shutil.which('gcloud')
        if not gcloud:
            raise RuntimeError('未找到 Google Cloud CLI，请先安装并登录。')
        auth = subprocess.run([gcloud, 'auth', 'print-identity-token'], capture_output=True, text=True, timeout=60)
        if auth.returncode or not auth.stdout.strip():
            raise RuntimeError('Google Cloud 身份验证失败，请运行 gcloud auth login 后重试。')
        update(job_id, stage='downloading', message='正在获取视频音频')
        options = {'format': 'bestaudio/best', 'outtmpl': str(folder / 'source.%(ext)s'), 'noplaylist': True, 'quiet': True, 'no_warnings': True, 'socket_timeout': 30, 'retries': 2, 'js_runtimes': {'node': {}}}
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(request.url, download=False)
            if info.get('is_live') or info.get('live_status') in ('is_live', 'is_upcoming'):
                raise RuntimeError('暂不支持直播或尚未开始的视频。')
            if info.get('duration') and request.start >= info['duration']:
                raise RuntimeError('开始时间超出了视频长度。')
            update(job_id, title=info.get('title') or 'YouTube 音频')
            ydl.download([request.url])
        sources = list(folder.glob('source.*'))
        if not sources:
            raise RuntimeError('没有找到下载的音频文件。')
        update(job_id, stage='preparing', message='正在截取音频片段')
        clip = folder / 'clip.wav'
        proc = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-nostdin', '-v', 'error', '-ss', str(request.start), '-i', str(sources[0]), '-t', str(request.duration), '-ac', '2', '-ar', '44100', '-y', str(clip)], capture_output=True, text=True, timeout=180)
        if proc.returncode or not clip.exists():
            raise RuntimeError('无法截取音频，请检查视频是否可用。')
        with wave.open(str(clip), 'rb') as w:
            clip_duration = w.getnframes() / w.getframerate()
        if clip_duration < 1:
            raise RuntimeError('所选时间没有可用音频，请调整开始时间。')
        update(job_id, duration=clip_duration, stage='separating', message='正在云端分离人声，首次启动可能需要几分钟')
        fields = {'include_intro': str(request.include_intro).lower()}
        if previous and previous.get('notes'):
            intro_end = max(0., previous['start'] - request.start + min(n['start'] for n in previous['notes']))
            fields.update(intro_end=str(min(clip_duration,intro_end)),reuse_voice='true')
        with clip.open('rb') as audio:
            with requests.post(endpoint + '/process', headers={'Authorization': 'Bearer ' + auth.stdout.strip()}, files={'audio': ('clip.wav', audio, 'audio/wav')}, data=fields, stream=True, timeout=(30, 1200)) as response:
                if response.status_code in (401, 403):
                    raise RuntimeError('云端服务拒绝访问，请确认登录账号具有 Cloud Run Invoker 权限。')
                response.raise_for_status()
                result = None
                # Audio arrives as a large base64 JSON line. Larger reads avoid
                # repeatedly copying a growing buffer in requests.iter_lines.
                for line in response.iter_lines(chunk_size=65536):
                    if not line: continue
                    event = json.loads(line)
                    if event.get('stage') == 'transcribing':
                        update(job_id, stage='transcribing', message='人声分离完成，正在识别旋律')
                    elif event.get('stage') == 'instrumental':
                        update(job_id, stage='instrumental', message='正在识别前奏的器乐旋律')
                    elif event.get('stage') == 'accompaniment':
                        update(job_id, stage='accompaniment', message='正在分析和弦与扫弦节奏')
                    elif event.get('error'):
                        raise RuntimeError(event['error'])
                    elif event.get('result'):
                        result = event['result']
                if result is None:
                    raise RuntimeError('云端服务没有返回处理结果。')
                if request.include_intro and 'intro_info' not in result and (result.get('notes') or previous):
                    raise RuntimeError('云端服务尚未支持前奏识别，请完成更新后重试。原来的旋律结果仍然保留。')
        vocal = folder / 'vocals.wav'
        vocal.write_bytes(base64.b64decode(result['vocals'], validate=True))
        backing_url = None
        if result.get('backing'):
            (folder / 'backing.wav').write_bytes(base64.b64decode(result['backing'], validate=True))
            backing_url = f'/api/jobs/{job_id}/backing'
        notes = to_tab(result['notes'])
        if previous and previous.get('notes'):
            offset = previous['start'] - request.start
            notes = [n for n in notes if n.get('source') == 'instrumental_intro']
            notes += [dict(n, start=n['start']+offset, end=n['end']+offset, source='vocal') for n in previous['notes']]
        fixes = []
        if backing_url and any(n.get('source')=='instrumental_intro' for n in notes):
            try:
                notes,fixes=refine_intro(notes,folder/'backing.wav')
            except Exception as exc:
                print('Intro cross-check unavailable:',type(exc).__name__,str(exc),flush=True)
        for source in sources:
            source.unlink(missing_ok=True)
        clip.rename(folder / 'original.wav')
        rhythm_info=None;timing_fixes=[]
        try:
            update(job_id,stage='timing',message='正在对照人声起音和原曲节拍')
            rhythm_info=beat_grid(folder/'original.wav')
            # Explicitly reused melodies may contain hand edits; leave them
            # untouched unless the user requests a separate timing refinement.
            if not previous and any(n.get('source')=='vocal' for n in notes):
                notes,timing_fixes=refine_vocal_timing(notes,folder/'vocals.wav')
        except Exception as exc:
            print('Rhythm analysis unavailable:',type(exc).__name__,str(exc),flush=True)
        intro_info=result.get('intro_info')
        if intro_info and fixes:
            intro_info=dict(intro_info,count=sum(n.get('source')=='instrumental_intro' for n in notes))
        update(job_id, stage='done', message='处理完成' if notes or result.get('accompaniment') else '没有识别到清晰的旋律或节拍，请换一个片段。', notes=notes, vocal_url=f'/api/jobs/{job_id}/vocals', accompaniment=result.get('accompaniment'), original_url=f'/api/jobs/{job_id}/original', backing_url=backing_url, intro_info=intro_info, reused_job_id=request.reuse_job_id, intro_fixes=fixes, rhythm_info=rhythm_info, timing_fixes=timing_fixes)
    except yt_dlp.utils.DownloadError:
        update(job_id, stage='error', message='无法获取该视频的音频。请检查链接、视频是否公开以及网络连接，然后重试。')
    except requests.RequestException as exc:
        print('Cloud connection error:', type(exc).__name__, str(exc), flush=True)
        update(job_id, stage='error', message='连接云端处理服务失败，请检查服务地址、网络与部署状态。')
    except Exception as exc:
        update(job_id, stage='error', message=str(exc) if isinstance(exc, RuntimeError) else '处理失败，请检查服务日志后重试。')
    finally:
        for path in folder.glob('source.*'): path.unlink(missing_ok=True)
        (folder / 'clip.wav').unlink(missing_ok=True)


@app.get('/')
def index():
    return FileResponse(ROOT / 'app/static/index.html')


@app.post('/api/jobs')
def create_job(req: JobRequest):
    try:
        valid = valid_youtube_url(req.url)
    except ValueError:
        valid = False
    if not valid:
        raise HTTPException(400, '请输入有效的 YouTube 视频链接。')
    if req.reuse_job_id:
        previous = find_job(req.reuse_job_id)
        if not previous or previous.get('stage') != 'done' or not previous.get('notes'):
            raise HTTPException(400, '原来的旋律结果不可用，请重新生成。')
        if not req.include_intro or req.url != previous.get('source_url') or req.start != 0 or req.duration < previous['start'] + previous['duration'] - .01:
            raise HTTPException(400, '前奏需从同一视频开头开始，并覆盖原来的旋律片段。')
    with lock:
        if any(j['stage'] not in ('done', 'error') for j in jobs.values()):
            raise HTTPException(409, '已有任务正在处理，请等它完成。')
        job_id = uuid.uuid4().hex
        jobs[job_id] = {'id': job_id, 'stage': 'queued', 'message': '任务已创建', 'start': req.start, 'duration': req.duration, 'source_url': req.url}
    threading.Thread(target=run_job, args=(job_id, req), daemon=True).start()
    return {'id': job_id}


@app.get('/api/jobs/{job_id}')
def get_job(job_id: str):
    job = find_job(job_id)
    if not job: raise HTTPException(404, '任务不存在。')
    return job


@app.get('/api/jobs/{job_id}/vocals')
def vocals(job_id: str):
    job = find_job(job_id)
    if not job or job['stage'] != 'done': raise HTTPException(404, '音频尚不可用。')
    return FileResponse(RUNTIME / job_id / 'vocals.wav', media_type='audio/wav')


class PitchEdits(BaseModel):
    pitches: list[int]


class IntroRefinement(BaseModel):
    start_at: float = Field(default=0, ge=0, le=60, allow_inf_nan=False)


@app.post('/api/jobs/{job_id}/refine-intro')
def refine_existing_intro(job_id: str, request: IntroRefinement):
    job=find_job(job_id)
    if not job or job.get('stage')!='done':
        raise HTTPException(404,'结果不存在。')
    original_folder=RUNTIME/job_id
    if not (original_folder/'backing.wav').is_file():
        raise HTTPException(400,'没有保存伴奏音频，无法核对前奏。')
    try:
        notes,fixes=refine_intro(job.get('notes',[]),original_folder/'backing.wav',request.start_at)
    except Exception as exc:
        print('Intro cross-check failed:',type(exc).__name__,str(exc),flush=True)
        raise HTTPException(500,'前奏核对失败，原结果没有改变。')
    if not fixes:
        raise HTTPException(422,'没有找到有足够音频依据的可修正短音，原结果没有改变。')
    new_id=uuid.uuid4().hex;folder=RUNTIME/new_id
    folder.mkdir(mode=0o700)
    try:
        for filename in ('original.wav','vocals.wav','backing.wav'):
            src=original_folder/filename
            if src.is_file(): shutil.copyfile(src,folder/filename)
        new=dict(job,id=new_id,notes=notes,intro_fixes=fixes,refined_from=job_id)
        new['vocal_url']=f'/api/jobs/{new_id}/vocals'
        new['original_url']=f'/api/jobs/{new_id}/original' if (folder/'original.wav').exists() else None
        new['backing_url']=f'/api/jobs/{new_id}/backing'
        if new.get('intro_info'):
            new['intro_info']=dict(new['intro_info'],count=sum(n.get('source')=='instrumental_intro' for n in notes))
        (folder/'result.json').write_text(json.dumps(new,ensure_ascii=False),encoding='utf-8')
        with lock: jobs[new_id]=new
    except Exception:
        shutil.rmtree(folder,ignore_errors=True)
        raise
    return new


@app.post('/api/jobs/{job_id}/refine-vocal-timing')
def refine_existing_vocal_timing(job_id: str):
    job=find_job(job_id)
    if not job or job.get('stage')!='done':raise HTTPException(404,'结果不存在。')
    original_folder=RUNTIME/job_id
    if not (original_folder/'vocals.wav').is_file() or not (original_folder/'original.wav').is_file():
        raise HTTPException(400,'没有保存原曲和分离人声，无法对照节拍。')
    try:
        notes,fixes=refine_vocal_timing(job.get('notes',[]),original_folder/'vocals.wav')
        rhythm=beat_grid(original_folder/'original.wav')
    except Exception as exc:
        print('Vocal timing cross-check failed:',type(exc).__name__,str(exc),flush=True)
        raise HTTPException(500,'人声节拍核对失败，原结果没有改变。')
    if not fixes and not rhythm:
        raise HTTPException(422,'没有找到足够明确的起音或节拍，原结果没有改变。')
    new_id=uuid.uuid4().hex;folder=RUNTIME/new_id;folder.mkdir(mode=0o700)
    try:
        for filename in ('original.wav','vocals.wav','backing.wav'):
            src=original_folder/filename
            if src.is_file():shutil.copyfile(src,folder/filename)
        new=dict(job,id=new_id,notes=notes,rhythm_info=rhythm,timing_fixes=fixes,refined_from=job_id)
        for kind in ('vocals','original','backing'):
            new[('vocal' if kind=='vocals' else kind)+'_url']=f'/api/jobs/{new_id}/{kind}' if (folder/f'{kind}.wav').exists() else None
        (folder/'result.json').write_text(json.dumps(new,ensure_ascii=False),encoding='utf-8')
        with lock:jobs[new_id]=new
    except Exception:
        shutil.rmtree(folder,ignore_errors=True)
        raise
    return new


@app.get('/api/jobs/{job_id}/fingerstyle-evidence')
def fingerstyle_evidence(job_id: str):
    job=find_job(job_id)
    if not job or job.get('stage')!='done':
        raise HTTPException(404,'结果不存在。')
    path=RUNTIME/job_id/'backing.wav'
    chords=(job.get('accompaniment') or {}).get('chords') or []
    if not path.is_file() or not chords:
        return {'roots':[]}
    if job_id in fingerstyle_cache:
        return {'roots':fingerstyle_cache[job_id]}
    try:
        roots=analyze_fingerstyle_backing(path,chords)
    except Exception as exc:
        print('Fingerstyle evidence unavailable:',type(exc).__name__,str(exc),flush=True)
        return {'roots':[]}
    fingerstyle_cache[job_id]=roots
    return {'roots':roots}


class ReviewNote(BaseModel):
    start: float = Field(ge=0,le=60,allow_inf_nan=False)
    end: float = Field(ge=0,le=60.1,allow_inf_nan=False)
    pitch: int = Field(ge=40,le=84)
    string: int = Field(ge=1,le=6)
    fret: int = Field(ge=0,le=20)
    role: str


class ReviewSlide(BaseModel):
    from_index: int = Field(alias='from',ge=0,le=249)
    to: int = Field(ge=0,le=249)
    start: float = Field(ge=0,le=60,allow_inf_nan=False)
    end: float = Field(ge=0,le=60,allow_inf_nan=False)
    semitones: int = Field(ge=-4,le=4)


class FingerstyleReview(BaseModel):
    api_key: SecretStr
    legato_enabled: bool = True
    extras: list[ReviewNote] = Field(max_length=120)
    slides: list[ReviewSlide] = Field(max_length=120)


@app.post('/api/jobs/{job_id}/ai-fingerstyle')
def ai_fingerstyle(job_id: str, body: FingerstyleReview, request: Request):
    origin=request.headers.get('origin')
    if origin:
        parsed=urlparse(origin)
        if parsed.scheme!='http' or parsed.hostname not in ('127.0.0.1','localhost') or parsed.netloc!=request.headers.get('host'):
            raise HTTPException(403,'请从本机页面使用 AI 审阅。')
    job=find_job(job_id)
    if not job or job.get('stage')!='done':
        raise HTTPException(404,'结果不存在。')
    key=body.api_key.get_secret_value().strip()
    if not key or len(key)>200 or '\n' in key or '\r' in key:
        raise HTTPException(400,'请输入有效的中转站密钥。')
    extras=[note.model_dump() for note in body.extras]
    slides=[slide.model_dump(by_alias=True) for slide in body.slides]
    evidence=fingerstyle_evidence(job_id)['roots']
    try:
        result=request_review(key,job.get('notes',[]),job.get('duration',0),extras,slides,job.get('accompaniment'),evidence,title=job.get('title'),legato_enabled=body.legato_enabled)
        review={'result':result,'notes':job.get('notes',[]),'extras':extras,'slides':slides,'legato_enabled':body.legato_enabled}
        folder=RUNTIME/job_id
        tmp=folder/f'.ai-review-{uuid.uuid4().hex}.tmp'
        try:
            tmp.write_text(json.dumps(review,ensure_ascii=False),encoding='utf-8')
            os.replace(tmp,folder/'ai-fingerstyle-review.json')
        finally:
            tmp.unlink(missing_ok=True)
        return result
    except ReviewError as exc:
        raise HTTPException(400,str(exc)) from None


@app.get('/api/jobs/{job_id}/ai-fingerstyle-review')
def get_fingerstyle_review(job_id: str):
    job=find_job(job_id)
    if not job or job.get('stage')!='done':raise HTTPException(404,'结果不存在。')
    try:
        review=json.loads((RUNTIME/job_id/'ai-fingerstyle-review.json').read_text(encoding='utf-8'))
    except (OSError,ValueError):
        return {'review':None}
    return {'review':review}


@app.delete('/api/jobs/{job_id}/ai-fingerstyle-review')
def delete_fingerstyle_review(job_id: str,request: Request):
    origin=request.headers.get('origin')
    if origin:
        parsed=urlparse(origin)
        if parsed.scheme!='http' or parsed.hostname not in ('127.0.0.1','localhost') or parsed.netloc!=request.headers.get('host'):
            raise HTTPException(403,'请从本机页面恢复原指弹。')
    job=find_job(job_id)
    if not job or job.get('stage')!='done':raise HTTPException(404,'结果不存在。')
    (RUNTIME/job_id/'ai-fingerstyle-review.json').unlink(missing_ok=True)
    return {'ok':True}


@app.get('/api/jobs/{job_id}/{kind}')
def reference_audio(job_id: str, kind: str):
    job = find_job(job_id)
    if not job or job.get('stage') != 'done' or kind not in ('original', 'backing'):
        raise HTTPException(404, '对照音频不存在。')
    path = RUNTIME / job_id / f'{kind}.wav'
    if not path.is_file():
        raise HTTPException(404, '这份旧结果没有保存对照音频，请重新处理。')
    return FileResponse(path, media_type='audio/wav')


@app.put('/api/jobs/{job_id}/notes')
def edit_notes(job_id: str, edits: PitchEdits):
    job = find_job(job_id)
    if not job or job.get('stage') != 'done':
        raise HTTPException(404, '结果不存在。')
    old = job.get('notes', [])
    if len(edits.pitches) != len(old) or any(p < 40 or p > 84 for p in edits.pitches):
        raise HTTPException(400, '音符数量或音高不正确。')
    entries = []
    for note, pitch in zip(old, edits.pitches):
        item = dict(note)
        if pitch != note['pitch']:
            item['uncertain'] = False
        item['pitch'] = pitch
        entries.append(item)
    job['notes'] = to_tab(entries)
    (RUNTIME / job_id / 'result.json').write_text(json.dumps(job, ensure_ascii=False), encoding='utf-8')
    with lock:
        jobs[job_id] = job
    return job
