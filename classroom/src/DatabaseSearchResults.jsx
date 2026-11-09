import React, { useEffect, useState } from 'react';
import { Guitar, MagnifyingGlass, MusicNote, MusicNotes, PianoKeys, ListNumbers, BookOpen } from '@phosphor-icons/react';
import { CustomSelect } from './CustomSelect.jsx';
import { SearchScoreCard } from './SearchScoreCard.jsx';
import { useContentSearch } from './useContentSearch.js';
import './database-search.css';

export function DatabaseSearchResults({term, resetKey, saved, onSave, onOpen}) {
  const [type, setType] = useState('全部'), [sort, setSort] = useState('综合推荐');
  const [page, setPage] = useState(0);
  useEffect(() => {setType('全部'); setSort('综合推荐');}, [term, resetKey]);
  useEffect(() => {setPage(0);}, [term, resetKey, type, sort]);
  const search = useContentSearch(term, type, sort, 30, true, page * 30);
  return <main className="score-search-page database-search"><div className="results-shell"><div className="results-main"><section className="results-panel glass-panel" aria-labelledby="results-heading">
    <div className="results-heading-row"><h2 id="results-heading"><MusicNotes size={33}/>搜索结果：<span>找到 <strong>{search.total}</strong> 条 {term && <>“<em>{term}</em>”</>} 的乐谱</span></h2><div className="results-type-tabs" role="group" aria-label="乐谱分类">{[{name:'全部'}, {name:'五线谱',icon:MusicNote}, {name:'简谱',icon:ListNumbers}, {name:'和弦谱',icon:BookOpen}, {name:'吉他谱',icon:Guitar}, {name:'钢琴谱',icon:PianoKeys}].map(({name,icon:Icon}) => <button key={name} className={type === name ? 'selected' : ''} aria-pressed={type === name} onClick={() => setType(name)}>{Icon && <Icon size={23}/>}<span>{name}</span></button>)}</div><div className="sort-select"><span>排序：</span><CustomSelect label="排序方式" value={sort} onChange={setSort} options={['综合推荐','最新上传','最热门','难度从低到高','难度从高到低']}/></div></div>
    {search.loading && <p role="status">正在搜索乐谱…</p>}
    {search.error && <p role="alert">{search.error} <button className="outline-button" onClick={search.retry}>重试</button></p>}
    <div className="results-score-grid">{search.items.map(song => <SearchScoreCard key={song.id} song={song} saved={saved} onSave={onSave} onOpen={onOpen}/>)}</div>
    {search.total > 30 && <div className="sd-load-more"><button disabled={page === 0 || search.loading} onClick={() => setPage(value => value - 1)}>上一页</button><span>第 {page + 1} / {Math.ceil(search.total / 30)} 页</span><button disabled={(page + 1) * 30 >= search.total || search.loading} onClick={() => setPage(value => value + 1)}>下一页</button></div>}
    {!search.loading && !search.error && !search.items.length && <div className="empty-state"><MagnifyingGlass size={38}/><h3>没有找到相关乐谱</h3><p>换个关键词，或清除筛选后再试试。</p><button className="outline-button" onClick={() => {setType('全部'); setSort('综合推荐');}}>清除筛选</button></div>}
  </section></div></div></main>;
}
