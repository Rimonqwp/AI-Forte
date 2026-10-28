from fastapi.testclient import TestClient
from app.main import app, valid_youtube_url

client = TestClient(app)


def test_url_validation_and_duration():
    assert valid_youtube_url('https://youtu.be/abc')
    assert not valid_youtube_url('https://youtube.com.evil.example/watch?v=abc')
    assert not valid_youtube_url('https://youtube.com@evil.example/watch?v=abc')
    assert client.post('/api/jobs', json={'url':'https://evil.example','start':0,'duration':30}).status_code == 400
    assert client.post('/api/jobs', json={'url':'https://youtu.be/abc','start':0,'duration':61}).status_code == 422
    assert client.post('/api/jobs', json={'url':'https://youtu.be/abc','start':-1,'duration':30}).status_code == 422


def test_index_and_unknown_job():
    assert client.get('/').status_code == 200
    assert client.get('/api/jobs/not-a-job').status_code == 404
    assert client.get('/api/jobs/not-a-job/vocals').status_code == 404


def test_note_editor_saves_and_retains_repeated_notes(monkeypatch, tmp_path):
    import json
    import app.main as main
    job_id = 'a' * 32
    folder = tmp_path / job_id
    folder.mkdir()
    monkeypatch.setattr(main, 'RUNTIME', tmp_path)
    job = {'id': job_id, 'stage': 'done', 'notes': [
        {'start': 0, 'end': .5, 'pitch': 60, 'confidence': .9},
        {'start': .5, 'end': 1, 'pitch': 62, 'confidence': .9},
    ]}
    (folder / 'result.json').write_text(json.dumps(job))
    response = client.put(f'/api/jobs/{job_id}/notes', json={'pitches': [60, 60]})
    assert response.status_code == 200
    assert len(response.json()['notes']) == 2
    assert json.loads((folder / 'result.json').read_text())['notes'][1]['pitch'] == 60
    assert client.put(f'/api/jobs/{job_id}/notes', json={'pitches': [12]}).status_code == 400
    main.jobs.pop(job_id, None)


def test_prepend_only_accepts_same_source_and_complete_previous_span(monkeypatch,tmp_path):
    import json
    import app.main as main
    monkeypatch.setattr(main,'RUNTIME',tmp_path)
    old_id='c'*32;folder=tmp_path/old_id;folder.mkdir()
    (folder/'result.json').write_text(json.dumps({'id':old_id,'stage':'done','source_url':'https://youtu.be/a','start':15,'duration':20,'notes':[{'start':1,'end':2,'pitch':60}]}))
    base={'url':'https://youtu.be/a','start':0,'duration':35,'reuse_job_id':old_id}
    assert client.post('/api/jobs',json={**base,'url':'https://youtu.be/b'}).status_code==400
    assert client.post('/api/jobs',json={**base,'duration':20}).status_code==400
    assert client.post('/api/jobs',json={**base,'start':1}).status_code==400
    assert client.post('/api/jobs',json={**base,'include_intro':False}).status_code==400


def test_intro_refinement_creates_a_separate_result(monkeypatch, tmp_path):
    import json
    import app.main as main
    monkeypatch.setattr(main, 'RUNTIME', tmp_path)
    job_id='d'*32
    folder=tmp_path/job_id
    folder.mkdir()
    notes=[{'start':1,'end':2,'pitch':60,'source':'instrumental_intro'},
           {'start':9,'end':10,'pitch':67,'source':'instrumental_intro'},
           {'start':16,'end':17,'pitch':62,'source':'vocal'}]
    job={'id':job_id,'stage':'done','notes':notes,'intro_info':{'state':'detected','count':2}}
    original=json.dumps(job)
    (folder/'result.json').write_text(original)
    for name in ('backing.wav','original.wav','vocals.wav'):
        (folder/name).write_bytes(name.encode())
    fixed=[dict(n) for n in notes]
    fixed[1]['end']=9.9
    monkeypatch.setattr(main,'refine_intro',lambda n,p,start: (fixed,[{'start':9.5}]))
    result=client.post(f'/api/jobs/{job_id}/refine-intro',json={'start_at':6})
    assert result.status_code==200
    new=result.json()
    assert new['id']!=job_id and new['refined_from']==job_id
    assert new['notes'][0]==notes[0] and new['notes'][-1]==notes[-1]
    assert (folder/'result.json').read_text()==original
    assert client.get(new['original_url']).content==b'original.wav'
    assert client.get(new['vocal_url']).content==b'vocals.wav'
    monkeypatch.setattr(main,'refine_intro',lambda n,p,start:(n,[]))
    assert client.post(f'/api/jobs/{job_id}/refine-intro',json={'start_at':6}).status_code==422
    assert client.post(f'/api/jobs/{job_id}/refine-intro',json={'start_at':-1}).status_code==422
    (folder/'backing.wav').unlink()
    assert client.post(f'/api/jobs/{job_id}/refine-intro',json={'start_at':6}).status_code==400
    main.jobs.pop(job_id,None)
    main.jobs.pop(new['id'],None)


