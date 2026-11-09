import { useContentSearch } from './useContentSearch.js';
import { tr, useLanguage } from './language.js';
import React, { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass, Fire, ClockCounterClockwise, MusicNotes, CaretRight, Trash, X, Link } from '@phosphor-icons/react';

const popularSearches = ['小星星', '晴天', '稻香', '告白气球', '夜空中最亮的星'];
const historyKey = 'little-score.search-history.v1';
const normalize = value => value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, '');

export function matchesSong(song, query) {
  return normalize(`${song.title} ${song.artist} ${song.instrument} ${song.instrument}谱 五线谱 简谱 和弦谱 乐谱`).includes(normalize(query));
}

function readHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
    return Array.isArray(saved) ? [...new Set(saved.filter(term => typeof term === 'string' && term.trim() && term.length <= 120))].slice(0, 8) : [];
  } catch {
    return [];
  }
}

function Highlight({ text, query }) {
  const term = query.trim();
  const index = term ? text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase()) : -1;
  if (index < 0) return text;
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + term.length)}</mark>{text.slice(index + term.length)}</>;
}

export function MusicSearch({ query, onQueryChange, songs, onSearch, onLink }) {
  useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState(readHistory);
  const [activeIndex, setActiveIndex] = useState(-1);
  const panel = useRef(null);
  const input = useRef(null);
  const composing = useRef(false);
  const term = query.trim();
  const isLink = /^https?:\/\//i.test(term);
  const search = useContentSearch(term, '全部', '综合推荐', 8, !!term && !isLink);
  const results = !term || isLink ? [] : search.items;

  useEffect(() => {
    try { localStorage.setItem(historyKey, JSON.stringify(history)); } catch { /* Search still works when browser storage is unavailable. */ }
  }, [history]);

  useEffect(() => {
    if (!expanded) return;
    const fitPanel = () => {
      const control = panel.current?.querySelector('.search-control');
      if (!control) return;
      const viewport = window.visualViewport;
      const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
      panel.current.style.setProperty('--search-available-height', `${Math.max(80, visibleBottom - control.getBoundingClientRect().bottom - 22)}px`);
    };
    const dismiss = event => {
      if (!panel.current?.contains(event.target)) setExpanded(false);
    };
    const escape = event => {
      if (event.key === 'Escape' && !event.isComposing) {
        setExpanded(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', escape);
    fitPanel();
    window.addEventListener('resize', fitPanel);
    window.addEventListener('scroll', fitPanel, { passive: true });
    window.visualViewport?.addEventListener('resize', fitPanel);
    window.visualViewport?.addEventListener('scroll', fitPanel);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', fitPanel);
      window.removeEventListener('scroll', fitPanel);
      window.visualViewport?.removeEventListener('resize', fitPanel);
      window.visualViewport?.removeEventListener('scroll', fitPanel);
    };
  }, [expanded]);

  useEffect(() => { setActiveIndex(-1); }, [query]);
  useEffect(() => {
    if (activeIndex >= 0) panel.current?.querySelector(`#music-search-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const submit = value => {
    const next = value.trim();
    setExpanded(false);
    setActiveIndex(-1);
    if (!next) {
      onQueryChange('');
      onSearch('');
      return;
    }
    if (/^https?:\/\//i.test(next)) {
      onLink(next);
      return;
    }
    setHistory(previous => [next, ...previous.filter(item => normalize(item) !== normalize(next))].slice(0, 8));
    onSearch(next);
  };

  const handleKeyDown = event => {
    if (event.nativeEvent.isComposing || composing.current || event.keyCode === 229) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setExpanded(true);
      if (results.length) setActiveIndex(previous => event.key === 'ArrowDown'
        ? (expanded ? previous + 1 : 0) % results.length
        : (!expanded || previous < 0 ? results.length - 1 : (previous - 1 + results.length) % results.length));
    } else if (event.key === 'Enter' && expanded && activeIndex >= 0 && results[activeIndex]) {
      event.preventDefault();
      submit(results[activeIndex].title);
    }
  };

  return <div className="search-panel" ref={panel} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
  }}>
    <h2><MagnifyingGlass size={32}/>{tr("搜索你想学习的歌曲或乐谱")}</h2>
    <div className="hot-search"><b><Fire size={18} weight="duotone"/>{tr("热门搜索：")}</b>{popularSearches.map(text => <button key={text} onClick={() => submit(text)}>{text}</button>)}</div>
    <div className="search-control">
      <form className={`search-form${expanded ? ' is-expanded' : ''}`} onClick={() => setExpanded(true)} onSubmit={event => {
        event.preventDefault();
        if (!composing.current) submit(query);
      }}>
        <MagnifyingGlass size={25}/>
        <input ref={input} id="music-search" value={query} onChange={event => {
          onQueryChange(event.target.value);
          setActiveIndex(-1);
          setExpanded(true);
        }} onFocus={() => setExpanded(true)} onKeyDown={handleKeyDown}
          onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
          placeholder={tr("搜索歌曲、歌手、谱子，或粘贴音乐 URL...")} autoComplete="off" spellCheck={false}
          aria-label={tr("搜索歌曲或乐谱")} role="combobox" aria-autocomplete="list" aria-expanded={expanded}
          aria-controls={expanded && term ? 'music-search-results' : undefined} aria-activedescendant={expanded && activeIndex >= 0 ? `music-search-option-${activeIndex}` : undefined}/>
        {query && <button type="button" className="search-clear" aria-label={tr("清空搜索内容")} onClick={() => {
          onQueryChange('');
          input.current?.focus();
        }}><X size={15}/></button>}
        <button className="coral-button" type="submit">{tr("搜索")}</button>
      </form>
      {expanded && <div className="search-suggestions" aria-label={tr("搜索建议")}>
        <section className="suggestion-section" aria-labelledby="popular-search-heading">
          <div className="suggestion-heading"><h3 id="popular-search-heading"><Fire size={17} weight="duotone"/>{tr("热门搜索")}</h3><button className="suggestion-close" aria-label={tr("关闭搜索建议")} onClick={() => setExpanded(false)}><X size={17}/></button></div>
          <div className="suggestion-chips popular-chips">{popularSearches.map((text, index) => <button key={text} onClick={() => submit(text)}><span>{index + 1}</span>{text}</button>)}</div>
        </section>
        <section className="suggestion-section" aria-labelledby="search-history-heading">
          <div className="suggestion-heading"><h3 id="search-history-heading"><ClockCounterClockwise size={17}/>{tr("搜索历史")}</h3>{history.length > 0 && <button className="clear-history" onClick={() => {
            setHistory([]);
            input.current?.focus();
          }}><Trash size={14}/>{tr("清空")}</button>}</div>
          {history.length ? <div className="suggestion-chips history-chips">{history.map(text => <span className="history-chip" key={text}><button className="history-term" onClick={() => submit(text)} title={text}>{text}</button><button className="remove-history" aria-label={`删除搜索记录：${text}`} onClick={() => {
            setHistory(previous => previous.filter(item => item !== text));
            input.current?.focus();
          }}><X size={12}/></button></span>)}</div> : <p className="search-history-empty">{tr("还没有搜索记录，搜一首喜欢的歌吧")}</p>}
        </section>
        {term && <section className="suggestion-section matching-section" aria-labelledby="matching-search-heading">
          <div className="suggestion-heading"><h3 id="matching-search-heading"><MusicNotes size={17}/>{tr('匹配乐谱')}</h3><span className="match-count" role="status">{isLink ? tr('音乐链接') : search.loading ? tr('搜索中…') : `${search.total} ${tr('首乐谱')}`}</span></div>
          <div id="music-search-results" role="listbox" aria-labelledby="matching-search-heading">
            {results.map((song, index) => <button key={song.id} id={`music-search-option-${index}`} type="button" role="option" aria-selected={activeIndex === index}
              className={`search-result${activeIndex === index ? ' is-active' : ''}`} onClick={() => submit(song.title)}>
              <span className="search-result-icon"><MusicNotes size={19} weight="duotone"/></span>
              <span className="search-result-text"><strong><Highlight text={tr(song.title)} query={query}/></strong><small><Highlight text={song.artist} query={query}/></small></span>
              <CaretRight size={14}/>
            </button>)}
          </div>
          {isLink ? <button className="search-link-action" onClick={() => submit(term)}><Link size={19}/><span>{tr("已识别音乐链接")}<small>{tr("继续前往旋律转谱工作台")}</small></span><CaretRight size={16}/></button> : !search.loading && !search.error && !results.length && <p className="search-no-results" role="status">{tr("没有找到相关乐谱，试试其他歌曲名、歌手或乐器")}</p>}
          {search.error && <p role="alert">{search.error}<button type="button" onClick={search.retry}>重试</button></p>}
        </section>}
      </div>}
    </div>
    <p className="search-help">{tr("支持歌曲名、歌手、乐器或粘贴音乐链接（如 YouTube / Bilibili 等）")}</p>
  </div>;
}
