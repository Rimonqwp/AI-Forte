const $ = (id) => document.getElementById(id);
const form = $('form');
let audioUrl = null, fingerstyleUrl = null, accompanimentUrl = null, ensembleUrl = null, currentJob = null, selectedIndex = -1, activePlayer = null, markerFrame = 0, lastMarker = "", lastHarmonyMarker = "";
let fingerstyleDraft=null, fingerstyleGroups=[];
const fingerstyleEvidence=new Map();
let aiFingerstyleReview=null;
let displayedHarmony=null;
let guitarTone='sample', legatoEnabled=true;
const guitarBankPromise=GuitarSamples.load().then(()=>true).catch(error=>{
  console.warn(error); guitarTone='synth'; $('guitar-tone').value='synth';
  $('guitar-tone').querySelector('[value="sample"]').disabled=true;
  $('sample-status').textContent='真实吉他音色加载失败，已使用原合成音。'; return false;
});
const defaultHarmonySettings={mode:'preset',progression:'gentle',key:0,pattern:'gentle',bpm:90,offset:0,gain:45};
let harmonySettings={...defaultHarmonySettings};
FixedAccompaniment.names.forEach((name,index)=>{const option=document.createElement('option');option.value=index;option.textContent=name;$('preset-key').append(option);});
function settingsKey(){return `melody-tab:harmony:${currentJob.id}`;}
function controlsFromSettings(){
  for(const [field,id] of Object.entries({mode:'harmony-mode',progression:'preset-progression',key:'preset-key',pattern:'preset-pattern',bpm:'preset-bpm',offset:'preset-offset',gain:'harmony-gain'}))$(id).value=harmonySettings[field];
  updateSettingVisibility();
}
function updateSettingVisibility(){
  $('preset-controls').hidden=$('harmony-mode').value!=='preset';$('gain-control').hidden=$('harmony-mode').value==='off';
  $('harmony-gain-value').textContent=$('harmony-gain').value+'%';
}
function readHarmonySettings(){
  const result={mode:$('harmony-mode').value,progression:$('preset-progression').value,key:Number($('preset-key').value),pattern:$('preset-pattern').value,bpm:Number($('preset-bpm').value),offset:Number($('preset-offset').value),gain:Number($('harmony-gain').value)};
  if(result.mode==='preset')FixedAccompaniment.generate(currentJob.duration,result);
  return result;
}
function loadHarmonySettings(){
  harmonySettings={...defaultHarmonySettings};
  try{
    const saved=JSON.parse(localStorage.getItem(settingsKey()));
    if(saved&&['preset','source','off'].includes(saved.mode)&&Number.isFinite(saved.gain)&&saved.gain>=0&&saved.gain<=100){
      FixedAccompaniment.generate(currentJob.duration,saved);harmonySettings=saved;
    }
  }catch{}
  controlsFromSettings();$('harmony-settings-message').textContent='';
}
function melodyTuning(job){return harmonySettings.mode==='source'?(job.accompaniment?.tuning_cents || 0):0;}
function renderMelody(job){
  if(audioUrl)URL.revokeObjectURL(audioUrl);
  audioUrl=URL.createObjectURL(makeWav(job.notes,job.duration,[],melodyTuning(job)));$('melody').src=audioUrl;
}
$('harmony-mode').addEventListener('change',updateSettingVisibility);
document.querySelectorAll('.arrangement-controls input,.arrangement-controls select').forEach(control=>control.addEventListener('input',()=>{updateSettingVisibility();$('harmony-settings-message').textContent='设置尚未应用，请点击下方按钮更新试听。';}));
$('apply-harmony').addEventListener('click',async()=>{
  if(!currentJob)return;
  let next;
  try{next=readHarmonySettings();}catch(error){$('harmony-settings-message').textContent=error.message;return;}
  $('apply-harmony').disabled=true;$('harmony-settings-message').textContent='正在本机更新试听…';
  const position=activePlayer?.currentTime || 0;
  players.forEach(player=>player.pause());activePlayer=null;
  await new Promise(resolve=>setTimeout(resolve,30));
  try{
    harmonySettings=next;renderMelody(currentJob);renderHarmony(currentJob);
    const player=displayedHarmony?.strums?.length?(currentJob.notes.length?$('ensemble'):$('accompaniment')):$('melody');
    player.currentTime=Math.min(position,currentJob.duration);activePlayer=player;lastMarker='';updateMarker(position,false);
    let stored=true;try{localStorage.setItem(settingsKey(),JSON.stringify(harmonySettings));}catch{stored=false;}
    $('harmony-settings-message').textContent=harmonySettings.mode==='off'?'伴奏已关闭，可以单独听旋律。':`试听已更新${stored?'，设置已保存在此浏览器':'；本次设置未能保存到浏览器'}。`;
  }catch(error){$('harmony-settings-message').textContent='更新失败：'+error.message;}
  finally{$('apply-harmony').disabled=false;}
});
const stageInfo = {queued:['准备中',8],downloading:['获取音频',22],preparing:['截取音频',34],separating:['分离人声',55],transcribing:['识别人声旋律',68],instrumental:['识别器乐前奏',80],accompaniment:['整理谱子',90],timing:['核对人声节拍',96]};
function show(section) { for (const id of ['empty','progress','error','result']) $(id).hidden = id !== section; }
function time(n) { const m=Math.floor(n/60); const s=(n%60).toFixed(1).padStart(4,'0'); return `${m}:${s}`; }
function seekToNote(index) {
  if (!currentJob || !currentJob.notes[index]) return;
  const player=activePlayer || $('melody');
  activePlayer=player; player.currentTime=currentJob.notes[index].start;
  updateMarker(player.currentTime, false);
}
function renderTabs(notes) {
  const parent=$('tabs'); parent.replaceChildren(); lastMarker='';
  if (!notes.length) { parent.textContent=currentJob?.practice?'现在是独立和弦练习。输入 YouTube 链接生成旋律后，也可以搭配这些固定和弦试听。':'这个片段没有识别到清晰的旋律。请尝试另一段人声更明显的音频。'; return; }
  const labels=['e','B','G','D','A','E'];
  for (let offset=0;offset<notes.length;offset+=12) {
    const group=notes.slice(offset,offset+12);
    const wrap=document.createElement('div'); wrap.className='tab-line'; wrap.dataset.firstNote=offset;
    const start=document.createElement('div'); start.className='time'; start.textContent=`${time(group[0].start)} — ${time(group[group.length-1].end)}     点击音符跳转`; wrap.append(start);
    labels.forEach((label,stringIndex)=> {
      const row=document.createElement('div'); row.className='tab-row';
      const prefix=document.createElement('span'); prefix.className='tab-string'; prefix.textContent=label+' |'; row.append(prefix);
      group.forEach((note,i)=>{
        const cell=document.createElement('span'); cell.className='tab-cell'; cell.dataset.noteIndex=offset+i;
        cell.textContent=note.string===stringIndex+1?('-'+String(note.fret)).padEnd(5,'-'):'-----';
        if(note.string===stringIndex+1) cell.classList.add('tab-fret');
        cell.title=`${note.source==='instrumental_intro'?'器乐前奏 · 建议核对':'人声主旋律'} · 第 ${offset+i+1} 个音符 · ${time(note.start)}–${time(note.end)} · 点击跳转`;
        cell.addEventListener('click',()=>seekToNote(offset+i)); row.append(cell);
      });
      row.append(document.createTextNode('|')); wrap.append(row);
    });
    const timings=document.createElement('div'); timings.className='tab-row tab-times';
    const prefix=document.createElement('span'); prefix.className='tab-string'; prefix.textContent='  '; timings.append(prefix);
    group.forEach((note,i)=>{const cell=document.createElement('span');cell.className='tab-cell tab-time-cell';cell.dataset.noteIndex=offset+i;cell.textContent=`${Math.floor(note.start/60)}:${String(Math.floor(note.start%60)).padStart(2,'0')}${note.uncertain?'?':' '}`;cell.title=`${time(note.start)}–${time(note.end)}${note.uncertain?' · 建议核对':''}`;cell.addEventListener('click',()=>seekToNote(offset+i));timings.append(cell)});
    wrap.append(timings); parent.append(wrap);
  }
}
function updateMarker(position, shouldFollow) {
  if (!currentJob) return;
  updateHarmonyMarker(position);
  updateFingerstyleMarker(position,shouldFollow);
  if (!currentJob.notes.length){$('playback-position').textContent=`当前位置 ${time(position)}`;return;}
  const notes=currentJob.notes;
  let index=-1;
  for(let i=0;i<notes.length && notes[i].start<=position+.002;i++) index=i;
  const lineIndex=index<0?0:Math.floor(index/12);
  const activeIndex=index>=0 && position+.002<notes[index].end?index:-1;
  const key=`${lineIndex}:${activeIndex}`;
  $('playback-position').textContent=`当前位置 ${time(position)}${activeIndex>=0?` · 第 ${activeIndex+1} 个音符`:''}`;
  if(key===lastMarker) return;
  lastMarker=key;
  document.querySelectorAll('#tabs .tab-line').forEach((row,i)=>row.classList.toggle('playing',i===lineIndex));
  document.querySelectorAll('#tabs .tab-cell').forEach(cell=>cell.classList.toggle('active',Number(cell.dataset.noteIndex)===activeIndex));
  const line=document.querySelectorAll('#tabs .tab-line')[lineIndex];
  if(shouldFollow && activePlayer!==$('fingerstyle') && $('follow-score').checked && line){const rect=line.getBoundingClientRect();if(rect.bottom>innerHeight-35 || rect.top<80)line.scrollIntoView({behavior:'smooth',block:'nearest'});}
}
function followPlayback() {
  cancelAnimationFrame(markerFrame);
  if(!activePlayer) return;
  updateMarker(activePlayer.currentTime,!activePlayer.paused);
  if(!activePlayer.paused) markerFrame=requestAnimationFrame(followPlayback);
}
const players=[$('vocals'),$('melody'),$('fingerstyle'),$('accompaniment'),$('ensemble'),$('original')];
document.querySelectorAll('[data-compare]').forEach(button=>button.addEventListener('click',async()=>{
  const target=$(button.dataset.compare);
  if(!target.getAttribute('src')) return;
  const position=activePlayer?.currentTime || 0;
  players.forEach(player=>player.pause());
  target.currentTime=Math.min(position, Number.isFinite(target.duration)?target.duration:position);
  try {await target.play();} catch { $('playback-position').textContent='请点击播放器的播放按钮继续试听。'; }
}));
for(const player of players) {
  player.addEventListener('play',()=>{ players.filter(other=>other!==player).forEach(other=>other.pause()); activePlayer=player; followPlayback(); });
  player.addEventListener('pause',()=>{if(activePlayer===player){cancelAnimationFrame(markerFrame);updateMarker(player.currentTime,false);}});
  player.addEventListener('seeked',()=>{activePlayer=player;updateMarker(player.currentTime,false);});
  player.addEventListener('ended',()=>{if(activePlayer===player){cancelAnimationFrame(markerFrame);updateMarker(player.currentTime,false);}});
}

