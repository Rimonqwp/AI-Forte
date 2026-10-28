"""Conservative accompaniment: only voice pitches supported by the backing audio."""
from functools import lru_cache
from itertools import product
import re
import numpy as np

PITCH_NAMES = ('C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B')
TUNING = (40, 45, 50, 55, 59, 64)
OPEN = {
    'C': [-1,3,2,0,1,0], 'D': [-1,-1,0,2,3,2], 'E': [0,2,2,1,0,0],
    'F': [1,3,3,2,1,1], 'G': [3,2,0,0,0,3], 'A': [-1,0,2,2,2,0], 'B': [-1,2,4,4,4,2],
    'Bb': [-1,1,3,3,3,1], 'Eb': [-1,-1,1,3,4,3],
    'Cm': [-1,3,5,5,4,3], 'Dm': [-1,-1,0,2,3,1], 'Em': [0,2,2,0,0,0],
    'Fm': [1,3,3,1,1,1], 'Gm': [3,5,5,3,3,3], 'Am': [-1,0,2,2,1,0], 'Bm': [-1,2,4,4,3,2],
}


def chord_frets(root, minor):
    label = PITCH_NAMES[root] + ('m' if minor else '')
    if label in OPEN:
        return list(OPEN[label])
    fret = (root - 4) % 12
    return [fret, fret+2, fret+2, fret if minor else fret+1, fret, fret]


INTERVALS = {
    '': (0,4,7), 'm': (0,3,7), '7': (0,4,7,10), 'maj7': (0,4,7,11),
    'm7': (0,3,7,10), '6': (0,4,7,9), 'm6': (0,3,7,9),
    'dim': (0,3,6), 'aug': (0,4,8), 'm7b5': (0,3,6,10), '5': (0,7),
}


