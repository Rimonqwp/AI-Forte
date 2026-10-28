// Let notes ring to the next melody onset, while softening close transitions.
(function(root){
  function canConnect(a,b){
    if(!a || !b || !Number.isFinite(a.end) || !Number.isFinite(b.start)) return false;
    const gap=b.start-a.end, interval=Math.abs(b.pitch-a.pitch);
    return gap>=-.03 && gap<=.08 && interval>=1 && interval<=5 &&
      a.end-a.start>=.08 && b.end-b.start>=.08 && b.start>a.start;
  }
  function connections(notes){
    return notes.map((note,index)=>({in:index>0 && canConnect(notes[index-1],note),out:canConnect(note,notes[index+1])}));
  }
  function sustainEnd(note,next,duration,extraNotes=[]){
    // Guitar strings naturally decay. The recording determines the maximum tail.
    let end=next ? Math.min(duration,next.start+.025) : Math.min(duration,note.end+.5);
    // A new pluck on this string takes over rather than playing two independent
    // long notes on the same string.
    for(const extra of extraNotes){
      if(extra.string===note.string && extra.start>note.start+.001 && extra.start<end)
        end=Math.min(end,extra.start+.015);
    }
    return Math.max(note.start,end);
  }
  function fillEnd(note,notes,extraNotes,duration){
    let end=duration;
    for(const next of notes){if(next.start>note.start+.001){end=Math.min(end,next.start+.025);break;}}
    for(const next of extraNotes){if(next!==note && next.string===note.string && next.start>note.start+.001)end=Math.min(end,next.start+.015);}
    return Math.max(note.end,Math.min(duration,end));
  }
  const api={canConnect,connections,sustainEnd,fillEnd};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Legato=api;
})(globalThis);
