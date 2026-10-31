"""Versioned, model-independent note processing shared by cloud and local v2.

Seconds are authoritative. Scores are ranking evidence, never probabilities.
"""
import copy
import hashlib
import math
from bisect import bisect_right

CONFIG = {'version': 1, 'phrase_gap': 1., 'switch_cost': .22, 'jump_cost': .018,
          'min_duration': .06, 'min_evidence': .32}
TUNING = (64, 59, 55, 50, 45, 40)
# MuScriptor instrument groups -> the stem vocabulary shared with Demucs tracks.
INSTRUMENT_STEMS = {'acoustic_guitar': 'guitar', 'clean_electric_guitar': 'guitar',
                    'distorted_electric_guitar': 'guitar', 'acoustic_piano': 'piano',
                    'electric_piano': 'piano', 'acoustic_bass': 'bass', 'electric_bass': 'bass',
                    'voice': 'vocals', 'drums': 'drums'}


def uid(*parts):
    return hashlib.sha256('|'.join(map(str, parts)).encode()).hexdigest()[:24]


def chunks(duration, core=30., context=3.):
    for i in range(math.ceil(duration / core)):
        a, b = i * core, min(duration, (i + 1) * core)
        yield {'index': i, 'start': max(0., a-context), 'end': min(duration, b+context),
               'core_start': a, 'core_end': b}


def normalize(events, track, duration, method='basic-pitch'):
    out = []
    for i, event in enumerate(events):
        try:
            a, b, p = float(event['start']), float(event['end']), int(event['pitch'])
            score = float(event.get('confidence', .5))
        except (KeyError, ValueError, TypeError, OverflowError):
            continue
        if not all(map(math.isfinite, (a, b, score))) or not 0 <= p <= 127:
            continue
        a, b = max(0., a), min(duration, b)
        if b-a < CONFIG['min_duration']:
            continue
        n = dict(event, id=event.get('id') or uid(track, round(a, 5), p, i),
                 track_id=track, start=a, end=b, pitch=p,
                 original_pitch=event.get('original_pitch', p), method=event.get('method', method),
                 confidence=max(0., min(1., score)), velocity=max(1, min(127, int(event.get('velocity', 80)))))
        # Duration and independent spectral support make scores comparable for ranking.
        support = float(event.get('spectral_support', score))
        n['evidence'] = {'stability': max(0., min(1., support)),
                         'duration': min(1., (b-a)/.4), 'raw_score': score}
        n['quality'] = n['evidence']['stability']*(.65+.35*n['evidence']['duration'])
        n['uncertain'] = bool(event.get('uncertain', n['quality'] < .6))
        n['uncertainty_reasons'] = event.get('uncertainty_reasons', ['weak_audio_support'] if n['uncertain'] else [])
        out.append(n)
    return sorted(out, key=lambda n: (n['start'], n['pitch'], n['id']))


def merge_chunks(parts, track, duration):
    """Keep attacks owned by each core; connect only context-clipped sustains.

    Real attacks in a core always win over a continuation from its neighbour.
    """
    kept = []
    for chunk, events in parts:
        offset = chunk['start']
        for event in events:
            n = dict(event, start=event['start']+offset, end=event['end']+offset)
            a, b = chunk['core_start'], chunk['core_end']
            if a <= n['start'] < b:
                kept.append(n)
            elif n['start'] < a < n['end']:
                match = next((x for x in reversed(kept) if x['pitch'] == n['pitch'] and
                              x['end'] >= a-.18 and abs(x['start']-n['start']) < .15), None)
                # Long sustains clipped by context have no new onset evidence.
                if match is None and event['start'] < .08:
                    match = next((x for x in reversed(kept) if x['pitch'] == n['pitch'] and
                                  x['start'] < a and abs(x['end']-a) < .18), None)
                if match and not any(x['pitch'] == n['pitch'] and a <= x['start'] < n['end'] for x in kept):
                    match['end'] = max(match['end'], n['end'])
    # Exact duplicate attacks from overlapping inference, not same-pitch repetitions.
    unique = []
    for n in sorted(kept, key=lambda x: (x['start'], x['pitch'])):
        old = next((x for x in reversed(unique[-32:]) if x['pitch'] == n['pitch'] and
                    abs(x['start']-n['start']) < .025), None)
        if old:
            old['end'] = max(old['end'], n['end'])
        else:
            unique.append(n)
    return normalize(unique, track, duration)


