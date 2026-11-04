import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, CaretDown, ChatCircle, Check, CheckSquare, FileText, Fire, GraduationCap, Guitar, Heart, Lightbulb, List, MagnifyingGlass, Microphone, MusicNote, MusicNotes, Pause, PianoKeys, Plant, Play, SpeakerHigh, Sparkle, Star, Target, UsersThree, X } from '@phosphor-icons/react';
import { App } from './App.jsx';
import './song-detail.css';
import './singer-versions.css';
import SongDiscussions from './SongDiscussions.jsx';
const ScorePractice = lazy(()=>import('./ScorePractice.jsx'));

const assets = import.meta.env.BASE_URL + 'assets/';
const detailAssets = assets + 'song-detail/';
const songCatalog = [
  {id:'rice',title:'稻香',artist:'周杰伦',date:'2008-10-15',key:'C',cover:'rice-cover.png',tags:['流行','校园','治愈','励志']},
  {id:'sunny',title:'晴天',artist:'周杰伦',date:'2003-07-31',key:'G',cover:'sunny-cover.png',tags:['流行','校园','抒情','青春']},
  {id:'confession',title:'告白气球',artist:'周杰伦',date:'2016-06-24',key:'B',tags:['流行','浪漫','弹唱']},
  {id:'fireworks',title:'烟花易冷',artist:'周杰伦',key:'C'},
  {id:'windmill',title:'七里香',artist:'周杰伦',key:'G'},
  {id:'nocturne',title:'夜曲',artist:'周杰伦',key:'C'},
  {id:'secret',title:'不能说的秘密',artist:'周杰伦',key:'G'},
  {id:'north',title:'一路向北',artist:'周杰伦',key:'G'},
  {id:'simple',title:'简单爱',artist:'周杰伦',key:'C'},
  {id:'clock',title:'反方向的钟',artist:'周杰伦',key:'F'},
  {id:'star',title:'小星星',artist:'传统儿歌',key:'C'},
  {id:'night',title:'夜空中最亮的星',artist:'逃跑计划',key:'C'},
  {id:'castle',title:'天空之城',artist:'久石让',key:'C'},
];
const defaultFilters = {singer:'all',instrument:'全部乐器',level:'难度',type:'谱子类型',key:'调性'};
// Performer identity is separate from the community arranger. Cover data is illustrative.
const demoPerformances = [
  {id:'original',kind:'原唱',singer:null},
  {id:'cover-xia',kind:'翻唱',singer:'小夏',demo:true},
  {id:'cover-chen',kind:'翻唱',singer:'阿辰',demo:true},
];
const versions = [
  {id:'piano-easy',performanceId:'original',author:'小谱老师',avatar:'teacher',instrument:'钢琴',type:'五线谱',level:2,key:'C',subtitle:'钢琴简化版（入门友好）',badge:'官方推荐',certified:true,description:'简单旋律与和弦，适合钢琴入门。',plays:'56.8',rating:4.9,days:3,sheet:'piano'},
  {id:'guitar-sing',performanceId:'original',author:'阿泽 Acous',avatar:'acous',instrument:'吉他',type:'和弦谱',level:3,key:'G',subtitle:'吉他弹唱版（原版和弦）',badge:'热门',authorLevel:5,description:'保留原曲和弦，适合自弹自唱。',plays:'42.3',rating:4.8,days:5,sheet:'guitar'},
  {id:'ukulele-easy',performanceId:'cover-xia',author:'星星同学',avatar:'star',instrument:'尤克里里',type:'简谱',level:2,key:'C',subtitle:'尤克里里弹唱版（超简单）',badge:'新上架',authorLevel:7,description:'三个常用和弦，新手轻松弹唱。',plays:'8.7',rating:4.9,days:1,sheet:'ukulele-v2'},
  {id:'guitar-finger',performanceId:'cover-chen',author:'指弹小林',avatar:'lin',instrument:'吉他',type:'吉他谱',level:4,key:'D',subtitle:'吉他指弹版（进阶独奏）',badge:'进阶精选',authorLevel:6,description:'旋律结合分解和弦，适合进阶。',plays:'6.2',rating:4.8,days:4,sheet:'fingerstyle'},
  {id:'piano-lyric',performanceId:'cover-xia',author:'小谱老师',avatar:'teacher',instrument:'钢琴',type:'五线谱',level:3,key:'G',subtitle:'钢琴抒情版（完整练习）',badge:'精选',certified:true,description:'分手慢练，逐步完成抒情演奏。',plays:'5.6',rating:4.7,days:8,sheet:'piano'},
  {id:'guitar-beginner',performanceId:'original',author:'阿泽 Acous',avatar:'acous',instrument:'吉他',type:'和弦谱',level:1,key:'C',subtitle:'吉他入门版（基础和弦）',badge:'新手友好',authorLevel:5,description:'简化和弦转换，先练稳节奏。',plays:'3.8',rating:4.6,days:2,sheet:'guitar'},
  {id:'uke-melody',performanceId:'original',author:'星星同学',avatar:'star',instrument:'尤克里里',type:'简谱',level:1,key:'G',subtitle:'尤克里里旋律版（单音练习）',badge:'轻松练习',authorLevel:7,description:'单音旋律练习，弹得清晰连贯。',plays:'2.1',rating:4.7,days:6,sheet:'ukulele-v2'},
  {id:'fingerstyle-full',performanceId:'cover-chen',author:'指弹小林',avatar:'lin',instrument:'吉他',type:'吉他谱',level:5,key:'G',subtitle:'指弹挑战版（丰富编配）',badge:'进阶精选',authorLevel:6,description:'融合旋律与低音，挑战丰富编配。',plays:'1.9',rating:4.9,days:7,sheet:'fingerstyle'},
];

