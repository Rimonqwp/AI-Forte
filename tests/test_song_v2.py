import copy
import io
import json
from pathlib import Path

import mido
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.midi_export import midi
from app.song_api import make_router, regenerate
from app.song_store import SongStore, Conflict
from cloud.music import chunks, normalize, merge_chunks, select_melody, arrange


def track(stem, notes, model='htdemucs_ft'):
    tid = model+'-'+stem
    return {'id': tid, 'model': model, 'stem': stem, 'notes': normalize(notes, tid, 600)}


def note(a, b, pitch=60, score=.9):
    return {'start': a, 'end': b, 'pitch': pitch, 'confidence': score}


def test_chunks_cover_full_song_and_overlap():
    c = list(chunks(600))
    assert len(c) == 20 and c[-1]['end'] == 600
    assert c[1] == {'index': 1, 'start': 27., 'end': 63., 'core_start': 30., 'core_end': 60.}


def test_merge_sustain_and_real_repeated_attack_at_boundary():
    c = list(chunks(60))
    events = merge_chunks([(c[0], [note(28, 33), note(32, 32.5, 62)]),
                           (c[1], [note(1, 7), note(5, 5.5, 62)])], 'other', 60)
    assert [(n['start'], n['end'], n['pitch']) for n in events] == [(28, 34, 60), (32, 32.5, 62)]
    repeated = merge_chunks([(c[0], [note(29, 30)]), (c[1], [note(2, 3), note(3, 3.5)])], 'other', 60)
    assert [(n['start'], n['end']) for n in repeated] == [(29, 30), (30, 30.5)]


def test_bad_events_and_quiet_evidence():
    assert normalize([note(float('nan'), 1), note(0, .01), note(0, 1, 128)], 'x', 2) == []
    weak = track('other', [dict(note(0, .5, score=.1), spectral_support=.05)])
    assert select_melody([weak], 1) == []


def test_vocal_rests_are_not_filled_and_bass_is_manual_only():
    voice = track('vocals', [note(1, 1.5, 64), note(2, 2.5, 65)])
    other = track('other', [note(0, .8, 67), note(1.6, 1.9, 69), note(3, 4, 67)])
    bass = track('bass', [note(0, 4, 43)])
    out = select_melody([voice, other, bass], 4)
    assert not any(n['start'] < 1.9 and n['end'] > 1.6 for n in out)
    assert any(n['track_id'] == other['id'] and n['start'] == 0 for n in out)
    assert not any(n['track_id'] == bass['id'] for n in out)
    assert all(n['track_id'] == bass['id'] for n in select_melody([bass], 4, [{'start': 0, 'end': 4, 'track_id': bass['id']}]))


def test_dual_candidates_gated_and_rest_override():
    primary = track('other', [note(0, 2, 60)])
    secondary = track('piano', [note(2, 4, 72)], 'htdemucs_6s')
    assert not any(n['start'] >= 2 for n in select_melody([primary, secondary], 4))
    assert any(n['start'] >= 2 for n in select_melody([primary, secondary], 4, dual_enabled=True))
    assert not select_melody([primary], 2, [{'start': 0, 'end': 2, 'track_id': None}])


def test_muscriptor_candidates_manual_until_validated():
    voice = track('vocals', [note(1, 1.5, 64)])
    stem = track('other', [note(2, 3, 60)])
    guitar = track('guitar', [note(2, 3, 67)], 'muscriptor')
    sung = track('vocals', [note(1, 1.5, 76)], 'muscriptor')
    bass = track('bass', [note(2, 3, 43)], 'muscriptor')
    tracks = [voice, stem, guitar, sung, bass]
    assert {n['track_id'] for n in select_melody(tracks, 4)} == {voice['id'], stem['id']}
    # Dual means the six-stem Demucs model, never MuScriptor.
    assert guitar['id'] not in {n['track_id'] for n in select_melody(tracks, 4, dual_enabled=True)}
    enabled = select_melody(tracks, 4, muscriptor_enabled=True)
    assert {n['track_id'] for n in enabled} == {voice['id'], guitar['id']}
    assert {e['track_id'] for e in arrange([], tracks, 4, muscriptor_enabled=True)['extras']} == {bass['id']}
    assert {e['track_id'] for e in arrange([], tracks, 4)['extras']} <= {stem['id']}
    assert select_melody(tracks, 4, [{'start': 2, 'end': 3, 'track_id': guitar['id']}])[-1]['pitch'] == 67


