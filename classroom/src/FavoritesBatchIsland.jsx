import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { FolderPlus, Heart, MinusCircle, Plus, X } from '@phosphor-icons/react';
import { CustomSelect } from './CustomSelect.jsx';
import { tr } from './language.js';
import './favorites-batch-island.css';

export function FavoritesBatchIsland({ open, count, allSelected, partiallySelected, hasItems, onSelectAll, playlists, destination, setDestination, onAdd, onRemove, onUnsave, onCreate, onExit }) {
  const [present, setPresent] = useState(open), [closing, setClosing] = useState(false);
  const island = useRef(null), selectAll = useRef(null);
  useEffect(() => {
    if (open) { setPresent(true); setClosing(false); return; }
    if (!present) return;
    setClosing(true);
    const timer = setTimeout(() => setPresent(false), 160);
    return () => clearTimeout(timer);
  }, [open, present]);
  useLayoutEffect(() => {
    if (!present) return;
    const node = island.current;
    // The top layer escapes the scrolling/animated settings content, while the
    // controls remain descendants of the dialog for its existing focus trap.
    node.showPopover?.();
    const place = () => {
      const viewport = window.visualViewport;
      const keyboardInset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      node.style.setProperty('--island-bottom', `${20 + keyboardInset}px`);
    };
    place();
    window.addEventListener('resize', place);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      window.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
      if (node.isConnected && node.matches(':popover-open')) node.hidePopover?.();
    };
  }, [present]);
  useEffect(() => { if (selectAll.current) selectAll.current.indeterminate = partiallySelected; }, [partiallySelected, present]);
  if (!present) return null;
  return <div ref={island} id="favorites-batch-island" popover="manual" role="toolbar" aria-label={tr('批量操作')} aria-hidden={closing || undefined} inert={closing} className={`favorites-batch-island${closing ? ' is-closing' : ''}`}>
    <label className="favorites-island-select-all"><input ref={selectAll} type="checkbox" checked={allSelected} disabled={!hasItems} onChange={event => onSelectAll(event.target.checked)}/><span>{tr('全选')}</span></label>
    <div className="favorites-island-count" role="status" aria-live="polite" aria-atomic="true"><span>{tr('已选择')}</span><strong>{count}</strong><span>{tr('项')}</span></div>
    <div className="favorites-island-actions">
      {playlists.length ? <>
        <CustomSelect label={tr('目标收藏夹')} className="favorites-island-destination" value={destination} onChange={setDestination} options={[{value:'',label:tr('选择收藏夹'),disabled:true},...playlists.map(item => ({value:item.id,label:item.name}))]}/>
        <button type="button" className="favorites-island-add" aria-label={tr('添加到收藏夹')} disabled={!count || !destination} onClick={onAdd}><FolderPlus size={17}/>{tr('添加')}</button>
      </> : <button type="button" className="favorites-island-add" onClick={onCreate}><Plus size={17}/>{tr('创建收藏夹')}</button>}
      {onRemove && <button type="button" aria-label={tr('移出收藏夹')} disabled={!count} onClick={onRemove}><MinusCircle size={17}/>{tr('移出')}</button>}
      <button type="button" className="favorites-island-unsave" disabled={!count} onClick={onUnsave}><Heart size={17}/>{tr('取消收藏')}</button>
    </div>
    <button type="button" className="favorites-island-close" aria-label={tr('退出批量管理')} onClick={onExit}><X size={19}/></button>
  </div>;
}