// Use calibrated guitar recordings; retain the earlier synthesizer for comparison and fallback.
function makeWav(notes, duration, strums=[], tuningCents=0, strumGain=1, extraNotes=[], slides=[]) {
  const sr=44100, length=Math.ceil((duration+0.1)*sr), buffer=new Float32Array(length);
  const harmonics=[1, .48, .26, .16, .10, .06];
  const links=legatoEnabled ? Legato.connections(notes) : [];
  const slideFrom=new Map(slides.map(slide=>[slide.from,slide]));
  const slideTo=new Set(slides.map(slide=>slide.to));
  notes.forEach((note,index)=>{
    const frequency=440*Math.pow(2,(note.pitch-69+tuningCents/100)/12), start=Math.max(0,Math.floor(note.start*sr));
    const next=notes[index+1]?.start ?? duration+0.1;
    const slide=slideFrom.get(index);
    const end=legatoEnabled || slide ? Legato.sustainEnd(note,notes[index+1],duration,extraNotes) : Math.min(duration+0.1,next,note.end+0.06);
    const count=Math.max(0,Math.min(length-start,Math.floor((end-note.start)*sr)));
    if(guitarTone==='sample' && GuitarSamples.mix(buffer,sr,note,end,.4,tuningCents,{softAttack:!!links[index]?.in || slideTo.has(index),slide})) return;
    const release=Math.min(.045, count/sr*.35);
    let phase=0;
    for(let i=0;i<count;i++) {
      const t=i/sr, attack=Math.min(1,t/(links[index]?.in || slideTo.has(index) ? .025 : .006)), fade=Math.min(1,(count-i)/(sr*release || 1));
      let sound=0;
      for(let h=0;h<harmonics.length;h++) {
        const harmonic=h+1;
        if(frequency*harmonic>=sr/2) break;
        sound+=harmonics[h]*Math.sin(phase*harmonic)*Math.exp(-(0.9+h*.55)*t);
      }
      buffer[start+i]+=sound*attack*fade*.22;
      const bend=slide ? slide.semitones*Math.max(0,Math.min(1,(note.start+t-slide.start)/(slide.end-slide.start))) : 0;
      phase+=2*Math.PI*frequency*Math.pow(2,bend/12)/sr;
    }
  });
  extraNotes.forEach(note=>{
    const frequency=440*Math.pow(2,(note.pitch-69+tuningCents/100)/12), start=Math.max(0,Math.floor(note.start*sr));
    const end=legatoEnabled && note.role==='fill' ? Legato.fillEnd(note,notes,extraNotes,duration) : Math.min(duration,note.end);
    const count=Math.max(0,Math.min(length-start,Math.floor((end-note.start)*sr)));
    if(guitarTone==='sample' && GuitarSamples.mix(buffer,sr,note,end,note.role==='bass'?.14:.10,tuningCents)) return;
    const release=Math.min(.045,count/sr*.35),gain=note.role==='bass'?.08:.06;
    for(let i=0;i<count;i++){
      const t=i/sr,attack=Math.min(1,t/.006),fade=Math.min(1,(count-i)/(sr*release||1));let sound=0;
      for(let h=0;h<harmonics.length;h++){const harmonic=h+1;if(frequency*harmonic>=sr/2)break;sound+=harmonics[h]*Math.sin(2*Math.PI*frequency*harmonic*t)*Math.exp(-(1.1+h*.65)*t);}
      buffer[start+i]+=sound*attack*fade*gain;
    }
  });
  const tuning=[40,45,50,55,59,64];
  strums.forEach((stroke,index)=>{
    const order=stroke.direction==='up'?[5,4,3,2,1,0]:[0,1,2,3,4,5];
    const allStrings=order.filter(string=>stroke.frets[string]>=0);
    const sounding=stroke.direction==='up'?allStrings.slice(0,3):allStrings;
    sounding.forEach((string,orderIndex)=>{
      const startTime=stroke.time+orderIndex*.008, start=Math.floor(startTime*sr);
      const nextTime=strums[index+1]?.time ?? duration+.1;
      const voiceEnd=Math.min(duration,stroke.end ?? duration,startTime+.85,nextTime+.025);
      const count=Math.max(0,Math.min(length-start,Math.floor((voiceEnd-startTime)*sr)));
      if(guitarTone==='sample' && GuitarSamples.mix(buffer,sr,{pitch:tuning[string]+stroke.frets[string],string:6-string,start:startTime},voiceEnd,.10*(stroke.velocity ?? .7)*strumGain,tuningCents)) return;
      const freq=440*Math.pow(2,(tuning[string]+stroke.frets[string]-69+tuningCents/100)/12);
      for(let i=0;i<count;i++){
        const t=i/sr, attack=Math.min(1,t/.004), release=Math.min(1,(count-i)/(sr*.05));
        let sound=0;
        for(let h=0;h<6;h++){const harmonic=h+1;if(freq*harmonic>=sr/2)break;sound+=harmonics[h]*Math.sin(2*Math.PI*freq*harmonic*t)*Math.exp(-(1.8+h*1.3)*t);}
        buffer[start+i]+=sound*attack*release*.04*(stroke.velocity ?? .7)*strumGain;
      }
    });
  });
  const array=new ArrayBuffer(44+length*2), view=new DataView(array);
  function word(offset,s){for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));}
  word(0,'RIFF'); view.setUint32(4,36+length*2,true); word(8,'WAVE'); word(12,'fmt '); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,sr,true); view.setUint32(28,sr*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true); word(36,'data'); view.setUint32(40,length*2,true);
  let peak=0; for(let i=0;i<length;i++) peak=Math.max(peak,Math.abs(buffer[i]));
  const scale=peak>.98?.98/peak:1;
  for(let i=0;i<length;i++) view.setInt16(44+i*2,Math.max(-1,Math.min(1,buffer[i]*scale))*32767,true);
  return new Blob([array],{type:'audio/wav'});
}

