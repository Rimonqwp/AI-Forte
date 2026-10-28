import numpy as np
import soundfile as sf
from app.fingerstyle_evidence import analyze_backing,bass_pitch_class


def test_bass_roots_include_slash_chords():
    assert bass_pitch_class('Bb/F')==5
    assert bass_pitch_class('D7/F#')==6
    assert bass_pitch_class('Ebm')==3
    assert bass_pitch_class('N') is None


def test_audio_evidence_rejects_silence_and_distinguishes_wrong_bass(tmp_path):
    sr=22050
    t=np.arange(2*sr)/sr
    path=tmp_path/'backing.wav'
    chords=[{'start':0,'end':1.8,'label':'C','uncertain':False},
            {'start':0,'end':1.8,'label':'F','uncertain':False},
            {'start':0,'end':1.8,'label':'C','uncertain':True},
            {'start':0,'end':1.8,'label':'C','uncertain':True,'source_labels':['C','Cmaj7']},
            {'start':0,'end':1.8,'label':'C','uncertain':True,'source_labels':['C','F']}] 
    sf.write(path,.3*np.sin(2*np.pi*130.8128*t),sr)
    out=analyze_backing(path,chords)
    assert len(out)==3
    assert out[0]['ratio']>.6
    assert out[1]['ratio']<.6
    assert out[2]['agreed'] and out[2]['ratio']>.6
    sf.write(path,np.zeros_like(t),sr)
    assert analyze_backing(path,chords)==[]