def test_arrangement_preserves_melody_and_hard_constraints():
    melody = normalize([note(i*.5, i*.5+.4, 64+i%4) for i in range(20)], 'v', 10)
    bass = track('bass', [note(i, i+.6, 31+i%4) for i in range(10)])
    original = copy.deepcopy(melody)
    draft = arrange(melody, [bass], 10)
    assert melody == original
    assert [n['start'] for n in draft['melody']] == [n['start'] for n in melody]
    assert [n['original_pitch'] for n in draft['melody']] == [n['pitch'] for n in melody]
    assert draft['extras']
    # Check the actual ringing melody, not just detected durations.
    melody = [dict(n, end=draft['melody'][i+1]['start'] if i+1<len(draft['melody']) else n['end']) for i,n in enumerate(draft['melody'])]
    all_notes = melody+draft['extras']
    for t in {n['start'] for n in all_notes}:
        active = [n for n in all_notes if n['start'] <= t < n['end']]
        assert len(active) <= 4
        assert len({n['string'] for n in active}) == len(active)
        frets = [n['fret'] for n in active if n['fret']]
        assert not frets or max(frets)-min(frets) <= 4


def test_vocal_focus_keeps_sung_tune_on_top_and_louder():
    sung = [dict(n, source='vocal') for n in normalize([note(i*.5, i*.5+.4, 60+i%5) for i in range(16)], 'v', 8)]
    chord = {'chords': [{'start': 0, 'end': 8, 'frets': [-1, 3, 2, 0, 1, 0]}]}  # C major
    other = track('other', [note(i*.5+.25, i*.5+.6, p) for i, p in enumerate([55, 52, 60, 64, 48, 55, 52, 60]*2)])
    bass = track('bass', [note(i, i+.6, 36) for i in range(8)])
    plain, focus = (arrange(sung, [other, bass], 8, {'vocal_focus': f}, chord) for f in (False, True))
    assert [n['pitch'] for n in focus['melody']] == [n['pitch'] for n in plain['melody']]
    assert all(n['string'] <= 3 for n in focus['melody'])
    assert all(n['accent'] and n['velocity'] == 104 for n in focus['melody'])
    assert not any('accent' in n for n in plain['melody'])
    fills = [e for e in focus['extras'] if e['role'] == 'fill']
    assert fills and all(e['under_vocal'] and e['velocity'] == 54 for e in fills)
    for e in fills:
        ringing = [m for i, m in enumerate(focus['melody']) if m['start'] <= e['start'] < (focus['melody'][i+1]['start'] if i+1 < len(focus['melody']) else m['end'])]
        assert all(e['pitch'] <= m['pitch']-5 for m in ringing)
    assert len(fills) < len([e for e in plain['extras'] if e['role'] == 'fill'])


def test_vocal_focus_lifts_low_sung_phrase_but_not_instrumental():
    low = normalize([note(i*.5, i*.5+.4, 48+i%3) for i in range(6)], 'v', 4)
    assert [n['pitch'] for n in arrange([dict(n, source='vocal') for n in low], [], 4)['melody']] == [60, 61, 62, 60, 61, 62]
    assert [n['pitch'] for n in arrange(low, [], 4)['melody']] == [48, 49, 50, 48, 49, 50]


def test_phrase_octave_and_locked_position():
    melody = normalize([note(0, 1, 92), note(1, 2, 94)], 'x', 2)
    draft = arrange(melody, [], 2)
    assert [n['pitch'] for n in draft['melody']] == [80, 82]
    assert [n['octave_shift'] for n in draft['melody']] == [-1, -1]
    melody = [dict(note(0, 1, 60), id='locked', locked_position=True, string=3, fret=5)]
    assert arrange(melody, [], 2)['melody'][0]['string'] == 3


def test_midi_roundtrip_under_two_milliseconds_and_repetition():
    notes = [note(.12345, .56789), note(.56789, .9), note(1.1, 1.8, 64)]
    file = mido.MidiFile(file=io.BytesIO(midi([('melody', notes)])))
    t, attacks, ends = 0., [], []
    for msg in file:
        t += msg.time
        if msg.type == 'note_on': attacks.append((t, msg.note))
        if msg.type == 'note_off': ends.append((t, msg.note))
    assert len(attacks) == 3 and len(ends) == 3
    for got, expected in zip(attacks, notes): assert abs(got[0]-expected['start']) < .002 and got[1] == expected['pitch']
    for got, expected in zip(ends, notes): assert abs(got[0]-expected['end']) < .002


@pytest.fixture
def workspace(tmp_path):
    store = SongStore(tmp_path)
    job_id = 'e'*32
    raw = {'tracks': [track('vocals', [note(0, 1, 64), note(2, 3, 65)]), track('other', [note(0, 3, 60)])]}
    folder = tmp_path/job_id; folder.mkdir()
    (folder/'analysis.json').write_text(json.dumps(raw))
    melody = select_melody(raw['tracks'], 4)
    j = regenerate({'id': job_id, 'stage': 'done', 'schema_version': 2, 'revision': 0, 'duration': 4, 'melody': melody, 'warnings': []}, raw)
    store.create(j)
    app = FastAPI(); app.include_router(make_router(store, None))
    return TestClient(app), store, job_id


