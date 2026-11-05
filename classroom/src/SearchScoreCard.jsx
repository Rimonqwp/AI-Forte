import React from 'react';
import { Fire, Guitar, Heart, PianoKeys, Play, Star } from '@phosphor-icons/react';
import './search-score-card.css';
import { formatPracticeTotal, songPracticeStats } from './song-practice-stats.js';

const assets = import.meta.env.BASE_URL + 'assets/';

export function SearchScoreCard({song,saved,onSave,onOpen}) {
  const practice=()=>onOpen({type:'practice',song});
  const color=song.color||(song.badge==='热门'?'coral':'purple');
  const BadgeIcon=color==='purple'?Star:Fire;
  const Instrument=song.instrument==='钢琴'?PianoKeys:Guitar;
  const practiceStats=songPracticeStats(song);
  return <article className="score-card results-practice-card" onClick={event=>{
    if(!event.target.closest('button,a,input,select'))practice();
  }}>
    <button className="score-cover" onClick={practice} aria-label={`开始练习${song.title}`}>
      <img src={assets+`score-${song.id}.png`} alt={`${song.title}的插画与乐谱`}/>
      {song.badge&&<span className={`score-badge ${color}`}><BadgeIcon size={12} weight="fill" aria-hidden="true"/>{song.badge}</span>}
    </button>
    <div className="score-info">
      <div className="score-title"><h3>{song.title}</h3><button className={`save-button ${saved.includes(song.id)?'is-saved':''}`} aria-label={`${saved.includes(song.id)?'取消收藏':'收藏'}${song.title}`} aria-pressed={saved.includes(song.id)} onClick={()=>onSave(song.id)}><Heart size={18} weight={saved.includes(song.id)?'fill':'regular'}/></button></div>
      <p className="score-artist">{song.artist}</p>
      <div className="score-meta"><span className={`instrument-badge ${song.instrument==='吉他'?'orange':'purple'}`}><Instrument size={14}/>{song.instrument}</span><span className="score-practice-total"><span>总次数</span><strong>{formatPracticeTotal(practiceStats.total)}</strong>{practiceStats.demo&&<small>示例</small>}</span></div>
      <div className="card-actions"><button className="outline-button" onClick={()=>onOpen({type:'preview',song})}><Play size={12}/>预览</button><button className="coral-button" onClick={practice}>开始练习</button></div>
    </div>
  </article>;
}
