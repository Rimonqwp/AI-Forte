import numpy as np
from cloud.harmony import PITCH_NAMES, chord_frets, parse_chord, voice_tones, reconcile_chords, TUNING


def test_all_guitar_voicings_match_the_reported_chord():
    tuning = (40,45,50,55,59,64)
    for root in range(12):
        for minor in (False, True):
            frets = chord_frets(root, minor)
            pitches = {(tuning[i]+f)%12 for i,f in enumerate(frets) if f >= 0}
            assert pitches == {root,(root+(3 if minor else 4))%12,(root+7)%12}
            assert all(-1 <= f <= 15 for f in frets)


def test_arrangement_follows_detected_beats_and_uses_playable_chords(tmp_path):
    import soundfile as sf
    from cloud.harmony import analyze_backing
    sr = 22050
    length = 8 * sr
    audio = np.zeros(length, dtype=np.float32)
    for beat in range(16):
        start = int(beat * .5 * sr)
        t = np.arange(int(.38 * sr)) / sr
        tones = sum(np.sin(2*np.pi*f*t) for f in (130.81, 164.81, 196.0))
        audio[start:start+len(t)] += .12 * tones * np.exp(-5*t)
        audio[start:start+100] += np.linspace(.25, 0, 100)
    path = tmp_path / 'chords.wav'
    sf.write(path, audio, sr)
    arrangement = analyze_backing(path)
    assert arrangement and 90 <= arrangement['bpm'] <= 150
    assert arrangement['strums'] and any(c['label'] == 'C' for c in arrangement['chords'])
    for stroke in arrangement['strums']:
        chord = next(c for c in arrangement['chords'] if c['start'] <= stroke['time'] < c['end'])
        assert stroke['chord'] == chord['label']
        assert stroke['frets'] == chord['frets']
        assert stroke['direction'] in ('up', 'down')


def test_silent_backing_does_not_invent_chords(tmp_path):
    import soundfile as sf
    from cloud.harmony import analyze_backing
    path = tmp_path / 'silent.wav'
    sf.write(path, np.zeros(22050 * 2), 22050)
    assert analyze_backing(path) is None


def test_silence_between_chords_and_single_note_riff_remain_empty(tmp_path):
    import soundfile as sf
    from cloud.harmony import analyze_backing, TUNING
    sr = 22050
    audio = np.zeros(sr*8)
    # A real C triad, then silence, then a repeated D with natural overtones.
    for beat in range(16):
        if 6 <= beat < 10:
            continue
        start = int(beat*.5*sr); t = np.arange(int(.4*sr))/sr
        frequencies = [130.81,164.81,196.] if beat < 6 else [146.83]
        for frequency in frequencies:
            for h in range(1,5):
                audio[start:start+len(t)] += .08/h*np.sin(2*np.pi*frequency*h*t)*np.exp(-6*t)
    path = tmp_path/'sparse.wav'; sf.write(path,audio,sr)
    arrangement = analyze_backing(path)
    assert arrangement and any(s['time'] < 2.5 for s in arrangement['strums'])
    assert not any(3.3 < s['time'] < 4.8 for s in arrangement['strums'])
    assert not any(s['time'] > 5.5 for s in arrangement['strums'])
    for stroke in arrangement['strums']:
        assert { (TUNING[i]+f)%12 for i,f in enumerate(stroke['frets']) if f>=0 } <= {0,4,7}
        assert stroke['time'] < stroke['end'] <= 8


def test_sevenths_inversions_and_enharmonic_names():
    assert parse_chord('Bbmaj7')['tones'] == {10,2,5,9}
    assert parse_chord('F6')['tones'] == {5,9,0,2}
    assert parse_chord('D7/F#')['bass'] == 6
    assert parse_chord('D7/Gb')['bass'] == 6
    assert parse_chord('N') is None
    assert parse_chord('not a chord') is None


def test_conflicting_thirds_are_removed_and_insufficient_overlap_is_silent():
    primary = [{'start':0.,'label':'Dm'},{'start':2.,'label':'G'}]
    original = [{'start':0.,'label':'D7/F#'},{'start':2.,'label':'Cm7'}]
    result = reconcile_chords(primary, original, 4.)
    first = result[0]
    assert first['label'] == 'D5' and first['uncertain'] and first['reduced']
    assert {(TUNING[i]+f)%12 for i,f in enumerate(first['frets']) if f>=0} == {2,9}
    assert result[1]['label'] == 'N' and result[1]['frets'] == [-1]*6
    assert result[0]['end'] == 2 and result[-1]['end'] == 4


def test_extended_chord_voicings_do_not_change_key_or_drop_the_seventh():
    for root in PITCH_NAMES:
        for quality in ('','m','7','m7','maj7','6','m7b5'):
            chord = parse_chord(root+quality)
            frets = voice_tones(tuple(sorted(chord['tones'])), chord['bass'])
            pitches = [(TUNING[i]+f)%12 for i,f in enumerate(frets) if f>=0]
            assert set(pitches) == chord['tones'], (root,quality,frets)
            assert pitches[0] == chord['bass'], (root,quality,frets)
            pressed = [f for f in frets if f>0]
            assert max(pressed)-min(pressed)<=3


def test_missing_reference_and_unknown_chord_never_become_major():
    result = reconcile_chords([{'start':.2,'label':'F'}], [{'start':.5,'label':'N'}], 2.)
    assert all(c['label'] == 'N' for c in result)
