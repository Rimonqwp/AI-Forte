const assert=require('node:assert/strict');const {generate,tuning,canHold}=require('../app/static/fingerstyle.js');
const source=[{start:.2,end:.5,pitch:64,string:1,fret:0},{start:.9,end:1.1,pitch:67,string:1,fret:3},{start:1.6,end:2,pitch:64,string:1,fret:0},{start:2.3,end:2.5,pitch:62,string:2,fret:3}];
const harmony={chords:[{start:0,end:2.2,label:'C',uncertain:false,frets:[-1,3,2,0,1,0]},{start:2.2,end:4,label:'N',uncertain:true,frets:[-1,-1,-1,-1,-1,-1]}]};
const evidence=[{start:0,end:2.2,pitch_class:0,ratio:.9}], before=JSON.stringify(source);
const draft=generate(source,4,harmony,evidence);assert.equal(JSON.stringify(source),before);
assert.deepEqual(draft.melody.map(({start,end,pitch,string,fret})=>({start,end,pitch,string,fret})),source);
assert(draft.extras.some(n=>n.role==='bass'));assert(draft.extras.some(n=>n.role==='fill'));
for(const x of draft.extras){
 assert(x.start>=0&&x.end<=2.2&&x.end>x.start);assert.equal(tuning[x.string-1]+x.fret,x.pitch);assert(x.fret>=0&&x.fret<=12);
 if(x.role==='bass'){assert.equal(x.pitch%12,0);assert(source.some(n=>Math.abs(n.start-x.start)<1e-6));}
 if(x.role==='fill')assert([0,4,7].includes(x.pitch%12));
 for(let i=0;i<source.length;i++){const n=source[i],ringEnd=source[i+1]?.start??n.end;if(ringEnd<=x.start||n.start>=x.end)continue;assert.notEqual(n.string,x.string);assert(canHold(n.fret,x.fret));}
}
assert.deepEqual(generate(source,4,harmony,[]).extras,[]);
assert.deepEqual(generate(source,4,harmony,[{...evidence[0],ratio:.2}]).extras,[]);
assert.deepEqual(generate(source,4,{chords:[{...harmony.chords[0],uncertain:true}]},evidence).extras,[]);
assert.deepEqual(generate([],5,harmony,evidence).events,[]);
console.log(`Fingerstyle: melody unchanged, ${draft.extras.length} source-supported notes, playable and uncertainty checks passed.`);
const slideSource=[{start:0,end:.2,pitch:64,string:2,fret:5},{start:.25,end:.45,pitch:66,string:2,fret:7},{start:.5,end:.7,pitch:67,string:2,fret:8},{start:.8,end:1,pitch:64,string:1,fret:0}];
const slideDraft=generate(slideSource,1.2);
assert(slideDraft.slides.length>0);
for(const slide of slideDraft.slides){
 const a=slideSource[slide.from],b=slideSource[slide.to];
 assert.equal(a.string,b.string);assert(a.fret>0 && b.fret>0);assert.equal(slide.semitones,b.fret-a.fret);
 assert(slide.start>=a.start && slide.start<slide.end && slide.end===b.start);
}
assert.deepEqual(slideDraft.melody.map(({role,melodyIndex,...n})=>n),slideSource);
const agreed={...harmony.chords[0],uncertain:true,source_labels:['C','Cmaj7']};
assert(generate(source,4,{chords:[agreed]},[{...evidence[0],agreed:true}],'rich').extras.length>0);
assert.equal(generate(source,4,{chords:[agreed]},[{...evidence[0],agreed:true}],'sparse').extras.length,0);
assert.equal(generate(source,4,{chords:[agreed]},evidence,'rich').extras.length,0);
console.log('Slides connect only playable fretted notes, and richer harmony requires matching evidence.');
const beatSource=source.map(n=>({...n,source:'vocal'}));
const unquantized=generate(beatSource,4,harmony,evidence,'rich');
const rhythmic=generate(beatSource,4,harmony,evidence,'rich',{regularity:1,beats:[0,.5,1,1.5,2,2.5,3]});
const firstFree=unquantized.extras.find(n=>n.role==='fill');
const firstGrid=rhythmic.extras.find(n=>n.role==='fill');
assert(firstFree&&firstGrid&&Math.abs(firstFree.start-.585)<1e-6&&Math.abs(firstGrid.start-.5)<1e-6);
assert.deepEqual(rhythmic.melody.map(({role,melodyIndex,...n})=>n),beatSource);
const unreliable=generate(beatSource,4,harmony,evidence,'rich',{regularity:.2,beats:[0,.5,1,1.5]});
assert.equal(unreliable.extras.find(n=>n.role==='fill').start,unquantized.extras.find(n=>n.role==='fill').start);
console.log('Vocal embellishments follow reliable source beats while melody timing remains unchanged.');
