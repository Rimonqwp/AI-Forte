import React, { useState } from 'react';
import { ArrowRight, BookOpen, ClockCounterClockwise, Heart, MagnifyingGlass, X } from '@phosphor-icons/react';
import { useCloudState } from './useCloudState.js';
import { useScoreHistory } from './score-history.js';
import { songCatalog, versions } from './library-catalog.js';
import { tr, useLanguage } from './language.js';
import { RecentBrowsing } from './RecentBrowsing.jsx';

export function SettingsLibrary({ section, user, onClose }) {
  const language = useLanguage();
  const [favorites, setFavorites] = useCloudState('favorites', []);
  const [arrangements, setArrangements] = useCloudState('practice-favorites', [], 'classroom.practice.saved');
  const [recent, setRecent] = useScoreHistory(user.uid, 'recent');
  const [practiced] = useScoreHistory(user.uid, 'practiced');
  const [query, setQuery] = useState(''), [scoreTab, setScoreTab] = useState('saved');
  const lookup = (songId, versionId) => {
    const song = songCatalog.find(item => item.id === songId);
    const version = versionId && versions.find(item => item.id === versionId);
    return song && (!versionId || version) ? { song, version, id: versionId ? `${songId}:${versionId}` : songId } : null;
  };
  const savedVersions = arrangements.map(id => lookup(...id.split(':'))).filter(Boolean);
  const practicedVersions = practiced.map(item => ({ ...lookup(item.songId, item.versionId), viewedAt: item.viewedAt })).filter(item => item.song);
  const entries = section === 'favorites' ? [...favorites].reverse().map(id => lookup(id)).filter(Boolean)
    : section === 'recent' ? recent.map(item => ({ ...lookup(item.songId), viewedAt: item.viewedAt })).filter(item => item.song)
      : scoreTab === 'saved' ? savedVersions : practicedVersions;
  const needle = query.trim().toLocaleLowerCase();
  const visible = entries.filter(({ song, version }) => `${song.title} ${song.artist} ${version?.instrument || ''} ${version?.author || ''} ${version?.subtitle || ''}`.toLocaleLowerCase().includes(needle));
  const open = ({ song, version }) => {
    onClose();
    requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('classroom:open-song', { detail: { id: song.id, versionId: version?.id } })));
  };
  const browse = () => { onClose(); if (!window.location.hash.startsWith('#scores')) window.location.hash = 'scores?q='; };
  const formatRecentVisit = timestamp => {
    const date = new Date(timestamp), today = new Date(), yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const sameDay = other => date.getFullYear() === other.getFullYear() && date.getMonth() === other.getMonth() && date.getDate() === other.getDate();
    const day = sameDay(today) ? tr('今天') : sameDay(yesterday) ? tr('昨天') : new Intl.DateTimeFormat(language, { ...(date.getFullYear() !== today.getFullYear() && { year: 'numeric' }), month: 'short', day: 'numeric' }).format(date);
    return `${day} ${new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(date)}`;
  };
  const emptyTitle = needle ? '没有找到匹配的乐谱' : section === 'favorites' ? '把喜欢的旋律留在这里' : section === 'recent' ? '从一首喜欢的歌开始' : scoreTab === 'saved' ? '收藏一个适合你的编配版本' : '你的练习足迹会出现在这里';
  if (section === 'recent') return <RecentBrowsing user={user} entries={entries} visible={visible} query={query} setQuery={setQuery} setRecent={setRecent} favorites={favorites} setFavorites={setFavorites} open={open} browse={browse} formatVisit={formatRecentVisit}/>;
  return <>
    {section === 'scores' && <div className="settings-library-tabs" role="group" aria-label={tr('我的乐谱分类')}><button aria-pressed={scoreTab === 'saved'} onClick={() => setScoreTab('saved')}>{tr('收藏的编配')}（{savedVersions.length}）</button><button aria-pressed={scoreTab === 'practiced'} onClick={() => setScoreTab('practiced')}>{tr('最近练习')}（{practicedVersions.length}）</button></div>}
    <div className="settings-library-toolbar"><label className="settings-library-search"><MagnifyingGlass size={17}/><input aria-label={tr('搜索我的乐谱')} placeholder={tr('搜索歌名、歌手或编配')} value={query} onChange={event => setQuery(event.target.value)}/></label><span className="settings-library-total">{visible.length} {tr('首乐谱')}</span>{section === 'recent' && recent.length > 0 && <button className="settings-text-button" onClick={() => setRecent(() => [])}>{tr('清空浏览记录')}</button>}</div>
    {visible.length ? <div className={`settings-score-list${section === 'recent' ? ' settings-recent-list' : ''}`}>{visible.map(entry => {
      const { song, version } = entry, saved = version ? arrangements.includes(entry.id) : favorites.includes(song.id);
      return <article className={`settings-score-row${section === 'recent' ? ' settings-recent-row' : ''}`} key={entry.id}>
        <button className="settings-score-open" onClick={() => open(entry)} aria-label={`${tr('打开')}《${song.title}》${version ? version.subtitle : ''}`}><img src={import.meta.env.BASE_URL + `assets/score-${song.id}.png`} alt=""/><span className="settings-score-copy"><strong>{song.title}</strong><small>{song.artist}{version && ` · ${tr(version.instrument)} · ${version.author}`}</small>{version && <small>{version.subtitle}</small>}{entry.viewedAt && section !== 'recent' && <em>{new Intl.DateTimeFormat(language, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(entry.viewedAt)}</em>}</span></button>
        {section === 'recent' && <time className="settings-recent-time" dateTime={new Date(entry.viewedAt).toISOString()} title={new Intl.DateTimeFormat(language, { dateStyle: 'long', timeStyle: 'short' }).format(entry.viewedAt)}>{formatRecentVisit(entry.viewedAt)}</time>}
        <button className="settings-score-favorite" aria-label={`${tr(saved ? '取消收藏' : '收藏')}《${song.title}》${version ? version.subtitle : ''}`} aria-pressed={saved} onClick={() => {
          const update = version ? setArrangements : setFavorites, id = version ? entry.id : song.id;
          update(items => items.includes(id) ? items.filter(value => value !== id) : [...items, id]);
        }}><Heart size={section === 'recent' ? 28 : 19} weight={saved ? 'fill' : 'regular'}/></button>
        {section === 'recent' && <button className="settings-recent-view" onClick={() => open(entry)} aria-label={`${tr('查看乐谱')}《${song.title}》`}>{tr('查看乐谱')}<ArrowRight size={21} aria-hidden="true"/></button>}
        {section === 'recent' && <button className="settings-score-favorite settings-recent-remove" title={tr('移除浏览记录')} aria-label={`${tr('移除浏览记录')}《${song.title}》`} onClick={() => setRecent(items => items.filter(item => item.songId !== song.id))}><X size={17}/></button>}
      </article>;
    })}</div> : <div className="settings-empty">{section === 'favorites' ? <Heart size={34}/> : section === 'recent' ? <ClockCounterClockwise size={34}/> : <BookOpen size={34}/>}<h3>{tr(emptyTitle)}</h3><p>{tr(needle ? '试试其他歌名、歌手或编配关键词。' : section === 'favorites' ? '点击乐谱上的爱心，喜欢的歌曲就会出现在这里。' : section === 'recent' ? '打开过的歌曲会按最近浏览时间排列在这里。' : '在歌曲详情中收藏编配，或打开一个版本开始练习。')}</p>{!needle && <button onClick={browse}>{tr('发现乐谱')}</button>}</div>}
    <p className="settings-library-note">{tr(section === 'recent' ? '最近浏览仅保存在当前浏览器，最多保留 50 首，按账号分别记录。' : section === 'scores' ? '收藏的编配与账号同步；最近练习保存在当前浏览器。当前谱例为演示内容。' : '这里与你在乐谱列表中的收藏保持一致。')}</p>
  </>;
}