function Rating({level}) {
  return <span className="detail-rating" aria-label={`难度 ${level} 星`}>{Array.from({length:5},(_,i)=><Star key={i} size={15} weight={i<level?'fill':'regular'} className={i<level?'filled':''}/>)}</span>;
}
function Instrument({name,...props}) { return name==='钢琴'?<PianoKeys {...props}/>:<Guitar {...props}/>; }

function SupportedInstruments({versions}) {
  const instruments=[...new Set(versions.map(version=>version.instrument))];
  const iconsOnly=instruments.length>3;
  return <div className="detail-supported-instruments" role="group" aria-label="支持乐器">
    <span className="detail-instruments-label">支持乐器：</span>
    {instruments.map(name=><span key={name} className="detail-instrument" title={name} aria-label={name}>
      <Instrument name={name} size={16} aria-hidden="true"/>{!iconsOnly&&<span>{name}</span>}
    </span>)}
  </div>;
}

const versionBadgeStyles = {
  '官方推荐': {tone:'sage', Icon:CheckSquare},
  '热门': {tone:'coral', Icon:Fire},
  '新上架': {tone:'teal', Icon:Sparkle},
  '进阶精选': {tone:'lilac', Icon:Target},
  '精选': {tone:'sand', Icon:Star},
  '新手友好': {tone:'leaf', Icon:Plant},
  '轻松练习': {tone:'blue', Icon:MusicNote},
};
function VersionBadge({label}) {
  const {tone,Icon}=versionBadgeStyles[label]||versionBadgeStyles['精选'];
  return <span className={`detail-version-badge ${tone}`}><Icon size={14} aria-hidden="true"/>{label}</span>;
}


export function ClassroomApp() {
  const [hash,setHash]=useState(window.location.hash);
  const [overlayId,setOverlayId]=useState(null);
  useEffect(()=>{const update=()=>{setHash(window.location.hash);setOverlayId(null);};const open=event=>setOverlayId(event.detail.id);window.addEventListener('hashchange',update);window.addEventListener('classroom:open-song',open);return()=>{window.removeEventListener('hashchange',update);window.removeEventListener('classroom:open-song',open);};},[]);
  const isDetail=hash.startsWith('#song?');
  const params=new URLSearchParams(hash.split('?')[1]);
  return <><div hidden={isDetail} inert={overlayId?true:undefined}><App/></div>{isDetail&&<SongDetail key={params.get('id')} song={songCatalog.find(song=>song.id===params.get('id'))||songCatalog[0]}/>} {overlayId&&<SongDetail key={`overlay-${overlayId}`} song={songCatalog.find(song=>song.id===overlayId)||songCatalog[0]} modal onClose={()=>setOverlayId(null)}/>}</>;
}