def lead_path(events):
    """Viterbi through simultaneous candidates, with a rest state."""
    if not events:
        return []
    edges = sorted({x for n in events for x in (n['start'], n['end'])})
    states, layers = [None], []
    costs = [0.]
    starts, current = {}, {}
    for n in events: starts.setdefault(n['start'], []).append(n)
    for a, b in zip(edges, edges[1:]):
        current = {key: n for key, n in current.items() if n['end'] > a}
        for n in starts.get(a, []): current[n['id']] = n
        active = [n for n in current.values() if n.get('quality', .5) >= CONFIG['min_evidence']]
        active = sorted(active, key=lambda n: n.get('quality', .5), reverse=True)[:8]+[None]
        layer = []
        for n in active:
            reward = ((n.get('quality', .5)-.3) if n else 0.) * (b-a)
            options = []
            for i, prev in enumerate(states):
                transition = 0.
                if n and prev and n['id'] != prev['id']:
                    transition = CONFIG['jump_cost']*min(24, abs(n['pitch']-prev['pitch']))
                options.append((costs[i]+reward-transition, i))
            layer.append(max(options, key=lambda x: x[0]))
        layers.append((a, b, active, layer))
        states, costs = active, [x[0] for x in layer]
    index = max(range(len(costs)), key=costs.__getitem__)
    segments = []
    for a, b, active, layer in reversed(layers):
        n = active[index]
        if n:
            segments.append(dict(n, start=a, end=b))
        index = layer[index][1]
    out = []
    for n in reversed(segments):
        if out and out[-1]['id'] == n['id'] and abs(out[-1]['end']-n['start']) < 1e-6:
            out[-1]['end'] = n['end']
        else:
            out.append(n)
    return [n for n in out if n['end']-n['start'] >= .06]


def crosscheck(tracks):
    for track in tracks:
        others = [t for t in tracks if t['model'] != track['model'] and t['stem'] == track['stem']]
        for n in track['notes']:
            overlap = [o for t in others for o in t['notes'] if o['start'] < n['end'] and o['end'] > n['start']]
            n['crosscheck'] = ('agreement' if any(o['pitch'] == n['pitch'] for o in overlap)
                               else 'conflict' if overlap else 'missing')


def instrument_tracks(tracks, muscriptor_enabled=False):
    """Non-vocal transcription evidence for automatic use.

    Once validated, MuScriptor's full-mix pass replaces Demucs-stem transcription for
    instruments; otherwise MuScriptor tracks stay manual candidates only.
    """
    if muscriptor_enabled and any(t['model'] == 'muscriptor' for t in tracks):
        return [t for t in tracks if t['model'] == 'muscriptor' and t['stem'] not in ('vocals', 'drums')]
    demucs = [t for t in tracks if t['model'] in ('htdemucs_ft', 'htdemucs_6s') and t['stem'] not in ('vocals', 'drums')]
    return [t for t in demucs if t['model'] == 'htdemucs_ft' or
            not any(x['model'] == 'htdemucs_ft' and x['stem'] == t['stem'] for x in demucs)]


