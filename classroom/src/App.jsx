import React, { useEffect, useRef, useState } from 'react';
import { ClassroomHeader } from './ClassroomHeader.jsx';
import { tr, useLanguage } from './language.js';
import { MusicSearch, matchesSong } from './MusicSearch.jsx';
import { SearchBanner } from './SearchBanner.jsx';
import { MusicNotes, MagnifyingGlass, Bell, CaretDown, CaretRight, CheckCircle, CheckSquare, PianoKeys, Guitar, GraduationCap, Star, Fire, Play, Pause, Heart, UsersThree, ChatsCircle, ChatCircle, CloudArrowUp, Trophy, Microphone, X, ArrowUp, ArrowLeft, Metronome, List, Headphones, BookOpen, SpeakerHigh, Check } from '@phosphor-icons/react';

const assets = import.meta.env.BASE_URL + 'assets/';
const songs = [
  { id:'star', title:'小星星', artist:'传统儿歌', instrument:'钢琴', level:1, badge:'热门', color:'coral', key:'C 大调', bpm:80 },
  { id:'sunny', title:'晴天', artist:'周杰伦', instrument:'吉他', level:2, badge:'新上', color:'purple', key:'G 大调', bpm:90 },
  { id:'confession', title:'告白气球', artist:'周杰伦', instrument:'钢琴', level:3, key:'B 大调', bpm:100 },
  { id:'night', title:'夜空中最亮的星', artist:'逃跑计划', instrument:'尤克里里', level:2, key:'C 大调', bpm:76 },
  { id:'castle', title:'天空之城', artist:'久石让 · 作曲', instrument:'钢琴', level:4, key:'C 大调', bpm:72 },
  { id:'rice', title:'稻香', artist:'周杰伦', instrument:'吉他', level:3, key:'A 大调', bpm:85 },
];
const initialPosts = [
  { id:'piano', title:'《小星星》钢琴演奏 · 零基础也能弹！', user:'小雨同学', level:6, likes:3428, comments:268, time:'04:32', category:'钢琴演奏' },
  { id:'guitar', title:'《晴天》吉他弹唱 Cover', user:'阿泽 Acous', level:5, likes:2617, comments:193, time:'03:57', category:'吉他弹唱' },
  { id:'vocal', title:'《告白气球》翻唱｜甜甜的情歌', user:'星星哼歌', level:7, likes:5806, comments:412, time:'04:09', category:'翻唱' },
];
const features = [
  { id:'reading', title:'识谱入门', desc:'认识音符、节拍、调号', color:'lilac' },
  { id:'rhythm', title:'节奏训练', desc:'培养节奏感，打好基础', color:'peach' },
  { id:'sing', title:'跟弹跟唱', desc:'边看边弹，轻松上手', color:'pink' },
  { id:'trophy', title:'音乐比赛', desc:'参与线上比赛，展示你的作品', color:'yellow' },
  { id:'community', title:'作品社区', desc:'发布演奏作品，收听他人分享', color:'lilac' },
];
const discussions = [
  { icon:MusicNotes, color:'purple', title:'如何快速看懂五线谱？', count:328, text:'从高音谱号开始，把五条线和四个间的音名记熟。每天选一段简单旋律，边唱边读谱，比一次记很多知识更容易上手。' },
  { icon:Guitar, color:'orange', title:'新手买吉他有什么推荐？', count:186, text:'先了解民谣吉他和古典吉他的手感差别，尽量亲自试弹。对初学者来说，合适的尺寸、舒适的弦距和稳定的音准都很重要。' },
  { icon:PianoKeys, color:'rose', title:'《小星星》有哪些练习技巧？', count:152, text:'先用右手慢速弹出旋律，每个音保持同样的时值。熟悉后再加入左手，最后把速度从 60 BPM 慢慢提高。' },
  { icon:Microphone, color:'purple', title:'唱歌总是跑调怎么办？', count:297, text:'先从舒适音区的单音模唱练起，用钢琴音做参照。听清楚再唱，录下自己的声音，逐句对照就能发现进步。' },
  { icon:Trophy, color:'orange', title:'本期音乐比赛作品讨论区', count:426, text:'本期主题是「我的第一首完整演奏」。欢迎在作品社区分享你的练习片段，记录每一次小小的进步。' },
];

