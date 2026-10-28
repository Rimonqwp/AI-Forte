/* Fixed accompaniment presets. No audio, model output, or network access. */
(function (root) {
  const names=['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const tuning=[40,45,50,55,59,64];
  const open={C:[-1,3,2,0,1,0],D:[-1,-1,0,2,3,2],E:[0,2,2,1,0,0],F:[1,3,3,2,1,1],G:[3,2,0,0,0,3],A:[-1,0,2,2,2,0],Bb:[-1,1,3,3,3,1],B:[-1,2,4,4,4,2],Cm:[-1,3,5,5,4,3],Dm:[-1,-1,0,2,3,1],Em:[0,2,2,0,0,0],Fm:[1,3,3,1,1,1],Gm:[3,5,5,3,3,3],Am:[-1,0,2,2,1,0],Bm:[-1,2,4,4,3,2]};
  const progressions={
    pop:{name:'明亮流行',minor:false,steps:[[0,false],[7,false],[9,true],[5,false]]},
    gentle:{name:'柔和抒情',minor:false,steps:[[0,false],[9,true],[5,false],[7,false]]},
    minor:{name:'小调循环',minor:true,steps:[[0,true],[8,false],[3,false],[10,false]]}
  };
  // Beat positions within each four-beat bar; a quiet two-stroke default.
  const patterns={gentle:[[0,'down',.7],[2,'down',.5]],quarter:[[0,'down',.75],[1,'down',.5],[2,'down',.65],[3,'down',.5]],pop:[[0,'down',.75],[1,'down',.55],[1.5,'up',.4],[2.5,'up',.4],[3,'down',.6],[3.5,'up',.4]]};
  function frets(root,minor){
    const label=names[root]+(minor?'m':'');
    if(open[label])return [...open[label]];
    // Prefer an A-shape barre when it keeps the hand closer to the nut.
    const e=(root-4+12)%12, a=(root-9+12)%12;
    return a<e?[-1,a,a+2,a+2,minor?a+1:a+2,a]:[e,e+2,e+2,minor?e:e+1,e,e];
  }
  function generate(duration,settings){
    const {key,bpm,offset,progression,pattern}=settings;
    if(!Number.isFinite(duration)||duration<=0||duration>60||!Number.isInteger(key)||key<0||key>11||!Number.isFinite(bpm)||bpm<40||bpm>200||!Number.isFinite(offset)||offset<0||offset>=duration||!progressions[progression]||!patterns[pattern])throw Error('请检查调性、节奏、速度（40–200 BPM）和起点（需小于片段时长）。');
    const preset=progressions[progression], beat=60/bpm, bar=4*beat, chords=[],strums=[];
    const labels=preset.steps.map(([interval,minor])=>names[(key+interval)%12]+(minor?'m':''));
    for(let index=0;offset+index*bar<duration-1e-8;index++){
      const start=offset+index*bar,end=Math.min(duration,start+bar),[interval,minor]=preset.steps[index%4];
      const shape=frets((key+interval)%12,minor), label=labels[index%4];
      chords.push({start,end,label,frets:shape});
      for(const [position,direction,velocity] of patterns[pattern]){
        const time=start+position*beat;
        if(time<end-1e-8)strums.push({time,end,direction,velocity,chord:label,frets:[...shape]});
      }
    }
    return {method:'fixed-preset',bpm,tuning_cents:0,chords,strums,labels,
      notice:`${names[key]}${preset.minor?'小调':'大调'} · ${labels.join(' → ')} · 每小节一个和弦，4 拍一换。固定循环不分析原曲，请用调性、速度和起点配合旋律。`};
  }
  const api={names,tuning,progressions,patterns,frets,generate};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FixedAccompaniment=api;
})(globalThis);
