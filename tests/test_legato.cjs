const assert=require('assert');
const {canConnect,connections}=require('../app/static/legato.js');
const note=(start,end,pitch)=>({start,end,pitch});
assert(canConnect(note(0,.4,60),note(.45,.7,62)));
assert(canConnect(note(0,.4,60),note(.4,.7,65)));
assert(!canConnect(note(0,.4,60),note(.49,.7,62))); // Rest must remain audible.
assert(!canConnect(note(0,.4,60),note(.4,.7,60))); // Repeated notes retain attacks.
assert(!canConnect(note(0,.4,60),note(.4,.7,67))); // Large leaps retain articulation.
assert(!canConnect(note(0,.05,60),note(.05,.7,62))); // Do not smear short ornaments.
const n=[note(0,.4,60),note(.45,.7,62),note(.9,1,64)],before=JSON.stringify(n);
assert.deepStrictEqual(connections(n),[{in:false,out:true},{in:true,out:false},{in:false,out:false}]);
assert.equal(JSON.stringify(n),before);

const {sustainEnd,fillEnd}=require('../app/static/legato.js');
const a={start:1,end:1.2,pitch:60,string:2};
const b={start:1.9,end:2.1,pitch:67,string:1};
assert(Math.abs(sustainEnd(a,b,3)-1.925)<1e-9); // Long gap and large leap remain connected.
assert(Math.abs(sustainEnd(a,{...b,pitch:60},3)-1.925)<1e-9); // Repeated pitches still ring.
const fill={start:1.5,end:1.6,pitch:60,string:2,role:'fill'};
assert.equal(sustainEnd(a,b,3,[fill]),1.515); // Same-string fill takes over.
assert(Math.abs(fillEnd(fill,[a,b],[fill],3)-1.925)<1e-9);
assert.equal(sustainEnd(a,null,1.4),1.4); // Never exceed the clip.

console.log('Continuous sustain bridges gaps, retains attacks and respects string boundaries.');
