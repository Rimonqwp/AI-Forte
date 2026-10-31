import numpy as np
import soundfile as sf

from cloud.full_song import blend
from cloud.music import chunks


def test_overlap_add_has_exact_duration_and_no_gain_jump(tmp_path):
    sr = 44100
    descriptors = list(chunks(61))
    paths = []
    for i, c in enumerate(descriptors):
        p = tmp_path/f'{i}.wav'
        # A DC signal exposes overlap doubling and holes directly.
        sf.write(p, np.full((round((c['end']-c['start'])*sr), 2), .2, np.float32), sr, subtype='FLOAT')
        paths.append(p)
    out = tmp_path/'merged.flac'
    blend(paths, descriptors, 61, out)
    data, rate = sf.read(out)
    assert rate == sr and len(data) == 61*sr
    assert np.max(abs(data-.2)) < .0001