function SongDetail({song,modal=false,onClose}) {
  const [filters,setFilters]=useState(defaultFilters);
  const [sort,setSort]=useState('最热推荐');
  const [saved,setSaved]=useState([]);
  const [songSaved,setSongSaved]=useState(false);
  const [section,setSection]=useState('versions');
  const [selected,setSelected]=useState(null);
  const [tempo,setTempo]=useState(80);
  const [playing,setPlaying]=useState(false);
  const [toast,setToast]=useState('');
  const [mobileNav,setMobileNav]=useState(false);
  const overlayDialog=useRef(null);
  const dialog=useRef(null),audio=useRef(null),nodes=useRef([]),timer=useRef(null),toastTimer=useRef(null);
  const stop=()=>{nodes.current.forEach(node=>{try{node.stop();}catch{}});nodes.current=[];clearTimeout(timer.current);setPlaying(false);};
  const notify=text=>{setToast(text);clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),3200);};
  const close=()=>{stop();setSelected(null);};
  const back=()=>{if(modal){onClose();return;}window.location.hash=sessionStorage.getItem('classroom.lastScoreSearch')||'scores?q=周杰伦';};
  const home=()=>{window.location.hash='';};
  useEffect(()=>{const previousTitle=document.title;document.title=`${song.title} · 玩家编配版本 · 小谱音乐教室`;return()=>{document.title=previousTitle;};},[song.title]);
  useEffect(()=>{if(!modal)window.scrollTo({top:0});return()=>{nodes.current.forEach(node=>{try{node.stop();}catch{}});clearTimeout(timer.current);clearTimeout(toastTimer.current);audio.current?.close();};},[]);
  useEffect(()=>{if(!modal)return;const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previousOverflow;};},[modal]);
  useEffect(()=>{if(!modal||selected)return;const previous=document.activeElement;overlayDialog.current?.focus({preventScroll:true});const handle=event=>{if(event.key==='Escape'){event.preventDefault();onClose();}if(event.key==='Tab'){const controls=[...overlayDialog.current.querySelectorAll('button,input,select,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===overlayDialog.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};document.addEventListener('keydown',handle);return()=>{document.removeEventListener('keydown',handle);previous?.focus({preventScroll:true});};},[modal,selected,onClose]);
  useEffect(()=>{if(!selected)return;const previous=document.activeElement;dialog.current?.focus();const escape=event=>{if(event.key==='Escape')close();if(event.key==='Tab'){const controls=[...((modal?overlayDialog.current:dialog.current)?.querySelectorAll('button,input,select')||[])].filter(el=>!el.disabled&&el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};document.addEventListener('keydown',escape);const previousOverflow=document.body.style.overflow;if(!modal)document.body.style.overflow='hidden';return()=>{document.removeEventListener('keydown',escape);if(!modal)document.body.style.overflow=previousOverflow;previous?.focus({preventScroll:true});};},[selected,modal]);
  const play=async()=>{if(playing){stop();return;}audio.current ||= new (window.AudioContext||window.webkitAudioContext)();await audio.current.resume();const start=audio.current.currentTime+.05,beat=60/tempo;[60,64,67,72,67,64,62,60].forEach((note,i)=>{const osc=audio.current.createOscillator(),gain=audio.current.createGain();osc.type=selected?.instrument==='钢琴'?'sine':'triangle';osc.frequency.value=440*Math.pow(2,(note-69)/12);gain.gain.setValueAtTime(0,start+i*beat);gain.gain.linearRampToValueAtTime(.12,start+i*beat+.015);gain.gain.exponentialRampToValueAtTime(.001,start+(i+.95)*beat);osc.connect(gain);gain.connect(audio.current.destination);osc.start(start+i*beat);osc.stop(start+(i+1)*beat);nodes.current.push(osc);});setPlaying(true);timer.current=setTimeout(()=>setPlaying(false),beat*8000);notify('正在播放练习音色演示，非原曲录音。');};
  const change=(key,value)=>setFilters(previous=>({...previous,[key]:value}));
  const performances=demoPerformances.map(performance=>({...performance,singer:performance.singer||song.artist,count:versions.filter(version=>version.performanceId===performance.id).length})).filter(performance=>performance.count>0);
  const performanceLabel=version=>{const performance=performances.find(item=>item.id===version.performanceId);return `${performance.kind} · ${performance.singer}${performance.demo?'（演示）':''}`;};
  const visible=versions.filter(version=>(filters.singer==='all'||version.performanceId===filters.singer)&&(filters.instrument==='全部乐器'||version.instrument===filters.instrument)&&(filters.level==='难度'||version.level===Number(filters.level))&&(filters.type==='谱子类型'||version.type===filters.type)&&(filters.key==='调性'||version.key===filters.key));
  visible.sort((a,b)=>sort==='最新发布'?a.days-b.days:sort==='评分最高'?b.rating-a.rating:sort==='最适合新手'?a.level-b.level:Number(b.plays)-Number(a.plays));
  const sectionItems=[{id:'info',label:'歌曲信息',Icon:MusicNotes},{id:'versions',label:'选择乐谱版本',Icon:GraduationCap},{id:'comments',label:'相关讨论',count:'1,268',Icon:ChatCircle}];
  const chooseSection=id=>{setSection(id);overlayDialog.current?.querySelector(`#${id==='info'?'detail-song-info':`detail-${id}`}`)?.scrollIntoView({behavior:'smooth',block:'start'});};
  const sectionNav=<div className="detail-side-nav" role="navigation" aria-label="歌曲详情导航">{sectionItems.map(({id,label,Icon,count})=><button key={id} className={section===id?'active':''} aria-current={section===id?'location':undefined} onClick={()=>chooseSection(id)}><Icon size={22}/><span>{label}</span>{count&&<small>（{count}）</small>}</button>)}</div>;
  return <div className={`song-detail-mode${modal?' detail-overlay':''}`} onMouseDown={event=>{if(modal&&event.target===event.currentTarget)onClose();}}>
    <div className={(modal?'detail-overlay-frame':'detail-page-frame')+(selected?' has-practice':'')} role={modal?'dialog':undefined} aria-modal={modal?true:undefined} aria-label={modal?`${song.title} · 选择乐谱版本`:undefined} tabIndex={modal?-1:undefined} ref={overlayDialog}>{modal&&<div className="detail-overlay-header">{!selected&&<><button className="detail-back" onClick={back}><ArrowLeft size={16}/>返回搜索结果</button>{sectionNav}</>}<button className="detail-overlay-close" aria-label="关闭版本选择" onClick={onClose}><X size={21}/></button></div>}
    {!modal&&!selected&&<><header className="site-header detail-site-header"><div className="header-inner">
      <a className="brand" href="#" onClick={event=>{event.preventDefault();home();}} aria-label="小谱音乐教室首页"><MusicNotes size={39} weight="duotone"/><span><strong>小谱音乐教室</strong><small>零基础也能学音乐 <MusicNotes size={10}/></small></span></a>
      <nav aria-label="主导航" className={mobileNav?'open':''}><button className="nav-active" onClick={home}>首页</button><button onClick={()=>notify('零基础入门课程 · 演示')}>零基础入门</button><button onClick={back}>乐谱练习</button><button onClick={()=>notify('课程尚未接入，敬请期待。')}>乐器课程 <CaretDown size={12}/></button><button onClick={()=>notify('课程尚未接入，敬请期待。')}>声乐课程</button><button onClick={()=>notify('今日练习打卡已完成 · 演示')}>每日打卡</button><button onClick={()=>chooseSection('comments')}>社区问答</button></nav>
      <div className="header-actions"><button className="icon-button" aria-label="搜索乐谱" onClick={back}><MagnifyingGlass size={23}/></button><button className="icon-button notification" aria-label="学习通知" onClick={()=>notify('今天也来选一个适合自己的版本练习吧！')}><Bell size={23}/><span>1</span></button><button className="profile" onClick={()=>notify(`本页已收藏 ${saved.length} 个乐谱版本 · 演示`)}><img src={assets+'avatar-musician.png'} alt="我的头像"/><span>我的学习</span><CaretDown size={12}/></button><button className="mobile-toggle icon-button" aria-label="展开导航" onClick={()=>setMobileNav(!mobileNav)}><List size={24}/></button></div>
    </div></header>
    <section className="detail-hero" aria-label="选择歌曲编配版本"><img className="detail-hero-art" src={detailAssets+'detail-hero-v2.png'} alt="阳光洒进音乐教室，女孩抱着尤克里里，钢琴旁摆着乐谱"/>
      <div className="detail-hero-content"><h1><MusicNotes size={26}/>同一首歌，也有不同玩家的编配版本 <Sparkle size={24} weight="fill"/></h1><p className="detail-hero-promise">选择你想练习的乐谱版本，让练习更适合你的水平与需求！<Sparkle size={14} weight="fill"/></p>
        <div className="detail-steps">{[{Icon:MagnifyingGlass,title:'1 搜索歌曲',text:'如：稻香'},{Icon:MusicNotes,title:'2 进入歌曲页面',text:'查看歌曲信息与多个版本'},{Icon:UsersThree,title:'3 选择玩家版本',text:'根据乐器、难度、风格挑选'},{Icon:FileText,title:'4 进入谱面详情',text:'查看完整乐谱并开始练习'}].map(({Icon,title,text},index)=><React.Fragment key={title}><div className="detail-step"><Icon size={28}/><span><strong>{title}</strong><small>{text}</small></span></div>{index<3&&<ArrowRight className="detail-step-arrow" size={21}/>}</React.Fragment>)}</div>
      </div>
    </section></>}
    <main className="song-detail-page" hidden={!!selected}>{!modal&&<aside className="detail-sidebar"><button className="detail-back" onClick={back}><ArrowLeft size={16}/>返回搜索结果</button>{sectionNav}</aside>}
      <div className="detail-main"><section className="detail-summary" id="detail-song-info" aria-label="歌曲信息"><button className="detail-cover" onClick={play} aria-label={`试听${song.title}练习音色演示`}><img src={song.cover?detailAssets+song.cover:assets+`score-library/cover-${song.id}.png`} onError={event=>{if(!event.currentTarget.dataset.fallback){event.currentTarget.dataset.fallback='true';event.currentTarget.src=assets+`score-${song.id}.png`;}}} alt={`${song.title}歌曲封面`}/><span>{playing?<Pause size={20} weight="fill"/>:<Play size={20} weight="fill"/>}</span></button>
        <div className="detail-song-copy"><h2>《{song.title}》</h2><p className="detail-credits"><span><FileText size={14}/>原唱：{song.artist}</span><span>词曲：{song.artist}</span>{song.date&&<span>发行：{song.date}</span>}</p><div className="detail-song-tags">{(song.tags||['流行','抒情','弹唱']).map(tag=><span key={tag}>{tag}</span>)}</div><p className="detail-song-facts"><span><MusicNotes size={17}/>原调：{song.key} 调</span><span><Target size={16}/>常用调：C / G / D</span><span>难度：<Rating level={3}/><small>（中等）</small></span></p><SupportedInstruments versions={versions}/><div className="detail-song-stats"><span><Fire size={18} weight="fill"/>128.6 万人练习</span><button onClick={()=>setSongSaved(!songSaved)} aria-pressed={songSaved} aria-label={`收藏${song.title}`}><Heart size={20} weight={songSaved?'fill':'regular'}/>{songSaved?'3.9 万+1':'3.9 万'}收藏</button><span><Star size={18} weight="fill"/>4.9 分<small>（4,328 条评分）</small></span></div></div>
        <aside className="detail-advice"><h3><Lightbulb size={24}/>选择建议 <small>· 不同版本适合不同的练习目标</small></h3><div className="detail-advice-cards">{[{Icon:Plant,title:'新手推荐',tone:'green',tips:['和弦简单、易上手','适合零基础入门']},{Icon:Microphone,title:'适合弹唱',tone:'pink',tips:['边弹边唱、氛围感强','适合自弹自唱练习']},{Icon:Target,title:'进阶提升',tone:'purple',tips:['指弹 / 独奏版本','提升演奏技巧与表现力']}].map(({Icon,title,tone,tips})=><div className={tone} key={title}><h4><Icon size={21}/>{title}</h4>{tips.map(tip=><p key={tip}><Check size={17}/>{tip}</p>)}</div>)}</div></aside>
      </section>
      <section id="detail-versions" className="detail-versions" aria-labelledby="detail-version-heading"><div className="detail-version-heading"><h2 id="detail-version-heading"><MusicNotes size={27}/>玩家制作的乐谱版本 <span aria-live="polite">（共 {visible.length} 个）</span></h2><p>由社区创作者精心编配，选择最适合你的版本开始练习吧！</p></div>
        <div className="detail-singer-filter" role="group" aria-label="演唱歌手版本">
          <strong><Microphone size={17}/>歌手版本：</strong>
          <div className="detail-singer-options">
            <button type="button" aria-pressed={filters.singer==='all'} onClick={()=>change('singer','all')}>全部歌手 <small>{versions.length}</small></button>
            {performances.map(performance=><button type="button" key={performance.id} aria-pressed={filters.singer===performance.id} onClick={()=>change('singer',performance.id)}><span className="detail-singer-kind">{performance.kind}</span>{performance.singer}{performance.demo&&<span className="detail-singer-demo">演示</span>}<small>{performance.count}</small></button>)}
          </div>
        </div>
        <div className="detail-version-toolbar"><strong>筛选：</strong><div className="detail-version-filters">{[{name:'instrument',options:['全部乐器','钢琴','吉他','尤克里里']},{name:'level',options:['难度','1','2','3','4','5']},{name:'type',options:['谱子类型','五线谱','和弦谱','简谱','吉他谱']},{name:'key',options:['调性','C','G','D']}].map(({name,options})=><label key={name}><select aria-label={{instrument:'版本乐器',level:'版本难度',type:'谱子类型',key:'版本调性'}[name]} value={filters[name]} onChange={event=>change(name,event.target.value)}>{options.map(option=><option key={option} value={option}>{name==='level'&&option!=='难度'?`${option} 星`:name==='key'&&option!=='调性'?`${option} 调`:option}</option>)}</select><CaretDown size={13}/></label>)}</div><span className="detail-toolbar-divider"/><div className="detail-version-sort"><strong>排序：</strong><div className="detail-sort-options">{['最热推荐','最新发布','评分最高','最适合新手'].map(value=><button key={value} className={sort===value?'active':''} aria-pressed={sort===value} onClick={()=>setSort(value)}>{value==='最热推荐'&&<Fire size={16} weight="fill"/>}{value}</button>)}</div></div></div>
        <div className="detail-version-grid">{visible.map(version=><article className="detail-version-card" key={version.id} onClick={event=>{if(!event.target.closest('button')){stop();setSelected(version);}}}><VersionBadge label={version.badge}/><button className="detail-version-save" aria-label={`${saved.includes(version.id)?'取消收藏':'收藏'}${version.author}的${version.subtitle}`} aria-pressed={saved.includes(version.id)} onClick={()=>setSaved(previous=>previous.includes(version.id)?previous.filter(id=>id!==version.id):[...previous,version.id])}><Heart size={20} weight={saved.includes(version.id)?'fill':'regular'}/></button><div className="detail-author"><img src={detailAssets+`avatar-${version.avatar}.png`} alt={`${version.author}头像`}/><strong>{version.author}</strong><span>{version.certified?<><CheckSquare size={13} weight="fill"/>老师认证</>:`Lv.${version.authorLevel}`}</span></div><h3><button className="detail-version-open" onClick={()=>{stop();setSelected(version);}} aria-label={`打开《${song.title}》${version.subtitle}谱例`}>《{song.title}》{version.subtitle}</button></h3><p className="detail-performer"><Microphone size={13}/>{performanceLabel(version)}</p><div className="detail-version-meta"><span className={version.instrument==='吉他'?'orange':'purple'}><Instrument name={version.instrument} size={17}/>{version.instrument}</span><span>难度：<Rating level={version.level}/></span><span>调性：{version.key} 调</span></div><div className="detail-sheet-strip" role="img" aria-label={`${version.instrument}编配的两行谱例演示`}>{[0,1].map(row=><img key={row} className="detail-sheet-row" src={detailAssets+`sheet-${version.sheet}.png`} alt=""/>)}</div><p className="detail-version-description">{version.description}</p><div className="detail-version-stats"><span><SpeakerHigh size={16}/>{version.plays}万练习</span><span><Star size={15} weight="fill"/>{version.rating} 分</span><small>更新：{version.days} 天前</small></div></article>)}</div>
        {!visible.length&&<div className="detail-empty"><MusicNotes size={35}/><h3>暂时没有匹配的版本</h3><p>换一组筛选条件，试试其他编配。</p><button onClick={()=>setFilters(defaultFilters)}>清空筛选</button></div>}
      </section>
      <SongDiscussions song={song}/>
      </div>
    </main>
    {selected&&<Suspense fallback={<div role="status" className="practice-loading">正在加载乐谱…</div>}><ScorePractice song={song} version={selected} onClose={close} dialogRef={dialog}/></Suspense>}
    </div>
    {toast&&<div className="toast" role="status">{toast}</div>}
  </div>;
}