function seekToTime(position) {
  const player=activePlayer || ($('ensemble').getAttribute('src')?(currentJob.notes.length?$('ensemble'):$('accompaniment')):$('melody')); activePlayer=player; player.currentTime=position; updateMarker(player.currentTime,false);
}
function renderHarmony(job) {
  lastHarmonyMarker='';
  const info=harmonySettings.mode==='preset'?FixedAccompaniment.generate(job.duration,harmonySettings):harmonySettings.mode==='source'?job.accompaniment:null;
  displayedHarmony=info;
  const available=!!info && !!info.chords?.length;
  $('harmony-section').hidden=!available;
  $('harmony-unavailable').hidden=available;
  if(accompanimentUrl)URL.revokeObjectURL(accompanimentUrl);if(ensembleUrl)URL.revokeObjectURL(ensembleUrl);
  accompanimentUrl=null;ensembleUrl=null;
  $('accompaniment').removeAttribute('src');$('ensemble').removeAttribute('src');
  $('accompaniment').load();$('ensemble').load();
  $('chord-list').replaceChildren();$('strum-list').replaceChildren();
  $('ensemble').closest('.player').hidden=!job.notes.length;
  document.querySelectorAll('[data-compare]').forEach(button=>button.disabled=button.dataset.compare==='fingerstyle'?!job.notes.length:button.dataset.compare!=='original'&&!info?.strums?.length);
  if(!available){$('harmony-unavailable').textContent=harmonySettings.mode==='off'?'伴奏已关闭。':job.practice?'独立练习没有原曲识别结果，请选择通用和弦。':'这份结果没有原曲伴奏，可以改用通用和弦。';return;}
  $('harmony-notice').textContent=info.notice || '旧版和弦未核对音高证据，可能包含错配；请重新生成后对照原曲试听。';
  $('harmony-tempo').textContent=`约 ${info.bpm} BPM`;
  const chords=$('chord-list');chords.replaceChildren();
  info.chords.forEach((chord,index)=>{const button=document.createElement('button');button.type='button';button.className='chord-card'+(chord.uncertain?' uncertain':'')+(chord.label==='N'?' rest':'');button.dataset.chordIndex=index;const name=document.createElement('strong');name.textContent=chord.label==='N'?'留空':chord.label+(chord.uncertain?' ?':'');const range=document.createElement('small');range.textContent=`${time(chord.start)} – ${time(chord.end)}`;const fingering=document.createElement('code');fingering.textContent=chord.label==='N'?'和弦证据不足':chord.frets.map(f=>f<0?'×':f).join(' ');button.append(name,range,fingering);button.title=chord.label==='N'?'未可靠识别和弦，暂不扫弦':(chord.reduced?'两次识别有分歧，仅弹共有音；':'')+'弦序：低音 E 到高音 e；× 表示不弹';button.onclick=()=>seekToTime(chord.start);chords.append(button)});
  const list=$('strum-list');list.replaceChildren();
  info.strums.forEach((stroke,index)=>{const button=document.createElement('button');button.type='button';button.className='strum-event';button.dataset.strumIndex=index;const direction=document.createElement('strong');direction.textContent=stroke.direction==='down'?'↓':'↑';const when=document.createElement('span');when.textContent=time(stroke.time);button.append(direction,when);button.title=`${stroke.chord} · ${stroke.direction==='down'?'下扫':'上扫'} · 点击跳转`;button.onclick=()=>seekToTime(stroke.time);list.append(button)});
  if(!info.strums.length){$('harmony-unavailable').hidden=false;$('harmony-unavailable').textContent='这一段无法可靠配出和弦，已保留原曲和旋律试听；暂不生成扫弦。';return;}
  accompanimentUrl=URL.createObjectURL(makeWav([],job.duration,info.strums,info.tuning_cents || 0,harmonySettings.gain/100));ensembleUrl=URL.createObjectURL(makeWav(job.notes,job.duration,info.strums,info.tuning_cents || 0,harmonySettings.gain/100));
  $('accompaniment').src=accompanimentUrl;$('ensemble').src=ensembleUrl;
}
function updateHarmonyMarker(position) {
  if(!displayedHarmony)return;
  const info=displayedHarmony;
  const chord=info.chords.findIndex(c=>position>=c.start && position<c.end);
  let strum=-1;for(let i=0;i<info.strums.length && info.strums[i].time<=position+.002;i++)strum=i;
  if(strum>=0 && (position>=(info.strums[strum].end ?? Infinity) || position>info.strums[strum].time+.85))strum=-1;
  const key=`${chord}:${strum}`; if(key===lastHarmonyMarker)return; lastHarmonyMarker=key;
  document.querySelectorAll('.chord-card').forEach((el,i)=>el.classList.toggle('playing',i===chord));
  document.querySelectorAll('.strum-event').forEach((el,i)=>el.classList.toggle('playing',i===strum));
}