def select_melody(tracks, duration, overrides=(), dual_enabled=False, muscriptor_enabled=False):
    paths = {t['id']: lead_path(t['notes']) for t in tracks if t['stem'] != 'drums'}
    automatic = [t for t in tracks if t['stem'] not in ('bass', 'drums') and
                 t['model'] in (('htdemucs_ft', 'htdemucs_6s') if dual_enabled else ('htdemucs_ft',))]
    if muscriptor_enabled and any(t['model'] == 'muscriptor' for t in tracks):
        automatic = [t for t in automatic if t['stem'] == 'vocals']+[
            t for t in instrument_tracks(tracks, True) if t['stem'] != 'bass']
    # If primary separation failed, use secondary evidence and report fallback upstream.
    if not automatic:
        automatic = [t for t in tracks if t['stem'] not in ('bass', 'drums')]
    voice = sorted([n for t in automatic if t['stem'] == 'vocals' for n in paths[t['id']]
                    if n.get('quality', 0) >= .55], key=lambda n: n['start'])
    phrases = []
    for n in voice:
        if phrases and n['start']-phrases[-1][1] < CONFIG['phrase_gap']:
            phrases[-1][1] = max(phrases[-1][1], n['end'])
        else:
            phrases.append([n['start'], n['end']])
    relevant = {t['id'] for t in automatic} | {o['track_id'] for o in overrides if o.get('track_id')}
    edges = sorted({0., duration} | {x for tid in relevant for n in paths.get(tid, []) for x in (n['start'], n['end'])}
                   | {x for o in overrides for x in (o['start'], o['end'])})
    costs, states, layers = [0.], [None], []
    starts, current = {}, {}
    for tid in relevant:
        for n in paths.get(tid, []): starts.setdefault(n['start'], []).append(n)
    phrase_starts = [x[0] for x in phrases]
    for a, b in zip(edges, edges[1:]):
        mid = (a+b)/2
        override = next((o for o in overrides if o['start'] <= mid < o['end']), None)
        phrase_index = bisect_right(phrase_starts, mid)-1
        singing = phrase_index >= 0 and mid < phrases[phrase_index][1]
        ids = ([override['track_id']] if override else
               [t['id'] for t in automatic if not singing or t['stem'] == 'vocals'])
        current = {tid: n for tid, n in current.items() if n['end'] > a}
        for n in starts.get(a, []): current[n['track_id']] = n
        options = [current[tid] for tid in ids if tid in current]+[None]
        layer = []
        for n in options:
            reward = ((n.get('quality', .5)-.3) if n else 0.)*(b-a)
            transitions = []
            for i, prev in enumerate(states):
                switch = CONFIG['switch_cost'] if n and prev and n['track_id'] != prev['track_id'] else 0.
                transitions.append((costs[i]+reward-switch, i))
            layer.append(max(transitions, key=lambda v: v[0]))
        layers.append((a, b, options, layer))
        states, costs = options, [x[0] for x in layer]
    idx = max(range(len(costs)), key=costs.__getitem__)
    out = []
    for a, b, options, layer in reversed(layers):
        if options[idx]:
            out.append(dict(options[idx], start=a, end=b))
        idx = layer[idx][1]
    result = []
    for n in reversed(out):
        n['source'] = 'vocal' if next(t for t in tracks if t['id'] == n['track_id'])['stem'] == 'vocals' else 'instrumental'
        if result and result[-1]['id'] == n['id'] and abs(result[-1]['end']-n['start']) < 1e-6:
            result[-1]['end'] = n['end']
        else:
            result.append(n)
    # Stable fragment IDs when an override splits an original note.
    for n in result:
        n['source_note_id'] = n['id']
        n['id'] = uid(n['id'], round(n['start'], 5))
    return [n for n in result if n['end']-n['start'] >= .06]


