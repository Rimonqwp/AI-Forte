import React, { useEffect, useRef, useState } from 'react';
import { ChartBar, CheckSquare, CaretDown, CaretRight, DotsThree, Fire, Folder, GraduationCap, Guitar, Heart, ListBullets, MusicNotes, PianoKeys, Play, Plus, Star, User, Video, X } from '@phosphor-icons/react';
import { songCatalog } from './library-catalog.js';
import { consecutiveDays, usePracticeTime } from './favorites-store.js';
import { useCloudState } from './useCloudState.js';
import { tr, useLanguage } from './language.js';
import './favorites-library.css';

const assets = import.meta.env.BASE_URL + 'assets/';
const metadata = {
  star: ['钢琴', 1, '五线谱'], sunny: ['吉他', 2, '和弦谱'], confession: ['钢琴', 3, '五线谱'], night: ['尤克里里', 2, '和弦谱'],
  castle: ['钢琴', 4, '五线谱'], rice: ['吉他', 3, '和弦谱'], fireworks: ['钢琴', 3, '五线谱'], windmill: ['吉他', 3, '和弦谱'],
  nocturne: ['钢琴', 4, '五线谱'], secret: ['钢琴', 3, '五线谱'], north: ['吉他', 3, '和弦谱'], simple: ['尤克里里', 2, '简谱'], clock: ['钢琴', 4, '五线谱'],
};
const categories = [
  { id: 'default', name: '默认收藏', icon: Heart }, { id: 'piano-category', name: '钢琴练习' },
  { id: 'guitar-category', name: '吉他弹唱' }, { id: 'vocal-category', name: '声乐歌曲' },
  { id: 'competition-category', name: '比赛曲目' }, { id: 'playlists', name: '我的歌单' },
];
const tabs = [{ id: 'scores', label: '乐谱收藏', icon: MusicNotes }, { id: 'videos', label: '视频收藏', icon: Video }, { id: 'courses', label: '课程收藏', icon: GraduationCap }, { id: 'works', label: '作品收藏', icon: User }];
export const favoriteSongs = ids => [...ids].reverse().map(id => {
  const song = songCatalog.find(item => item.id === id), facts = metadata[id];
  return song && facts ? { ...song, instrument: facts[0], level: facts[1], type: facts[2] } : null;
}).filter(Boolean);
function categorySongs(id, songs, playlists) {
  if (id === 'piano-category') return songs.filter(song => song.instrument === '钢琴');
  if (id === 'guitar-category') return songs.filter(song => song.instrument === '吉他');
  if (['vocal-category', 'competition-category'].includes(id)) {
    const name = id === 'vocal-category' ? '声乐歌曲' : '比赛曲目';
    const ids = playlists.filter(item => item.name === name).flatMap(item => item.songs);
    return songs.filter(song => ids.includes(song.id));
  }
  const playlist = playlists.find(item => item.id === id);
  return playlist ? songs.filter(song => playlist.songs.includes(song.id)) : songs;
}

export function FavoritesSidebar({ favorites, playlists, active, onSelect, onCreate }) {
  const [more, setMore] = useState(false);
  const songs = favoriteSongs(favorites);
  return <div className="favorites-sidebar" id="favorites-folders">
    <div className="favorites-sidebar-heading"><Folder size={22}/><strong>{tr('我的收藏夹')}</strong><button aria-label={tr('新建收藏夹')} onClick={onCreate}><Plus size={16}/></button></div>
    {categories.map(item => { const Icon = item.icon || Folder; return <button key={item.id} className="favorites-folder-link" aria-current={active === item.id ? 'page' : undefined} onClick={() => onSelect(item.id)}><Icon size={20}/><strong>{tr(item.name)}</strong><span>{item.id === 'playlists' ? playlists.length + 1 : categorySongs(item.id, songs, playlists).length}</span></button>; })}
    {more && playlists.map(item => <button key={item.id} className="favorites-folder-link favorites-custom-link" aria-current={active === item.id ? 'page' : undefined} onClick={() => onSelect(item.id)}><Folder size={18}/><strong>{tr(item.name)}</strong><span>{songs.filter(song => item.songs.includes(song.id)).length}</span></button>)}
    <button className="favorites-folders-more" aria-expanded={more} onClick={() => setMore(!more)}>{tr(more ? '收起更多' : '展开更多')}<CaretDown size={13} style={{ transform: more ? 'rotate(180deg)' : undefined }}/></button>
  </div>;
}

