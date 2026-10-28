"""Conservative source-audio support for automatically picked bass notes."""
import re

PITCH_CLASSES={'C':0,'C#':1,'Db':1,'D':2,'D#':3,'Eb':3,'E':4,'F':5,'F#':6,'Gb':6,'G':7,'G#':8,'Ab':8,'A':9,'A#':10,'Bb':10,'B':11}


def bass_pitch_class(label):
    inversion=re.search(r'/([A-G][b#]?)$',label)
    root=inversion or re.match(r'^([A-G][b#]?)',label)
    return PITCH_CLASSES.get(root.group(1)) if root else None


def analyze_backing(path,chords):
    import librosa
    import numpy as np
    audio,sr=librosa.load(str(path),sr=22050,mono=True)
    if not len(audio) or np.sqrt(np.mean(audio**2))<.001:
        return []
    harmonic=librosa.effects.harmonic(audio,margin=3)
    spectrum=np.abs(librosa.cqt(harmonic,sr=sr,hop_length=256,fmin=librosa.note_to_hz('E2'),n_bins=24,bins_per_octave=12,tuning=0))
    times=librosa.frames_to_time(np.arange(spectrum.shape[1]),sr=sr,hop_length=256)
    bins=(np.arange(24)+40)%12
    supported=[]
    for chord in chords:
        pitch=bass_pitch_class(chord.get('label',''))
        start,end=chord.get('start',0),chord.get('end',0)
        if pitch is None or end-start<.35:
            continue
        if chord.get('uncertain',True):
            labels=chord.get('source_labels',[])
            if len(labels)!=2 or any(bass_pitch_class(label)!=pitch for label in labels):
                continue
        frames=(times>=start+.1)&(times<min(end,start+1))
        if not np.any(frames):continue
        energy=np.mean(spectrum[:,frames],axis=1)
        chroma=np.array([energy[bins==pc].sum() for pc in range(12)])
        maximum=float(np.max(chroma))
        if maximum<1e-4:continue
        supported.append({'start':start,'end':end,'pitch_class':pitch,'ratio':round(float(chroma[pitch]/maximum),3),'agreed':bool(chord.get('uncertain',True))})
    return supported
