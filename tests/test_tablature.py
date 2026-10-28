from app.tablature import monophonic, to_tab, TUNING


def test_overlapping_notes_selects_stronger_and_keeps_timing():
    notes = to_tab([{'start':0,'end':1,'pitch':60,'confidence':.9}, {'start':.4,'end':1.4,'pitch':64,'confidence':.2}])
    assert [(n['start'], n['end'], n['original_pitch']) for n in notes] == [(0, 1, 60), (1, 1.4, 64)]
    assert all(TUNING[n['string'] - 1] + n['fret'] == n['pitch'] and 0 <= n['fret'] <= 20 for n in notes)


def test_silence_bad_data_and_octave_shift():
    assert monophonic([]) == []
    assert monophonic([{'start':0,'end':.01,'pitch':60}, {'start':float('nan'),'end':1,'pitch':60}]) == []
    notes = to_tab([{'start':0,'end':1,'pitch':20}, {'start':1,'end':2,'pitch':100}])
    assert [n['octave_shift'] for n in notes] == [2, -2]
    assert all(TUNING[n['string'] - 1] + n['fret'] == n['pitch'] for n in notes)


def test_adjacent_positions_are_optimized():
    notes = to_tab([{'start':i,'end':i+.8,'pitch':pitch} for i,pitch in enumerate([60,62,64,65])])
    assert max(abs(a['fret']-b['fret']) for a,b in zip(notes,notes[1:])) <= 3


def test_repeated_adjacent_notes_stay_separate():
    notes = to_tab([{'start':0,'end':.5,'pitch':60}, {'start':.5,'end':1,'pitch':60}])
    assert len(notes) == 2
    assert notes[0]['end'] == notes[1]['start']
