import json
import pytest
from app.ai_fingerstyle import request_review, validate_candidates, ReviewError, parse_response

NOTES=[{'start':0,'end':.3,'pitch':64,'string':2,'fret':5,'source':'vocal'},
       {'start':.5,'end':.8,'pitch':66,'string':2,'fret':7,'source':'vocal'}]
EXTRAS=[{'start':0,'end':.25,'pitch':45,'string':5,'fret':0,'role':'bass'}]
SLIDES=[{'from':0,'to':1,'start':.4,'end':.5,'semitones':2}]


def test_review_sends_only_the_score_and_accepts_candidate_ids(monkeypatch):
    import app.ai_fingerstyle as ai
    seen={}
    class Response:
        status_code=200
        ok=True
        def json(self):return {'choices':[{'message':{'content':'```json\n{"keep_extras":[0],"keep_slides":[],"reason":"减少滑音"}\n```'}}]}
    def post(url,**kwargs):seen.update(url=url,**kwargs);return Response()
    monkeypatch.setattr(ai.requests,'post',post)
    result=request_review('test-secret',NOTES,1,EXTRAS,SLIDES,{'chords':[]},[],title='歌曲测试',legato_enabled=False)
    assert result=={'keep_extras':[0],'keep_slides':[],'reason':'减少滑音'}
    assert seen['url']==ai.ENDPOINT and seen['allow_redirects'] is False
    assert seen['headers']['Authorization']=='Bearer test-secret'
    assert 'test-secret' not in json.dumps(seen['json'])
    sent=json.loads(seen['json']['messages'][1]['content'])
    assert sent['melody']==NOTES and sent['extras'][0]['id']==0 and 'audio' not in sent and 'source_url' not in sent
    assert sent['song_title']=='歌曲测试' and sent['playback_context']['continuous_sustain'] is False
    assert '【滑音：有作用、不过度】' in seen['json']['messages'][0]['content']


def test_invalid_suggestions_cannot_add_or_modify_notes():
    for content in ['{"keep_extras":[1],"keep_slides":[],"reason":"x"}',
                    '{"keep_extras":[0,0],"keep_slides":[],"reason":"x"}',
                    '{"keep_extras":[true],"keep_slides":[],"reason":"x"}',
                    '{"keep_extras":[],"keep_slides":[],"reason":"x","extra":1}',
                    'not json']:
        with pytest.raises(ReviewError):parse_response({'choices':[{'message':{'content':content}}]},1,1)
    with pytest.raises(ReviewError):validate_candidates(NOTES,1,[{**EXTRAS[0],'pitch':47}],SLIDES)
    with pytest.raises(ReviewError):validate_candidates(NOTES,1,EXTRAS,[{**SLIDES[0],'to':0}])


def test_relay_rejects_secret_without_exposing_it(monkeypatch):
    import app.ai_fingerstyle as ai
    class Response:
        status_code=401
        ok=False
    monkeypatch.setattr(ai.requests,'post',lambda *args,**kwargs:Response())
    with pytest.raises(ReviewError) as exc:
        request_review('super-secret',NOTES,1,EXTRAS,SLIDES,{},[])
    assert '密钥' in str(exc.value) and 'super-secret' not in str(exc.value)


def test_rich_draft_does_not_silently_drop_all_arpeggios(monkeypatch):
    import app.ai_fingerstyle as ai
    class Response:
        status_code=200
        ok=True
        def json(self):return {'choices':[{'message':{'content':'{"keep_extras":[],"keep_slides":[],"reason":"omit"}'}}]}
    monkeypatch.setattr(ai.requests,'post',lambda *args,**kwargs:Response())
    fills=[{'start':0,'end':.2,'pitch':57,'string':3,'fret':2,'role':'fill'},
           {'start':.25,'end':.4,'pitch':59,'string':3,'fret':4,'role':'fill'}]
    with pytest.raises(ReviewError,match='分解音'):
        request_review('key',NOTES,1,fills,[],{},[])
