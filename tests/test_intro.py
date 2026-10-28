import numpy as np
from cloud.intro import find_vocal_start, safe_vocal_boundary, select_intro_lead


def test_first_uncertain_vocal_is_not_overwritten_by_a_later_confident_phrase():
    notes = [{'start':1.0}, {'start':3.0}]
    assert safe_vocal_boundary(notes, 3.0, 10) == (1.0, 'detected_vocal')
    assert safe_vocal_boundary(notes, None, 10) == (1.0, 'uncertain_vocal')
    assert safe_vocal_boundary([], None, 10) == (10.0, 'instrumental_only')


def test_find_vocal_start_ignores_isolated_and_quiet_leakage():
    sr = 100
    original = np.ones(sr*5)*.2
    vocal = np.ones(sr*5)*.005
    notes = [{'start': .5, 'end': .75, 'pitch': 65, 'confidence': .9}]
    assert find_vocal_start(notes, vocal, original, sr) is None
    vocal[sr*2:] = .1
    notes += [{'start':2+i*.3, 'end':2.2+i*.3,'pitch':60+i,'confidence':.9} for i in range(3)]
    assert find_vocal_start(notes, vocal, original, sr) == 2


def test_instrumental_notes_stay_before_vocal_and_remove_polyphony():
    events = [{'start':0,'end':.7,'pitch':60,'confidence':.8}, {'start':0,'end':.7,'pitch':48,'confidence':.99},
              {'start':.7,'end':1.8,'pitch':62,'confidence':.8}, {'start':1.5,'end':2.5,'pitch':65,'confidence':.4}]
    notes=select_intro_lead(events,1.6)
    assert notes and notes[0]['pitch']==60
    assert all(n['end']<=1.6 and n['source']=='instrumental_intro' and n['uncertain'] for n in notes)
    assert all(a['end']<=b['start'] for a,b in zip(notes,notes[1:]))


def test_silence_and_only_low_or_weak_events_yield_no_intro():
    assert select_intro_lead([],3)==[]
    assert select_intro_lead([{'start':0,'end':2,'pitch':43,'confidence':.9}, {'start':0,'end':2,'pitch':70,'confidence':.1}],3)==[]
