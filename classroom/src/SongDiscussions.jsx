import { CustomSelect } from './CustomSelect.jsx';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, BookmarkSimple, ChatCircle, Heart, ListBullets, PaperPlaneTilt, PencilSimple, Trash, UsersThree } from '@phosphor-icons/react';
import { useAccount } from './account-context.js';
import { contentRequest, writeContent } from './content-api.js';
import { useCommunity } from './useCommunity.js';
import './song-discussions.css';

const categories = ['全部', '乐谱选择', '练习方法', '学歌指导', '指法技巧', '演奏分享', '钢琴演奏', '吉他弹唱', '翻唱', '学习交流'];
const asset = import.meta.env.BASE_URL + 'assets/song-detail/';
function Avatar({name}) { return <img className="sd-avatar" src={asset + 'avatar-star.png'} alt={`${name}头像`}/>; }
function Like({item, onClick, disabled}) {
  return <button type="button" className="sd-like" disabled={disabled} aria-label={`${item.liked ? '取消赞同' : '赞同'}：${item.title || item.author}`} aria-pressed={item.liked} onClick={onClick}><Heart size={18} weight={item.liked ? 'fill' : 'regular'}/>{item.likes}</button>;
}

export default function SongDiscussions({song, initialPostId = null}) {
  const {user, openLogin} = useAccount();
  const [category, setCategory] = useState('全部');
  const community = useCommunity(song?.id, category);
  const [view, setView] = useState(initialPostId), [current, setCurrent] = useState(null);
  const [replies, setReplies] = useState([]), [replyTotal, setReplyTotal] = useState(0);
  const [replyTo, setReplyTo] = useState(null), [error, setError] = useState('');
  const [loadingThread, setLoadingThread] = useState(false), [message, setMessage] = useState('');
  const panel = useRef(null), replyInput = useRef(null), viewChanged = useRef(false), threadRequest = useRef(0);
  const changeView = value => {threadRequest.current++; viewChanged.current = true; setView(value); setCurrent(null); setReplies([]); setReplyTotal(0); setReplyTo(null); setError(''); setMessage('');};
  const loadThread = async (id, offset = 0) => {
    const request = ++threadRequest.current;
    setLoadingThread(true); setError('');
    try {
      const [post, comments] = await Promise.all([contentRequest(`/posts/${id}`), contentRequest(`/posts/${id}/comments?offset=${offset}`)]);
      if (request !== threadRequest.current) return;
      setCurrent(post); setReplies(previous => offset ? [...previous, ...comments.items] : comments.items); setReplyTotal(comments.total);
    } catch (cause) { if (request === threadRequest.current) setError(cause.message); }
    finally { if (request === threadRequest.current) setLoadingThread(false); }
  };
  useEffect(() => {setCurrent(null); setReplies([]); if (view && view !== 'compose') void loadThread(view); return () => {threadRequest.current++;};}, [view, user?.uid]);
  useLayoutEffect(() => {
    if (!view || !panel.current) return;
    const section = panel.current, scroller = section.closest('.detail-overlay') ? section.closest('.song-detail-page') : null;
    const fit = () => {section.style.minHeight = `${scroller ? scroller.clientHeight : window.innerHeight}px`;};
    fit(); window.addEventListener('resize', fit);
    return () => {window.removeEventListener('resize', fit); section.style.removeProperty('min-height');};
  }, [view]);
  useEffect(() => {if (viewChanged.current) {panel.current?.scrollIntoView({block:'start'}); panel.current?.querySelector('h2')?.focus({preventScroll:true}); viewChanged.current = false;}}, [view]);
  const action = async (operation, success) => {
    const result = await community.mutate(operation);
    if (result) {if (success) success(result); if (view && view !== 'compose') await loadThread(view);}
  };
  const publish = async event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const post = await community.publish({title: data.get('title'), body: data.get('body'), category: data.get('category')});
    if (post) {changeView(post.id); setMessage('帖子已发布并保存。');}
  };
  const reply = async event => {
    event.preventDefault();
    const form = event.currentTarget, text = new FormData(form).get('reply');
    await action(() => writeContent(`/posts/${view}/comments`, 'POST', {text, parent_id: replyTo?.id || null}), () => {form.reset(); setReplyTo(null); setMessage('回复已发表并保存。');});
  };
  const likePost = post => action(() => writeContent(`/posts/${post.id}/like`, 'PUT', {active: !post.liked}));
  return <section id={song ? 'detail-comments' : 'community-posts'} className="detail-extra-panel song-discussions" aria-label={song ? '歌曲相关讨论' : '作品社区'} ref={panel}>
    {!view ? <>
      <header className="sd-heading"><div className="sd-heading-title"><UsersThree size={31}/><h2 tabIndex={-1}>{song ? '相关讨论' : '作品与讨论'}</h2><p>一起交流练习心得</p></div><div className="sd-heading-actions"><span>{community.total} 篇帖子</span><button type="button" className="sd-primary sd-publish" onClick={() => {if (!user || user.isAnonymous) {openLogin(); return;} changeView('compose');}}>我要发帖 <PencilSimple size={16}/></button></div></header>
      <div className="sd-hot-heading"><h3><ListBullets size={24}/>最新讨论</h3><div className="sd-categories" role="group" aria-label="讨论分类">{categories.map(item => <button key={item} type="button" aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></div>
      <div className="sd-hot-list" aria-live="polite">{community.posts.map(post => <article key={post.id} className="sd-hot-row"><ChatCircle className="sd-row-chat" size={22}/><button type="button" className="sd-hot-open" onClick={() => changeView(post.id)}><span className={`sd-category sd-tone-${post.category}`}>{post.category}</span><strong>{post.title}</strong><span className="sd-hot-excerpt">{post.excerpt}</span></button><div className="sd-hot-author"><Avatar name={post.author}/><span>{post.author}</span></div><Like item={post} disabled={community.busy} onClick={() => community.like(post)}/><button type="button" className="sd-hot-replies" aria-label={`查看${post.title}的回复`} onClick={() => changeView(post.id)}><ChatCircle size={16}/>{post.comments}</button></article>)}</div>
      {community.loading && <p role="status">正在加载讨论…</p>}
      {!community.loading && !community.error && !community.posts.length && <p className="sd-empty">还没有讨论，来分享第一篇练习心得吧。</p>}
      {community.posts.length < community.total && <div className="sd-load-more"><button disabled={community.loading} onClick={community.loadMore}>显示更多</button></div>}
    </> : view === 'compose' ? <>
      <div className="sd-view-toolbar"><button type="button" onClick={() => changeView(null)}><ArrowLeft size={18}/>返回讨论列表</button></div>
      <h2 tabIndex={-1} className="sd-view-title"><PencilSimple size={26}/>分享你的音乐练习心得</h2>
      <form className="sd-compose-form" onSubmit={publish}><label>讨论分类<CustomSelect name="category" label="讨论分类" defaultValue={category === '全部' ? '乐谱选择' : category} options={categories.slice(1)}/></label><label>标题<input name="title" minLength={5} maxLength={100} required/></label><label>正文<textarea name="body" rows={7} minLength={10} maxLength={5000} required/></label><p className="sd-form-hint">帖子与回复随账号保存，公开展示。请友善交流。</p><div className="sd-form-actions"><button type="button" onClick={() => changeView(null)}>取消</button><button className="sd-primary" disabled={community.busy} type="submit"><PaperPlaneTilt size={18}/>{community.busy ? '正在发布…' : '发布讨论'}</button></div></form>
    </> : <>
      <div className="sd-view-toolbar"><button type="button" onClick={() => changeView(null)}><ArrowLeft size={18}/>返回讨论列表</button></div>
      {loadingThread && <p role="status">正在加载帖子…</p>}
      {current && <article className="sd-thread"><span className={`sd-category sd-tone-${current.category}`}>{current.category}</span><h2 tabIndex={-1} className="sd-view-title">{current.title}</h2><div className="sd-thread-author"><Avatar name={current.author}/><strong>{current.author}</strong><time dateTime={current.created_at}>{new Date(current.created_at).toLocaleString()}</time></div><div className="sd-thread-body">{current.body.split('\n').map((line, index) => <p key={index}>{line}</p>)}</div><div className="sd-thread-actions"><Like item={current} disabled={community.busy} onClick={() => likePost(current)}/><button type="button" disabled={community.busy} aria-pressed={current.saved} onClick={() => action(() => writeContent(`/posts/${view}/bookmark`, 'PUT', {active: !current.saved}))}><BookmarkSimple size={18} weight={current.saved ? 'fill' : 'regular'}/>{current.saved ? '已收藏' : '收藏讨论'}</button>{current.owned && <button type="button" disabled={community.busy} onClick={async () => {if (await community.remove(view)) {changeView(null); setMessage('帖子已删除。');}}}><Trash size={17}/>删除我的帖子</button>}</div>
      <div className="sd-replies"><h3><ChatCircle size={22}/>琴友回复（{replyTotal} 条）</h3>{replies.map(item => <article className="sd-reply" key={item.id}><Avatar name={item.author}/><div><div className="sd-reply-author"><strong>{item.author}</strong><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></div><p>{item.to && <span className="sd-reply-to">回复 @{item.to}：</span>}{item.text}</p><div className="sd-reply-actions"><Like item={item} disabled={community.busy} onClick={() => action(() => writeContent(`/comments/${item.id}/like`, 'PUT', {active: !item.liked}))}/><button type="button" onClick={() => {setReplyTo(item); replyInput.current?.focus();}}>回复</button>{item.owned && <button type="button" disabled={community.busy} onClick={() => action(() => writeContent(`/comments/${item.id}`, 'DELETE'))}>删除</button>}</div></div></article>)}{!replyTotal && <p className="sd-empty">还没有回复，来分享第一个练习建议吧。</p>}{replies.length < replyTotal && <button type="button" disabled={loadingThread} onClick={() => loadThread(view, replies.length)}>加载更多回复</button>}</div>
      <form className="sd-reply-form" onSubmit={reply}><label htmlFor={`reply-${song?.id || 'community'}`}>{replyTo ? `回复 @${replyTo.author}` : '写下你的回复'}{replyTo && <button type="button" onClick={() => setReplyTo(null)}>取消引用</button>}</label><textarea ref={replyInput} id={`reply-${song?.id || 'community'}`} name="reply" rows={3} maxLength={2000} required/><div className="sd-form-actions"><span>友善交流，让练习更有收获。</span><button className="sd-primary" disabled={community.busy} type="submit"><PaperPlaneTilt size={17}/>发表回复</button></div></form></article>}
    </>}
    {(error || community.error) && <p className="sd-error" role="alert">{error || community.error} <button type="button" onClick={() => view && view !== 'compose' ? loadThread(view) : community.refresh()}>重试</button></p>}
    {message && <p className="sd-status" role="status">{message}</p>}
  </section>;
}