def guitar_line(notes, vocal_focus=False):
    """Phrase octave choice followed by global fingering DP; preserve locked notes.

    With vocal_focus, sung phrases sit no lower than B3 and prefer strings 1-3, so the
    tune stays the top voice above bass and fills, as in a fingerstyle cover.
    """
    notes = copy.deepcopy(notes)
    phrases = []
    for n in notes:
        if not phrases or n['start']-phrases[-1][-1]['end'] >= 1.:
            phrases.append([])
        phrases[-1].append(n)
    for phrase in phrases:
        sung = vocal_focus and sum(n.get('source') == 'vocal' for n in phrase)*2 > len(phrase)
        middle = sorted(n['pitch'] for n in phrase)[len(phrase)//2]
        shift = min(range(-5, 6), key=lambda s: sum(max(40-(n['pitch']+12*s), 0)+
                    max(n['pitch']+12*s-84, 0) for n in phrase)+abs(s)*.01+
                    sung*max(0, 59-(middle+12*s))*len(phrase))
        for n in phrase:
            n['original_pitch'] = n.get('original_pitch', n['pitch'])
            if n.get('locked_position'):
                continue
            n['pitch'] += shift*12
            while n['pitch'] < 40: n['pitch'] += 12
            while n['pitch'] > 84: n['pitch'] -= 12
            n['octave_shift'] = (n['pitch']-n['original_pitch'])//12
    if not notes:
        return []
    layers = []
    for n in notes:
        choices = [(i+1, n['pitch']-p) for i, p in enumerate(TUNING) if 0 <= n['pitch']-p <= 20]
        if n.get('locked_position'):
            choices = [(n['string'], n['fret'])]
        low = 1.2 if vocal_focus and n.get('source') == 'vocal' else 0.
        layer = {}
        for c in choices:
            own = .12*c[1]+low*max(0, c[0]-3)
            if not layers:
                layer[c] = (own, None)
            else:
                layer[c] = min((v[0]+abs(c[1]-p[1])+.8*abs(c[0]-p[0])+own, p)
                               for p, v in layers[-1].items())
        layers.append(layer)
    c = min(layers[-1], key=lambda x: layers[-1][x][0])
    for i in range(len(notes)-1, -1, -1):
        notes[i]['string'], notes[i]['fret'] = c
        notes[i]['role'] = 'melody'
        if vocal_focus and notes[i].get('source') == 'vocal':
            notes[i]['accent'] = True
        c = layers[i][c][1]
    for a, b in zip(notes, notes[1:]):
        if abs(a['fret']-b['fret']) > 4: b['difficulty'] = 'position_change'
    return notes


def arrange(notes, tracks, duration, settings=None, harmony=None, muscriptor_enabled=False):
    settings = dict({'density': 'rich', 'slides': True, 'legato': True, 'vocal_focus': True}, **(settings or {}))
    focus = settings['vocal_focus']
    melody = guitar_line(notes, focus)
    extras = []
    rich = settings['density'] == 'rich'
    # Sung phrases, for accompaniment that steps back under the tune.
    sung = []
    for m in melody:
        if not m.get('accent'): continue
        if sung and m['start']-sung[-1][1] < CONFIG['phrase_gap']: sung[-1][1] = max(sung[-1][1], m['end'])
        else: sung.append([m['start'], m['end']])
    def singing(t): return any(a <= t < b for a, b in sung)
    candidates = []
    for t in instrument_tracks(tracks, muscriptor_enabled):
        for n in t['notes']:
            if n.get('quality', 0) < .55:
                continue
            if t['stem'] == 'bass':
                candidates.append(dict(n, role='bass'))
            else:
                # Fill only between melody attacks and with recognised harmonic support.
                chord = next((c for c in (harmony or {}).get('chords', []) if c['start'] <= n['start'] < c['end'] and not c.get('uncertain')), None)
                tones = {TUNING[5-i]+f for i, f in enumerate(chord['frets']) if f >= 0} if chord else set()
                if n['pitch']%12 in {p%12 for p in tones}:
                    candidates.append(dict(n, role='fill'))
    previous = {'bass': -10., 'fill': -10.}
    sounding = [dict(m, end=melody[i+1]['start'] if settings['legato'] and i+1 < len(melody) else m['end']) for i, m in enumerate(melody)]
    # Bass is allocated before fills regardless of event order.
    for role in ('bass', 'fill'):
        for n in sorted((x for x in candidates if x['role'] == role), key=lambda x: x['start']):
            start = n['start']
            under = singing(start)
            gap = (.65 if rich else 1.3) if role == 'bass' else (1. if rich else 2.)*(2 if under else 1)
            if start-previous[role] < gap:
                continue
            if any(abs(m['start']-start) < (.15 if under else .10) for m in melody) and role == 'fill':
                continue
            end = min(n['end'], start+(.7 if role == 'bass' else .35), duration)
            pitches = [n['pitch']+12*k for k in range(-4, 5) if (40 <= n['pitch']+12*k <= 55 if role == 'bass' else 45 <= n['pitch']+12*k <= 71)]
            choices = []
            for pitch in pitches:
                for string, tuning in enumerate(TUNING, 1):
                    fret = pitch-tuning
                    if not 0 <= fret <= 12 or (role == 'bass' and string < 4):
                        continue
                    stop = end
                    # Legato melody occupies its string until next melody onset.
                    valid = True
                    overlaps = [m for m in sounding+extras if m['start'] < stop and m['end'] > start]
                    for m in overlaps:
                        # Fills keep at least a fourth below a sung note, so the tune stays on top.
                        if m['string'] == string or (fret and m['fret'] and abs(m['fret']-fret) > 4) or (role == 'fill' and pitch > m['pitch']-(5 if m.get('accent') else 1)):
                            if m['start'] <= start:
                                valid = False; break
                            stop = min(stop, m['start'])
                    # Enforce a global fretted span and maximum simultaneous polyphony.
                    boundaries = {start} | {m['start'] for m in overlaps if start < m['start'] < stop}
                    for moment in boundaries:
                        active = [m for m in overlaps if m['start'] <= moment < m['end']]
                        frets = [m['fret'] for m in active if m['fret']] + ([fret] if fret else [])
                        if len(active) >= 4 or (frets and max(frets)-min(frets) > 4): valid = False
                    if valid and stop-start >= .1:
                        choices.append((abs(pitch-n['pitch'])+.1*fret, string, fret, pitch, stop))
            if choices:
                _, string, fret, pitch, stop = min(choices)
                extras.append(dict(n, id=uid('extra', n['id']), pitch=pitch, original_pitch=n['pitch'],
                                   string=string, fret=fret, end=stop, origin='transcribed',
                                   truncated=stop < n['end'], octave_shift=(pitch-n['pitch'])//12,
                                   **({'under_vocal': True} if under else {})))
                previous[role] = start
    extras.sort(key=lambda n: (n['start'], n['string']))
    if focus:
        # Arrangement dynamics for MIDI: the sung tune clearly over a softer accompaniment.
        for n in melody: n['velocity'] = 104 if n.get('accent') else 92
        for n in extras: n['velocity'] = (64 if n['role'] == 'bass' else 54) if n.get('under_vocal') else (76 if n['role'] == 'bass' else 68)
    slides = []
    if settings['slides']:
        for i, (a, b) in enumerate(zip(melody, melody[1:])):
            delta = b['fret']-a['fret']
            start = b['start']-.07
            if (a['string'] == b['string'] and min(a['fret'], b['fret']) > 0 and
                1 <= abs(delta) <= 4 and .15 <= b['start']-a['start'] <= .8 and b['start']-a['end'] <= .22 and
                not any(x['start'] < b['start'] and x['end'] > start for x in extras)):
                slides.append({'from': i, 'to': i+1, 'start': start, 'end': b['start'], 'semitones': delta})
    return {'melody': melody, 'extras': extras, 'slides': slides, 'settings': settings,
            'events': sorted(melody+extras, key=lambda n: (n['start'], n['string']))}
