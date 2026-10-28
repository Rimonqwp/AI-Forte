"""Conservative corrections to brief intro voice-switch errors."""
from pathlib import Path
import numpy as np


def repair_spikes(notes, chroma_notes, times, start_at=0):
    """Remove a brief contradictory detour when a stronger pitch continues.

    chroma_notes is a semitone CQT starting at MIDI C2 (36). No melody pitch is
    invented: we only extend the identical surrounding pitch through the gap.
    """
    result=[dict(n) for n in notes]
    fixes=[];i=1
    while i<len(result)-1:
        a,b,c=result[i-1:i+2]
        if (all(n.get('source')=='instrumental_intro' for n in (a,b,c)) and b.get('uncertain',False)
            and b['start']>=start_at and a['pitch']==c['pitch']
            and abs(b['pitch']-a['pitch'])>=2 and b['end']-b['start']<=.25
            and 0<=b['start']-a['end']<=.1 and 0<=c['start']-b['end']<=.1):
            ix=(times>=b['start']) & (times<b['end'])
            neighbor=a['pitch']-36; detour=b['pitch']-36
            if np.any(ix) and 0<=neighbor<chroma_notes.shape[0] and 0<=detour<chroma_notes.shape[0]:
                spectrum=np.mean(chroma_notes[:,ix],axis=1)
                base=float(spectrum[neighbor]);other=float(spectrum[detour])
                if base>1e-6 and other/base<.35:
                    fixes.append({'start':b['start'],'end':b['end'],'removed_pitch':b['pitch'],
                                  'continued_pitch':a['pitch'],'relative_strength':round(other/base,3)})
                    a['end']=c['start']
                    del result[i]
                    continue
        i+=1
    return result,fixes


def refine_intro(notes, backing_path, start_at=0):
    """Cross-check candidates against the harmonic component of the backing."""
    import librosa
    audio,sr=librosa.load(str(Path(backing_path)),sr=22050,mono=True)
    if not len(audio) or np.sqrt(np.mean(audio**2))<.001:
        return [dict(n) for n in notes],[]
    harmonic=librosa.effects.harmonic(audio,margin=3)
    chroma=np.abs(librosa.cqt(harmonic,sr=sr,hop_length=256,fmin=librosa.note_to_hz('C2'),n_bins=72,bins_per_octave=12,tuning=0))
    times=librosa.frames_to_time(np.arange(chroma.shape[1]),sr=sr,hop_length=256)
    return repair_spikes(notes,chroma,times,start_at)
