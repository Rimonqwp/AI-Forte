"""Turn time-stamped pitch events into a playable single-note guitar line."""
from math import isfinite

# High E to low E, matching the visual order of a six-line tab.
TUNING = (64, 59, 55, 50, 45, 40)
MAX_FRET = 20


def monophonic(events):
    clean = []
    for event_id, item in enumerate(events):
        try:
            start = float(item['start']); end = float(item['end'])
            pitch = int(item['pitch']); confidence = float(item.get('confidence', 0.5))
        except (KeyError, TypeError, ValueError, OverflowError):
            continue
        if not all(isfinite(x) for x in (start, end, confidence)) or start < 0 or end - start < .06 or not 0 <= pitch <= 127:
            continue
        clean.append({'event_id': event_id, 'start': start, 'end': end, 'pitch': pitch, 'confidence': confidence, 'refined': bool(item.get('refined', False)), 'uncertain': bool(item.get('uncertain', False)), 'model_pitch': item.get('model_pitch', pitch), 'source': item.get('source','vocal')})
    # Pick the strongest active note for each time interval and join contiguous pieces.
    points = sorted({p for n in clean for p in (n['start'], n['end'])})
    result = []
    for a, b in zip(points, points[1:]):
        active = [n for n in clean if n['start'] < b and n['end'] > a]
        if not active:
            continue
        chosen = max(active, key=lambda n: (n['confidence'], n['end'] - n['start'], n['pitch']))
        if result and result[-1]['event_id'] == chosen['event_id'] and abs(result[-1]['end'] - a) < 1e-6:
            result[-1]['end'] = b
        else:
            result.append({'event_id': chosen['event_id'], 'start': a, 'end': b, 'pitch': chosen['pitch'], 'confidence': chosen['confidence'], 'refined': chosen['refined'], 'uncertain': chosen['uncertain'], 'model_pitch': chosen['model_pitch'], 'source': chosen['source']})
    for note in result:
        note.pop('event_id')
    return [n for n in result if n['end'] - n['start'] >= .06]


def to_tab(events):
    notes = monophonic(events)
    candidates = []
    for note in notes:
        pitch = note['pitch']; shifted = pitch
        while shifted < min(TUNING): shifted += 12
        while shifted > max(TUNING) + MAX_FRET: shifted -= 12
        choices = [(i, shifted - tuning) for i, tuning in enumerate(TUNING) if 0 <= shifted - tuning <= MAX_FRET]
        candidates.append(choices)
        note['original_pitch'] = pitch
        note['pitch'] = shifted
        note['octave_shift'] = (shifted - pitch) // 12
    if not notes:
        return []
    # Dynamic programming keeps the entire phrase playable, not just each individual note.
    costs = [{c: (c[1] * .12, None) for c in candidates[0]}]
    for i in range(1, len(notes)):
        layer = {}
        for c in candidates[i]:
            options = [(value[0] + abs(c[1] - prev[1]) + abs(c[0] - prev[0]) * .8 + c[1] * .12, prev) for prev, value in costs[-1].items()]
            layer[c] = min(options, key=lambda x: x[0])
        costs.append(layer)
    current = min(costs[-1], key=lambda c: costs[-1][c][0])
    for i in range(len(notes) - 1, -1, -1):
        notes[i]['string'] = current[0] + 1
        notes[i]['fret'] = current[1]
        current = costs[i][current][1]
    return notes
