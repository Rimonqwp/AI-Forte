"""Select a cautious instrumental lead before the first confirmed sung phrase."""
from math import isfinite
import numpy as np


def safe_vocal_boundary(notes, detected, duration):
    """Never use instrumental inference to overwrite a previously found vocal note."""
    earliest = min((float(n['start']) for n in notes), default=float(duration))
    if detected is None:
        return min(float(duration), earliest), 'uncertain_vocal' if notes else 'instrumental_only'
    return min(float(duration), earliest, float(detected)), 'detected_vocal'


def find_vocal_start(notes, vocal, original, sr):
    """Require both a voiced phrase and enough separated-vocal energy.

    A small vocal-stem leakage or a lone transient must not truncate an intro.
    Return None when a convincing sung phrase cannot be established.
    """
    candidates = []
    for note in sorted(notes, key=lambda n: n['start']):
        if note.get('confidence', 0) < .5 or note['end']-note['start'] < .09:
            continue
        lo = max(0, int(note['start']*sr)); hi = min(len(vocal), len(original), int(note['end']*sr))
        if hi <= lo:
            continue
        a = float(np.sqrt(np.mean(vocal[lo:hi]**2)))
        b = float(np.sqrt(np.mean(original[lo:hi]**2)))
        if a >= .008 and a >= .23*max(b, .001):
            candidates.append(note)
    for i, note in enumerate(candidates):
        # Short sequences of at least three stable notes or a sustained note
        # form a phrase. Intermittent leakage is not enough by itself.
        near = [n for n in candidates[i:] if n['start'] <= note['start']+1.8]
        if len(near)>=3 and sum(n['end']-n['start'] for n in near)>=.35:
            return float(note['start'])
        if note['end']-note['start']>=.65:
            return float(note['start'])
    return None


def select_intro_lead(events, stop):
    """Create one cautious melodic line from polyphonic Basic Pitch events.

    This is a heuristic, not a source-isolated solo. All generated notes are
    flagged for review; the sung melody is kept separately and takes priority.
    """
    eligible = []
    for item in events:
        try:
            start, end, pitch, amp = float(item['start']), float(item['end']), int(item['pitch']), float(item.get('confidence', 0))
        except (KeyError, ValueError, TypeError, OverflowError):
            continue
        end = min(end, stop)
        if not all(isfinite(x) for x in (start,end,amp)) or start<0 or end-start<.10 or not 55<=pitch<=84 or amp<.3:
            continue
        eligible.append({'start':start,'end':end,'pitch':pitch,'confidence':amp})
    if not eligible:
        return []
    # At overlapping notes, favor a strong, smoothly moving upper voice instead
    # of indiscriminately selecting the highest or the loudest harmonic.
    points=sorted({v for n in eligible for v in (n['start'],n['end'])})
    output=[];previous=None
    for lo,hi in zip(points,points[1:]):
        if hi-lo<.01: continue
        active=[n for n in eligible if n['start']<hi-1e-7 and n['end']>lo+1e-7]
        if not active: continue
        def score(n):
            continuity=0 if previous is None else .018*min(12,abs(n['pitch']-previous))
            return n['confidence']+.10*(n['pitch']-55)/29-continuity
        note=max(active,key=score)
        if output and output[-1]['pitch']==note['pitch'] and abs(output[-1]['end']-lo)<1e-6:
            output[-1]['end']=hi
        else:
            output.append({'start':lo,'end':hi,'pitch':note['pitch'],'confidence':note['confidence'],
                           'uncertain':True,'refined':False,'source':'instrumental_intro'})
        previous=note['pitch']
    return [n for n in output if n['end']-n['start']>=.10]
