/* Sparse chord-root and arpeggio draft, gated by source bass evidence. */
(function(root){
  const tuning=[64,59,55,50,45,40]; // visual string order: high e -> low E
  function canHold(fretA,fretB){return fretA===0 || fretB===0 || Math.abs(fretA-fretB)<=4;}
  function generate(notes,duration,harmony=null,evidence=[],density='rich',rhythm=null){
    const melody=notes.map((n,index)=>({...n,role:'melody',melodyIndex:index}));
    const extras=[];
    const rich=density==='rich';
    const beats=(rhythm?.regularity>=.8 && Array.isArray(rhythm.beats))?rhythm.beats.filter(Number.isFinite):[];
    const beatGrid=[];
    for(let i=0;i<beats.length;i++){
      beatGrid.push(beats[i]);
      if(i+1<beats.length && beats[i+1]-beats[i]>=.25 && beats[i+1]-beats[i]<=1.2)beatGrid.push((beats[i]+beats[i+1])/2);
    }
    function fillTime(note,next,chord,ideal){
      if(note.source!=='vocal' || !beatGrid.length)return ideal;
      const options=beatGrid.filter(t=>t>=note.start+.10 && t<=next.start-.10 && t>=chord.start && t<chord.end && Math.abs(t-ideal)<=.12);
      if(!options.length)return ideal;
      const nearest=options.reduce((best,t)=>Math.abs(t-ideal)<Math.abs(best-ideal)?t:best);
      return Math.abs(nearest-ideal)>.02?nearest:ideal;
    }
    const chords=(harmony?.chords || []).filter(c=>Array.isArray(c.frets) && c.frets.length===6);
    const supported=chords.map(chord=>{
      const proof=evidence.find(e=>Math.abs(e.start-chord.start)<.01 && Math.abs(e.end-chord.end)<.01 && e.ratio>=.6);
      if(chord.uncertain && (!rich || !proof?.agreed))return null;
      if(!proof)return null;
      const tones=new Set(chord.frets.flatMap((f,i)=>f>=0?[(tuning[5-i]+f)%12]:[]));
      return {...chord,root:proof.pitch_class,tones};
    }).filter(Boolean);
    // Include the ringing melody up to the next onset when checking playability.
    function safeEnd(start,end,string,fret,ignore=null){
      for(let i=0;i<melody.length;i++){
        const n=melody[i], soundingEnd=melody[i+1]?.start ?? n.end;
        if(soundingEnd<=start || n.start>=end)continue;
        if(n.string===string || !canHold(n.fret,fret)){
          if(n.start<=start+.001)return start;
          end=Math.min(end,n.start);
        }
      }
      for(const n of extras){
        if(n===ignore)continue;
        if(n.end<=start || n.start>=end)continue;
        if(n.string===string || !canHold(n.fret,fret)){
          if(n.start<=start+.001)return start;
          end=Math.min(end,n.start);
        }
      }
      return end;
    }
    let previousBass=-Infinity,previousFill=-Infinity;
    for(const chord of supported){
      // Play the bass on an existing melody attack inside this chord, not on a
      // synthetic beat or a bass note unrelated to the source harmony.
      let bassCount=0;
      for(const n of melody){
        if(n.start<chord.start || n.start>=chord.end || n.start-previousBass<(rich ? .9 : 1.5) || !chord.tones.has(n.pitch%12))continue;
        const choices=[];
        for(let string=4;string<=6;string++){
          if(string<=n.string)continue;
          for(let fret=0;fret<=12;fret++){
            const pitch=tuning[string-1]+fret;
            if(pitch%12!==chord.root || pitch>=n.pitch-5 || pitch>55 || !canHold(n.fret,fret))continue;
            const end=safeEnd(n.start,Math.min(chord.end,duration,n.start+.48),string,fret);
            if(end-n.start<.12)continue;
            choices.push({start:n.start,end,pitch,string,fret,role:'bass',score:Math.abs(fret-n.fret)*.1+(pitch-40)*.025});
          }
        }
        if(choices.length){choices.sort((a,b)=>a.score-b.score);const {score,...note}=choices[0];extras.push(note);previousBass=n.start;bassCount++;if(bassCount>=(rich?2:1))break;}
      }
      // A quiet chord tone in a sufficiently long gap creates a picked
      // arpeggio while the melody keeps ringing. Never repeat the melody note.
      let fillCount=0;
      for(let i=0;i<melody.length-1;i++){
        const n=melody[i],next=melody[i+1],gap=next.start-n.start;
        if(n.start<chord.start || next.start>chord.end || gap<(rich ? .36 : .48) || !chord.tones.has(n.pitch%12))continue;
        const start=n.start+gap*.55;
        if(start-previousFill<(rich?1.1:2.4) || Math.abs(start-previousBass)<.20)continue;
        const choices=[];
        for(let string=2;string<=4;string++){
          if(string===n.string)continue;
          for(let fret=0;fret<=12;fret++){
            const pitch=tuning[string-1]+fret, interval=(n.pitch-pitch)%12;
            if(!chord.tones.has(pitch%12) || pitch>=n.pitch || ![3,4,5,7,8,9].includes(interval) || !canHold(n.fret,fret))continue;
            const end=safeEnd(start,Math.min(next.start,chord.end,start+.28,duration),string,fret);
            if(end-start<.10)continue;
            choices.push({start,end,pitch,string,fret,role:'fill',score:Math.abs(fret-n.fret)*.2+Math.abs(n.pitch-pitch)*.03});
          }
        }
        if(choices.length){choices.sort((a,b)=>a.score-b.score);const {score,...note}=choices[0];extras.push(note);previousFill=start;fillCount++;if(fillCount>=(rich?2:1))break;}
      }
    }
    extras.sort((a,b)=>a.start-b.start || a.string-b.string);
    // Adjust already-selected vocal fills only; rhythm alignment must not add
    // or remove candidates merely because a timing threshold was crossed.
    if(beatGrid.length){
      for(const extra of extras){
        if(extra.role!=='fill')continue;
        const i=melody.findIndex((n,index)=>index+1<melody.length && n.start<=extra.start && melody[index+1].start>extra.start);
        if(i<0)continue;
        const n=melody[i],next=melody[i+1];
        const chord=supported.find(c=>n.start>=c.start && next.start<=c.end);
        if(!chord)continue;
        const start=fillTime(n,next,chord,extra.start);
        if(start===extra.start || extras.some(other=>other!==extra && Math.abs(other.start-start)<(other.role==='fill' ? .8 : .10)))continue;
        const end=safeEnd(start,Math.min(start+(extra.end-extra.start),next.start,chord.end,duration),extra.string,extra.fret,extra);
        if(end-start<.10)continue;
        extra.start=start;extra.end=end;
      }
      extras.sort((a,b)=>a.start-b.start || a.string-b.string);
    }
    // Slides are optional performance choices between existing fretted notes.
    const slides=[];let lastSlide=-Infinity;
    for(let i=0;i<melody.length-1;i++){
      const a=melody[i],b=melody[i+1],delta=b.fret-a.fret,span=b.start-a.start;
      if(a.string!==b.string || a.fret<=0 || b.fret<=0 || Math.abs(delta)<1 || Math.abs(delta)>4 ||
         b.pitch-a.pitch!==delta || span<.15 || span>.8 || b.start-a.end>.22 || a.start-lastSlide<(rich ? .55 : 1.1))continue;
      const start=b.start-Math.min(.095,span*.3);
      if(extras.some(n=>n.start<b.start && n.end>start && (n.string===a.string || !canHold(n.fret,b.fret))))continue;
      slides.push({from:i,to:i+1,start,end:b.start,semitones:delta});lastSlide=a.start;
    }
    return {melody,extras,slides,events:[...melody,...extras].sort((a,b)=>a.start-b.start || a.string-b.string)};
  }
  const api={generate,tuning,canHold};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Fingerstyle=api;
})(globalThis);