def test_revision_conflicts_selection_preserves_outside_edits_and_undo(workspace):
    client, store, tid = workspace
    original = store.get(tid)
    n = original['melody'][-1]
    r = client.patch(f'/api/jobs/{tid}/notes', json={'revision': 0, 'id': n['id'], 'pitch': 67})
    assert r.status_code == 200
    assert client.patch(f'/api/jobs/{tid}/notes', json={'revision': 0, 'id': n['id'], 'pitch': 69}).status_code == 409
    chosen = client.put(f'/api/jobs/{tid}/melody-selection', json={'revision': 1, 'start': 0, 'end': 1, 'track_id': 'htdemucs_ft-other'}).json()
    assert any(n['pitch'] == 67 and n['start'] == 2 for n in chosen['melody'])
    undone = client.post(f'/api/jobs/{tid}/undo', json={'revision': 2}).json()
    assert undone['revision'] == 3
    assert undone['melody'] == r.json()['melody']
    assert SongStore(store.root).get(tid)['revision'] == 3


def test_invalid_track_time_and_note_overlap_leave_revision_unchanged(workspace):
    client, store, tid = workspace
    assert client.put(f'/api/jobs/{tid}/melody-selection', json={'revision': 0, 'start': 0, 'end': 10}).status_code == 400
    assert client.put(f'/api/jobs/{tid}/melody-selection', json={'revision': 0, 'start': 0, 'end': 1, 'track_id': '../bad'}).status_code == 400
    assert client.patch(f'/api/jobs/{tid}/notes', json={'revision': 0, 'start': .5, 'end': 1.5, 'pitch': 60}).status_code == 400
    assert store.get(tid)['revision'] == 0


def test_transcription_only_track_serves_its_stem_audio(workspace):
    client, store, tid = workspace
    folder = store.root/tid
    raw = json.loads((folder/'analysis.json').read_text())
    raw['tracks'] += [dict(track('guitar', [note(0, 1, 64)], 'muscriptor'), audio_file='tracks/htdemucs_6s-guitar.flac'),
                      dict(track('piano', [note(0, 1, 64)], 'muscriptor'), audio_file=None),
                      dict(track('organ', [], 'muscriptor'), audio_file='../analysis.json')]
    (folder/'analysis.json').write_text(json.dumps(raw))
    (folder/'tracks').mkdir(); (folder/'tracks'/'htdemucs_6s-guitar.flac').write_bytes(b'fLaC')
    assert client.get(f'/api/jobs/{tid}/tracks/muscriptor-guitar/audio').content == b'fLaC'
    assert client.get(f'/api/jobs/{tid}/tracks/muscriptor-piano/audio').status_code == 404
    assert client.get(f'/api/jobs/{tid}/tracks/muscriptor-organ/audio').status_code == 404


def test_bundle_and_exports(workspace):
    client, store, tid = workspace
    assert client.get(f'/api/jobs/{tid}/exports/melody').content[:4] == b'MThd'
    assert client.get(f'/api/jobs/{tid}/exports/bundle').content[:2] == b'PK'
    assert client.get(f'/api/jobs/{tid}/exports/track-nothing').status_code == 404


def test_ai_range_keeps_secret_out_of_state_and_revision_bound(workspace, monkeypatch):
    client, store, tid = workspace
    monkeypatch.setattr('app.song_api.request_review', lambda *a, **k: {'keep_extras': [], 'keep_slides': [], 'reason': 'test review'})
    payload = {'revision': 0, 'start': 0, 'end': 3, 'api_key': 'secret-for-test'}
    response = client.post(f'/api/jobs/{tid}/ai-review-range', json=payload)
    assert response.status_code == 200
    assert response.json()['ai_review']['result']['reason'] == 'test review'
    assert 'secret-for-test' not in response.text
    assert 'secret-for-test' not in store.path.read_bytes().decode(errors='ignore')
    assert client.post(f'/api/jobs/{tid}/ai-review-range', json=payload).status_code == 409
    changed = client.put(f'/api/jobs/{tid}/arrangement-settings', json={'revision': 1, 'density': 'sparse'}).json()
    assert 'ai_review' not in changed


def test_manually_selected_bass_keeps_real_note_boundaries():
    bass = track('bass', [note(1, 1.5, 43), note(2, 2.5, 45)])
    other = track('other', [])
    out = select_melody([bass, other], 4, [{'start': 0, 'end': 4, 'track_id': bass['id']}])
    assert [(n['start'], n['end']) for n in out] == [(1, 1.5), (2, 2.5)]


def test_cancel_wins_over_late_completion(tmp_path):
    store = SongStore(tmp_path)
    store.create({'id': 'a', 'stage': 'queued'})
    store.update('a', stage='cancelled')
    store.update('a', stage='done')
    assert store.get('a')['stage'] == 'cancelled'
