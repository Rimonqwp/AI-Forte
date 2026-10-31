const el=id=>document.getElementById(id);
let job=null,tracks=[],selected=null,page=0,scoreKind='fingerstyle',mode='fingerstyle',pollTimer=null;
const perPage=48;
const fmt=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const sampleReady=GuitarSamples.load().catch(()=>{el('song-tone').value='synth';el('song-message').textContent='采样加载失败，已使用合成音。';});
const player=new SongPlayer(position=>{el('song-seek').value=position;el('song-position').textContent=fmt(position);if(el('song-follow').checked&&job){const columns=scoreColumns();let i=columns.findIndex(group=>group[0].start>position);i=i<0?columns.length-1:Math.max(0,i-1);const next=Math.floor(i/perPage);if(page!==next){page=Math.max(0,next);renderScore();}}document.querySelectorAll('[data-note-start]').forEach(c=>c.classList.toggle('current',Number(c.dataset.noteStart)<=position&&Number(c.dataset.noteEnd)>position));});
async function api(path,method='GET',body){const r=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(typeof data.detail==='string'?data.detail:JSON.stringify(data.detail));return data;}
function message(e){el('song-message').textContent=e.message??e;}
async function action(fn){try{await fn();}catch(e){message(e);}}
el('song-mode').onchange=()=>{const full=el('song-mode').value==='full';el('song-start').disabled=full;el('song-duration').disabled=full;};
el('inspect-video').onclick=()=>action(async()=>{el('inspect-video').disabled=true;try{const data=await api('/api/video-info?url='+encodeURIComponent(el('song-url').value));el('video-info').textContent=`${data.title||'视频'} · ${data.duration?fmt(data.duration):'未知时长'}${data.is_live?' · 不支持直播':!data.full_song_allowed?' · 超出整曲范围，请选择片段':''}`;}finally{el('inspect-video').disabled=false;}});
el('song-form').onsubmit=e=>{e.preventDefault();action(async()=>{const body={url:el('song-url').value,mode:el('song-mode').value,start:Number(el('song-start').value),duration:Number(el('song-duration').value),pipeline_version:2};const reused=new URLSearchParams(location.search).get('reuse');if(reused)body.reuse_job_id=reused;const data=await api('/api/jobs','POST',body);history.replaceState(null,'',`/v2?job=${data.id}`);watch(data.id);});};
async function watch(id){clearTimeout(pollTimer);try{const data=await api(`/api/jobs/${id}`);job=data;el('task-controls').hidden=false;el('resume-link').hidden=false;el('resume-link').href=`/v2?job=${id}`;el('resume-link').textContent='任务地址 · 可关闭页面后重新打开';el('song-message').textContent=`${data.message||data.stage}${data.progress?`\n已完成 ${data.progress.completed}/${data.progress.total} 个分析步骤`:''}`;const terminal=['done','partial','error','cancelled'].includes(data.stage);el('cancel-task').disabled=terminal;el('retry-task').disabled=!['error','cancelled','partial'].includes(data.stage);el('clean-task').disabled=!terminal;el('song-result').hidden=true;if(['done','partial'].includes(data.stage)&&!data.files_cleaned){await loadResult(data);return;}if(!terminal)pollTimer=setTimeout(()=>watch(id),4000);}catch(e){message(e);pollTimer=setTimeout(()=>watch(id),8000);}}
async function loadResult(data){player.pause();job=data;selected=null;await sampleReady;tracks=(await api(`/api/jobs/${job.id}/tracks`)).tracks;el('song-result').hidden=false;el('song-title').textContent=job.title;el('song-revision').textContent=`修订 ${job.revision} · ${job.notes.length} 个旋律音符 · ${fmt(job.duration)}`;el('song-warnings').textContent=[...job.warnings,...(!job.dual_enabled?['六声部候选可手动选择；自动选轨使用四声部方案，尚未通过双模型质量验收。']:[]),...(!job.muscriptor_enabled&&tracks.some(t=>t.model==='muscriptor')?['MuScriptor 候选可手动选择；尚未通过质量验收，自动选轨与指弹加花仍使用 Demucs 分轨转录。']:[])].join('\n');el('song-original').src=job.original_url;el('song-seek').max=job.duration;el('range-end').value=Math.min(job.duration,30);el('song-density').value=job.settings.density;el('song-slides').checked=job.settings.slides;el('song-legato').checked=job.settings.legato;el('song-vocal-focus').checked=job.settings.vocal_focus??true;const select=el('source-track');select.replaceChildren();for(const t of tracks.filter(t=>t.stem!=='drums')){const o=document.createElement('option');o.value=t.id;o.textContent=`${t.stem} · ${t.model} · ${t.notes.length} 音`;select.append(o);}renderExports();renderScore();updateSourceInfo();if(job.ai_review)el('song-ai-message').textContent=job.ai_review.result.reason;configurePlayer();}
function effectiveDraft(){const draft=structuredClone(job.arrangement);const review=job.ai_review;if(review){const a=review.start,b=review.end;const extras=new Set(review.kept_extra_ids),slides=new Set(review.kept_slide_keys);draft.extras=draft.extras.filter(n=>n.start<a||n.start>=b||extras.has(n.id));draft.slides=draft.slides.filter(s=>s.end<a||s.end>=b||slides.has(`${s.from}:${s.to}`));draft.events=[...draft.melody,...draft.extras].sort((a,b)=>a.start-b.start||a.string-b.string);}return draft;}
function scoreEvents(){return scoreKind==='melody'?job.notes:effectiveDraft().events;}
function scoreColumns(){const columns=[];for(const n of scoreEvents()){let last=columns[columns.length-1];if(!last||Math.abs(last[0].start-n.start)>.000001){last=[];columns.push(last);}last.push(n);}return columns;}
function configurePlayer(candidate=null){if(!job)return;const draft=effectiveDraft();let notes=candidate??(mode==='melody'?job.notes:draft.events);const melody=mode==='melody'?job.notes:draft.melody;const slides=new Map(draft.slides.map(s=>[draft.melody[s.from]?.id,s]));notes=notes.map(n=>{let end=n.end;if(job.settings.legato&&n.role==='melody'){const i=melody.findIndex(m=>m.id===n.id);end=i>=0&&melody[i+1]?melody[i+1].start:Math.min(job.duration,n.end+.5);}for(const other of notes)if(other.string===n.string&&other.start>n.start+.001&&other.start<end)end=other.start;return {...n,play_end:Math.max(n.start+.01,end),slide:mode==='fingerstyle'?slides.get(n.id):null};});player.set(notes,job.duration);player.tone=el('song-tone').value;}
function renderScore(){
  if(!job)return;
  const columns=scoreColumns(),pages=Math.max(1,Math.ceil(columns.length/perPage));
  page=Math.max(0,Math.min(page,pages-1));
  el('score-page').textContent=`${page+1} / ${pages}`;
  el('score-kind').textContent=scoreKind==='melody'?'旋律':'指弹';
  const box=el('song-score');box.replaceChildren();
  const portion=columns.slice(page*perPage,(page+1)*perPage),slides=new Map(effectiveDraft().slides.map(s=>[job.arrangement.melody[s.from].id,s]));
  for(let offset=0;offset<portion.length;offset+=12){
    const groups=portion.slice(offset,offset+12),line=document.createElement('div');line.className='tab-line';
    for(let s=1;s<=6;s++){
      const row=document.createElement('div');row.className='tab-row';
      const label=document.createElement('span');label.className='tab-string';label.textContent=['e','B','G','D','A','E'][s-1]+' |';row.append(label);
      for(const group of groups){
        const n=group.find(n=>n.string===s),cell=document.createElement('span');cell.className='tab-cell';
        const slide=n&&scoreKind==='fingerstyle'?slides.get(n.id):null;
        cell.textContent=n?`-${n.fret}${slide?(slide.semitones>0?'/':'\\'):''}${n.uncertain?'?':''}-`:'-----';
        if(n){
          cell.classList.add(n.role||'melody');cell.dataset.noteStart=n.start;cell.dataset.noteEnd=n.end;cell.tabIndex=0;cell.setAttribute('role','button');
          cell.title=`${n.role||'旋律'} · ${n.start.toFixed(3)}–${n.end.toFixed(3)}s · ${n.track_id||''}${n.origin?' · '+n.origin:''}${n.difficulty?' · 需要换把':''}`;
          const choose=()=>{player.seek(n.start);el('song-original').currentTime=n.start;if(n.role==='melody'||scoreKind==='melody'){selected=n.id;const original=job.melody.find(x=>x.id===n.id);el('edit-start').value=n.start;el('edit-end').value=n.end;el('edit-pitch').value=original?.pitch??n.pitch;el('edit-selected').textContent=`所选音符 ${n.id} · ${n.start.toFixed(3)}s`;}};
          cell.onclick=choose;cell.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();choose();}};
        }
        row.append(cell);
      }
      line.append(row);
    }
    const timeRow=document.createElement('div');timeRow.className='tab-row';const prefix=document.createElement('span');prefix.className='tab-string';timeRow.append(prefix);
    for(const group of groups){const cell=document.createElement('span');cell.className='tab-cell';cell.textContent=group[0].start.toFixed(1);timeRow.append(cell);}
    line.append(timeRow);box.append(line);
  }
  if(!columns.length)box.textContent='没有可靠旋律。可在旋律来源中试听候选，或手动补音。';
}
function renderExports(){const box=el('song-exports');box.replaceChildren();for(const [kind,label]of [['melody','原音高旋律 MIDI'],['fingerstyle','吉他指弹 MIDI'],['multitrack','候选多轨 MIDI'],['bundle','完整结果包'],...tracks.filter(t=>t.notes.length).map(t=>['track-'+t.id,`${t.stem} / ${t.model}`])]){const a=document.createElement('a');a.href=`/api/jobs/${job.id}/exports/${kind}`;a.textContent=label;box.append(a);}}
function range(){return {start:Number(el('range-start').value),end:Number(el('range-end').value)};}
function updateSourceInfo(){const t=tracks.find(t=>t.id===el('source-track').value);el('source-info').textContent=t?`${t.stem} · ${t.notes.length} 个候选音。分离及转录均可能有误，双模型一致也需要核对。`:'';}
el('source-track').onchange=updateSourceInfo;
for(const [id,extra]of [['choose-track',()=>({track_id:el('source-track').value})],['choose-rest',()=>({track_id:null})],['choose-auto',()=>({auto:true})]])el(id).onclick=()=>action(async()=>{const next=await api(`/api/jobs/${job.id}/melody-selection`,'PUT',{revision:job.revision,...range(),...extra()});await loadResult(next);});
el('song-undo').onclick=()=>action(async()=>loadResult(await api(`/api/jobs/${job.id}/undo`,'POST',{revision:job.revision})));
el('save-settings').onclick=()=>action(async()=>loadResult(await api(`/api/jobs/${job.id}/arrangement-settings`,'PUT',{revision:job.revision,density:el('song-density').value,slides:el('song-slides').checked,legato:el('song-legato').checked,vocal_focus:el('song-vocal-focus').checked})));
async function patchNote(add=false,remove=false,delta=0){if(!selected&&!add)throw Error('请先点击一个旋律音符。');await loadResult(await api(`/api/jobs/${job.id}/notes`,'PATCH',{revision:job.revision,id:add?null:selected,delete:remove,...(!remove?{start:Number(el('edit-start').value),end:Number(el('edit-end').value),pitch:Number(el('edit-pitch').value)+delta}:{})}));}
for(const [id,args]of [['edit-save',[]],['edit-add',[true]],['edit-delete',[false,true]],['edit-lower',[false,false,-1]],['edit-raise',[false,false,1]]])el(id).onclick=()=>action(()=>patchNote(...args));
el('play-melody').onclick=()=>action(async()=>{mode='melody';const t=player.now();pauseAudio();configurePlayer();player.seek(t);await player.play();});
el('play-fingerstyle').onclick=()=>action(async()=>{mode='fingerstyle';const t=player.now();pauseAudio();configurePlayer();player.seek(t);await player.play();});
function pauseAudio(){el('song-original').pause();el('track-audio').pause();}
el('pause-song').onclick=()=>{player.pause();pauseAudio();};
el('song-seek').oninput=()=>{const t=Number(el('song-seek').value);player.seek(t);el('song-original').currentTime=t;if(el('track-audio').src)el('track-audio').currentTime=t;};
el('compare-original').onclick=()=>action(async()=>{const t=player.now();player.pause();el('track-audio').pause();el('song-original').currentTime=t;await el('song-original').play();});
for(const id of ['song-original','track-audio']){el(id).onplay=()=>{player.pause();el(id==='song-original'?'track-audio':'song-original').pause();};el(id).ontimeupdate=()=>{if(!el(id).paused){player.position=el(id).currentTime;player.update(player.position);}};}
el('listen-track').onclick=()=>action(async()=>{player.pause();el('song-original').pause();const t=tracks.find(t=>t.id===el('source-track').value);el('track-audio').src=t.audio_url;el('track-audio').currentTime=range().start;await el('track-audio').play();});
el('listen-candidate').onclick=()=>action(async()=>{const t=tracks.find(t=>t.id===el('source-track').value);pauseAudio();const r=range();const candidates=t.melody_candidates.filter(n=>n.start>=r.start&&n.start<r.end).map(n=>({...n,play_end:Math.min(n.end,r.end)}));player.set(candidates,job.duration);player.seek(r.start);await player.play();});
el('score-prev').onclick=()=>{page--;renderScore();};el('score-next').onclick=()=>{page++;renderScore();};
el('score-melody').onclick=()=>{scoreKind='melody';page=0;renderScore();};el('score-fingerstyle').onclick=()=>{scoreKind='fingerstyle';page=0;renderScore();};
el('song-tone').onchange=()=>{player.tone=el('song-tone').value;};
for(const [id,verb]of [['cancel-task','cancel'],['retry-task','retry']])el(id).onclick=()=>action(async()=>{await api(`/api/jobs/${job.id}/${verb}`,'POST');watch(job.id);});
el('clean-task').onclick=()=>action(async()=>{if(!confirm('清理此任务的本机音频和分析文件？修订记录会保留，但将无法继续试听或编辑。'))return;await api(`/api/jobs/${job.id}/local-files`,'DELETE');watch(job.id);});
el('song-ai-review').onclick=()=>action(async()=>{const key=el('song-ai-key').value;el('song-ai-key').value='';el('song-ai-review').disabled=true;try{const next=await api(`/api/jobs/${job.id}/ai-review-range`,'POST',{revision:job.revision,api_key:key,...range()});await loadResult(next);}finally{el('song-ai-review').disabled=false;}});
el('song-ai-reset').onclick=()=>action(async()=>loadResult(await api(`/api/jobs/${job.id}/ai-review-range`,'DELETE',{revision:job.revision})));
const params=new URLSearchParams(location.search);if(params.get('job'))watch(params.get('job'));if(params.get('reuse'))action(async()=>{const old=await api(`/api/jobs/${params.get('reuse')}`);el('song-url').value=old.source_url;el('song-mode').value='segment';el('song-mode').onchange();el('song-start').value=0;el('song-duration').value=Math.min(600,Math.ceil(old.start+old.duration));message('新结果将覆盖视频开头至旧片段结尾，并保留旧谱旋律和指位。');});