function showAiReview(result,extraCount,slideCount){
  $('ai-review-status').textContent=`已加载模型建议：保留 ${result.keep_extras.length}/${extraCount} 个加花、${result.keep_slides.length}/${slideCount} 处滑音；主旋律不变。`;
  $('ai-review-reason').textContent=result.reason;
  $('ai-review-reason-details').hidden=false;
}
function originalFingerstyleDraft(job){
  const draft=Fingerstyle.generate(job.notes,job.duration,job.accompaniment,fingerstyleEvidence.get(job.id) || [],$('fingerstyle-density').value,job.rhythm_info);
  if(!$('fingerstyle-slides').checked)draft.slides=[];
  return draft;
}
function draftSignature(job,draft){return JSON.stringify({id:job.id,notes:job.notes,extras:draft.extras,slides:draft.slides,legato_enabled:legatoEnabled});}
function renderFingerstyle(job){
  $('fingerstyle-section').hidden=!job.notes.length;
  if(fingerstyleUrl)URL.revokeObjectURL(fingerstyleUrl);fingerstyleUrl=null;
  $('fingerstyle').removeAttribute('src');$('fingerstyle').load();
  fingerstyleGroups=[];fingerstyleDraft=null;const parent=$('fingerstyle-tabs');parent.replaceChildren();
  if(!job.notes.length)return;
  fingerstyleDraft=originalFingerstyleDraft(job);
  if(aiFingerstyleReview && aiFingerstyleReview.signature!==draftSignature(job,fingerstyleDraft))$('ai-review-status').textContent='当前谱子或编配设置与 AI 建议不一致，暂未应用。';
  if(aiFingerstyleReview && aiFingerstyleReview.signature===draftSignature(job,fingerstyleDraft)){
    showAiReview(aiFingerstyleReview,fingerstyleDraft.extras.length,fingerstyleDraft.slides.length);
    const extraIds=new Set(aiFingerstyleReview.keep_extras),slideIds=new Set(aiFingerstyleReview.keep_slides);
    fingerstyleDraft.extras=fingerstyleDraft.extras.filter((_,i)=>extraIds.has(i));
    fingerstyleDraft.slides=fingerstyleDraft.slides.filter((_,i)=>slideIds.has(i));
    fingerstyleDraft.events=[...fingerstyleDraft.melody,...fingerstyleDraft.extras].sort((a,b)=>a.start-b.start || a.string-b.string);
  }

  const slidesByNote=new Map(fingerstyleDraft.slides.map(slide=>[slide.from,slide]));
  for(const event of fingerstyleDraft.events){
    let group=fingerstyleGroups[fingerstyleGroups.length-1];
    if(!group||Math.abs(group.start-event.start)>1e-6){group={start:event.start,notes:[]};fingerstyleGroups.push(group);}
    group.notes.push(event);
  }
  const labels=['e','B','G','D','A','E'];
  for(let offset=0;offset<fingerstyleGroups.length;offset+=12){
    const group=fingerstyleGroups.slice(offset,offset+12),wrap=document.createElement('div');wrap.className='tab-line fingerstyle-tabs';wrap.dataset.groupOffset=offset;
    const title=document.createElement('div');title.className='time';title.textContent=`${time(group[0].start)} — ${time(group[group.length-1].start)}   点击音符跳转 · 下方为秒数`;wrap.append(title);
    labels.forEach((label,stringIndex)=>{
      const row=document.createElement('div');row.className='tab-row';const prefix=document.createElement('span');prefix.className='tab-string';prefix.textContent=label+' |';row.append(prefix);
      group.forEach(g=>{
        const cell=document.createElement('span');cell.className='tab-cell';const note=g.notes.find(n=>n.string===stringIndex+1);
        const slide=note?.role==='melody'?slidesByNote.get(note.melodyIndex):null;
        cell.textContent=note?('-'+String(note.fret)+(slide?(slide.semitones>0?'/':'\\'):'' )).padEnd(5,'-'):'-----';
        if(note){cell.classList.add(note.role);if(slide)cell.classList.add('slide');cell.dataset.start=note.start;cell.dataset.end=note.end;cell.title=`${note.role==='bass'?'原曲和弦低音':note.role==='fill'?'和弦分解音':'主旋律'}${slide?` · 滑向第 ${fingerstyleDraft.melody[slide.to].fret} 品`:''} · ${time(note.start)}–${time(note.end)} · 点击跳转`;}

        cell.addEventListener('click',()=>{activePlayer=$('fingerstyle');activePlayer.currentTime=g.start;updateMarker(g.start,false);});row.append(cell);
      });row.append(document.createTextNode('|'));wrap.append(row);
    });
    const timings=document.createElement('div');timings.className='tab-row tab-times';const prefix=document.createElement('span');prefix.className='tab-string';prefix.textContent='  ';timings.append(prefix);
    group.forEach(g=>{const cell=document.createElement('span');cell.className='tab-cell tab-time-cell';cell.textContent=g.start.toFixed(1).padStart(5,' ');cell.title=`${time(g.start)} · 点击跳转`;cell.onclick=()=>{activePlayer=$('fingerstyle');activePlayer.currentTime=g.start;updateMarker(g.start,false);};timings.append(cell)});wrap.append(timings);parent.append(wrap);
  }
  const bass=fingerstyleDraft.extras.filter(n=>n.role==='bass').length,fill=fingerstyleDraft.extras.filter(n=>n.role==='fill').length;
  $('fingerstyle-summary').textContent=`主旋律 ${job.notes.length} 个音符 · 低音 ${bass} 个、分解音 ${fill} 个、滑音 ${fingerstyleDraft.slides.length} 处。${bass+fill?'参考原曲伴奏推测，建议试听核对。':'伴奏证据不足，暂不添加低音或分解音。'}`;
  fingerstyleUrl=URL.createObjectURL(makeWav(job.notes,job.duration,[],0,1,fingerstyleDraft.extras,fingerstyleDraft.slides));$('fingerstyle').src=fingerstyleUrl;
}
function updateFingerstyleMarker(position,shouldFollow){
  if(!fingerstyleGroups.length)return;
  let current=0;for(let i=0;i<fingerstyleGroups.length&&fingerstyleGroups[i].start<=position+.002;i++)current=i;
  const lineIndex=Math.floor(current/12),lines=document.querySelectorAll('#fingerstyle-tabs .tab-line');
  lines.forEach((line,i)=>line.classList.toggle('playing',i===lineIndex));
  document.querySelectorAll('#fingerstyle-tabs .tab-cell[data-start]').forEach(cell=>cell.classList.toggle('active',position+.002>=Number(cell.dataset.start)&&position<Number(cell.dataset.end)));
  const line=lines[lineIndex];if(shouldFollow&&activePlayer===$('fingerstyle')&&$('follow-score').checked&&line){const rect=line.getBoundingClientRect();if(rect.bottom>innerHeight-35||rect.top<80)line.scrollIntoView({behavior:'smooth',block:'nearest'});}
}

