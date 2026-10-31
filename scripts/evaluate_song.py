"""Evaluate annotated notes against baseline/four/dual predictions.

Manifest: {clips:[{song_id, split:validation|test, role:vocal|instrumental,
 reference:path, baseline:path, four:path, dual:path, muscriptor?:path}]}. Each path is a JSON note
list (start/end/pitch), relative to manifest. Human-verified references only.
"""
import argparse
import json
from pathlib import Path


def counts(reference, predicted):
    # Maximum bipartite matching, rather than greedy matching repeated notes.
    edges = [[i for i, r in enumerate(reference) if r['pitch'] == n['pitch'] and abs(r['start']-n['start']) <= .05] for n in predicted]
    matched = {}
    def visit(i, seen):
        for j in edges[i]:
            if j in seen: continue
            seen.add(j)
            if j not in matched or visit(matched[j], seen): matched[j] = i; return True
        return False
    for i in range(len(predicted)): visit(i, set())
    tp = len(matched)
    return tp, len(predicted)-tp, len(reference)-tp


def main():
    p = argparse.ArgumentParser(); p.add_argument('manifest', type=Path); p.add_argument('--output', type=Path)
    args = p.parse_args(); clips = json.loads(args.manifest.read_text(encoding='utf-8'))['clips']
    songs = {}
    for c in clips:
        songs.setdefault(c['song_id'], set()).add(c['split'])
    if any(len(s)>1 for s in songs.values()): raise SystemExit('A song cannot appear in both validation and test')
    # MuScriptor is optional: four-stem selection with SONG_MUSCRIPTOR_VALIDATED=1.
    models = ('baseline','four','dual')+(('muscriptor',) if all('muscriptor' in c for c in clips) else ())
    totals = {m: {g: [0,0,0] for g in ('all','vocal','instrumental')} for m in models}
    for clip in clips:
        if clip['split'] != 'test': continue
        def read(key): return json.loads((args.manifest.parent/clip[key]).read_text(encoding='utf-8'))
        reference = read('reference')
        for model in totals:
            value = counts(reference, read(model))
            for group in ('all', clip['role']): totals[model][group] = [a+b for a,b in zip(totals[model][group], value)]
    result = {}
    for model, groups in totals.items():
        result[model] = {g: {'tp': v[0], 'fp': v[1], 'fn': v[2], 'f1': 2*v[0]/max(1,2*v[0]+v[1]+v[2])} for g,v in groups.items()}
    enough = len(clips)>=12 and all(totals['baseline'][g][0]+totals['baseline'][g][2]>0 for g in ('vocal','instrumental'))
    result['gates'] = {'dataset_minimum_met': enough,
        'new_pipeline': enough and result['four']['all']['f1']-result['baseline']['all']['f1']>=.05 and result['four']['vocal']['f1']>=result['baseline']['vocal']['f1']-.02,
        'dual_auto': enough and result['dual']['instrumental']['f1']-result['four']['instrumental']['f1']>=.03 and result['dual']['vocal']['f1']>=result['four']['vocal']['f1']-.02}
    if 'muscriptor' in result:
        result['gates']['muscriptor_auto'] = (enough and result['muscriptor']['instrumental']['f1']-result['four']['instrumental']['f1']>=.03
                                              and result['muscriptor']['vocal']['f1']>=result['four']['vocal']['f1']-.02)
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if args.output: args.output.write_text(text, encoding='utf-8')
    print(text)


if __name__ == '__main__': main()
