"""Review an existing, bounded fingerstyle draft using a user-supplied relay key."""
import json
import re
from pathlib import Path

import requests

ENDPOINT = 'https://happyapi.org/v1/chat/completions'
MODEL = 'claude-opus-5-5'
TUNING = [64, 59, 55, 50, 45, 40]
SYSTEM = (Path(__file__).parent / 'prompts' / 'fingerstyle_review.txt').read_text(encoding='utf-8').strip()


class ReviewError(Exception):
    pass


def _hold(a, b):
    return a == 0 or b == 0 or abs(a-b) <= 4


def validate_candidates(notes, duration, extras, slides):
    if len(notes)>250 or len(extras)>120 or len(slides)>120:
        raise ReviewError('谱子过长，请缩短片段后重试。')
    for item in extras:
        if not (0 <= item['start'] < item['end'] <= duration+.001 and
                1 <= item['string'] <= 6 and 0 <= item['fret'] <= 20 and
                item['pitch'] == TUNING[item['string']-1]+item['fret'] and item['role'] in ('bass','fill')):
            raise ReviewError('指弹候选音符无效，请刷新页面重试。')
        for i, note in enumerate(notes):
            ring_end = notes[i+1]['start'] if i+1<len(notes) else note['end']
            if ring_end <= item['start'] or note['start'] >= item['end']:
                continue
            if note['string']==item['string'] or not _hold(note['fret'], item['fret']):
                raise ReviewError('指弹候选音符与旋律的指位冲突，请刷新页面重试。')
    for i, item in enumerate(extras):
        for other in extras[i+1:]:
            if other['end']<=item['start'] or other['start']>=item['end']:continue
            if other['string']==item['string'] or not _hold(other['fret'],item['fret']):
                raise ReviewError('指弹候选音符之间存在指位冲突，请刷新页面重试。')
    for slide in slides:
        i=slide['from']
        if i<0 or i+1>=len(notes) or slide['to']!=i+1:
            raise ReviewError('滑音候选无效，请刷新页面重试。')
        a,b=notes[i:i+2];delta=b['fret']-a['fret']
        if not (a['string']==b['string'] and a['fret']>0 and b['fret']>0 and 1<=abs(delta)<=4 and
                slide['semitones']==delta and b['pitch']-a['pitch']==delta and
                a['start']<=slide['start']<slide['end'] and abs(slide['end']-b['start'])<.001):
            raise ReviewError('滑音候选无效，请刷新页面重试。')
        for item in extras:
            if item['start']<slide['end'] and item['end']>slide['start'] and (item['string']==a['string'] or not _hold(item['fret'],b['fret'])):
                raise ReviewError('滑音与其他音符的指位冲突，请刷新页面重试。')


def parse_response(data, extra_count, slide_count):
    try:
        content=data['choices'][0]['message']['content']
        if not isinstance(content,str) or len(content)>16000:
            raise ValueError('invalid content')
        content=re.sub(r'^```(?:json)?\s*|\s*```$', '', content.strip(), flags=re.I)
        result=json.loads(content)
        if not isinstance(result,dict) or set(result)!={'keep_extras','keep_slides','reason'}:raise ValueError('invalid fields')
        reason=result['reason']
        if not isinstance(reason,str) or not reason.strip():raise ValueError('invalid reason')
        output={}
        for field,count in [('keep_extras',extra_count),('keep_slides',slide_count)]:
            ids=result[field]
            if not isinstance(ids,list) or len(ids)>count or any(type(i) is not int or i<0 or i>=count for i in ids) or len(set(ids))!=len(ids) or ids!=sorted(ids):
                raise ValueError('invalid ids')
            output[field]=ids
        output['reason']=reason.strip()[:600]
        return output
    except (KeyError, IndexError, TypeError, ValueError, json.JSONDecodeError) as exc:
        raise ReviewError('模型返回的建议格式无效，原谱没有改变。') from exc


def request_review(key, notes, duration, extras, slides, accompaniment, evidence, title=None, legato_enabled=True):
    validate_candidates(notes,duration,extras,slides)
    # Do not send the URL, audio, credentials (except the HTTP auth
    # header), or unrelated job data to the relay.
    melody=[{k:n[k] for k in ('start','end','pitch','string','fret','source') if k in n} for n in notes]
    chords=[{k:c[k] for k in ('start','end','label','uncertain','reduced') if k in c} for c in (accompaniment or {}).get('chords',[])]
    clarified_evidence=[{**{k:v for k,v in e.items() if k!='agreed'},
                         'source_agreement':'同根音、和弦类型略有分歧' if e.get('agreed') else '两路和弦名称一致'} for e in evidence]
    draft={'song_title':title,'duration':duration,
           'playback_context':{'continuous_sustain':legato_enabled,
              'timing_note':'音符 start/end 是识别或编配的原始时间；开启连续延音时试听可能持续至后一个音或同弦拨弦，采样会自然衰减，实际响度与实际时长无法从这些字段确定。' if legato_enabled else '音符 start/end 是识别或编配的原始时间；播放包络与采样自然衰减可能使实际时长稍有不同。'},
           'melody':melody,'chords':chords,'bass_evidence':clarified_evidence,
           'extras':[dict(item,id=i) for i,item in enumerate(extras)],
           'slides':[dict(item,id=i) for i,item in enumerate(slides)]}
    payload={'model':MODEL,'messages':[{'role':'system','content':SYSTEM},{'role':'user','content':json.dumps(draft,ensure_ascii=False,separators=(',',':'))}],'max_tokens':3600}
    try:
        response=requests.post(ENDPOINT,headers={'Authorization':'Bearer '+key},json=payload,timeout=(15,120),allow_redirects=False)
    except requests.RequestException as exc:
        raise ReviewError('无法连接中转站，请检查网络后重试。') from exc
    if response.status_code in (401,403):raise ReviewError('中转站拒绝了密钥，请检查密钥或模型权限。')
    if response.status_code==429:raise ReviewError('中转站额度不足或请求过于频繁，请检查账户后重试。')
    if not response.ok:raise ReviewError(f'中转站返回错误（HTTP {response.status_code}），请检查模型是否可用。')
    try: data=response.json()
    except ValueError as exc:raise ReviewError('中转站返回了无法识别的结果。') from exc
    result=parse_response(data,len(extras),len(slides))
    available_fills=sum(item['role']=='fill' for item in extras)
    kept_fills=sum(extras[i]['role']=='fill' for i in result['keep_extras'])
    if available_fills>=2 and kept_fills<2:
        raise ReviewError('模型没有保留足够的分解音，原谱没有改变；可以重试。')
    return result
