import React, { useEffect, useState } from 'react';
import { CheckCircle, CheckSquare, Heart, MusicNotes } from '@phosphor-icons/react';
import { MusicSearch } from './MusicSearch.jsx';

const assets = import.meta.env.BASE_URL + 'assets/';

export function SearchBanner({ term, locationHash, songs, onSearch, onLink }) {
  const currentTerm = locationHash.startsWith('#scores')
    ? new URLSearchParams(locationHash.split('?')[1] || '').get('q') || ''
    : term;
  const [draft, setDraft] = useState(currentTerm);
  useEffect(() => { setDraft(currentTerm); }, [currentTerm]);

  return <section className="hero library-home-hero" aria-label="音乐学习与乐谱搜索">
    <div className="hero-art-frame">
      <img className="hero-art" src={assets + 'hero-classroom-v3.png'} alt="阳光洒进音乐教室，戴耳机的女孩抱着尤克里里，身旁的小猫安静地睡着"/>
    </div>
    <div className="hero-content">
      <div className="hero-heading">
        <MusicNotes className="hero-note-decoration" size={42} weight="duotone" aria-hidden="true"/>
        <Heart className="hero-heart-decoration" size={24} aria-hidden="true"/>
        <h1><span className="hero-title-lead">跟着乐谱学音乐，</span><span className="hero-title-end"><em>轻松唱奏</em>一首歌</span></h1>
        <div className="hero-promises">{['从识谱到演奏', '步骤清晰易懂', '零基础也能上手'].map(text => <span key={text}><CheckCircle size={20} weight="bold"/>{text}</span>)}</div>
      </div>
      <aside className="learning-note">
        <h2>在这里你将学会：<Heart size={20}/></h2>
        {['认识五线谱与简谱', '掌握节奏与拍子', '和弦弹唱 / 尤克里里演奏', '边学边练一首完整作品'].map(text => <p key={text}><CheckSquare size={18}/>{text}</p>)}
      </aside>
      <MusicSearch query={draft} onQueryChange={setDraft} songs={songs} onSearch={onSearch} onLink={onLink}/>
    </div>
  </section>;
}