def pitch_class(name):
    match = re.fullmatch(r'([A-G])([b#]?)', name)
    if not match:
        raise ValueError('Invalid pitch name')
    return ({'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}[match[1]]
            + {'':0,'b':-1,'#':1}[match[2]]) % 12


def parse_chord(label):
    match = re.fullmatch(r'([A-G][b#]?)(maj7|m7b5|m7|m6|dim|aug|m|6|7|5)?(?:/([A-G][b#]?))?', label)
    if not match:
        return None
    root = pitch_class(match[1]); quality = match[2] or ''
    bass = pitch_class(match[3]) if match[3] else root
    tones = {(root+interval)%12 for interval in INTERVALS[quality]}
    tones.add(bass)
    return {'root':root, 'bass':bass, 'quality':quality, 'tones':tones}


@lru_cache(maxsize=512)
def voice_tones(tones, bass):
    """Find a compact standard-tuning voicing without adding any extra pitches."""
    tones = set(tones)
    if len(tones) < 2:
        return [-1]*6
    familiar = [*OPEN.values(), [-1,-1,0,2,3,-1], [-1,1,3,2,3,1],
                [-1,-1,0,2,1,1], [3,5,3,3,3,3], [-1,3,1,3,1,3],
                [-1,-1,3,3,3,1], [1,3,3,2,3,1]]
    for frets in familiar:
        pitches = [(TUNING[i]+f)%12 for i,f in enumerate(frets) if f >= 0]
        if set(pitches) == tones and pitches[0] == bass:
            return list(frets)
    best, best_cost = None, float('inf')
    for position in range(1, 10):
        choices = []
        for string in TUNING:
            choices.append([-1]+[f for f in [0, *range(position, position+4)] if (string+f)%12 in tones])
        for frets in product(*choices):
            sounded = [i for i,f in enumerate(frets) if f >= 0]
            if len(sounded) < max(3, len(tones)):
                continue
            pitches = [(TUNING[i]+frets[i])%12 for i in sounded]
            if set(pitches) != tones:
                continue
            pressed = [f for f in frets if f > 0]
            # At most four fingers, allowing a single barre at the lowest fret.
            fingers = len(pressed)
            if pressed:
                lowest = min(pressed)
                # Open/muted strings interrupt a barre; do not pretend they can
                # ring through a finger pressing the same fret across all strings.
                run = 0
                for fret in [*frets, -1]:
                    if fret < lowest:
                        fingers -= max(0, run-1); run = 0
                    elif fret == lowest:
                        run += 1
            if fingers > 4:
                continue
            interior_mutes = sum(frets[i]<0 for i in range(sounded[0], sounded[-1]+1))
            cost = 8*(pitches[0] != bass) + .2*max(frets) + .08*sum(pressed)
            cost += .8*(6-len(sounded)) + 1.5*interior_mutes
            if cost < best_cost:
                best, best_cost = list(frets), cost
    return best if best is not None else [-1]*6


def chord_events(audio, sr):
    import vamp
    result = vamp.collect(audio, sr, 'nnls-chroma:chordino', output='simplechord',
                          parameters={'useNNLS': 1., 'usehartesyntax': 0.})
    # Vamp timestamps are seconds, including the plugin's analysis delay compensation.
    return [{'start': float(item['timestamp']), 'label': item['label']} for item in result.get('list', [])]


def reject_monophonic_segments(chords, audio, sr):
    """A single pitch with overtones is not sufficient evidence of harmony."""
    import vamp
    features = list(vamp.process_audio(audio, sr, 'nnls-chroma:nnls-chroma', output='chroma'))
    times = np.array([float(f['timestamp']) for f in features])
    values = np.array([f['values'] for f in features])
    for chord in chords:
        frames = values[(times >= chord['start']) & (times < chord['end'])]
        spectrum = np.mean(frames, axis=0) if frames.size else np.zeros(12)
        peaks = np.sort(spectrum)
        if peaks[-1] <= 1e-8 or peaks[-2] < .16*peaks[-1]:
            chord.update(label='N', frets=[-1]*6, uncertain=True, reduced=False)
    return chords


def reconcile_chords(backing, reference, duration):
    """Cross-check full mix and separated backing; conflicting tones are omitted.

    The two analyses are correlated estimates, not ground truth. Disagreement is
    visible to the user; an intersection with fewer than two tones stays empty.
    """
    edges = sorted({0., duration} | {float(c['start']) for c in backing+reference if 0 < c['start'] < duration})
    def at(events, time):
        candidates = [c for c in events if c['start'] <= time+1e-8]
        return candidates[-1]['label'] if candidates else 'N'
    chords = []
    for start, end in zip(edges[:-1], edges[1:]):
        primary_label, reference_label = at(backing, start), at(reference, start)
        primary, other = parse_chord(primary_label), parse_chord(reference_label)
        common = primary['tones'] & other['tones'] if primary and other else set()
        uncertain = primary_label != reference_label
        label = 'N'; frets = [-1]*6; reduced = False
        if len(common) >= 2:
            bass = primary['bass'] if primary['bass'] in common else min(common)
            frets = voice_tones(tuple(sorted(common)), bass)
            if any(f >= 0 for f in frets):
                if common == primary['tones']:
                    label = primary_label
                elif common == other['tones']:
                    label = reference_label
                elif common == {primary['root'], (primary['root']+7)%12}:
                    label = PITCH_NAMES[primary['root']]+'5'
                else:
                    label = '·'.join(PITCH_NAMES[p] for p in sorted(common))
                reduced = common != primary['tones'] or common != other['tones']
        entry = {'start':start, 'end':end, 'label':label, 'frets':frets,
                 'uncertain': uncertain or label == 'N', 'reduced':reduced,
                 'source_labels': [primary_label, reference_label]}
        if chords and all(chords[-1][k] == entry[k] for k in ('label','frets','uncertain','reduced')):
            chords[-1]['end'] = end
        else:
            chords.append(entry)
    return chords


def analyze_backing(path, reference_path=None):
    """Recognize extended chords and inversions, checked against the original mix."""
    import librosa
    audio, sr = librosa.load(str(path), sr=44100, mono=True)
    duration = len(audio)/sr
    if len(audio) < sr or float(np.sqrt(np.mean(audio**2))) < .001:
        return None
    reference = audio
    if reference_path is not None:
        reference, _ = librosa.load(str(reference_path), sr=sr, mono=True)
    primary = chord_events(audio, sr)
    comparison = chord_events(reference, sr) if reference_path is not None else primary
    chords = reconcile_chords(primary, comparison, duration)
    chords = reject_monophonic_segments(chords, audio, sr)
    hop = 512
    # Use the full mix for rhythm so drum attacks remain available after separation.
    rhythm = librosa.resample(reference, orig_sr=sr, target_sr=22050)
    onset = librosa.onset.onset_strength(y=rhythm, sr=22050, hop_length=hop)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=22050, hop_length=hop, units='time', trim=False)
    beats = np.asarray(beats, dtype=float)
    bpm = float(np.asarray(tempo).reshape(-1)[0]) if np.size(tempo) else 0.
    if len(beats) < 2 or not 45 <= bpm <= 240:
        return None
    beats = beats[(beats >= 0) & (beats < duration)]
    period = 60./bpm
    while beats[-1]+period < duration:
        beats = np.append(beats, beats[-1]+period)
    strengths = np.asarray(onset, dtype=float)
    def strength_at(t):
        frame = int(round(t*22050/hop)); lo = max(0, frame-1); hi = min(len(strengths), frame+2)
        return float(np.max(strengths[lo:hi])) if hi > lo else 0.
    reference_strength = max(float(np.percentile(strengths, 75)), 1e-8)
    harmonic = librosa.effects.harmonic(rhythm, margin=3.)
    tuning_cents = float(librosa.estimate_tuning(y=harmonic, sr=22050))*100
    strums = []
    for i, beat in enumerate(beats):
        segment = next((c for c in chords if c['start'] <= beat < c['end']), None)
        if not segment or segment['label'] == 'N' or segment['end']-segment['start'] < .25:
            continue
        samples = audio[int(beat*sr):min(len(audio), int((beat+.12)*sr))]
        if not len(samples) or np.sqrt(np.mean(samples**2)) < .001:
            continue
        if strength_at(beat) < .35*reference_strength:
            continue
        velocity = float(np.clip(strength_at(beat)/(reference_strength*2), .4, .85))
        stroke = {'time':float(beat), 'direction':'down', 'chord':segment['label'],
                  'frets':segment['frets'], 'end':segment['end'], 'velocity':velocity}
        strums.append(stroke)
        next_beat = beats[i+1] if i+1 < len(beats) else min(duration, beat+period)
        upbeat = (beat+next_beat)/2
        if not segment['uncertain'] and upbeat < segment['end'] and strength_at(upbeat) >= reference_strength:
            strums.append(dict(stroke, time=float(upbeat), direction='up', velocity=velocity*.65))
    covered = sum(c['end']-c['start'] for c in chords if c['label'] != 'N')
    return {'version':2, 'method':'chordino-mix-backing-consensus', 'bpm':round(bpm, 1),
            'tuning_cents':round(tuning_cents, 1), 'coverage':round(covered/duration, 3),
            'chords':chords, 'strums':strums,
            'notice':'已对照原曲与分离伴奏估计和弦；? 表示两次判断有分歧，已省略冲突音。留空处暂不扫弦，仍需听音核对。'}
