"""Build the local playback bank from the CC0 Meta Nylon Guitar finger samples.

Usage: python scripts/build_guitar_bank.py /path/to/verified/ogg-samples
The sample collection and hashes are linked in README.md.
"""
import json
import re
import sys
from pathlib import Path

import librosa
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

strings={'HighE':1,'B':2,'G':3,'D':4,'A':5,'LowE':6}
source=Path(sys.argv[1]); target=Path(__file__).resolve().parent.parent/'app/static/guitar'
target.mkdir(exist_ok=True)
entries=[]; waveforms=[]; offset=0
for file in sorted(source.glob('*_Vel01Finger_*.ogg')):
    match=re.fullmatch(r'INSGuitarNylon_String(HighE|B|G|D|A|LowE)_Vel01Finger_([A-G]s?\d)_01\.ogg',file.name)
    if not match:continue
    string=strings[match[1]];pitch=librosa.note_to_midi(match[2].replace('s','#'))
    samples,sr=sf.read(file,dtype='float32',always_2d=True);mono=samples.mean(axis=1)
    assert sr==48000
    y=resample_poly(mono[:int(sr*3.5)],147,320).astype(np.float32);out_sr=22050
    nominal=float(librosa.midi_to_hz(pitch));segment=y[int(.04*out_sr):int(.38*out_sr)]
    nfft=131072; spectrum=np.abs(np.fft.rfft(segment*np.hanning(len(segment)),nfft));freqs=np.fft.rfftfreq(nfft,1/out_sr)
    measured=[]
    for harmonic in range(1,5):
        lo=nominal*harmonic*.97;hi=nominal*harmonic*1.03
        indices=np.flatnonzero((freqs>=lo)&(freqs<=hi))
        if len(indices):
            k=indices[np.argmax(spectrum[indices])]
            if spectrum[k] > spectrum.max()*.025: measured.append(freqs[k]/harmonic)
    frequency=float(np.median(measured)) if measured else nominal
    if abs(1200*np.log2(frequency/nominal))>45:frequency=nominal
    peak=max(float(np.max(np.abs(y[:int(out_sr*.5)]))),1e-6)
    y=np.clip(y*(.8/peak),-1,1)
    # A short fade prevents a click if the source is longer than the bank sample.
    endfade=min(int(.025*out_sr),len(y));y[-endfade:]*=np.linspace(1,0,endfade)
    pcm=np.rint(y*32767).astype('<i2')
    entries.append({'string':string,'pitch':pitch,'offset':offset,'length':len(pcm),'frequency':frequency,'file':file.name})
    waveforms.append(pcm);offset+=len(pcm)
assert len(entries)==116, f'expected 116 samples, got {len(entries)}'
np.concatenate(waveforms).tofile(target/'samples.pcm')
(target/'samples.json').write_text(json.dumps({'sampleRate':out_sr,'samples':entries},separators=(',',':')))
(target/'LICENSE').write_text((source/'LICENSE').read_text())
print(f'{len(entries)} samples; {offset/out_sr:.1f} seconds; {(offset*2)/1024/1024:.1f} MiB')
