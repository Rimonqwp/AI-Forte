import numpy as np
from app.vocal_timing import refine_from_features,beat_grid


def test_only_moves_confident_voiced_attack_and_keeps_other_notes():
    times=np.arange(0,2,.01)
    spec=np.zeros((60,len(times)));midi=np.full(len(times),np.nan);voiced=np.zeros(len(times),bool);prob=np.zeros(len(times))
    spec[62-36,(times>=.94)&(times<1.3)]=2
    mask=(times>=.94)&(times<1.3);midi[mask]=62;voiced[mask]=True;prob[mask]=.8
    notes=[{'start':.1,'end':.5,'pitch':67,'source':'instrumental_intro'},
           {'start':1.,'end':1.3,'pitch':62,'original_pitch':62,'source':'vocal','uncertain':False}]
    before=[dict(n) for n in notes]
    output,fixes=refine_from_features(notes,times,spec,np.array([.9]),midi,voiced,prob)
    assert notes==before and output[0]==before[0]
    assert len(fixes)==1 and abs(output[1]['start']-.94)<1e-6
    assert output[1]['pitch']==62 and output[1]['end']==1.3
    weak=np.zeros_like(prob)
    assert refine_from_features(notes,times,spec,np.array([.9]),midi,voiced,weak)[1]==[]
    assert refine_from_features(notes,times,spec,np.array([.9]),midi,voiced,prob,start_at=1.1)[1]==[]
    ambiguous=[notes[0],dict(notes[1],uncertain=True)]
    assert refine_from_features(ambiguous,times,spec,np.array([.9]),midi,voiced,prob)[1]==[]


def test_silence_does_not_manufacture_a_beat(tmp_path):
    import soundfile as sf
    p=tmp_path/'silent.wav';sf.write(p,np.zeros(22050*5),22050)
    assert beat_grid(p) is None
