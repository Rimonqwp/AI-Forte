"""MuScriptor inference in its own interpreter; torch>=2.3 / numpy>=2 clash with Basic Pitch.

Usage: python muscriptor_runner.py plan.json, where the plan is [{input, output, instruments}].
The model loads once per plan. Seconds are relative to each input; drums are dropped.
"""
import importlib.metadata
import json
import os
import sys
from pathlib import Path


def main(plan):
    from muscriptor import NoteEndEvent, TranscriptionModel
    model = TranscriptionModel.load_model(os.environ.get('MUSCRIPTOR_WEIGHTS') or os.environ.get('MUSCRIPTOR_MODEL', 'large'))
    version = importlib.metadata.version('muscriptor')
    cfg = float(os.environ.get('MUSCRIPTOR_CFG', '1'))
    for job in json.loads(Path(plan).read_text(encoding='utf-8')):
        notes = [{'start': e.start_event.start_time, 'end': e.end_time, 'pitch': e.start_event.pitch,
                  'instrument': e.start_event.instrument}
                 for e in model.transcribe(job['input'], instruments=job.get('instruments') or None, cfg_coef=cfg)
                 if isinstance(e, NoteEndEvent) and e.start_event.instrument != 'drums']
        target = Path(job['output'])
        partial = target.with_suffix('.part')
        partial.write_text(json.dumps({'version': version, 'notes': notes}), encoding='utf-8')
        os.replace(partial, target)


if __name__ == '__main__': main(sys.argv[1])