function noteName(pitch) { return ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][pitch%12]+(Math.floor(pitch/12)-1); }
function renderEditor() {
  const list=$('note-list'); list.replaceChildren();
  currentJob.notes.forEach((note,index)=>{ const button=document.createElement('button'); button.type='button'; button.className='note-chip'+(note.uncertain?' uncertain':'')+(index===selectedIndex?' selected':''); button.textContent=`${time(note.start)} ${noteName(note.pitch)}${note.uncertain?' ?':''}`; button.setAttribute('aria-label',`第 ${index+1} 个音符，${time(note.start)}，${noteName(note.pitch)}${note.uncertain?'，建议核对':''}`); button.onclick=()=>{selectedIndex=index; renderEditor();}; list.append(button); });
  const selected=currentJob.notes[selectedIndex]; $('selected-note').textContent=selected?`第 ${selectedIndex+1} 个 · ${time(selected.start)} · ${noteName(selected.pitch)}`:'请选择一个音符'; $('lower-note').disabled=!selected || selected.pitch<=40; $('raise-note').disabled=!selected || selected.pitch>=84;
}
async function shiftNote(amount) {
  if(selectedIndex<0) return; const pitches=currentJob.notes.map(n=>n.pitch); pitches[selectedIndex]+=amount;
  $('lower-note').disabled=true; $('raise-note').disabled=true; $('edit-message').textContent='正在保存…';
  try {const response=await fetch(`/api/jobs/${encodeURIComponent(currentJob.id)}/notes`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({pitches})}); const data=await response.json(); if(!response.ok) throw Error(data.detail || '保存失败'); players.forEach(player=>player.pause()); renderResult(data); $('edit-message').textContent='已保存，可以重新试听。';}
  catch(e) {$('edit-message').textContent=e.message; renderEditor();}
}
$('lower-note').onclick=()=>shiftNote(-1); $('raise-note').onclick=()=>shiftNote(1);
function renderResult(job) {
  let upgrade=$('upgrade-song');if(!upgrade){upgrade=document.createElement('a');upgrade.id='upgrade-song';upgrade.className='practice-button';$('result').prepend(upgrade);}upgrade.hidden=!!job.practice;upgrade.href=`/v2?reuse=${encodeURIComponent(job.id)}`;upgrade.textContent='创建整曲新版结果，保留这份旋律';
  const newlyLoaded=currentJob?.id!==job.id;
  currentJob=job;
  if(newlyLoaded)$('other-accompaniment').open=!!job.practice;
  if(newlyLoaded){loadHarmonySettings();aiFingerstyleReview=null;$('ai-review-reset').hidden=true;$('ai-review-reason-details').hidden=true;$('ai-review-status').textContent='密钥仅用于本次请求，不会保存在项目或浏览器中。';}
  if(newlyLoaded){$('start').value=job.start;$('duration').value=Math.max(5,Math.min(60,Math.ceil(job.duration)));}
  if(job.source_url && !$('url').value) $('url').value=job.source_url;
  $('song-title').textContent=job.title || '你的旋律'; $('song-info').textContent=job.practice?'独立练习 · 32 秒 · 无需链接或上传音频':`原视频 ${time(job.start)} 开始 · 片段 ${job.duration.toFixed(1)} 秒 · ${job.notes.length} 个音符${job.timing_fixes?.length?` · 已核对 ${job.timing_fixes.length} 处人声起音`:''}`;
  const intro=job.intro_info;
  const vocalCount=job.notes.filter(note=>note.source!=='instrumental_intro').length;
  $('intro-status').textContent=intro?.state==='detected'?`器乐前奏 ${intro.count} 个音符（标 ?，建议核对）· ${vocalCount?`人声主旋律 ${vocalCount} 个音符${job.reused_job_id?'，沿用之前结果':''}`:'未识别到人声旋律'}`:intro?.state==='failed'?`前奏识别未成功${vocalCount?'；已保留人声旋律':''}，可以重试。`:intro?.state==='empty'?`这段前奏没有识别到可靠的器乐音符${vocalCount?'；人声旋律已保留':''}。`:'';
  $('prepend-intro').hidden=!!job.practice||!job.source_url||job.start<=0||!job.notes.length;
  $('prepend-intro').disabled=job.start+job.duration>60;
  $('prepend-intro').title=$('prepend-intro').disabled?'前奏与原片段合计超过 60 秒，请缩短片段后处理。':'';
  $('vocals').closest('.player').hidden=!job.vocal_url;$('melody').closest('.player').hidden=!job.notes.length;
  if(job.vocal_url)$('vocals').src=job.vocal_url;else {$('vocals').removeAttribute('src');$('vocals').load();}
  $('reference-section').hidden=!job.original_url;
  if(job.original_url)$('original').src=job.original_url;else $('original').removeAttribute('src');
  renderMelody(job);
  renderFingerstyle(job);renderHarmony(job); renderTabs(job.notes); activePlayer=null; cancelAnimationFrame(markerFrame); $('playback-position').textContent='播放试听时，谱子会标记当前位置';
  const shifted=job.notes.filter(n=>n.octave_shift).length;
  const uncertain=job.notes.filter(n=>n.uncertain).length; $('tab-note').textContent=[shifted?`↕ 音高按八度调整：${shifted} 个音符。`:'',uncertain?`? 建议核对：${uncertain} 个音符。`:''].filter(Boolean).join(' ');
  renderEditor();$('note-list').closest('.editor').hidden=!job.notes.length; show('result');
}
async function startPractice(){
  await guitarBankPromise;
  players.forEach(player=>player.pause());history.replaceState(null,'','?practice=1');
  renderResult({id:'practice',practice:true,title:'通用和弦练习',start:0,duration:32,notes:[]});
}
$('start-practice').addEventListener('click',startPractice);
async function poll(id) {
  try {
    const response=await fetch(`/api/jobs/${encodeURIComponent(id)}`); if(!response.ok) throw Error('无法读取任务状态，请刷新页面。');
    const job=await response.json();
    if(job.schema_version===2){location.replace(`/v2?job=${encodeURIComponent(job.id)}`);return;}
    if(job.stage==='done') {
      $('progress-title').textContent='核对伴奏并加载吉他音色';
      const evidence=job.notes.length && job.accompaniment ? fetch(`/api/jobs/${encodeURIComponent(job.id)}/fingerstyle-evidence`).then(r=>r.ok?r.json():{roots:[]}).catch(()=>({roots:[]})) : Promise.resolve({roots:[]});
      const review=job.notes.length ? fetch(`/api/jobs/${encodeURIComponent(job.id)}/ai-fingerstyle-review`).then(r=>r.ok?r.json():{review:null}).catch(()=>({review:null})) : Promise.resolve({review:null});
      const [,proof,saved]=await Promise.all([guitarBankPromise,evidence,review]);fingerstyleEvidence.set(job.id,proof.roots || []);renderResult(job);
      if(saved.review){
        const record=saved.review, signature=JSON.stringify({id:job.id,notes:record.notes,extras:record.extras,slides:record.slides,legato_enabled:record.legato_enabled ?? true});
        aiFingerstyleReview={...record.result,signature};$('ai-review-reset').hidden=false;
        if(draftSignature(job,originalFingerstyleDraft(job))===signature){renderFingerstyle(job);showAiReview(record.result,record.extras.length,record.slides.length);}
        else $('ai-review-status').textContent='已保存的 AI 建议与当前谱子或设置不一致，未应用。';
      }
      $('submit').disabled=false;return;
    }
    if(job.stage==='error') { $('error-message').textContent=job.message; show('error'); $('submit').disabled=false; return; }
    let [title,percent]=stageInfo[job.stage]||['处理中',5]; $('progress-title').textContent=title; $('progress-message').textContent=job.stage==='accompaniment'?'正在整理识谱和可选伴奏。':job.message; $('progress-bar').style.width=percent+'%';
    setTimeout(()=>poll(id),1500);
  } catch(e) { $('error-message').textContent=e.message; show('error'); $('submit').disabled=false; }
}
async function beginJob(payload){
  $('submit').disabled=true; players.forEach(player=>player.pause()); show('progress'); $('progress-title').textContent='正在准备'; $('progress-message').textContent='正在创建任务'; $('progress-bar').style.width='4%';
  try {
    const response=await fetch('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data=await response.json(); if(!response.ok) throw Error(typeof data.detail==='string'?data.detail:'请检查输入。'); history.replaceState(null, '', `?job=${encodeURIComponent(data.id)}`); poll(data.id);
  } catch(e) { $('error-message').textContent=e.message; show('error'); $('submit').disabled=false; }
}
form.addEventListener('submit',async(event)=>{
  event.preventDefault();await beginJob({url:$('url').value.trim(),start:Number($('start').value),duration:Number($('duration').value),include_intro:$('include-intro').checked});
});
$('prepend-intro').addEventListener('click',()=>{
  if(!currentJob?.source_url||currentJob.start<=0)return;
  beginJob({url:currentJob.source_url,start:0,duration:Math.min(60,Math.ceil(currentJob.start+currentJob.duration)),include_intro:true,reuse_job_id:currentJob.id});
});
function updateGuitarSound(){
  guitarTone=$('guitar-tone').value; legatoEnabled=$('legato-mode').value==='on';
  if(!currentJob)return;
  const player=activePlayer, position=player?.currentTime || 0;
  players.forEach(item=>item.pause());
  renderMelody(currentJob);renderFingerstyle(currentJob);renderHarmony(currentJob);
  if(player){player.currentTime=Math.min(position,currentJob.duration);activePlayer=player;lastMarker='';updateMarker(position,false);}
}
function updateFingerstyleOptions(){
  if(!currentJob?.notes.length)return;
  if(aiFingerstyleReview){const draft=originalFingerstyleDraft(currentJob),matches=aiFingerstyleReview.signature===draftSignature(currentJob,draft);if(matches)showAiReview(aiFingerstyleReview,draft.extras.length,draft.slides.length);else $('ai-review-status').textContent='当前编配设置与 AI 建议不一致，暂未应用。';}
  const position=$('fingerstyle').currentTime, wasActive=activePlayer===$('fingerstyle');
  $('fingerstyle').pause();renderFingerstyle(currentJob);
  if(wasActive){activePlayer=$('fingerstyle');$('fingerstyle').currentTime=Math.min(position,currentJob.duration);updateMarker(position,false);}
}
$('ai-review-button').addEventListener('click',async()=>{
  if(!currentJob?.notes.length)return;
  const key=$('ai-key').value.trim();$('ai-key').value='';
  if(!key){$('ai-review-status').textContent='请输入中转站密钥。';return;}
  const job=currentJob,draft=originalFingerstyleDraft(job),signature=draftSignature(job,draft);
  $('ai-review-button').disabled=true;$('ai-review-status').textContent='正在审阅指弹谱，可能需要一些时间…';
  try{
    const response=await fetch(`/api/jobs/${encodeURIComponent(job.id)}/ai-fingerstyle`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({api_key:key,extras:draft.extras,slides:draft.slides,legato_enabled:legatoEnabled})});
    const result=await response.json();if(!response.ok)throw Error(typeof result.detail==='string'?result.detail:'AI 审阅失败，请稍后重试。');
    if(!currentJob || currentJob.id!==job.id || draftSignature(currentJob,originalFingerstyleDraft(currentJob))!==signature){$('ai-review-status').textContent='谱子或设置已变化，请重新审阅。';return;}
    aiFingerstyleReview={...result,signature};
    const position=$('fingerstyle').currentTime,wasActive=activePlayer===$('fingerstyle');$('fingerstyle').pause();renderFingerstyle(currentJob);
    if(wasActive){activePlayer=$('fingerstyle');$('fingerstyle').currentTime=Math.min(position,currentJob.duration);updateMarker(position,false);}
    $('ai-review-reset').hidden=false;
    showAiReview(result,draft.extras.length,draft.slides.length);
  }catch(error){$('ai-review-status').textContent=error.message || 'AI 审阅失败，原谱保持不变。';}
  finally{$('ai-review-button').disabled=false;}
});
$('ai-review-reset').addEventListener('click',async()=>{
  if(!currentJob)return;
  const id=currentJob.id;$('ai-review-reset').disabled=true;
  try{
    const response=await fetch(`/api/jobs/${encodeURIComponent(id)}/ai-fingerstyle-review`,{method:'DELETE'});
    if(!response.ok)throw Error('恢复失败，请重试。');
    if(!currentJob || currentJob.id!==id)return;
    aiFingerstyleReview=null;
    const position=$('fingerstyle').currentTime,wasActive=activePlayer===$('fingerstyle');$('fingerstyle').pause();renderFingerstyle(currentJob);
    if(wasActive){activePlayer=$('fingerstyle');$('fingerstyle').currentTime=Math.min(position,currentJob.duration);updateMarker(position,false);}
    $('ai-review-reset').hidden=true;$('ai-review-reason-details').hidden=true;$('ai-review-status').textContent='已恢复原指弹编配。';
  }catch(error){$('ai-review-status').textContent=error.message;}
  finally{$('ai-review-reset').disabled=false;}
});
$('fingerstyle-density').addEventListener('change',updateFingerstyleOptions);
$('fingerstyle-slides').addEventListener('change',updateFingerstyleOptions);
$('guitar-tone').addEventListener('change',updateGuitarSound);
$('legato-mode').addEventListener('change',updateGuitarSound);
// A completed task can be reopened while the local server is running.
const existingJob = new URLSearchParams(location.search).get('job');
if (existingJob && /^[0-9a-f]{32}$/.test(existingJob)) {
  $('submit').disabled=true; show('progress'); poll(existingJob);
}else if(new URLSearchParams(location.search).get('practice')==='1')startPractice();
