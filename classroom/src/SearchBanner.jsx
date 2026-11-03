import React, { useEffect, useState } from 'react';
import { CheckSquare, MagnifyingGlass } from '@phosphor-icons/react';
import { MusicSearch } from './MusicSearch.jsx';
import './search-results.css';

const assets = import.meta.env.BASE_URL + 'assets/';

export function SearchBanner({ term, locationHash, songs, onSearch, onLink }) {
  const currentTerm = locationHash.startsWith('#scores')
    ? new URLSearchParams(locationHash.split('?')[1] || '').get('q') || ''
    : term;
  const [draft, setDraft] = useState(currentTerm);
  useEffect(() => { setDraft(currentTerm); }, [currentTerm]);

  return <div className="score-search-page shared-search-banner">
    <section className="results-hero" aria-labelledby="shared-search-title">
      <div className="shared-banner-art-frame">
        <img className="results-hero-art" src={assets + 'search-hero.png'} alt="暖阳里的音乐教室，女孩弹着尤克里里，小猫在窗边熟睡"/>
      </div>
      <div className="results-hero-content">
        <div className="results-title-row">
          <h1 id="shared-search-title"><MagnifyingGlass size={45}/>乐谱搜索结果</h1>
          <p>找到你想学的曲谱，开始轻松练习吧！</p>
        </div>
        <MusicSearch variant="banner" query={draft} onQueryChange={setDraft} songs={songs} onSearch={onSearch} onLink={onLink}/>
      </div>
      <aside className="results-note">
        <h2>为什么选择小谱的乐谱？</h2>
        {['多种谱型，覆盖主流乐器', '难度分级，循序渐进学习', '高清排版，清晰易练习'].map(text => <p key={text}><CheckSquare size={18}/>{text}</p>)}
      </aside>
    </section>
  </div>;
}
