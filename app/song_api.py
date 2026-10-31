"""Version 2 editing API; raw analysis is immutable and separate from revisions."""
import io
import json
import re
import uuid
import zipfile
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel, Field, SecretStr

from cloud.music import arrange, select_melody, lead_path
from app.midi_export import midi
from app.song_store import Conflict
from app.ai_fingerstyle import request_review, ReviewError


class Revision(BaseModel):
    revision: int = Field(ge=0)


class Selection(Revision):
    start: float = Field(ge=0, allow_inf_nan=False)
    end: float = Field(gt=0, allow_inf_nan=False)
    track_id: str | None = None  # None is rest; auto=True removes the override.
    auto: bool = False


class NotePatch(Revision):
    id: str | None = None
    delete: bool = False
    start: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    end: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    pitch: int | None = Field(default=None, ge=0, le=127)


class Settings(Revision):
    density: str = Field(default='rich', pattern='^(rich|sparse)$')
    slides: bool = True
    legato: bool = True
    vocal_focus: bool = True


class ReviewRange(Revision):
    start: float = Field(ge=0, allow_inf_nan=False)
    end: float = Field(gt=0, allow_inf_nan=False)
    api_key: SecretStr


def effective_arrangement(job):
    import copy
    draft = copy.deepcopy(job['arrangement'])
    review = job.get('ai_review')
    if review:
        a, b = review['start'], review['end']
        draft['extras'] = [n for n in draft['extras'] if not a <= n['start'] < b or n['id'] in review['kept_extra_ids']]
        draft['slides'] = [s for s in draft['slides'] if not a <= s['end'] < b or f'{s["from"]}:{s["to"]}' in review['kept_slide_keys']]
        draft['events'] = sorted(draft['melody']+draft['extras'], key=lambda n: (n['start'], n['string']))
    return draft


def regenerate(job, analysis):
    job['arrangement'] = arrange(job['melody'], analysis['tracks'], job['duration'], job.get('settings'),
                                analysis.get('accompaniment'), job.get('muscriptor_enabled', False))
    job['notes'] = job['arrangement']['melody']
    job['settings'] = job['arrangement']['settings']
    return job


