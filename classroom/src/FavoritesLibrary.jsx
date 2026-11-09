import React, { useEffect, useRef, useState } from 'react';
import { ChartBar, CheckSquare, CaretDown, CaretRight, DotsThree, Fire, Folder, FolderOpen, GraduationCap, Guitar, Heart, ImageSquare, ListBullets, MusicNotes, PianoKeys, Play, Plus, Star, User, Video, X } from '@phosphor-icons/react';
import { consecutiveDays, usePracticeTime } from './favorites-store.js';
import { contentTypes, folderCover, folderEntries } from './favorite-folders.js';
import { prepareFolderCover } from './favorite-cover.js';
import { useCloudState } from './useCloudState.js';
import { tr, useLanguage } from './language.js';
import './favorites-library.css';

const assets = import.meta.env.BASE_URL + 'assets/';
const typeIcons = { score: MusicNotes, video: Video, course: GraduationCap, work: User };
function scoreImageFallback(event, id, failed = () => {}) {
  const fallback = assets + `score-library/cover-${id}.png`;
  if (['fireworks', 'windmill', 'nocturne', 'secret', 'north', 'simple', 'clock'].includes(id) && event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback;
  else failed();
}

export function FavoritesSidebar({ folders, entries, active, onSelect }) {
  const [more, setMore] = useState(false);
  useEffect(() => { if (folders.findIndex(item => item.id === active) >= 6) setMore(true); }, [active, folders.length]);
  return <div className="favorites-sidebar" id="favorites-folders">
    {(more ? folders : folders.slice(0, 6)).map(item => {
      const Icon = item.id === 'default' ? Heart : item.id === active ? FolderOpen : Folder;
      return <button key={item.id} className="favorites-folder-link" aria-current={active === item.id ? 'page' : undefined} onClick={() => onSelect(item.id)}><Icon size={20}/><strong>{item.system ? tr(item.name) : item.name}</strong><span>{folderEntries(item, entries).length}</span></button>;
    })}
    {folders.length > 6 && <button className="favorites-folders-more" aria-expanded={more} onClick={() => setMore(!more)}>{tr(more ? '收起更多' : '展开更多')}<CaretDown size={13} style={{ transform: more ? 'rotate(180deg)' : undefined }}/></button>}
  </div>;
}

export function MusicFootprint({ uid, count }) {
  useLanguage();
  const sessions = usePracticeTime(uid), [checkins] = useCloudState('checkins', []);
  const seconds = sessions.reduce((sum, item) => sum + item.seconds, 0), streak = consecutiveDays([...checkins, ...sessions.map(item => item.day)]);
  return <section className="music-footprint" aria-label={tr('我的音乐足迹')} title={tr('练习时长从本次更新起记录，仅统计当前浏览器的前台练习时间。')}>
    <h3><ChartBar size={22}/>{tr('我的音乐足迹')}</h3>
    <dl><div><dd>{count}</dd><dt>{tr('收藏总数')}</dt></div><div><dd>{Number((seconds / 3600).toFixed(1))}<small>h</small></dd><dt>{tr('练习时长')}</dt></div><div><dd>{streak}<small>{tr('天')}</small></dd><dt>{tr('坚持学习')}</dt></div></dl>
  </section>;
}

function FolderCard({ item, entries, active, onSelect, onMenu, menuOpen, onEdit }) {
  const cover = folderCover(item, entries), [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [cover?.src]);
  const name = item.system ? tr(item.name) : item.name;
  return <article className={`favorite-playlist${active ? ' is-active' : ''}`}>
    <button className="favorite-playlist-open" onClick={onSelect} aria-label={`${tr('打开收藏夹')}：${name}`} aria-pressed={active}>
      <span className={`favorite-playlist-image${!cover || failed ? ' is-empty' : cover.kind === 'score' ? '' : ' is-art-only'}`}>
        {cover && !failed ? <img src={cover.src} alt="" onError={event => cover.kind === 'score' ? scoreImageFallback(event, entries.find(entry => entry.kind === 'score')?.id, () => setFailed(true)) : setFailed(true)}/> : <Folder size={42} weight="thin" aria-hidden="true"/>}
      </span>
      <strong>{name}</strong><span><MusicNotes size={15}/>{entries.length} {tr(entries.every(entry => entry.kind === 'score') && entries.length ? '首' : '项')}</span>
    </button>
    <button className="favorite-playlist-menu" aria-label={`${tr('收藏夹选项')}：${name}`} aria-expanded={menuOpen} onClick={onMenu}><DotsThree size={22} weight="bold"/></button>
    {menuOpen && <div className="favorite-playlist-popover"><button onClick={onSelect}>{tr('查看收藏夹')}</button>{!item.system && <button onClick={onEdit}>{tr('编辑收藏夹')}</button>}</div>}
  </article>;
}

function useFolderTransition(active) {
  const [displayed, setDisplayed] = useState(active), [phase, setPhase] = useState('is-entering');
  useEffect(() => {
    if (active === displayed) { setPhase('is-entering'); return; }
    if (document.documentElement.dataset.reducedMotion === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayed(active); setPhase(''); return;
    }
    setPhase('is-leaving');
    const timer = setTimeout(() => { setDisplayed(active); setPhase('is-entering'); }, 120);
    return () => clearTimeout(timer);
  }, [active, displayed]);
  return [displayed, phase, () => setPhase('')];
}

export function FavoritesLibrary({ collections, setCollections, entries, folders, playlists, setPlaylists, active, setActive, editor, setEditor, onClose }) {
  useLanguage();
  const [type, setType] = useState('全部'), [expanded, setExpanded] = useState(false);
  const [managing, setManaging] = useState(false), [selected, setSelected] = useState([]), [menu, setMenu] = useState(null), [notice, setNotice] = useState('');
  const [name, setName] = useState(''), [nameError, setNameError] = useState(''), [destination, setDestination] = useState('');
  const [coverImage, setCoverImage] = useState(null), [coverError, setCoverError] = useState(''), [readingCover, setReadingCover] = useState(false);
  const nameInput = useRef(null), coverInput = useRef(null), createButton = useRef(null), coverRequest = useRef(0), gallery = useRef(null);
  const [displayed, phase, finishTransition] = useFolderTransition(active);
  const current = folders.find(item => item.id === displayed) || folders[0];
  const source = folderEntries(current, entries), scoresOnly = current.kind === 'score' || source.length > 0 && source.every(item => item.kind === 'score');
  const visible = source.filter(item => !scoresOnly || type === '全部' || item.notation === type);
  useEffect(() => { setSelected([]); setManaging(false); setType('全部'); setMenu(null); }, [active]);
  useEffect(() => {
    if (folders.findIndex(item => item.id === active) >= 5) setExpanded(true);
  }, [active, folders.length]);
  useEffect(() => {
    const container = gallery.current;
    const reveal = () => {
      const card = container?.querySelector('.favorite-playlist.is-active');
      if (!card || container.scrollWidth <= container.clientWidth) return;
      const bounds = container.getBoundingClientRect(), item = card.getBoundingClientRect();
      if (item.left >= bounds.left && item.right <= bounds.right) return;
      container.scrollTo({ left: container.scrollLeft + item.left - bounds.left - 3, behavior: 'auto' });
    };
    const frame = requestAnimationFrame(reveal), observer = new ResizeObserver(reveal);
    if (container) observer.observe(container);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [active, expanded, folders.length]);
  useEffect(() => {
    if (!editor) return;
    const folder = playlists.find(item => item.id === editor.id);
    setName(folder?.name || ''); setCoverImage(folder?.coverImage || null); setNameError(''); setCoverError(''); setReadingCover(false);
    requestAnimationFrame(() => nameInput.current?.focus());
    return () => { coverRequest.current++; };
  }, [editor]);
  useEffect(() => {
    const dismiss = event => { if (!event.target.closest('.favorite-playlist')) setMenu(null); };
    document.addEventListener('pointerdown', dismiss); return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const chooseCover = async event => {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    const request = ++coverRequest.current; setReadingCover(true); setCoverError('');
    try { const image = await prepareFolderCover(file); if (request === coverRequest.current) setCoverImage(image); }
    catch (error) { if (request === coverRequest.current) setCoverError(error.message); }
    finally { if (request === coverRequest.current) setReadingCover(false); }
  };
  const open = (item, preview = false) => {
    if (item.kind !== 'score') {
      if (!item.url) { setNotice(tr('这个收藏暂时没有可打开的链接。')); return; }
      onClose(); window.location.assign(item.url); return;
    }
    onClose();
    if (preview) { sessionStorage.setItem('classroom.lastScoreSearch', window.location.hash); window.location.hash = `song?id=${encodeURIComponent(item.id)}`; }
    else requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('classroom:open-song', { detail: { id: item.id } })));
  };
  const browse = () => { onClose(); if (!window.location.hash.startsWith('#scores')) window.location.hash = 'scores?q='; };
  const closeEditor = () => { coverRequest.current++; setEditor(null); requestAnimationFrame(() => createButton.current?.focus()); };
  const saveFolder = event => {
    event.preventDefault(); if (readingCover) return;
    const value = name.trim();
    if (!value) { setNameError('请输入收藏夹名称。'); return; }
    if (folders.some(item => item.name === value && item.id !== editor?.id)) { setNameError('这个名称已经存在，请换一个名称。'); return; }
    if (!editor.id && playlists.length >= 100) { setNameError('收藏夹数量已达到上限。'); return; }
    let result;
    if (editor.id) result = setPlaylists(items => items.map(item => item.id === editor.id ? { ...item, name: value, coverImage } : item));
    else { result = setPlaylists(items => [...items, { id: `folder-${crypto.randomUUID()}`, name: value, coverImage, items: [] }]); setExpanded(true); }
    setNotice(tr(result?.persisted === false ? '浏览器空间不足，收藏夹仅保留在本次会话。' : editor.id ? '收藏夹已保存。' : '收藏夹已创建，可通过批量管理添加内容。')); closeEditor();
  };
  const toggleSelected = key => setSelected(items => items.includes(key) ? items.filter(item => item !== key) : [...items, key]);
  const remove = keys => {
    const removed = {};
    for (const kind of contentTypes.map(item => item.id)) {
      const ids = new Set(keys.filter(key => key.startsWith(kind + ':')).map(key => key.slice(kind.length + 1)));
      if (!ids.size) continue;
      const values = collections[kind];
      removed[kind] = values.filter(item => ids.has(kind === 'score' ? item : item.id));
      setCollections[kind](items => items.filter(item => !ids.has(kind === 'score' ? item : item.id)));
    }
    setSelected([]);
    setNotice(<>{tr('已取消收藏。')}<button onClick={() => {
      for (const [kind, values] of Object.entries(removed)) setCollections[kind](items => [...items, ...values.filter(value => !items.some(item => (kind === 'score' ? item : item.id) === (kind === 'score' ? value : value.id)))]);
      setNotice(tr('已恢复收藏。'));
    }}>{tr('撤销')}</button></>);
  };
  const addToFolder = () => {
    setPlaylists(items => items.map(item => item.id === destination ? { ...item, items: [...new Set([...item.items, ...selected])] } : item));
    setNotice(tr('已添加到收藏夹。')); setSelected([]);
  };
  return <div className="favorites-library" onKeyDown={event => {
    if (event.key === 'Escape' && (editor || menu || managing)) { event.preventDefault(); event.stopPropagation(); if (editor) closeEditor(); else if (menu) setMenu(null); else { setManaging(false); setSelected([]); } }
  }}>
    <div className="favorites-topline"><div className="favorites-top-actions"><button className="favorites-manage" aria-pressed={managing} disabled={!source.length || phase === 'is-leaving'} onClick={() => { setManaging(!managing); setSelected([]); }}><CheckSquare size={17}/>{tr(managing ? '完成管理' : '批量管理')}</button><button className="favorites-create" ref={createButton} onClick={() => setEditor({})}><Plus size={24}/>{tr('创建收藏夹')}</button></div></div>
    {editor && <form className="favorites-editor" onSubmit={saveFolder} aria-label={tr(editor.id ? '编辑收藏夹' : '创建收藏夹')}>
      <label htmlFor="favorite-folder-name">{tr('收藏夹名称')}</label><input id="favorite-folder-name" ref={nameInput} maxLength={30} placeholder={tr('输入收藏夹名称')} value={name} onChange={event => { setName(event.target.value); setNameError(''); }} aria-invalid={!!nameError} aria-describedby={nameError ? 'favorite-folder-error' : undefined}/>
      <div className="favorites-cover-editor" aria-busy={readingCover}><span className="favorites-cover-preview">{coverImage ? <img src={coverImage} alt={tr('收藏夹封面预览')}/> : <ImageSquare size={30}/>}</span><div><strong>{tr('封面图片（可选）')}</strong><p>{tr('未上传时，使用收藏夹内第一首乐谱的图片。')}</p><div className="favorites-cover-actions"><button type="button" disabled={readingCover} onClick={() => coverInput.current?.click()}>{tr(readingCover ? '正在读取…' : coverImage ? '更换图片' : '上传图片')}</button>{coverImage && <button type="button" disabled={readingCover} onClick={() => { setCoverImage(null); setCoverError(''); }}>{tr('移除封面')}</button>}</div></div><input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label={tr('选择收藏夹封面')} onChange={chooseCover} hidden/>{coverError && <p className="favorites-cover-error" role="alert">{tr(coverError)}</p>}</div>
      <div className="favorites-editor-actions"><button className="favorites-create" type="submit" disabled={readingCover}>{tr('保存')}</button><button type="button" onClick={closeEditor}>{tr('取消')}</button></div>{nameError && <p id="favorite-folder-error" role="alert">{tr(nameError)}</p>}
    </form>}
    {notice && <div className="favorites-notice" role="status">{notice}<button aria-label={tr('关闭提示')} onClick={() => setNotice('')}><X size={15}/></button></div>}
    <section className="favorites-playlists-section" aria-labelledby="favorite-playlists-heading">
      <div className="favorites-section-heading"><h3 id="favorite-playlists-heading"><ListBullets size={27}/>{tr('我的收藏夹')}<small>{tr('共')} {folders.length} {tr('个')}</small></h3>{folders.length > 5 && <button className="favorites-section-more" onClick={() => setExpanded(!expanded)}>{tr(expanded ? '收起收藏夹' : '查看全部')}<CaretRight size={16}/></button>}</div>
      <div className="favorites-playlists" ref={gallery}>{(expanded ? folders : folders.slice(0, 5)).map(item => <FolderCard key={item.id} item={item} entries={folderEntries(item, entries)} active={item.id === active} onSelect={() => { setActive(item.id); setMenu(null); }} onMenu={() => setMenu(menu === item.id ? null : item.id)} menuOpen={menu === item.id} onEdit={() => { setEditor({ id: item.id }); setMenu(null); }}/>)}</div>
    </section>
    <section key={current.id} className={`favorites-scores-section favorites-folder-content ${phase}`} aria-labelledby="favorite-scores-heading" aria-busy={phase === 'is-leaving'} onAnimationEnd={event => { if (event.target === event.currentTarget && phase === 'is-entering') finishTransition(); }}>
      <div className="favorites-section-heading favorites-scores-heading"><h3 id="favorite-scores-heading"><MusicNotes size={29}/>{current.id === 'default' ? tr(scoresOnly ? '最近收藏的乐谱' : '最近收藏') : current.system ? tr(current.name) : current.name}<small>{tr('共')} {source.length} {tr(scoresOnly ? '首' : '项')}</small></h3>{scoresOnly && <><div className="favorites-score-filters" role="group" aria-label={tr('收藏乐谱类型')}>{['全部', '五线谱', '简谱', '和弦谱'].map(item => <button key={item} aria-pressed={type === item} onClick={() => { setType(item); setSelected([]); }}>{tr(item)}</button>)}</div><button className="favorites-section-more favorites-more-scores" onClick={browse}>{tr('更多乐谱')}<CaretRight size={16}/></button></>}</div>
      {managing && <div className="favorites-batch"><label><input type="checkbox" checked={visible.length > 0 && visible.every(item => selected.includes(item.key))} disabled={!visible.length} onChange={event => setSelected(event.target.checked ? visible.map(item => item.key) : [])}/>{tr('全选')}</label><span>{tr('已选择')} {selected.length}</span><select aria-label={tr('添加到收藏夹')} value={destination} disabled={!playlists.length} onChange={event => setDestination(event.target.value)}><option value="">{tr('选择收藏夹')}</option>{playlists.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button disabled={!selected.length || !destination} onClick={addToFolder}>{tr('添加到收藏夹')}</button>{!current.system && <button disabled={!selected.length} onClick={() => { setPlaylists(items => items.map(item => item.id === current.id ? { ...item, items: item.items.filter(key => !selected.includes(key)) } : item)); setSelected([]); setNotice(tr('已从收藏夹移除，仍保留在默认收藏。')); }}>{tr('移出收藏夹')}</button>}<button disabled={!selected.length} onClick={() => remove(selected)}>{tr('取消收藏')}</button></div>}
      {visible.length ? <div className="favorites-score-grid">{visible.map((item,index) => <article className="favorite-score-card" key={item.key} style={{ '--favorite-order': Math.min(index,7) }}>
        <button className={`favorite-score-cover${item.kind !== 'score' ? ' favorite-media-cover' : ''}`} onClick={() => managing ? toggleSelected(item.key) : open(item)} aria-label={`${tr(managing ? '选择' : '打开')}《${item.title}》`}>{item.image ? <img src={item.image} alt={`${item.title}${tr(item.kind === 'score' ? '插画与乐谱' : '封面')}`} onError={event => item.kind === 'score' && scoreImageFallback(event, item.id)}/> : React.createElement(typeIcons[item.kind], { size: 38 })}{item.kind === 'score' && ['star', 'sunny'].includes(item.id) && <span className={`favorite-score-badge ${item.id === 'sunny' ? 'is-new' : ''}`}>{item.id === 'star' ? <Fire size={13} weight="fill"/> : <Star size={13} weight="fill"/>}{tr(item.id === 'star' ? '热门' : '新上')}</span>}</button>
        {managing && <label className="favorite-score-select"><input type="checkbox" aria-label={`${tr('选择')}《${item.title}》`} checked={selected.includes(item.key)} onChange={() => toggleSelected(item.key)}/></label>}
        <div className="favorite-score-info"><div className="favorite-score-title"><h4><button onClick={() => open(item)}>{item.title}</button></h4><button className="favorite-score-heart" aria-label={`${tr('取消收藏')}《${item.title}》`} onClick={() => remove([item.key])}><Heart size={19}/></button></div><p>{item.artist || tr(contentTypes.find(type => type.id === item.kind).name)}</p>{item.kind === 'score' ? <><div className="favorite-score-meta"><span className={`favorite-instrument ${item.instrument === '吉他' ? 'is-guitar' : ''}`}>{item.instrument === '钢琴' ? <PianoKeys size={13}/> : <Guitar size={13}/>} {tr(item.instrument)}</span><span className="favorite-score-level" aria-label={`${tr('难度')}：${item.level}/5`}>{tr('难度')}：{Array.from({ length: 5 }, (_, index) => <Star key={index} size={12} weight={index < item.level ? 'fill' : 'regular'}/>)}</span></div><div className="favorite-score-actions"><button onClick={() => open(item, true)}><Play size={12}/>{tr('预览')}</button><button onClick={() => open(item)}>{tr('开始练习')}</button></div></> : <div className="favorite-score-actions favorite-media-actions"><button onClick={() => open(item)}>{tr({ video: '查看视频', course: '查看课程', work: '查看作品' }[item.kind])}<CaretRight size={14}/></button></div>}</div>
      </article>)}</div> : <div className="favorites-empty"><FolderOpen size={37}/><h4>{tr(type !== '全部' ? '这个分类还没有乐谱' : current.id === 'default' ? '把喜欢的旋律留在这里' : '收藏夹还没有内容')}</h4><p>{tr(current.system ? '收藏乐谱、视频或课程后，会自动按类型归档。' : '在默认收藏中使用批量管理，将喜欢的内容添加到这个收藏夹。')}</p><button onClick={current.system ? browse : () => setActive('default')}>{tr(current.system ? '发现乐谱' : '前往默认收藏')}<CaretRight size={16}/></button></div>}
    </section>
  </div>;
}
