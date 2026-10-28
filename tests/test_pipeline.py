import base64
import io
import json
import wave
from types import SimpleNamespace

import app.main as main


def wav_bytes():
    out = io.BytesIO()
    with wave.open(out, 'wb') as audio:
        audio.setnchannels(2); audio.setsampwidth(2); audio.setframerate(44100)
        audio.writeframes(b'\0\0\0\0' * 44100 * 2)
    return out.getvalue()


def test_full_task_uses_selected_segment_and_returns_vocals(monkeypatch, tmp_path):
    monkeypatch.setattr(main, 'RUNTIME', tmp_path)
    monkeypatch.setenv('CLOUD_RUN_URL', 'https://example.run.app')
    monkeypatch.setattr(main.shutil, 'which', lambda _: '/fake/gcloud')
    calls = []
    def command(args, **kwargs):
        calls.append(args)
        if 'auth' in args:
            return SimpleNamespace(returncode=0, stdout='test-token', stderr='')
        (tmp_path / 'job' / 'clip.wav').write_bytes(wav_bytes())
        return SimpleNamespace(returncode=0, stdout='', stderr='')
    monkeypatch.setattr(main.subprocess, 'run', command)
    monkeypatch.setattr(main.imageio_ffmpeg, 'get_ffmpeg_exe', lambda: '/fake/ffmpeg')
    class Youtube:
        def __init__(self, options): self.options = options
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def extract_info(self, url, download=False): return {'duration': 60, 'title': 'Example'}
        def download(self, urls): (tmp_path / 'job' / 'source.webm').write_bytes(b'fake')
    monkeypatch.setattr(main.yt_dlp, 'YoutubeDL', Youtube)
    class Response:
        status_code = 200
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def raise_for_status(self): pass
        def iter_lines(self, chunk_size=512):
            assert chunk_size == 65536
            yield json.dumps({'stage': 'transcribing'}).encode()
            yield json.dumps({'result': {'vocals': base64.b64encode(wav_bytes()).decode(), 'backing': base64.b64encode(wav_bytes()).decode(), 'intro_info': {'state':'empty','count':0}, 'notes': [{'start': .5, 'end': 1.2, 'pitch': 60, 'confidence': .9}]}}).encode()
    monkeypatch.setattr(main.requests, 'post', lambda *args, **kwargs: Response())
    main.jobs['job'] = {'id': 'job', 'stage': 'queued'}
    main.run_job('job', main.JobRequest(url='https://youtu.be/example', start=5, duration=10))
    result = main.jobs.pop('job')
    assert result['stage'] == 'done'
    assert result['duration'] == 2
    assert result['notes'][0]['start'] == .5
    assert (tmp_path / 'job' / 'vocals.wav').is_file()
    assert not (tmp_path / 'job' / 'clip.wav').exists()
    assert (tmp_path / 'job' / 'original.wav').read_bytes() == wav_bytes()
    assert (tmp_path / 'job' / 'backing.wav').read_bytes() == wav_bytes()
    assert result['original_url'] == '/api/jobs/job/original'
    assert result['backing_url'] == '/api/jobs/job/backing'
    ffmpeg = calls[1]
    assert ffmpeg[ffmpeg.index('-ss') + 1] == '5.0'
    assert ffmpeg[ffmpeg.index('-t') + 1] == '10.0'


def test_clip_start_beyond_video_reports_error(monkeypatch, tmp_path):
    monkeypatch.setattr(main, 'RUNTIME', tmp_path)
    monkeypatch.setenv('CLOUD_RUN_URL', 'https://example.run.app')
    monkeypatch.setattr(main.shutil, 'which', lambda _: '/fake/gcloud')
    monkeypatch.setattr(main.subprocess, 'run', lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout='test-token'))
    class Youtube:
        def __init__(self, options): pass
        def __enter__(self): return self
        def __exit__(self, *args): pass
        def extract_info(self, url, download=False): return {'duration': 10}
    monkeypatch.setattr(main.yt_dlp, 'YoutubeDL', Youtube)
    main.jobs['bad'] = {'id': 'bad', 'stage': 'queued'}
    main.run_job('bad', main.JobRequest(url='https://youtu.be/example', start=11, duration=10))
    job = main.jobs.pop('bad')
    assert job['stage'] == 'error' and '超出' in job['message']


def test_prepend_intro_preserves_edited_previous_melody_and_sends_exact_boundary(monkeypatch,tmp_path):
    monkeypatch.setattr(main,'RUNTIME',tmp_path)
    monkeypatch.setenv('CLOUD_RUN_URL','https://example.run.app')
    monkeypatch.setattr(main.shutil,'which',lambda _:'/fake/gcloud')
    prior_id='b'*32
    old={'id':prior_id,'stage':'done','source_url':'https://youtu.be/example','start':.5,'duration':1,
         'notes':[{'start':.5,'end':.9,'pitch':62,'string':2,'fret':3,'confidence':.91,'uncertain':False}]}
    folder=tmp_path/prior_id;folder.mkdir();(folder/'result.json').write_text(json.dumps(old))
    def command(args,**kwargs):
        if 'auth' in args:return SimpleNamespace(returncode=0,stdout='test-token',stderr='')
        (tmp_path/'job'/'clip.wav').write_bytes(wav_bytes());return SimpleNamespace(returncode=0,stdout='',stderr='')
    monkeypatch.setattr(main.subprocess,'run',command)
    monkeypatch.setattr(main.imageio_ffmpeg,'get_ffmpeg_exe',lambda:'/fake/ffmpeg')
    class Youtube:
        def __init__(self,options):pass
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def extract_info(self,url,download=False):return {'duration':30,'title':'Example'}
        def download(self,urls):(tmp_path/'job'/'source.webm').write_bytes(b'fake')
    monkeypatch.setattr(main.yt_dlp,'YoutubeDL',Youtube)
    received={}
    class Response:
        status_code=200
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def raise_for_status(self):pass
        def iter_lines(self, chunk_size=512):
            assert chunk_size == 65536
            result={'vocals':base64.b64encode(wav_bytes()).decode(),'notes':[{'start':.1,'end':.4,'pitch':67,'confidence':.8,'source':'instrumental_intro','uncertain':True}], 'intro_info':{'state':'detected','count':1,'end':1.0}}
            yield json.dumps({'result':result}).encode()
    def post(*args,**kwargs):received.update(kwargs['data']);return Response()
    monkeypatch.setattr(main.requests,'post',post)
    main.jobs['job']={'id':'job','stage':'queued'}
    main.run_job('job',main.JobRequest(url=old['source_url'],start=0,duration=5,reuse_job_id=prior_id))
    result=main.jobs.pop('job')
    assert received=={'include_intro':'true','intro_end':'1.0','reuse_voice':'true'}
    assert result['intro_info']['state']=='detected' and result['reused_job_id']==prior_id
    assert [(n['start'],n['pitch'],n['source']) for n in result['notes']]==[(.1,67,'instrumental_intro'),(1.,62,'vocal')]
    assert result['notes'][1]['fret']==3 and result['notes'][1]['string']==2
    assert json.loads((folder/'result.json').read_text())==old
