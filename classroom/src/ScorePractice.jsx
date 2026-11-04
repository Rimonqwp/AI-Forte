import React, {useEffect, useMemo, useRef, useState} from 'react';
import ABCJS from 'abcjs';
import {ArrowLeft, MusicNotes, MusicNote, Guitar, Play, Pause, Stop, Heart, ShareNetwork, Printer, Moon, Sun, Minus, Plus, Microphone, GameController, ArrowsOut, Clock, FloppyDisk} from '@phosphor-icons/react';
import './score-practice.css';
import {PracticeSelect, PracticeMetronome} from './PracticeControls.jsx';

// Original sight-reading exercises. These are deliberately not a transcription of the selected song.
const phrases = [
  'CE GE G2 E2 | DF AF A2 G2 | EG cB c2 B2 | A2 G2 E4',
  'GA GE D2 E2 | FA cA G4 | EG cB AG ED | C4 z4',
  'E2 E G A2 G2 | D E F A G2 E2 | C2 D2 E2 G2 | A4 G4',
  'G2 c B A2 G2 | E2 G2 D4 | F2 A G E2 D2 | C4 z4',
  'C2 D2 E2 G2 | A2 G2 E4 | D2 E2 G2 D2 | C6 z2',
  'E2 G2 A2 c2 | B2 G2 E4 | F2 A2 G2 E2 | D4 C4',
  'G A c B A2 G2 | E2 G2 D4 | F A G E D2 E2 | C6 z2',
  'C2 E2 G2 c2 | A2 G2 E4 | F2 E2 D2 G2 | C4 z4',
  'G2 E2 D2 C2 | E G A G E4 | D2 F2 A2 G2 | E4 D4',
  'C2 D2 E2 G2 | A G E D C4 | F2 E2 D2 G2 | C8',
];
const midiMap={C:60,D:62,E:64,F:65,G:67,A:69,B:71,c:72,z:0};
const numberMap={C:'1',D:'2',E:'3',F:'4',G:'5',A:'6',B:'7',c:'1̇',z:'0'};
const chordNames=['C','Am','F','G'];
const captions=['放 慢 速 度 听 见 每 一 个 音 符 让 旋 律 自 然 流 动','抬 起 手 腕 保 持 放 松 跟 随 节 拍 慢 慢 练 习','一 次 一 小 节 把 每 个 细 节 都 弹 得 更 清 晰','从 容 呼 吸 轻 轻 落 指 让 音 乐 陪 伴 你','每 天 一 点 进 步 享 受 属 于 自 己 的 旋 律'];
const seconds=value=>`${String(Math.floor(value/60)).padStart(2,'0')}:${String(Math.floor(value%60)).padStart(2,'0')}`;
function Staff({phrase,index,active}) {
  const host=useRef(null);
  useEffect(()=>{
    ABCJS.renderAbc(host.current,`X:1\nM:4/4\nL:1/8\nK:C\n${phrase}${index===9?' |]':' |'}\nw: ${captions[index%5]}`,{
      responsive:'resize',staffwidth:1250,paddingtop:2,paddingbottom:0,paddingleft:0,paddingright:0,add_classes:true,
      format:{vocalfont:'serif 14',measurefont:'serif 11',barsperstaff:4,stretchlast:1,vocalspace:0,stafftopmargin:0},
      ariaLabel:`第 ${index*4+1} 至 ${index*4+4} 小节练习谱面`,
    });
  },[phrase,index]);
  return <div className={`practice-staff ${active?'is-playing':''}`}><small>{index*4+1}</small><div ref={host}/></div>;
}
export default function ScorePractice({song,version,onClose,dialogRef}) {
  const [type,setType]=useState(version.type==='和弦谱'?'和弦谱':version.type==='简谱'?'简谱':'五线谱');
  const [openControl,setOpenControl]=useState(null);
  const [zoom,setZoom]=useState(100),[dark,setDark]=useState(false),[auto,setAuto]=useState(false);
  const [playing,setPlaying]=useState(false),[elapsed,setElapsed]=useState(0),[speed,setSpeed]=useState(1),[metro,setMetro]=useState(false),[bpm,setBpm]=useState(96),[mode,setMode]=useState('跟弹练习'),[notice,setNotice]=useState('');
  const [saved,setSaved]=useState(()=>{try{return JSON.parse(localStorage.getItem('classroom.practice.saved')||'[]').includes(`${song.id}:${version.id}`);}catch{return false;}});
  const context=useRef(null),soundNodes=useRef([]),position=useRef(0),noticeTimer=useRef(null),paper=useRef(null),scoreScroll=useRef(null);
  const events=useMemo(()=>{let beat=0;return phrases.flatMap(phrase=>[...phrase.matchAll(/([A-Gcz])(\d?)/g)].map(match=>{const duration=Number(match[2]||1)/2;const event={midi:midiMap[match[1]],beat,duration};beat+=duration;return event;}));},[]);
  const duration=160*60/bpm;
  const tell=text=>{setNotice(text);clearTimeout(noticeTimer.current);noticeTimer.current=setTimeout(()=>setNotice(''),3500);};
  const haltSounds=()=>{soundNodes.current.forEach(node=>{try{node.stop();}catch{}});soundNodes.current=[];};
  const seek=value=>{setPlaying(false);position.current=value;setElapsed(value);if(value===0)scoreScroll.current?.scrollTo({top:0});};
  const toggle=async()=>{if(playing){setPlaying(false);return;}try{context.current ||= new (window.AudioContext||window.webkitAudioContext)();await context.current.resume();if(position.current>=duration)seek(0);setPlaying(true);}catch{tell('当前浏览器无法播放音频。');}};
  useEffect(()=>{if(!playing)return;const ctx=context.current;if(!ctx)return;const start=performance.now(),offset=position.current,beatLength=60/bpm;let nextBeat=Math.ceil(offset/beatLength);let nextEvent=events.findIndex(event=>event.beat*beatLength>=offset);if(nextEvent<0)nextEvent=events.length;
    const tone=(midi,length,click=false)=>{if(!midi)return;const osc=ctx.createOscillator(),gain=ctx.createGain(),now=ctx.currentTime;osc.type=click?'square':'triangle';osc.frequency.value=click?midi:440*2**((midi-69)/12);gain.gain.setValueAtTime(click?.025:.075,now);gain.gain.exponentialRampToValueAtTime(.001,now+length);osc.connect(gain);gain.connect(ctx.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();soundNodes.current=soundNodes.current.filter(node=>node!==osc);};osc.start();osc.stop(now+length);soundNodes.current.push(osc);};
    const clock=setInterval(()=>{const time=Math.min(duration,offset+(performance.now()-start)/1000*speed);position.current=time;setElapsed(time);while(nextEvent<events.length&&events[nextEvent].beat*beatLength<=time){const event=events[nextEvent++];tone(event.midi,Math.max(.07,event.duration*beatLength/speed*.85));}if(metro&&nextBeat*beatLength<=time){tone(nextBeat%4===0?1200:850,.045,true);nextBeat++;}if(time>=duration)setPlaying(false);},40);
    return()=>{clearInterval(clock);haltSounds();};
  },[playing,bpm,speed,metro,auto,duration,events]);
  useEffect(()=>{if(!metro||playing||!context.current)return;const ctx=context.current;let beat=0;const tick=()=>{const osc=ctx.createOscillator(),gain=ctx.createGain();osc.frequency.value=beat++%4===0?1200:850;gain.gain.setValueAtTime(.04,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.05);osc.connect(gain);gain.connect(ctx.destination);osc.onended=()=>{osc.disconnect();gain.disconnect();};osc.start();osc.stop(ctx.currentTime+.05);};tick();const clock=setInterval(tick,60000/bpm);return()=>clearInterval(clock);},[metro,playing,bpm]);
  useEffect(()=>{try{const progress=JSON.parse(localStorage.getItem(`classroom.practice.progress.${song.id}.${version.id}`)||'null');if(progress&&Number.isFinite(progress.elapsed)&&progress.bpm>=40&&progress.bpm<=180){position.current=Math.min(progress.elapsed,160*60/progress.bpm);setElapsed(position.current);setBpm(progress.bpm);requestAnimationFrame(()=>{if(scoreScroll.current)scoreScroll.current.scrollTop=progress.scrollTop||0;});}}catch{}},[song.id,version.id]);
  useEffect(()=>()=>{clearTimeout(noticeTimer.current);haltSounds();context.current?.close();},[]);
  useEffect(()=>{dialogRef.current?.focus({preventScroll:true});},[dialogRef]);
  useEffect(()=>{const previous=document.title;document.title=`${song.title} · 乐谱练习`;return()=>{document.title=previous;};},[song.title]);
  const favorite=()=>{const id=`${song.id}:${version.id}`;try{const values=JSON.parse(localStorage.getItem('classroom.practice.saved')||'[]');localStorage.setItem('classroom.practice.saved',JSON.stringify(saved?values.filter(value=>value!==id):[...new Set([...values,id])])) ;setSaved(!saved);}catch{tell('浏览器未允许保存收藏。');}};
  const changeBpm=value=>{position.current=position.current*bpm/value;setElapsed(position.current);setBpm(value);};
  const activeRow=Math.min(phrases.length-1,Math.floor(elapsed/(16*60/bpm)));
  useEffect(()=>{if(!auto||!playing)return;const container=scoreScroll.current,row=container?.querySelector('.practice-score-content')?.children[activeRow];if(container&&row)container.scrollTo({top:container.scrollTop+row.getBoundingClientRect().top-container.getBoundingClientRect().top-20,behavior:'smooth'});},[activeRow,auto,playing,type]);
  const toggleMetronome=async()=>{try{context.current ||= new(window.AudioContext||window.webkitAudioContext)();await context.current.resume();setMetro(!metro);}catch{tell('当前浏览器无法播放节拍器音频。');}};
  return <section className={`score-practice practice-embedded ${dark?'practice-dark':''}`} role="region" aria-label={`${song.title}乐谱练习`} tabIndex={-1} ref={dialogRef}>
    <header className="practice-heading"><button className="practice-return" onClick={onClose}><ArrowLeft size={15}/>返回乐谱列表</button><div className="practice-song-heading"><MusicNotes size={29} weight="duotone"/><h1>《{song.title}》</h1><span className="practice-version-facts">{type} · {version.key} 调</span><span className="practice-arranger" title={`歌手：${song.artist} · 编配：${version.author}`}><span className="practice-performer-credit">歌手：<strong>{song.artist}</strong></span><span>编配：<strong>{version.author}</strong></span></span></div><div className="practice-counts"><span><Clock size={16}/>{version.plays} 万次练习</span></div></header>
    <div className="practice-toolbar"><PracticeSelect id="notation" label="谱式" value={type} icon={type==='和弦谱'?Guitar:MusicNote} dark={dark} openControl={openControl} setOpenControl={setOpenControl} options={['五线谱','简谱','和弦谱'].map((value,i)=>({value,description:['音高与节奏，完整阅读','数字音符，轻松识谱','和弦标记，弹唱练习'][i],onSelect:()=>setType(value)}))}/><span className="practice-tool-divider"/><div className="practice-zoom"><span>缩放</span><div><button aria-label="缩小谱面" disabled={zoom<=70} onClick={()=>setZoom(zoom-10)}><Minus size={14}/></button><output>{zoom}%</output><button aria-label="放大谱面" disabled={zoom>=150} onClick={()=>setZoom(zoom+10)}><Plus size={14}/></button></div></div><button className="practice-auto" role="switch" aria-checked={auto} onClick={()=>setAuto(!auto)}><Play size={14} weight="fill"/>自动滚谱<span className={`practice-switch ${auto?'on':''}`}/></button><button className="practice-theme" aria-pressed={dark} onClick={()=>setDark(!dark)}>{dark?<Sun size={16}/>:<Moon size={16} weight="fill"/>}{dark?'日间模式':'夜间模式'}</button><button onClick={()=>window.print()}><Printer size={18}/>打印</button></div>
    <main className="practice-paper" ref={paper}><div className="practice-paper-tools"><span>谱面演示 · 非原曲</span><button aria-label="保存练习进度" onClick={()=>{try{localStorage.setItem(`classroom.practice.progress.${song.id}.${version.id}`,JSON.stringify({elapsed,scrollTop:scoreScroll.current?.scrollTop||0,bpm}));tell('练习进度已保存在当前浏览器。');}catch{tell('浏览器未允许保存练习进度。');}}}><FloppyDisk size={16}/></button><button aria-label="切换全屏" onClick={()=>{if(document.fullscreenElement)document.exitFullscreen?.();else dialogRef.current.requestFullscreen?.().catch(()=>tell('当前浏览器暂不支持全屏。'));}}><ArrowsOut size={16}/></button></div><div className="practice-paper-title"><h2>{song.title}</h2><p>{song.artist}</p></div><div className="practice-sheet-meta"><span><MusicNote size={14} weight="fill"/> = {bpm}</span><span>编配：{version.author}<br/>版本：{version.subtitle}</span></div>
      <div className="practice-score-scroll" ref={scoreScroll} tabIndex={0} aria-label="连续乐谱，可向下滚动"><div className={`practice-score-content notation-${type}`} style={{width:`${zoom}%`,'--score-font':1}}>{phrases.map((phrase,index)=>{const row=index%5;return type==='五线谱'?<Staff key={index} phrase={phrase} index={index} active={playing&&mode==='跟弹练习'&&activeRow===index}/>:<div className={`practice-alternate-row ${playing&&mode==='跟弹练习'&&activeRow===index?'is-playing':''}`} key={index}><small>{index*4+1}</small><div>{phrase.split('|').map((bar,i)=><div className="practice-bar" key={i}>{type==='和弦谱'&&<strong>{chordNames[(i+row)%4]}</strong>}<p>{[...bar.matchAll(/([A-Gcz])(\d?)/g)].map((note,j)=><span key={j}>{numberMap[note[1]]}<small>{Number(note[2]||1)>=4?'—':''}</small></span>)}</p></div>)}</div><p className="practice-row-caption">{captions[row]}</p></div>;})}</div></div>

    </main>
    <footer className="practice-player"><button className="practice-play" aria-label={playing?'暂停播放':'播放练习演示'} onClick={toggle}>{playing?<Pause size={24} weight="fill"/>:<Play size={24} weight="fill"/>}</button><button className="practice-stop" aria-label="停止并回到开头" onClick={()=>seek(0)}><Stop size={17} weight="fill"/></button><PracticeSelect id="mode" label="练习模式" value={mode} icon={GameController} dark={dark} openControl={openControl} setOpenControl={setOpenControl} side="top" options={['跟弹练习','自由练习'].map((value,i)=>({value,description:['播放时突出当前谱行','按自己的节奏自由读谱'][i],onSelect:()=>setMode(value)}))}/><div className="practice-timeline"><span>{seconds(elapsed)} / {seconds(duration)}</span><input type="range" aria-label="播放进度" min="0" max={duration} step=".1" value={elapsed} onChange={e=>seek(Number(e.target.value))}/></div><label className="practice-speed"><select aria-label="播放速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}>{[.5,.75,1,1.25,1.5].map(value=><option value={value} key={value}>{value.toFixed(value%1?2:1)}x</option>)}</select></label><PracticeMetronome bpm={bpm} onChange={changeBpm} enabled={metro} onToggle={toggleMetronome} dark={dark} openControl={openControl} setOpenControl={setOpenControl}/><button className="practice-record" onClick={()=>tell('录音评分尚未接入，当前可使用谱面和练习音色试听。')}><Microphone size={24}/><span>录音评分</span><small>NEW</small></button><button className="practice-favorite" aria-pressed={saved} onClick={favorite}><Heart size={21} weight={saved?'fill':'regular'}/>{saved?'已收藏':'收藏'}</button><button onClick={async()=>{try{const link=new URL(window.location.href);link.hash=`song?id=${song.id}`;await navigator.clipboard.writeText(link.href);tell('歌曲链接已复制。');}catch{tell('复制未完成，请从地址栏复制歌曲链接。');}}}><ShareNetwork size={21}/>分享</button></footer>
    {notice&&<div className="practice-notice" role="status">{notice}</div>}
  </section>;
}
