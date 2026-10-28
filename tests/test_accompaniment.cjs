const assert=require('node:assert/strict');
const {generate,names,tuning,progressions,patterns,frets}=require('../app/static/accompaniment.js');
const defaults={key:0,bpm:90,offset:0,progression:'gentle',pattern:'gentle'};
assert.deepEqual(generate(20,defaults).labels,['C','Am','F','G']);
assert.deepEqual(generate(20,{...defaults,key:9,progression:'minor'}).labels,['Am','F','C','G']);
for(let root=0;root<12;root++)for(const minor of [false,true]){
 const shape=frets(root,minor), pitches=new Set(shape.flatMap((f,i)=>f<0?[]:[(tuning[i]+f)%12]));
 assert.deepEqual(pitches,new Set([root,(root+(minor?3:4))%12,(root+7)%12]));
 assert(shape.every(f=>f>=-1&&f<=15));
 const pressed=shape.filter(f=>f>0);assert(Math.max(...pressed)-Math.min(...pressed)<=3);
}
for(let key=0;key<12;key++)for(const progression of Object.keys(progressions))for(const pattern of Object.keys(patterns)){
 const info=generate(19.7,{key,progression,pattern,bpm:137,offset:1.1});
 assert(info.strums.length);assert.equal(info.chords[0].start,1.1);assert.equal(info.chords.at(-1).end,19.7);
 for(const stroke of info.strums){const chord=info.chords.find(c=>c.start<=stroke.time&&stroke.time<c.end);assert(chord);assert.equal(stroke.chord,chord.label);assert.deepEqual(stroke.frets,chord.frets);assert.equal(stroke.end,chord.end);}
}
const fixed=generate(10,{...defaults,bpm:120,offset:1,pattern:'quarter'});
assert.deepEqual(fixed.chords.map(c=>c.start),[1,3,5,7,9]);
assert.deepEqual(fixed.strums.slice(0,4).map(s=>s.time),[1,1.5,2,2.5]);
for(const settings of [{bpm:0},{bpm:NaN},{offset:20},{offset:-1},{key:12},{key:.5},{progression:'unknown'},{pattern:'unknown'}])assert.throws(()=>generate(20,{...defaults,...settings}));
console.log('Fixed accompaniment: voicings in all 12 keys, 108 arrangements, timing and validation passed.');