def test_fingerstyle_evidence_requires_backing_and_reuses_analysis(monkeypatch,tmp_path):
    import json
    import app.main as main
    monkeypatch.setattr(main,'RUNTIME',tmp_path)
    job_id='e'*32;folder=tmp_path/job_id;folder.mkdir()
    (folder/'result.json').write_text(json.dumps({'id':job_id,'stage':'done','accompaniment':{'chords':[{'start':0,'end':2,'label':'C','uncertain':False}]}}))
    assert client.get(f'/api/jobs/{job_id}/fingerstyle-evidence').json()=={'roots':[]}
    (folder/'backing.wav').write_bytes(b'audio')
    calls=[]
    def analyze(path,chords):
        calls.append((path,chords))
        return [{'start':0,'end':2,'pitch_class':0,'ratio':1}]
    monkeypatch.setattr(main,'analyze_fingerstyle_backing',analyze)
    result=client.get(f'/api/jobs/{job_id}/fingerstyle-evidence')
    assert result.status_code==200 and result.json()['roots'][0]['pitch_class']==0
    assert client.get(f'/api/jobs/{job_id}/fingerstyle-evidence').json()==result.json()
    assert len(calls)==1
    main.fingerstyle_cache.pop(job_id,None)


def test_ai_review_uses_local_job_and_does_not_save_or_return_secret(monkeypatch,tmp_path):
    import json
    import app.main as main
    monkeypatch.setattr(main,'RUNTIME',tmp_path)
    job_id='f'*32;folder=tmp_path/job_id;folder.mkdir()
    job={'id':job_id,'stage':'done','duration':1,'notes':[{'start':0,'end':.3,'pitch':64,'string':2,'fret':5}]}
    original=json.dumps(job);(folder/'result.json').write_text(original)
    called=[]
    def fake(key,notes,duration,extras,slides,accompaniment,evidence,title=None,legato_enabled=True):
        called.append((key,notes));return {'keep_extras':[],'keep_slides':[],'reason':'测试结果'}
    monkeypatch.setattr(main,'request_review',fake)
    payload={'api_key':'test-secret','extras':[],'slides':[]}
    assert client.post(f'/api/jobs/{job_id}/ai-fingerstyle',json=payload,headers={'Origin':'https://evil.example'}).status_code==403
    result=client.post(f'/api/jobs/{job_id}/ai-fingerstyle',json=payload)
    assert result.status_code==200 and 'test-secret' not in result.text
    assert called==[('test-secret',job['notes'])] and (folder/'result.json').read_text()==original
    saved=client.get(f'/api/jobs/{job_id}/ai-fingerstyle-review').json()['review']
    assert saved['result']['reason']=='测试结果' and 'test-secret' not in json.dumps(saved)
    assert client.delete(f'/api/jobs/{job_id}/ai-fingerstyle-review',headers={'Origin':'https://evil.example'}).status_code==403
    assert client.delete(f'/api/jobs/{job_id}/ai-fingerstyle-review').json()=={'ok':True}
    assert client.get(f'/api/jobs/{job_id}/ai-fingerstyle-review').json()=={'review':None}


def test_vocal_timing_creates_separate_copy_and_keeps_original(monkeypatch,tmp_path):
    import json
    import app.main as main
    monkeypatch.setattr(main,'RUNTIME',tmp_path)
    job_id='1'*32;folder=tmp_path/job_id;folder.mkdir()
    notes=[{'start':1,'end':2,'pitch':60,'source':'instrumental_intro'},
           {'start':3,'end':3.5,'pitch':62,'source':'vocal'}]
    job={'id':job_id,'stage':'done','notes':notes};original=json.dumps(job)
    (folder/'result.json').write_text(original)
    for filename in ('original.wav','vocals.wav','backing.wav'):(folder/filename).write_bytes(filename.encode())
    fixed=[dict(n) for n in notes];fixed[1]['start']=2.97
    monkeypatch.setattr(main,'refine_vocal_timing',lambda n,p:(fixed,[{'index':1,'before':3,'after':2.97}]))
    monkeypatch.setattr(main,'beat_grid',lambda p:{'bpm':120,'beats':[0,.5,1], 'regularity':1})
    r=client.post(f'/api/jobs/{job_id}/refine-vocal-timing');assert r.status_code==200
    new=r.json();assert new['id']!=job_id and new['notes'][0]==notes[0] and new['notes'][1]['pitch']==62
    assert new['notes'][1]['start']==2.97 and new['refined_from']==job_id and (folder/'result.json').read_text()==original
    assert client.get(new['vocal_url']).content==b'vocals.wav'
    (folder/'vocals.wav').unlink();assert client.post(f'/api/jobs/{job_id}/refine-vocal-timing').status_code==400
    main.jobs.pop(new['id'],None)