export function MusicFootprint({ uid, favorites }) {
  useLanguage();
  const sessions = usePracticeTime(uid), [checkins] = useCloudState('checkins', []);
  const seconds = sessions.reduce((sum, item) => sum + item.seconds, 0), streak = consecutiveDays([...checkins, ...sessions.map(item => item.day)]);
  return <section className="music-footprint" aria-label={tr('我的音乐足迹')} title={tr('练习时长从本次更新起记录，仅统计当前浏览器的前台练习时间。')}>
    <h3><ChartBar size={22}/>{tr('我的音乐足迹')}</h3>
    <dl><div><dd>{favorites.length}</dd><dt>{tr('收藏总数')}</dt></div><div><dd>{Number((seconds / 3600).toFixed(1))}<small>h</small></dd><dt>{tr('练习时长')}</dt></div><div><dd>{streak}<small>{tr('天')}</small></dd><dt>{tr('坚持学习')}</dt></div></dl>
  </section>;
}

function PlaylistCard({ item, count, onSelect, onMenu, menuOpen, onRename, canRename }) {
  return <article className="favorite-playlist">
    <button className="favorite-playlist-open" onClick={onSelect} aria-label={`${tr('打开歌单')}：${tr(item.name)}`}>
      <span className={`favorite-playlist-image${item.cover === 'piano' ? ' is-art-only' : ''}`}><img src={assets + (item.cover === 'piano' ? 'favorites/piano-morning.png' : item.cover === 'night' ? 'score-night.png' : item.cover === 'sunny' ? 'score-library/cover-sunny-clean.png' : `score-library/cover-${item.cover}.png`)} alt=""/></span>
      <strong>{tr(item.name)}</strong><span><MusicNotes size={15}/>{count} {tr('首')}</span>
    </button>
    <button className="favorite-playlist-menu" aria-label={`${tr('歌单选项')}：${tr(item.name)}`} aria-expanded={menuOpen} onClick={onMenu}><DotsThree size={22} weight="bold"/></button>
    {menuOpen && <div className="favorite-playlist-popover"><button onClick={onSelect}>{tr('查看歌单')}</button>{canRename && <button onClick={onRename}>{tr('重命名')}</button>}</div>}
  </article>;
}

