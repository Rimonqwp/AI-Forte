import React, { useState } from 'react';
import { ClassroomHeader } from './ClassroomHeader.jsx';
import { SearchBanner } from './SearchBanner.jsx';
import { DatabaseSearchResults } from './DatabaseSearchResults.jsx';
import { useCatalog } from './useCatalog.js';
import { useCloudState, localDay } from './useCloudState.js';

export function DatabaseSearchPage({hash}) {
  const {songs} = useCatalog();
  const [saved, setSaved] = useCloudState('favorites', []);
  const [checkins, setCheckins] = useCloudState('checkins', []);
  const [resetKey, setResetKey] = useState(0);
  const term = new URLSearchParams(hash.split('?')[1]).get('q') || '';
  const home = () => {window.location.hash = '';};
  const search = (text = '') => {if (!text.trim()) setResetKey(value => value + 1); window.location.hash = 'scores?q=' + encodeURIComponent(text.trim());};
  const open = value => {
    if (value.song) {
      sessionStorage.setItem('classroom.lastScoreSearch', window.location.hash);
      if (value.type === 'practice') window.dispatchEvent(new CustomEvent('classroom:open-song', {detail: {id: value.song.id}}));
      else window.location.hash = 'song?id=' + encodeURIComponent(value.song.id);
    } else {
      home();
      requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('classroom:login-navigation', {detail: {action: 'open', value}})));
    }
  };
  return <>
    <ClassroomHeader assets={import.meta.env.BASE_URL + 'assets/'} isSearchPage savedCount={saved.length} onHome={home} onResults={search} onCommunity={() => {home(); requestAnimationFrame(() => document.getElementById('community')?.scrollIntoView());}} onOpen={open} checkedIn={checkins.includes(localDay())} onCheckIn={() => setCheckins(items => [...new Set([...items, localDay()])].slice(-1000))}/>
    <SearchBanner term={term} locationHash={hash} songs={songs} onSearch={search} onLink={url => open({type:'link', url})}/>
    <DatabaseSearchResults term={term} resetKey={resetKey} saved={saved} onSave={id => setSaved(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id])} onOpen={open}/>
  </>;
}
