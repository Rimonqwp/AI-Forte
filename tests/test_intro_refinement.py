import numpy as np
from app.intro_refinement import repair_spikes


def test_only_removes_a_short_spike_when_source_supports_the_neighbor():
    notes=[{'start':8.5,'end':9.5,'pitch':67,'source':'instrumental_intro'},
           {'start':9.5,'end':9.64,'pitch':70,'source':'instrumental_intro','uncertain':True},
           {'start':9.64,'end':10.0,'pitch':67,'source':'instrumental_intro'},
           {'start':16,'end':16.2,'pitch':62,'source':'vocal'}]
    original=[dict(n) for n in notes];times=np.arange(8.4,10.1,.01);spec=np.zeros((72,len(times)));spec[67-36]=2;spec[70-36]=.2
    out,fixes=repair_spikes(notes,spec,times,start_at=6)
    assert notes==original and len(fixes)==1
    assert [(n['pitch'],n['start'],n['end']) for n in out]==[(67,8.5,9.64),(67,9.64,10.0),(62,16,16.2)]
    assert out[-1]==original[-1]
    unchanged,_=repair_spikes(notes,spec,times,start_at=10);assert unchanged==original
    spec[70-36]=1.5;unchanged,_=repair_spikes(notes,spec,times,start_at=6);assert unchanged==original


def test_sustained_or_non_repeating_melody_is_not_rewritten():
    notes=[{'start':6,'end':6.5,'pitch':70,'source':'instrumental_intro'},
           {'start':6.5,'end':7,'pitch':72,'source':'instrumental_intro'},
           {'start':7,'end':8,'pitch':70,'source':'instrumental_intro'}]
    times=np.arange(6,8,.01);spec=np.ones((72,len(times)))
    out,fix=repair_spikes(notes,spec,times);assert out==notes and fix==[]
