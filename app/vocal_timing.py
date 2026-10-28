"""Conservative timing checks against the separated voice and original mix."""
import numpy as np


def beat_grid(original_path):
    import librosa
    y,sr=librosa.load(str(original_path),sr=22050,mono=True)
    if len(y)<sr*4 or float(np.sqrt(np.mean(y*y)))<.002:return None
    hop=256
    onset=librosa.onset.onset_strength(y=y,sr=sr,hop_length=hop)
    if float(np.percentile(onset,90))<.05:return None
    bpm,beats=librosa.beat.beat_track(onset_envelope=onset,sr=sr,hop_length=hop,units='time',trim=False)
    beats=np.asarray(beats,dtype=float)
    if len(beats)<6:return None
    intervals=np.diff(beats);period=float(np.median(intervals))
    if not .25<=period<=1.2:return None
    regular=float(np.mean(np.abs(intervals-period)<=period*.18))
    if regular<.8:return None
    reference=float(np.percentile(onset,75))
    if reference<.05:return None
    frame_times=librosa.frames_to_time(np.arange(len(onset)),sr=sr,hop_length=hop)
    beat_support=[]
    for beat in beats:
        local=(frame_times>=beat-.05)&(frame_times<=beat+.05)
        beat_support.append(bool(np.any(local) and np.max(onset[local])>=reference*.35))
    onset_agreement=float(np.mean(beat_support))
    if onset_agreement<.6:return None
    return {'onset_agreement':round(onset_agreement,3),'bpm':round(float(np.asarray(bpm).reshape(-1)[0]),1),'beats':[round(float(b),6) for b in beats],
            'regularity':round(regular,3),'method':'original-mix-beat-tracker'}


def refine_from_features(notes,times,spectrum,peak_times,f0_midi,voiced,probability,start_at=0):
    """Advance only clearly supported voiced attacks; never quantize the melody."""
    result=[dict(n) for n in notes];fixes=[]
    for i,note in enumerate(result):
        if note.get('source')!='vocal' or note.get('uncertain') or note['start']<start_at:continue
        pitch=int(note.get('original_pitch',note['pitch']))
        if not 36<=pitch<36+spectrum.shape[0]:continue
        start,end=note['start'],note['end'];prior=result[i-1]['end'] if i else 0
        candidates=peak_times[(peak_times>=max(prior+.02,start-.17)) & (peak_times<start-.045)]
        if not len(candidates):continue
        onset=candidates[-1];row=spectrum[pitch-36]
        strong=(times>=start+.01)&(times<min(end,start+.11))
        if not np.any(strong):continue
        reference=float(np.median(row[strong]))
        if reference<.1:continue
        mask=(times>=onset+.015)&(times<start-.01)&(row>=reference*.25)&voiced&(probability>=.08)&np.isfinite(f0_midi)&(np.abs(f0_midi-pitch)<.55)
        mask &= row/(np.max(spectrum,axis=0)+1e-8)>.6
        ids=np.flatnonzero(mask)
        # A brief pair of independently supported frames is safer than aligning
        # to an unpitched consonant, a drum hit or the nearest metronome tick.
        if len(ids)<2 or ids[1]!=ids[0]+1:continue
        new_start=float(times[ids[0]])
        if not .015<=start-new_start<=.08 or new_start<prior+.015:continue
        note['start']=new_start
        fixes.append({'index':i,'before':start,'after':new_start,'pitch':pitch})
    return result,fixes


def refine_vocal_timing(notes,vocal_path):
    import librosa
    from scipy.ndimage import gaussian_filter1d
    from scipy.signal import find_peaks
    vocal=[n for n in notes if n.get('source')=='vocal']
    if not vocal:return [dict(n) for n in notes],[]
    y,sr=librosa.load(str(vocal_path),sr=22050,mono=True)
    if not len(y) or float(np.sqrt(np.mean(y*y)))<.001:return [dict(n) for n in notes],[]
    # One second of context before the first vocal keeps onset detection local.
    offset=max(0,int(min(n['start'] for n in vocal))-1)
    y=y[offset*sr:];hop=256
    f0,voiced,prob=librosa.pyin(y,fmin=librosa.note_to_hz('C2'),fmax=librosa.note_to_hz('C6'),sr=sr,frame_length=2048,hop_length=hop)
    times=librosa.frames_to_time(np.arange(len(f0)),sr=sr,hop_length=hop)+offset
    mids=np.full(len(f0),np.nan);valid=np.isfinite(f0)&(f0>0);mids[valid]=librosa.hz_to_midi(f0[valid])
    spectrum=np.abs(librosa.cqt(y,sr=sr,hop_length=hop,fmin=librosa.note_to_hz('C2'),n_bins=60,bins_per_octave=12,tuning=0))
    onset=librosa.onset.onset_strength(y=y,sr=sr,hop_length=hop)
    peaks,_=find_peaks(gaussian_filter1d(onset,1),prominence=float(np.percentile(onset,70))*.7,distance=10)
    peaks=librosa.frames_to_time(peaks,sr=sr,hop_length=hop)+offset
    limit=min(len(times),spectrum.shape[1]);times=times[:limit];spectrum=spectrum[:,:limit]
    return refine_from_features(notes,times,spectrum,peaks,mids[:limit],voiced[:limit],prob[:limit])