export function FavoritesLibrary({ favorites, setFavorites, playlists, setPlaylists, active, setActive, editor, setEditor, onClose }) {
  useLanguage();
  const [tab, setTab] = useState('scores'), [type, setType] = useState('全部'), [expanded, setExpanded] = useState(false);
  const [managing, setManaging] = useState(false), [selected, setSelected] = useState([]), [menu, setMenu] = useState(null), [notice, setNotice] = useState('');
  const [name, setName] = useState(''), [nameError, setNameError] = useState(''), [destination, setDestination] = useState('');
  const nameInput = useRef(null), createButton = useRef(null);
  const songs = favoriteSongs(favorites), activePlaylist = playlists.find(item => item.id === active);
  const source = categorySongs(active, songs, playlists), visible = source.filter(song => type === '全部' || song.type === type);
  const allPlaylists = [{ id: 'default', name: '默认收藏', cover: 'confession', songs: favorites }, ...playlists];
  useEffect(() => { setSelected([]); setManaging(false); setTab('scores'); setType('全部'); setNotice(''); }, [active]);
  useEffect(() => { if (editor) { setName(editor.id ? playlists.find(item => item.id === editor.id)?.name || '' : ''); setNameError(''); requestAnimationFrame(() => nameInput.current?.focus()); } }, [editor]);
  useEffect(() => {
    const dismiss = event => { if (!event.target.closest('.favorite-playlist')) setMenu(null); };
    document.addEventListener('pointerdown', dismiss); return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  const open = (song, preview = false) => {
    onClose();
    if (preview) { sessionStorage.setItem('classroom.lastScoreSearch', window.location.hash); window.location.hash = `song?id=${encodeURIComponent(song.id)}`; }
    else requestAnimationFrame(() => window.dispatchEvent(new CustomEvent('classroom:open-song', { detail: { id: song.id } })));
  };
  const browse = () => { onClose(); if (!window.location.hash.startsWith('#scores')) window.location.hash = 'scores?q='; };
  const closeEditor = () => { setEditor(null); requestAnimationFrame(() => createButton.current?.focus()); };
  const savePlaylist = event => {
    event.preventDefault(); const value = name.trim();
    if (!value) { setNameError('请输入歌单名称。'); return; }
    if (allPlaylists.some(item => item.name === value && item.id !== editor?.id)) { setNameError('这个名称已经存在，请换一个名称。'); return; }
    if (editor?.id) setPlaylists(items => items.map(item => item.id === editor.id ? { ...item, name: value } : item));
    else {
      const id = `playlist-${crypto.randomUUID()}`;
      setPlaylists(items => [...items, { id, name: value, cover: 'confession', songs: [] }]); setExpanded(true);
    }
    setNotice(tr(editor?.id ? '歌单名称已保存。' : '歌单已创建，可通过批量管理添加乐谱。')); closeEditor();
  };
  const toggleSelected = id => setSelected(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  const remove = ids => {
    const before = [...favorites];
    setFavorites(items => items.filter(id => !ids.includes(id))); setSelected([]);
    setNotice(<>{tr('已取消收藏。')}<button onClick={() => { setFavorites(items => [...new Set([...items, ...before.filter(id => ids.includes(id))])]); setNotice(tr('已恢复收藏。')); }}>{tr('撤销')}</button></>);
  };
  const addToPlaylist = () => {
    setPlaylists(items => items.map(item => item.id === destination ? { ...item, songs: [...new Set([...item.songs, ...selected])] } : item));
    setNotice(tr('已添加到歌单。')); setSelected([]);
  };
  const heading = activePlaylist?.name || categories.find(item => item.id === active)?.name;
  return <div className="favorites-library" onKeyDown={event => {
    if (event.key === 'Escape' && (editor || menu || managing)) { event.preventDefault(); event.stopPropagation(); if (editor) closeEditor(); else if (menu) setMenu(null); else { setManaging(false); setSelected([]); } }
  }}>
    <div className="favorites-topline"><div className="favorites-tabs" role="group" aria-label={tr('收藏分类')}>
      {tabs.map(item => <button key={item.id} aria-pressed={tab === item.id} onClick={() => { setTab(item.id); setManaging(false); }}><item.icon size={27}/>{tr(item.label)}</button>)}
    </div><div className="favorites-top-actions"><button className="favorites-manage" aria-pressed={managing} disabled={tab !== 'scores' || !songs.length} onClick={() => { setManaging(!managing); setSelected([]); }}><CheckSquare size={17}/>{tr(managing ? '完成管理' : '批量管理')}</button><button className="favorites-create" ref={createButton} onClick={() => setEditor({})}><Plus size={24}/>{tr('新建歌单')}</button></div></div>
    {editor && <form className="favorites-editor" onSubmit={savePlaylist} aria-label={tr(editor.id ? '重命名歌单' : '新建歌单')}>
      <label htmlFor="favorite-playlist-name">{tr(editor.id ? '重命名歌单' : '新建歌单')}</label><input id="favorite-playlist-name" ref={nameInput} maxLength={30} placeholder={tr('输入歌单名称')} value={name} onChange={event => { setName(event.target.value); setNameError(''); }} aria-invalid={!!nameError} aria-describedby="favorite-playlist-error"/>
      <button className="favorites-create" type="submit">{tr('保存')}</button><button type="button" onClick={closeEditor} aria-label={tr('取消编辑歌单')}><X size={20}/></button>{nameError && <p id="favorite-playlist-error" role="alert">{tr(nameError)}</p>}
    </form>}
    {notice && <div className="favorites-notice" role="status">{notice}<button aria-label={tr('关闭提示')} onClick={() => setNotice('')}><X size={15}/></button></div>}
    {tab === 'scores' ? <>
      <section className="favorites-playlists-section" aria-labelledby="favorite-playlists-heading">
        <div className="favorites-section-heading"><h3 id="favorite-playlists-heading"><ListBullets size={27}/>{tr('我的歌单 / 合集')}<small>{tr('共')} {allPlaylists.length} {tr('个')}</small></h3><button className="favorites-section-more" onClick={() => setExpanded(!expanded)}>{tr(expanded ? '收起歌单' : '查看全部')}<CaretRight size={16}/></button></div>
        <div className="favorites-playlists">{(expanded ? allPlaylists : allPlaylists.slice(0, 5)).map(item => <PlaylistCard key={item.id} item={item} count={songs.filter(song => item.songs.includes(song.id)).length} onSelect={() => { setActive(item.id); setMenu(null); }} onMenu={() => setMenu(menu === item.id ? null : item.id)} menuOpen={menu === item.id} canRename={item.id !== 'default'} onRename={() => { setEditor({ id: item.id }); setMenu(null); }}/>)}</div>
      </section>
      {active !== 'playlists' && <section className="favorites-scores-section" aria-labelledby="favorite-scores-heading">
        <div className="favorites-section-heading favorites-scores-heading"><h3 id="favorite-scores-heading"><MusicNotes size={29}/>{tr(active === 'default' ? '最近收藏的乐谱' : heading || '最近收藏的乐谱')}<small>{tr('共')} {source.length} {tr('首')}</small></h3><div className="favorites-score-filters" role="group" aria-label={tr('收藏乐谱类型')}>{['全部', '五线谱', '简谱', '和弦谱'].map(item => <button key={item} aria-pressed={type === item} onClick={() => { setType(item); setSelected([]); }}>{tr(item)}</button>)}</div><button className="favorites-section-more favorites-more-scores" onClick={browse}>{tr('更多乐谱')}<CaretRight size={16}/></button></div>
        {managing && <div className="favorites-batch"><label><input type="checkbox" checked={visible.length > 0 && visible.every(song => selected.includes(song.id))} disabled={!visible.length} onChange={event => setSelected(event.target.checked ? visible.map(song => song.id) : [])}/>{tr('全选')}</label><span>{tr('已选择')} {selected.length}</span><select aria-label={tr('添加到歌单')} value={destination} onChange={event => setDestination(event.target.value)}><option value="">{tr('选择歌单')}</option>{playlists.map(item => <option key={item.id} value={item.id}>{tr(item.name)}</option>)}</select><button disabled={!selected.length || !destination} onClick={addToPlaylist}>{tr('添加到歌单')}</button>{activePlaylist && <button disabled={!selected.length} onClick={() => { setPlaylists(items => items.map(item => item.id === active ? { ...item, songs: item.songs.filter(id => !selected.includes(id)) } : item)); setSelected([]); setNotice(tr('已从歌单移除，仍保留在默认收藏。')); }}>{tr('移出歌单')}</button>}<button disabled={!selected.length} onClick={() => remove(selected)}>{tr('取消收藏')}</button></div>}
        {visible.length ? <div className="favorites-score-grid">{visible.map(song => <article className="favorite-score-card" key={song.id}>
          <button className="favorite-score-cover" onClick={() => managing ? toggleSelected(song.id) : open(song)} aria-label={`${tr(managing ? '选择' : '打开')}《${song.title}》`}><img src={assets + `score-${song.id}.png`} alt={`${song.title}${tr('插画与乐谱')}`} onError={event => {
            const fallback = assets + `score-library/cover-${song.id}.png`;
            if (['fireworks', 'windmill', 'nocturne', 'secret', 'north', 'simple', 'clock'].includes(song.id) && event.currentTarget.getAttribute('src') !== fallback) event.currentTarget.src = fallback;
          }}/>{['star', 'sunny'].includes(song.id) && <span className={`favorite-score-badge ${song.id === 'sunny' ? 'is-new' : ''}`}>{song.id === 'star' ? <Fire size={13} weight="fill"/> : <Star size={13} weight="fill"/>}{tr(song.id === 'star' ? '热门' : '新上')}</span>}</button>
          {managing && <label className="favorite-score-select"><input type="checkbox" aria-label={`${tr('选择')}《${song.title}》`} checked={selected.includes(song.id)} onChange={() => toggleSelected(song.id)}/></label>}
          <div className="favorite-score-info"><div className="favorite-score-title"><h4><button onClick={() => open(song)}>{song.title}</button></h4><button className="favorite-score-heart" aria-label={`${tr('取消收藏')}《${song.title}》`} onClick={() => remove([song.id])}><Heart size={19}/></button></div><p>{song.artist}</p><div className="favorite-score-meta"><span className={`favorite-instrument ${song.instrument === '吉他' ? 'is-guitar' : ''}`}>{song.instrument === '钢琴' ? <PianoKeys size={13}/> : <Guitar size={13}/>} {tr(song.instrument)}</span><span className="favorite-score-level" aria-label={`${tr('难度')}：${song.level}/5`}>{tr('难度')}：{Array.from({ length: 5 }, (_, index) => <Star key={index} size={12} weight={index < song.level ? 'fill' : 'regular'}/>)}</span></div><div className="favorite-score-actions"><button onClick={() => open(song, true)}><Play size={12}/>{tr('预览')}</button><button onClick={() => open(song)}>{tr('开始练习')}</button></div></div>
        </article>)}</div> : <div className="favorites-empty"><Heart size={37}/><h4>{tr(type !== '全部' ? '这个分类还没有乐谱' : active === 'default' ? '把喜欢的旋律留在这里' : '收藏夹还没有乐谱')}</h4><p>{tr(activePlaylist ? '在默认收藏中使用批量管理，将喜欢的乐谱添加到这个歌单。' : '点击乐谱上的爱心，喜欢的歌曲就会出现在这里。')}</p><button onClick={activePlaylist ? () => setActive('default') : browse}>{tr(activePlaylist ? '前往默认收藏' : '发现乐谱')}<CaretRight size={16}/></button></div>}
      </section>}
    </> : <div className="favorites-empty favorites-tab-empty">{React.createElement(tabs.find(item => item.id === tab).icon, { size: 44 })}<h4>{tr({ videos: '还没有收藏的视频', courses: '还没有收藏的课程', works: '还没有收藏的作品' }[tab])}</h4><p>{tr('收藏后，你喜欢的内容会出现在这里。')}</p></div>}
  </div>;
}