def make_router(store, manager):
    router = APIRouter()

    def get(job_id, ready=True):
        if not re.fullmatch('[0-9a-f]{32}', job_id): raise HTTPException(404, '任务不存在。')
        job = store.get(job_id)
        if not job: raise HTTPException(404, '新版任务不存在。')
        if ready and job['stage'] not in ('done', 'partial'): raise HTTPException(409, '任务尚未完成。')
        if ready and job.get('files_cleaned'): raise HTTPException(410, '此任务的本机分析文件已清理，请重新处理。')
        return job

    def analysis(job_id):
        job = store.get(job_id)
        return json.loads((store.root/job_id/job.get('analysis_file', 'analysis.json')).read_text(encoding='utf-8'))

    def revise(job_id, revision, fn):
        get(job_id)
        try: return store.revise(job_id, revision, fn)
        except Conflict as exc: raise HTTPException(409, str(exc)) from None

    @router.get('/api/jobs/{job_id}/tracks')
    def tracks(job_id: str):
        job = get(job_id)
        data = analysis(job_id)
        return {'revision': job['revision'], 'tracks': [dict(t, melody_candidates=lead_path(t['notes']), audio_url=f'/api/jobs/{job_id}/tracks/{t["id"]}/audio') for t in data['tracks']], 'overrides': job.get('overrides', [])}

    @router.post('/api/jobs/{job_id}/ai-review-range')
    def review(job_id: str, body: ReviewRange):
        job = get(job_id)
        if job['revision'] != body.revision: raise HTTPException(409, '结果已经更新，请重新加载。')
        if not body.start < body.end <= job['duration'] or body.end-body.start > 30:
            raise HTTPException(400, '请选择不超过 30 秒的有效区间。')
        key = body.api_key.get_secret_value().strip()
        if not key or len(key) > 200 or '\n' in key or '\r' in key: raise HTTPException(400, '请输入有效密钥。')
        draft = job['arrangement']
        # Include ringing preceding melody in validation, not just attacks in range.
        indices = [i for i, n in enumerate(draft['melody']) if n['start'] < body.end and
                   (draft['melody'][i+1]['start'] if i+1 < len(draft['melody']) else n['end']) > body.start]
        mapping = {old: new for new, old in enumerate(indices)}
        def crop(n): return dict(n, start=max(0., n['start']-body.start), end=min(body.end-body.start, n['end']-body.start))
        notes = [crop(draft['melody'][i]) for i in indices]
        for n in notes: n['end'] = max(n['start']+.001, n['end'])
        extras = [n for n in draft['extras'] if body.start <= n['start'] < body.end]
        global_slides = [s for s in draft['slides'] if s['from'] in mapping and s['to'] in mapping and body.start <= s['end'] < body.end]
        slides = [dict(s, **{'from': mapping[s['from']], 'to': mapping[s['to']],
                             'start': max(0., s['start']-body.start), 'end': s['end']-body.start}) for s in global_slides]
        harmony = {'chords': [crop(c) for c in (job.get('accompaniment') or {}).get('chords', []) if c['start'] < body.end and c['end'] > body.start]}
        try:
            result = request_review(key, notes, body.end-body.start, [crop(n) for n in extras], slides,
                                    harmony, [], title=job.get('title'), legato_enabled=job['settings']['legato'])
        except ReviewError as exc: raise HTTPException(400, str(exc)) from None
        record = {'start': body.start, 'end': body.end, 'result': result,
                  'kept_extra_ids': [extras[i]['id'] for i in result['keep_extras']],
                  'kept_slide_keys': [f'{global_slides[i]["from"]}:{global_slides[i]["to"]}' for i in result['keep_slides']]}
        return revise(job_id, body.revision, lambda j: dict(j, ai_review=record))

    @router.delete('/api/jobs/{job_id}/ai-review-range')
    def reset_review(job_id: str, body: Revision):
        return revise(job_id, body.revision, lambda j: j)

    @router.get('/api/jobs/{job_id}/tracks/{track_id}/audio')
    def audio(job_id: str, track_id: str):
        get(job_id)
        track = next((t for t in analysis(job_id)['tracks'] if t['id'] == track_id), None)
        if track is None: raise HTTPException(404)
        # Transcription-only tracks (MuScriptor) point at the stem audio they were checked against.
        relative = track.get('audio_file', f'tracks/{track_id}.flac')
        if not relative or not re.fullmatch(r'tracks/[a-z0-9_-]+\.flac', relative): raise HTTPException(404, '该声部音频不可用。')
        path = store.root/job_id/relative
        if not path.exists(): raise HTTPException(404, '该声部音频不可用。')
        return FileResponse(path, media_type='audio/flac')

    @router.put('/api/jobs/{job_id}/melody-selection')
    def selection(job_id: str, body: Selection):
        job, raw = get(job_id), analysis(job_id)
        if not body.start < body.end <= job['duration']: raise HTTPException(400, '时间范围越界。')
        if body.track_id is not None and body.track_id not in {t['id'] for t in raw['tracks']}:
            raise HTTPException(400, '未知声部。')
        def change(j):
            overrides = []
            for o in j.get('overrides', []):
                if o['end'] <= body.start or o['start'] >= body.end: overrides.append(o)
                else:
                    if o['start'] < body.start: overrides.append(dict(o, end=body.start))
                    if o['end'] > body.end: overrides.append(dict(o, start=body.end))
            if not body.auto: overrides.append({'start': body.start, 'end': body.end, 'track_id': body.track_id})
            j['overrides'] = sorted(overrides, key=lambda x: x['start'])
            selected = select_melody(raw['tracks'], j['duration'], j['overrides'], j.get('dual_enabled', False),
                                     j.get('muscriptor_enabled', False))
            # Re-select only the requested interval; retain edits outside it, including crossing notes.
            keep = []
            for n in j['melody']:
                if n['end'] <= body.start or n['start'] >= body.end: keep.append(n)
                else:
                    if n['start'] < body.start: keep.append(dict(n, end=body.start))
                    if n['end'] > body.end: keep.append(dict(n, id=uuid.uuid4().hex, start=body.end))
            keep.extend(dict(n, start=max(n['start'], body.start), end=min(n['end'], body.end))
                        for n in selected if n['start'] < body.end and n['end'] > body.start)
            j['melody'] = sorted(keep, key=lambda n: n['start'])
            return regenerate(j, raw)
        return revise(job_id, body.revision, change)

    @router.patch('/api/jobs/{job_id}/notes')
    def patch(job_id: str, body: NotePatch):
        job, raw = get(job_id), analysis(job_id)
        def change(j):
            notes = j['melody']
            n = next((n for n in notes if n['id'] == body.id), None)
            if body.id and n is None: raise HTTPException(404, '音符不存在。')
            if body.delete:
                if n is None: raise HTTPException(400, '请选择要删除的音符。')
                notes.remove(n)
            else:
                if n is None:
                    if any(x is None for x in (body.start, body.end, body.pitch)): raise HTTPException(400, '补音需要开始、结束和音高。')
                    n = {'id': uuid.uuid4().hex, 'source': 'manual', 'track_id': 'manual', 'confidence': 1., 'velocity': 80}
                    notes.append(n)
                for key in ('start', 'end', 'pitch'):
                    value = getattr(body, key)
                    if value is not None: n[key] = value
                if not 0 <= n['start'] < n['end'] <= j['duration']: raise HTTPException(400, '音符时间越界。')
                n['original_pitch'] = n['pitch']; n['uncertain'] = False; n['edited'] = True
                n.pop('locked_position', None)
            notes.sort(key=lambda n: n['start'])
            if any(a['end'] > b['start']+.001 for a, b in zip(notes, notes[1:])):
                raise HTTPException(400, '主旋律音符不能重叠，请先调整相邻音符。')
            return regenerate(j, raw)
        return revise(job_id, body.revision, change)

    @router.put('/api/jobs/{job_id}/arrangement-settings')
    def settings(job_id: str, body: Settings):
        raw = analysis(job_id) if get(job_id) else None
        def change(j):
            j['settings'] = body.model_dump(exclude={'revision'})
            return regenerate(j, raw)
        return revise(job_id, body.revision, change)

    @router.post('/api/jobs/{job_id}/undo')
    def undo(job_id: str, body: Revision):
        current = get(job_id)
        def change(j):
            old = store.prior(job_id, current.get('undo_cursor', body.revision))
            if not old: raise HTTPException(400, '没有更早的修订。')
            old['undo_cursor'] = old['revision']
            return old
        return revise(job_id, body.revision, change)

    @router.post('/api/jobs/{job_id}/cancel')
    def cancel(job_id: str):
        get(job_id, False)
        return manager.cancel(job_id)

    @router.post('/api/jobs/{job_id}/retry')
    def retry(job_id: str):
        job = get(job_id, False)
        if job['stage'] not in ('error', 'cancelled', 'partial'): raise HTTPException(409, '此任务无需重试。')
        try: return manager.retry(job_id)
        except RuntimeError as exc: raise HTTPException(409, str(exc)) from None

    @router.delete('/api/jobs/{job_id}/local-files')
    def cleanup(job_id: str):
        job = get(job_id, False)
        if job['stage'] not in ('done', 'partial', 'error', 'cancelled'): raise HTTPException(409, '请先取消任务。')
        # Only enumerated task-owned artifacts; preserve the result and revision history.
        import shutil
        folder = (store.root/job_id).resolve()
        if folder.parent != store.root.resolve(): raise HTTPException(400)
        for child in folder.iterdir() if folder.exists() else []:
            if child.is_dir(): shutil.rmtree(child)
            else: child.unlink()
        return store.update(job_id, files_cleaned=True)

    @router.get('/api/jobs/{job_id}/exports/{kind}')
    def export(job_id: str, kind: str):
        job, raw = get(job_id), analysis(job_id)
        tracks = [(f'{t["model"]}/{t["stem"]}', t['notes']) for t in raw['tracks']]
        if kind == 'melody': data = midi([('Original melody', job['melody'])])
        elif kind == 'fingerstyle':
            events = effective_arrangement(job)['events']
            data = midi([(role, [n for n in events if n['role'] == role]) for role in ('melody', 'bass', 'fill')])
        elif kind == 'multitrack': data = midi(tracks)
        elif kind.startswith('track-'):
            tid = kind[6:]
            track = next((t for t in raw['tracks'] if t['id'] == tid), None)
            if not track: raise HTTPException(404)
            data = midi([(f'{track["model"]}/{track["stem"]}', track['notes'])])
        elif kind == 'bundle':
            out = io.BytesIO()
            with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
                archive.writestr('result.json', json.dumps(job, ensure_ascii=False, indent=2))
                archive.writestr('analysis.json', json.dumps(raw, ensure_ascii=False))
                archive.writestr('multitrack.mid', midi(tracks))
                archive.writestr('melody.mid', midi([('Original melody', job['melody'])]))
                archive.writestr('fingerstyle.mid', midi([(r, [n for n in effective_arrangement(job)['events'] if n['role'] == r]) for r in ('melody', 'bass', 'fill')]))
                for t in raw['tracks']: archive.writestr(f'tracks/{t["id"]}.mid', midi([(t['stem'], t['notes'])]))
            return Response(out.getvalue(), media_type='application/zip', headers={'Content-Disposition': f'attachment; filename="{job_id}-r{job["revision"]}.zip"'})
        else: raise HTTPException(404)
        return Response(data, media_type='audio/midi', headers={'Content-Disposition': f'attachment; filename="{kind}-r{job["revision"]}.mid"'})

    return router
