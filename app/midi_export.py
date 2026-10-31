"""Small Type 1 MIDI writer: 120 BPM, 960 PPQ = 1920 ticks/second."""
import struct


def vlq(n):
    out = [n & 127]
    while n >> 7:
        n >>= 7
        out.insert(0, (n & 127) | 128)
    return bytes(out)


def block(kind, data):
    return kind+struct.pack('>I', len(data))+data


def midi(tracks):
    result = [block(b'MThd', struct.pack('>HHH', 1, len(tracks)+1, 960)),
              block(b'MTrk', b'\x00\xff\x51\x03\x07\xa1\x20\x00\xff\x2f\x00')]
    for index, (name, notes) in enumerate(tracks):
        channel = index % 15
        if channel >= 9: channel += 1
        label = name.encode('utf-8')[:120]
        data = b'\x00\xff\x03'+vlq(len(label))+label+b'\x00'+bytes([0xc0+channel, 24])
        events = []
        # Truncate overlapping repetitions of the same MIDI key to prevent note-off ambiguity.
        grouped = {}
        for n in sorted(notes, key=lambda x: x['start']):
            p = n['pitch']
            if p in grouped and grouped[p]['end'] > n['start']:
                grouped[p]['end'] = n['start']
            item = dict(n)
            grouped[p] = item
            events.append(item)
        messages = []
        for n in events:
            a, b = round(n['start']*1920), round(n['end']*1920)
            if b <= a: continue
            messages.extend([(a, 1, bytes([0x90+channel, n['pitch'], n.get('velocity', 80)])),
                             (b, 0, bytes([0x80+channel, n['pitch'], 0]))])
        last = 0
        for tick, _, message in sorted(messages):
            data += vlq(tick-last)+message
            last = tick
        result.append(block(b'MTrk', data+b'\x00\xff\x2f\x00'))
    return b''.join(result)