function Instrument({name, ...props}) { const Icon = name === '钢琴' ? PianoKeys : Guitar; return <Icon {...props}/>; }
function Rating({level}) { return <span className="rating" aria-label={`难度 ${level} 星`}>{Array.from({length:5},(_,i)=><Star key={i} size={13} weight={i<level?'fill':'regular'} className={i<level?'filled':''}/>)}</span>; }

export function App({ userName = '音乐同学' }) {
  useLanguage();
  const [query,setQuery]=useState(''); const [search,setSearch]=useState(''); const [filter,setFilter]=useState('全部');
  const [tab,setTab]=useState('推荐'); const [saved,setSaved]=useState([]); const [liked,setLiked]=useState([]);
  const [modal,setModal]=useState(null); const [menu,setMenu]=useState(null); const [checkedIn,setCheckedIn]=useState(false);
  const [posts,setPosts]=useState(initialPosts); const [toast,setToast]=useState(''); const [completed,setCompleted]=useState([]);
  const [playing,setPlaying]=useState(false); const [tempo,setTempo]=useState(80); const [progress,setProgress]=useState(0);
  const dialog=useRef(null); const audio=useRef(null); const audioNodes=useRef([]); const timer=useRef(null); const toastTimer=useRef(null);
  const [mobileNav,setMobileNav]=useState(false);
  const notify=(message)=>{setToast(tr(message));clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),3000);};
  const stopAudio=()=>{audioNodes.current.forEach(n=>{try{n.stop();}catch{}});audioNodes.current=[];clearInterval(timer.current);setPlaying(false);setProgress(0);};
  const closeModal=()=>{stopAudio();setModal(null);};
  const open=(value)=>{if(value.song&&['preview','practice'].includes(value.type)&&window.location.hash.startsWith('#scores')){if(value.type==='practice'){window.dispatchEvent(new CustomEvent('classroom:open-song',{detail:{id:value.song.id}}));return;}sessionStorage.setItem('classroom.lastScoreSearch',window.location.hash);window.location.hash='song?id='+encodeURIComponent(value.song.id);return;}stopAudio();setMenu(null);setMobileNav(false);setModal(value);setTempo(value.song?.bpm||80);};
  useEffect(()=>{ const handle=e=>{if(e.key==='Escape'){closeModal();setMenu(null);}}; window.addEventListener('keydown',handle);return()=>{window.removeEventListener('keydown',handle);clearInterval(timer.current);clearTimeout(toastTimer.current);audio.current?.close();};},[]);
  useEffect(()=>{document.body.style.overflow=modal?'hidden':''; if(!modal)return; const previous=document.activeElement;dialog.current?.focus();const trap=e=>{if(e.key!=='Tab')return;const controls=[...dialog.current.querySelectorAll('button,a[href],input,textarea,select,[tabindex="0"]')].filter(el=>!el.disabled&&el.offsetParent!==null);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};document.addEventListener('keydown',trap);return()=>{document.body.style.overflow='';document.removeEventListener('keydown',trap);previous?.focus();};},[modal]);
  const scrollTo=(id)=>{document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});setMenu(null);setMobileNav(false);};
  const find=(text)=>{setQuery(text);setSearch(text.trim());setFilter('全部');scrollTo('scores');};
  const toggleSaved=(id)=>{setSaved(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);};
  const play=async()=>{
    if(playing){stopAudio();return;}
    audio.current ||= new (window.AudioContext||window.webkitAudioContext)(); await audio.current.resume();
    const melody=modal?.song?.id==='star'?[60,60,67,67,69,69,67,null,65,65,64,64,62,62,60,null]:[60,64,67,72,71,67,64,62,60,64,69,72,71,67,62,60];
    const beat=60/tempo; const start=audio.current.currentTime+.08;
    melody.forEach((note,i)=>{if(note===null)return;const osc=audio.current.createOscillator();const gain=audio.current.createGain();osc.type='triangle';osc.frequency.value=440*Math.pow(2,(note-69)/12);gain.gain.setValueAtTime(0,start+i*beat);gain.gain.linearRampToValueAtTime(.18,start+i*beat+.015);gain.gain.exponentialRampToValueAtTime(.001,start+(i+.9)*beat);osc.connect(gain);gain.connect(audio.current.destination);osc.start(start+i*beat);osc.stop(start+(i+1)*beat);audioNodes.current.push(osc);});
    setPlaying(true);let started=Date.now();timer.current=setInterval(()=>{const percent=(Date.now()-started)/(melody.length*beat*1000)*100;if(percent>=100){stopAudio();}else setProgress(percent);},80);
  };
  const filteredSongs=songs.filter(s=>(filter==='全部'||filter==='五线谱'||filter==='简谱'||filter==='和弦谱'||s.instrument===filter)&&matchesSong(s,search));
  const shownPosts=tab==='推荐'?posts:posts.filter(p=>p.category===tab);
  const lessonTitle=modal?.feature?.title||modal?.title||'零基础入门';
  const lessonSteps=modal?.feature?.id==='rhythm'?['认识四分音符与四四拍','跟着节拍器，均匀地拍手','用 60 BPM 完成四小节练习']:['认识高音谱号和五条谱线','找到中央 C，唱出 do re mi','跟着《小星星》完成第一次练习'];
  return <>
    <ClassroomHeader userName={userName} assets={assets} isSearchPage={window.location.hash.startsWith('#scores')}
      onHome={()=>{window.location.hash='';window.scrollTo({top:0,behavior:'smooth'});setSearch('');setQuery('');setFilter('全部');}}
      onResults={text=>find(text??'周杰伦')} onCommunity={()=>scrollTo('community')} onOpen={open}
      checkedIn={checkedIn} savedCount={saved.length}
      onCheckIn={()=>{setCheckedIn(true);notify(checkedIn?'今天已经打卡啦，明天继续！':'打卡成功！今天也离音乐更近了一步。');}}/>
    {window.location.hash.startsWith('#scores')&&<SearchBanner term={query} locationHash={window.location.hash} songs={songs} onSearch={find} onLink={url=>open({type:'link',url})}/>}
    <main>
      <section className="hero" aria-label={tr("音乐学习与乐谱搜索")}>
        <div className="hero-art-frame"><img className="hero-art" src={assets+'hero-classroom-v3.png'} alt={tr("阳光洒进音乐教室，戴耳机的女孩抱着尤克里里，身旁的小猫安静地睡着")}/></div>
        <div className="hero-content">
        <div className="hero-heading"><MusicNotes className="hero-note-decoration" size={42} weight="duotone" aria-hidden="true"/><Heart className="hero-heart-decoration" size={24} aria-hidden="true"/><h1><span className="hero-title-lead">{tr("跟着乐谱学音乐，")}</span><span className="hero-title-end"><em>{tr("轻松唱奏")}</em>{tr("一首歌")}</span></h1><div className="hero-promises">{['从识谱到演奏','步骤清晰易懂','零基础也能上手'].map(t=><span key={t}><CheckCircle size={20} weight="bold"/>{tr(t)}</span>)}</div></div>
        <aside className="learning-note"><h2>{tr("在这里你将学会：")}<Heart size={20}/></h2>{['认识五线谱与简谱','掌握节奏与拍子','和弦弹唱 / 尤克里里演奏','边学边练一首完整作品'].map(t=><p key={t}><CheckSquare size={18}/>{tr(t)}</p>)}</aside>
        <MusicSearch query={query} onQueryChange={setQuery} songs={songs} onSearch={find} onLink={url=>open({type:'link',url})}/>
        </div>
        <div className="feature-grid">{features.map(f=><button key={f.id} className={`feature-card ${f.color}`} onClick={()=>f.id==='community'?scrollTo('community'):open({type:'lesson',feature:f})}><img src={assets+`feature-${f.id}-handdrawn-v2.png`} alt=""/><h2>{tr(f.title)}</h2><p>{tr(f.desc)}<CaretRight size={12}/></p></button>)}</div>
      </section>
      <div className="content-shell">
        <section className="scores-section glass-panel" id="scores" aria-labelledby="scores-heading">
          <div className="section-heading"><h2 id="scores-heading"><MusicNotes size={36} weight="duotone"/>{tr("热门乐谱 · 发现想弹的曲子")}</h2><div className="score-types score-filters" role="group" aria-label={tr("乐谱分类")}>{[{name:'五线谱',icon:MusicNotes},{name:'简谱',number:true},{name:'和弦谱',icon:BookOpen},{name:'吉他谱',icon:Guitar},{name:'钢琴谱',icon:PianoKeys}].map(item=><button key={item.name} className={filter===(item.name==='吉他谱'?'吉他':item.name==='钢琴谱'?'钢琴':item.name)?'selected':''} onClick={()=>{setFilter(item.name==='吉他谱'?'吉他':item.name==='钢琴谱'?'钢琴':item.name);setSearch('');setQuery('');scrollTo('scores');}}>{item.number?<span className="number-icon">123</span>:<item.icon size={25} weight="duotone"/>}{tr(item.name)}</button>)}<button className="more-type" onClick={()=>{setFilter('尤克里里');scrollTo('scores');}}>{tr("更多 ")}<CaretDown size={12}/></button></div><button className="outline-button more-scores" onClick={()=>open({type:'library'})}>{tr("更多乐谱 ")}<CaretRight size={17}/></button></div>

          {(search||filter!=='全部')&&<div className="filter-status"><span>{search?`“${search}” 的搜索结果`:filter+'精选'} · {filteredSongs.length}{tr(" 首乐谱")}</span><button onClick={()=>{setFilter('全部');setSearch('');setQuery('');}}><X size={13}/>{tr("清除筛选")}</button></div>}
          <div className="scores-grid">{filteredSongs.map(song=><article className="score-card" key={song.id}><button className="score-cover" onClick={()=>open({type:'preview',song})} aria-label={`预览${song.title}乐谱`}><img src={assets+`score-${song.id}.png`} alt={`${song.title}的插画与乐谱`}/>{song.badge&&<span className={'score-badge '+song.color}>{song.color==='purple'?<Star size={12} weight="fill" aria-hidden="true"/>:<Fire size={12} weight="fill" aria-hidden="true"/>}{tr(song.badge)}</span>}</button><div className="score-info"><div className="score-title"><h3>{tr(song.title)}</h3><button className={'save-button '+(saved.includes(song.id)?'is-saved':'')} aria-label={`${saved.includes(song.id)?'取消收藏':'收藏'}${song.title}`} aria-pressed={saved.includes(song.id)} onClick={()=>toggleSaved(song.id)}><Heart size={18} weight={saved.includes(song.id)?'fill':'regular'}/></button></div><p className="score-artist">{song.artist}</p><div className="score-meta"><span className={'instrument-badge '+(song.instrument==='钢琴'?'purple':'orange')}><Instrument name={song.instrument} size={14} weight="duotone"/>{tr(song.instrument)}</span><div className="difficulty">{tr("难度：")}<Rating level={song.level}/></div></div><div className="card-actions"><button className="outline-button" onClick={()=>open({type:'preview',song})}><Play size={13}/>{tr("预览")}</button><button className="coral-button" onClick={()=>open({type:'practice',song})}>{tr("开始练习")}</button></div></div></article>)}</div>
          {!filteredSongs.length&&<div className="empty-state"><MagnifyingGlass size={36}/><h3>{tr("还没有找到这首曲子")}</h3><p>{tr("试试「小星星」「晴天」，或选择乐器来发现乐谱。")}</p><button className="outline-button" onClick={()=>{setSearch('');setQuery('');setFilter('全部');}}>{tr("查看全部乐谱")}</button></div>}
        </section>
        <section className="community-section glass-panel" id="community" aria-labelledby="community-heading">
          <div className="section-heading"><h2 id="community-heading"><UsersThree size={38} weight="duotone"/>{tr("音乐论坛 · 分享你的演奏")}</h2><div className="community-tabs" role="tablist" aria-label={tr("作品分类")}>{['推荐','钢琴演奏','吉他弹唱','尤克里里','翻唱','合奏','比赛作品','学习交流'].map(t=><button key={t} role="tab" aria-selected={tab===t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t==='推荐'&&<Fire size={18} weight="duotone"/>}{tr(t)}</button>)}</div></div>
          <div className="community-layout"><div className="community-feed"><div className="post-grid">{shownPosts.map(post=><article className="post-card" key={post.id}><button className="post-cover" aria-label={`播放${post.title}`} onClick={()=>open({type:'post',post,song:songs.find(s=>s.id===(post.id==='guitar'?'sunny':post.id==='vocal'?'confession':'star'))})}><img src={assets+`community-${post.id==='local'?'piano':post.id}.png`} alt={tr(post.title)}/><span className="play-bubble"><Play size={23} weight="fill"/></span><span className="video-duration">{post.time}</span></button><h3>{tr(post.title)}</h3><div className="post-meta"><img src={assets+'avatar-musician.png'} alt=""/><span>{post.user}</span><span className="level-tag">Lv.{post.level}</span><button aria-label={`点赞${post.title}`} aria-pressed={liked.includes(post.id)} onClick={()=>setLiked(s=>s.includes(post.id)?s.filter(x=>x!==post.id):[...s,post.id])}><Heart size={16} weight={liked.includes(post.id)?'fill':'regular'}/>{(post.likes+(liked.includes(post.id)?1:0)).toLocaleString()}</button><button aria-label={`查看${post.title}评论`} onClick={()=>open({type:'discussion',discussion:{title:post.title,text:'好喜欢这段演奏！欢迎记录你的练习心得，与音乐同好一起交流。',count:post.comments}})}><ChatCircle size={15}/>{post.comments}</button></div></article>)}</div>{!shownPosts.length&&<div className="empty-feed"><MusicNotes size={30}/><p>{tr("这里等着你的第一段演奏")}</p><button className="outline-button" onClick={()=>open({type:'upload'})}>{tr("分享我的作品")}</button></div>}</div><aside className="discussion-panel"><div className="discussion-heading"><h3><ChatsCircle size={29} weight="duotone"/>{tr("精选讨论")}</h3><button onClick={()=>open({type:'discussions'})}>{tr("查看全部 ")}<CaretRight size={12}/></button></div>{discussions.map((d,i)=><button key={d.title} className="discussion-row" onClick={()=>open({type:'discussion',discussion:d})}><d.icon size={23} weight="duotone" className={d.color}/><span>{tr(d.title)}</span><small><ChatCircle size={16}/>{d.count}</small></button>)}</aside></div>
        </section>
      </div>
    </main>
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-main">
          <div className="footer-about">
            <a className="brand footer-brand" href="#" onClick={e=>{e.preventDefault();window.scrollTo({top:0,behavior:'smooth'});}} aria-label={tr("谱芽岛，返回顶部")}><MusicNotes size={37} weight="duotone"/><span><strong>{tr("谱芽岛")}</strong><small>{tr("让喜欢的歌，在指尖靠岸。")}</small></span></a>
            <p>{tr("从第一个音符，到第一首完整的歌。")}<br/>{tr("陪你慢慢学，开心唱，自在弹。")}</p>
          </div>
          <div className="footer-links" role="navigation" aria-label={tr("页尾快捷入口")}>
            <div><h2>{tr("开始学音乐")}</h2><button onClick={()=>open({type:'lesson',title:'零基础入门'})}>{tr("零基础入门")}</button><button onClick={()=>scrollTo('scores')}>{tr("发现好乐谱")}</button><button onClick={()=>open({type:'lesson',title:'我的学习计划'})}>{tr("我的学习计划")}</button></div>
            <div><h2>{tr("遇见音乐同好")}</h2><button onClick={()=>scrollTo('community')}>{tr("作品社区")}</button><button onClick={()=>{scrollTo('community');setTab('学习交流');}}>{tr("学习交流")}</button><button onClick={()=>open({type:'discussion',discussion:discussions[4]})}>{tr("音乐比赛")}</button></div>
          </div>
          <div className="footer-encouragement"><span className="footer-note" aria-hidden="true"><MusicNotes size={24} weight="duotone"/></span><p>{tr("每天一小段，")}<br/><strong>{tr("离喜欢的音乐近一点。")}</strong></p><button onClick={()=>scrollTo('scores')}>{tr("今天也来练一首 ")}<CaretRight size={15}/></button></div>
        </div>
        <div className="footer-bottom"><small>© {new Date().getFullYear()}{tr(" 谱芽岛 ")}<span>·</span>{tr(" 用音乐记录每一点进步")}</small><span className="footer-demo">{tr("学习体验演示 · 社区内容为示例")}</span><button className="back-to-top" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>{tr("返回顶部 ")}<ArrowUp size={15}/></button></div>
      </div>
    </footer>
    {toast&&<div className="toast" role="status"><CheckCircle size={22} weight="duotone"/>{toast}</div>}
    {modal&&<div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)closeModal();}}><section className={'modal modal-'+modal.type} ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="modal-title"><button className="close-modal icon-button" aria-label={tr("关闭弹窗")} onClick={closeModal}><X size={24}/></button>
      {['preview','practice','post'].includes(modal.type)&&<><span className="eyebrow"><MusicNotes size={17}/>{tr(" PUYA ISLAND · 一起享受音乐")}</span><h2 id="modal-title">{modal.type==='post'?modal.post.title:modal.song.title}<small>{modal.type==='practice'?'跟着乐谱，慢慢弹好每一个音':modal.type==='post'?'作品欣赏 · 练习伴奏试听':'乐谱预览'}</small></h2><img className="practice-score" src={assets+`score-${modal.song.id}.png`} alt={`${modal.song.title}乐谱预览`}/><div className="practice-info"><span><Instrument name={modal.song.instrument} size={18}/>{tr(modal.song.instrument)}</span><span>{modal.song.key}</span><Rating level={modal.song.level}/></div><label className="tempo-label">{tr("练习速度 ")}<b>{tempo} BPM</b><input type="range" min="40" max="160" value={tempo} onChange={e=>{stopAudio();setTempo(Number(e.target.value));}}/></label><progress max="100" value={progress} aria-label={tr("试听进度")}/><div className="modal-actions"><button className="outline-button" onClick={()=>{toggleSaved(modal.song.id);}}><Heart size={18} weight={saved.includes(modal.song.id)?'fill':'regular'}/>{saved.includes(modal.song.id)?'已收藏':'收藏乐谱'}</button><button className="coral-button" onClick={play}>{playing?<Pause size={19} weight="fill"/>:<Play size={19} weight="fill"/>}{playing?'暂停试听':modal.song.id==='star'?'播放小星星旋律':'播放练习音阶'}</button>{modal.type==='preview'&&<button className="outline-button" onClick={()=>open({...modal,type:'practice'})}>{tr("开始练习")}<CaretRight size={16}/></button>}</div><p className="modal-footnote">{modal.song.id==='star'?'用熟悉的旋律练习识谱，按自己的节奏来。':'插画乐谱为设计演示素材，音阶试听用于练习节拍。'}</p></>}
      {modal.type==='lesson'&&<><span className="eyebrow"><GraduationCap size={19}/>{tr(" 每一点进步，都值得被听见")}</span><h2 id="modal-title">{tr(lessonTitle)}</h2><p className="modal-intro">{tr("从一个音符开始，让今天成为你的音乐第一天。")}</p><div className="lesson-list">{lessonSteps.map((step,i)=><button key={step} className={completed.includes(step)?'complete':''} onClick={()=>setCompleted(s=>s.includes(step)?s.filter(x=>x!==step):[...s,step])}><span className="lesson-number">{completed.includes(step)?<Check size={22}/>:String(i+1).padStart(2,'0')}</span><span><strong>{tr(step)}</strong><small>{tr(i===0?'认识基础知识 · 5 分钟':i===1?'动手试一试 · 8 分钟':'完成一次小练习 · 10 分钟')}</small></span><CheckCircle size={23} weight={completed.includes(step)?'fill':'regular'}/></button>)}</div><button className="coral-button wide-button" onClick={()=>open({type:'practice',song:songs[0]})}><Play size={18}/>{tr("用《小星星》开始练习")}</button></>}
      {modal.type==='library'&&<><h2 id="modal-title">{tr("发现想弹的曲子")}</h2><p className="modal-intro">{tr("选一首喜欢的，把练习变成期待。")}</p><div className="library-list">{songs.map(s=><button key={s.id} onClick={()=>open({type:'practice',song:s})}><img src={assets+`score-${s.id}.png`} alt=""/><span><strong>{tr(s.title)}</strong><small>{tr(s.instrument)} · {s.key}</small></span><Rating level={s.level}/><CaretRight size={18}/></button>)}</div></>}
      {modal.type==='saved'&&<><h2 id="modal-title">{tr("我的收藏")}</h2><p className="modal-intro">{tr("把喜欢的旋律，留给下一次练习。")}</p>{saved.length?<div className="library-list">{songs.filter(s=>saved.includes(s.id)).map(s=><button key={s.id} onClick={()=>open({type:'practice',song:s})}><img src={assets+`score-${s.id}.png`} alt=""/><strong>{tr(s.title)}</strong><CaretRight size={18}/></button>)}</div>:<div className="empty-state"><Heart size={42}/><p>{tr("点击乐谱卡片上的爱心，收藏喜欢的曲子。")}</p></div>}</>}
      {modal.type==='upload'&&<><span className="eyebrow"><CloudArrowUp size={20}/>{tr(" 分享你的音乐时刻")}</span><h2 id="modal-title">{tr("发布演奏作品")}</h2><p className="modal-intro">{tr("每一次勇敢的演奏，都值得被听见。")}</p><form className="publish-form" onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);setPosts(s=>[{id:'local',title:data.get('title'),user:'音乐同学',level:1,likes:0,comments:0,time:'新作品',category:data.get('category')},...s.filter(p=>p.id!=='local')]);setTab('推荐');closeModal();notify('作品已添加到当前页面，刷新后会重置。');}}><label>{tr("作品标题")}<input name="title" required maxLength={36} placeholder={tr("给你的演奏起个名字")}/></label><label>{tr("作品分类")}<select name="category">{['钢琴演奏','吉他弹唱','尤克里里','翻唱','合奏','比赛作品','学习交流'].map(s=><option key={s}>{s}</option>)}</select></label><label>{tr("音乐心得")}<textarea name="description" rows={3} placeholder={tr("分享练习中的小故事…")}/></label><p className="modal-footnote">{tr("当前为页面演示，作品会展示在本次预览中。")}</p><button className="coral-button wide-button" type="submit"><CloudArrowUp size={20}/>{tr("发布到作品社区")}</button></form></>}
      {modal.type==='discussion'&&<><span className="eyebrow"><ChatsCircle size={20}/>{tr(" 音乐同好的小小讨论室")}</span><h2 id="modal-title">{tr(modal.discussion.title)}</h2><div className="discussion-answer"><img src={assets+'avatar-musician.png'} alt=""/><div><strong>{tr("小谱音乐老师")}</strong><small>{tr("一起学习，一起进步")}</small><p>{modal.discussion.text}</p></div></div><form className="reply-form" onSubmit={e=>{e.preventDefault();notify('你的想法已记录在本次预览中。');e.currentTarget.reset();}}><input aria-label={tr("讨论回复")} placeholder={tr("聊聊你的音乐心得…")} required/><button className="coral-button">{tr("发送")}</button></form></>}
      {modal.type==='discussions'&&<><h2 id="modal-title">{tr("精选讨论")}</h2><div className="all-discussions">{discussions.map(d=><button key={d.title} onClick={()=>open({type:'discussion',discussion:d})}><d.icon size={26} weight="duotone"/><span>{tr(d.title)}<small>{d.count}{tr(" 位同学参与讨论")}</small></span><CaretRight size={18}/></button>)}</div></>}
      {modal.type==='notification'&&<><h2 id="modal-title">{tr("学习通知")}</h2><div className="notification-card"><MusicNotes size={34} weight="duotone"/><div><h3>{tr("欢迎来到谱芽岛")}</h3><p>{tr("你的音乐旅程从这里开始。试试收藏一首喜欢的曲子，完成今天的第一段练习吧。")}</p></div></div><button className="coral-button wide-button" onClick={()=>{closeModal();scrollTo('scores');}}>{tr("发现我的第一首乐谱")}</button></>}
      {modal.type==='link'&&<><h2 id="modal-title">{tr("从音乐链接开始")}</h2><p className="modal-intro">{tr("已识别你的音乐链接，可以进入现有的旋律转谱工作台继续处理。")}</p><div className="link-preview">{modal.url}</div><a className="coral-button wide-button" href="http://127.0.0.1:8000/v2">{tr("打开整曲转谱工作台")}<CaretRight size={18}/></a><p className="modal-footnote">{tr("工作台需要项目的本地 Python 服务运行在 8000 端口。")}</p></>}
    </section></div>}
  </>;
}
