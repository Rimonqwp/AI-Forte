import base64
import json
import wave

from cloud.main import process


def test_silence_returns_empty_notes_and_audio_without_demucs(tmp_path):
    folder = tmp_path / 'job'
    folder.mkdir()
    clip = folder / 'clip.wav'
    with wave.open(str(clip), 'wb') as audio:
        audio.setnchannels(2)
        audio.setsampwidth(2)
        audio.setframerate(44100)
        audio.writeframes(b'\0\0\0\0' * 44100)
    original = clip.read_bytes()
    events = [json.loads(line) for line in process(clip, folder)]
    result = events[-1]['result']
    assert result['notes'] == []
    assert base64.b64decode(result['vocals']) == original
    assert not folder.exists()


def test_pitch_cross_check_corrects_uncertain_note(tmp_path):
    import numpy as np
    from cloud.main import refine_pitch
    sr = 22050
    t = np.arange(sr) / sr
    clip = tmp_path / 'tone.wav'
    with wave.open(str(clip), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(sr)
        audio.writeframes((np.sin(2 * np.pi * 440 * t) * 20000).astype('<i2').tobytes())
    events = [{'start': .05, 'end': .95, 'pitch': 70, 'confidence': .4}]
    result = refine_pitch(events, clip)
    assert result[0]['pitch'] == 69
    assert result[0]['model_pitch'] == 70 and result[0]['refined']
    confident = refine_pitch([{'start': .05, 'end': .95, 'pitch': 70, 'confidence': .9}], clip)[0]
    assert confident['pitch'] == 70 and confident['uncertain']


def test_contour_transcription_retains_stable_notes_and_ignores_brief_slides():
    import numpy as np
    from cloud.main import contour_to_notes
    from app.tablature import to_tab
    # First phrase: B-string 3,1,3,1,3 then G-string 3,2,3,5.
    sequence = [(62,12),(60,11),(62,17),(60,24),(62,29),(58,24),(56,6),(57,23),(58,16),(60,30)]
    pitches = []
    for pitch, frames in sequence:
        pitches += [-1] * 5 + [pitch] * frames
    midi = np.asarray(pitches)
    voiced = midi >= 0
    f0 = np.full(len(midi), np.nan)
    f0[voiced] = 440 * 2 ** ((midi[voiced] - 69) / 12)
    probability = np.where(voiced, .9, 0.)
    notes = to_tab(contour_to_notes(f0, voiced, probability, sample_rate=100, hop_length=1))
    assert [n['pitch'] for n in notes] == [62,60,62,60,62,58,57,58,60]
    assert [n['fret'] for n in notes] == [3,1,3,1,3,3,2,3,5]
    assert [n['string'] for n in notes] == [2,2,2,2,2,3,3,3,3]


def test_contour_keeps_repeated_notes_when_separated():
    import numpy as np
    from cloud.main import contour_to_notes
    f0 = np.array([440.] * 20 + [np.nan] * 5 + [440.] * 20)
    voiced = np.isfinite(f0)
    notes = contour_to_notes(f0, voiced, np.where(voiced, .9, 0.), sample_rate=100, hop_length=1)
    assert len(notes) == 2 and [n['pitch'] for n in notes] == [69,69]


def test_keepalive_stream_emits_heartbeats_during_slow_inference():
    import time
    from cloud.main import keepalive_stream, event
    def slow():
        yield event({'stage':'separating'})
        time.sleep(.055)
        yield event({'result':{'notes':[]}})
    items=[json.loads(line) for line in keepalive_stream(slow(), interval=.01)]
    assert items[0]['stage']=='separating'
    assert any(item.get('stage')=='heartbeat' for item in items[1:-1])
    assert items[-1]['result']=={'notes':[]}
