import React, { useEffect, useRef } from 'react';
import { CaretRight, ChatCircle, ChatsCircle, Fire, Heart, MusicNotes, UsersThree } from '@phosphor-icons/react';
import { useAccount } from './account-context.js';
import { useCommunity } from './useCommunity.js';
import { tr, useLanguage } from './language.js';
import './home-community.css';

const categories = ['推荐', '钢琴演奏', '吉他弹唱', '尤克里里', '翻唱', '合奏', '比赛作品', '学习交流'];
const assets = import.meta.env.BASE_URL + 'assets/';

export function HomeCommunity({category, onCategoryChange, onOpen, dialogOpen}) {
  useLanguage();
  const {user, openLogin} = useAccount();
  const feed = useCommunity(undefined, category);
  const discussions = useCommunity();
  const wasOpen = useRef(dialogOpen);
  useEffect(() => {
    if (wasOpen.current && !dialogOpen) {void feed.refresh(); void discussions.refresh();}
    wasOpen.current = dialogOpen;
  }, [dialogOpen, feed.refresh, discussions.refresh]);
  const openPost = post => onOpen({type: 'discussion', postId: post.id});
  const publish = () => user && !user.isAnonymous ? onOpen({type: 'upload'}) : openLogin();
  const cover = post => assets + `community-${post.category === '钢琴演奏' ? 'piano' : ['吉他弹唱', '尤克里里'].includes(post.category) ? 'guitar' : 'vocal'}.png`;

  return <section className="community-section glass-panel home-community" id="community" aria-labelledby="community-heading">
    <div className="section-heading"><h2 id="community-heading"><UsersThree size={38} weight="duotone"/>{tr('音乐论坛 · 分享你的演奏')}</h2><div className="community-tabs" role="tablist" aria-label={tr('作品分类')}>{categories.map(item => <button key={item} role="tab" aria-selected={category === item} className={category === item ? 'active' : ''} onClick={() => onCategoryChange(item)}>{item === '推荐' && <Fire size={18} weight="duotone"/>}{tr(item)}</button>)}</div></div>
    <div className="community-layout"><div className="community-feed">
      <div className="post-grid">{feed.posts.map(post => <article className="post-card" key={post.id}>
        <button className="post-cover" aria-label={`${tr('查看讨论')}：${post.title}`} onClick={() => openPost(post)}><img src={cover(post)} alt=""/><span className="play-bubble"><ChatCircle size={23}/></span></button>
        <h3><button onClick={() => openPost(post)}>{post.title}</button></h3>
        <div className="post-meta"><img src={assets + 'avatar-musician.png'} alt=""/><span>{post.author}</span><button aria-label={`${post.liked ? tr('取消点赞') : tr('点赞')}：${post.title}`} aria-pressed={post.liked} disabled={feed.busy} onClick={() => feed.like(post)}><Heart size={16} weight={post.liked ? 'fill' : 'regular'}/>{post.likes.toLocaleString()}</button><button aria-label={`${tr('查看评论')}：${post.title}`} onClick={() => openPost(post)}><ChatCircle size={15}/>{post.comments}</button></div>
      </article>)}</div>
      {feed.loading && !feed.posts.length && <div className="empty-feed" role="status">{tr('正在加载作品…')}</div>}
      {feed.error && <div className="empty-feed" role="alert"><p>{feed.error}</p><button className="outline-button" onClick={() => feed.refresh()}>{tr('重试')}</button></div>}
      {!feed.loading && !feed.error && !feed.posts.length && <div className="empty-feed"><MusicNotes size={30}/><p>{tr('这里等着你的第一段演奏')}</p><button className="outline-button" onClick={publish}>{tr('分享我的作品')}</button></div>}
      {feed.posts.length < feed.total && <button className="outline-button home-community-more" disabled={feed.loading} onClick={feed.loadMore}>{tr('显示更多')}</button>}
    </div><aside className="discussion-panel"><div className="discussion-heading"><h3><ChatsCircle size={29} weight="duotone"/>{tr('精选讨论')}</h3><button onClick={() => onOpen({type: 'discussions'})}>{tr('查看全部 ')}<CaretRight size={12}/></button></div>
      {discussions.posts.slice(0, 5).map(post => <button key={post.id} className="discussion-row" onClick={() => openPost(post)}><MusicNotes size={23} weight="duotone" className="purple"/><span>{post.title}</span><small><ChatCircle size={16}/>{post.comments}</small></button>)}
      {discussions.loading && !discussions.posts.length && <p className="home-community-empty" role="status">{tr('正在加载讨论…')}</p>}
      {discussions.error && <div className="home-community-empty" role="alert"><p>{discussions.error}</p><button onClick={() => discussions.refresh()}>{tr('重试')}</button></div>}
      {!discussions.loading && !discussions.error && !discussions.posts.length && <p className="home-community-empty">{tr('还没有讨论，来分享第一篇练习心得吧。')}</p>}
    </aside></div>
  </section>;
}
