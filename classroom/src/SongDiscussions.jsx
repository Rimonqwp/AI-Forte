import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookmarkSimple, ChatCircle, CheckCircle, Heart, ListBullets, MusicNotes, PaperPlaneTilt, PencilSimple, ThumbsUp, Trash, UsersThree } from '@phosphor-icons/react';
import './song-discussions.css';

const asset = import.meta.env.BASE_URL + 'assets/song-detail/';
const PAGE_SIZE = 20;
const categories = ['全部', '乐谱选择', '练习方法', '学歌指导', '指法技巧', '演奏分享'];
const categoryIcons = { 乐谱选择: MusicNotes, 练习方法: ThumbsUp, 学歌指导: MusicNotes, 指法技巧: MusicNotes, 演奏分享: PaperPlaneTilt };

const discussionTopics = {
  乐谱选择: ['怎样选择适合自己音域的调？', '简化谱和原版谱的节奏差在哪里？', '和弦谱里的斜杠符号怎么看？', '零基础先看五线谱还是六线谱？', '不同版本的前奏该怎么挑？', '想练独奏应该看哪些编配信息？', '如何判断一个版本的实际难度？', '谱上没有指法标记时怎么办？', '同一首歌为什么有不同拍号标记？', '数字谱和五线谱怎样对照练习？', '移调后哪些和弦需要重新确认？', '选谱时你最看重哪些细节？'],
  练习方法: ['如何把一首歌拆成每日的小目标？', '慢练到什么程度才适合提速？', '总在同一小节卡住，该怎么拆练？', '练琴前的五分钟热身怎么安排？', '怎样用录音找到节奏问题？', '左右手分开练后怎么合起来？', '隔天再练就忘记，如何巩固？', '每天只有十五分钟该练什么？', '节拍器开到多少速度比较合适？', '完整弹一遍和难点练习如何分配？', '练习时怎样避免越弹越快？', '背谱和看谱练习怎么交替？'],
  学歌指导: ['主歌与副歌的力度怎么安排？', '怎样找到乐句自然的呼吸点？', '听原曲时可以重点记哪些细节？', '歌词的重音怎样放进伴奏里？', '前奏和第一句怎样自然连接？', '如何让重复段落有一点变化？', '旋律里哪些音适合轻一些？', '怎样把自己的情绪放进演奏？', '句尾留白多长会比较自然？', '唱歌和伴奏总不同步怎么办？', '遇到高音时怎样保持放松？', '尾奏怎样收得更完整？'],
  指法技巧: ['换和弦时怎样减少停顿？', '大横按按不响有哪些调整方法？', '右手分解和弦怎样练得均匀？', '如何减少换把时的杂音？', '扫弦的手腕应该怎样放松？', '左手手指抬得太高怎么改善？', '连音和滑音怎样练得清楚？', '怎样让旋律音从伴奏里突出？', '低音与高音的音量怎么平衡？', '连续八分音符怎样保持稳定？', '拨弦角度会怎样影响音色？', '相邻和弦有哪些保留指的小技巧？'],
  演奏分享: ['第一次录下完整演奏，想听听建议', '坚持慢练一周后的变化记录', '用简化版完成了今天的练习', '分享我的分段练习笔记', '终于把前奏和主歌接起来了', '和朋友一起合奏的练习心得', '今天尝试了不一样的演奏速度', '从跟不上节拍到稳定弹完的过程', '分享一次小小的家庭演奏', '给这首歌加了一点自己的处理', '一个月后的练习回顾与目标', '欢迎一起交流今天的练习收获'],
};

function moreDemoPosts(song) {
  const authors = [['柚子琴友', 'star'], ['小谱音乐', 'teacher'], ['阿木同学', 'acous'], ['晴天小七', 'lin']];
  return Object.entries(discussionTopics).flatMap(([category, topics], group) => topics.map((topic, index) => {
    const [author, avatar] = authors[(group + index) % authors.length];
    const excerpt = `正在练习《${song}》，想和琴友一起聊聊${topic.replace(/[？！，]/g, '')}，欢迎分享你的经验。`;
    return { id: `demo-${group}-${index}`, category, title: `《${song}》${topic}`, excerpt, body: `${excerpt}\n\n你会怎样安排这部分的练习？有哪些值得留意的小细节？`, author, avatar, level: 3 + index % 5, likes: 380 - index * 19 - group * 7, comments: 68 - index * 4 - group, replies: [] };
  }));
}

function initialPosts(song) {
  return [
    { id: 'version', featured: true, category: '乐谱选择', badge: '乐谱选择', image: 'selection', title: `《${song}》选哪个版本更适合练习？`, excerpt: '网上有原版、简化版、弹唱版好几个版本，想请教大家：不同水平该怎么选？哪个更适合入门？', author: '星星同学', avatar: 'star', level: 7, likes: 1234, comments: 268, body: `最近想认真练好《${song}》，却发现有原版、简化版和弹唱版好几种编配。我刚学会几个常用和弦，换和弦时还不太流畅。\n\n大家最开始练的是哪个版本？应该先把简单版练完整，再挑战原版，还是直接从自己最喜欢的版本开始？也欢迎分享你们的练习顺序。`, replies: [{ id: 'version-1', author: '小谱老师', avatar: 'teacher', level: 8, text: '建议先从简化版开始：用稳定的节奏弹完一整段，比一开始就挑战复杂编配更有帮助。等换和弦顺畅后，再加入原版的节奏型。', likes: 86 }, { id: 'version-2', author: '阿泽 Acous', avatar: 'acous', level: 5, text: '如果想边弹边唱，可以先选基础和弦的弹唱版。每天用慢速练四小节，再把它们连起来。', likes: 32 }] },
    { id: 'rhythm', featured: true, category: '练习方法', badge: '练习建议', image: 'practice', title: `《${song}》节奏总是不稳，怎么练？`, excerpt: '副歌部分总是跟不上节拍，尤其是附点节奏，大家有什么好用的练习方法吗？求分享！', author: '阿泽 Acous', avatar: 'acous', level: 5, likes: 982, comments: 187, body: `练《${song}》的时候，单独换和弦没有问题，但一加上右手节奏就会越弹越快。副歌里的附点节奏尤其容易乱。\n\n目前用 80 BPM 练习，想听听大家会怎么拆分练习：先拍手数拍，还是先练右手？`, replies: [{ id: 'rhythm-1', author: '指弹小林', avatar: 'lin', level: 6, text: '先降到 60 BPM，只练右手。开口数出「一、二、三、四」，每小节只在第一拍换和弦。连续三遍稳定后，每次加 5 BPM。', likes: 57 }] },
    { id: 'feeling', featured: true, category: '学歌指导', badge: '学歌指导', image: 'theory', title: `如何更好地理解和演绎《${song}》？`, excerpt: '这首歌的情感很温暖，想把“回到初心”的感觉弹出来，大家在演绎上有什么心得和建议？', author: '小鹿同学', avatar: 'lin', level: 5, likes: 1076, comments: 236, body: `我希望演奏《${song}》时，听起来不只是把音符弹对，还能有自然的呼吸和情绪。\n\n大家会怎么处理主歌和副歌的强弱？哪些地方适合留一点空间？欢迎聊聊你听到这首歌时想到的画面。`, replies: [{ id: 'feeling-1', author: '小谱老师', avatar: 'teacher', level: 8, text: '可以先轻声唱一遍，把自然换气的位置标在谱上。主歌轻一些，副歌逐渐增加力度，每个乐句的结尾稍稍收住。', likes: 64 }] },
    { id: 'chords', category: '乐谱选择', title: '玩家自制谱可靠吗？怎么判断质量？', excerpt: '看到好多玩家自制的编配乐谱，想请问大家：如何判断是否适合自己？', author: '柚子琴友', avatar: 'star', level: 6, likes: 742, comments: 136, body: '挑谱时我会先看调性、难度和试听，再对照原曲确认节奏。大家还有哪些挑选乐谱的小技巧？', replies: [] },
    { id: 'plan', category: '练习方法', title: '每天练多久效果最好？我的一周练习计划分享', excerpt: `从零开始学《${song}》的一周练习安排（附节拍练习方法）`, author: '小谱音乐', avatar: 'teacher', level: 5, likes: 689, comments: 102, body: '我的练习安排：5 分钟热身，10 分钟难点慢练，10 分钟分段连接，最后录一遍完整演奏。每次只选一个具体目标，练完记下今天的进步。', replies: [] },
    { id: 'strum', category: '指法技巧', title: `《${song}》弹唱如何配和弦？超实用入门方案`, excerpt: '分享一个简单好听的弹唱和弦方案，适合新手。', author: '阿木同学', avatar: 'acous', level: 4, likes: 517, comments: 98, body: '可以先用每拍一下的下扫练熟和弦转换，再逐渐加入切分。左手先提前准备下一个和弦的位置，右手保持匀速，先不要追求速度。', replies: [] },
    { id: 'first-song', category: '演奏分享', title: `我的《${song}》练习打卡：从不会到完整弹唱！`, excerpt: `记录自己练习《${song}》的过程与心得，遇到的问题也一起聊聊。`, author: '晴天小七', avatar: 'lin', level: 6, likes: 420, comments: 76, body: '练了两周，今天终于能慢速完整弹唱啦！最难的还是一边唱一边换和弦。对我最有帮助的是先分开练，再每天录音听一听有没有抢拍。也给正在练习的你一点鼓励！', replies: [] },
    ...moreDemoPosts(song),
  ];
}

function loadState(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key));
    if (!stored || typeof stored !== 'object') return {};
    return { posts: Array.isArray(stored.posts) ? stored.posts.filter(p => typeof p.id === 'string' && typeof p.title === 'string' && typeof p.body === 'string' && categories.includes(p.category) && Array.isArray(p.replies)) : [], liked: Array.isArray(stored.liked) ? stored.liked : [], saved: Array.isArray(stored.saved) ? stored.saved : [] };
  } catch { return {}; }
}

function Avatar({ name, kind = 'star' }) {
  return <img className="sd-avatar" src={asset + `avatar-${kind}.png`} alt={`${name}头像`} />;
}

function Like({ post, compact = false, liked, onToggle }) {
  const active = liked.includes(post.id);
  return <button type="button" className="sd-like" aria-label={`${active ? '取消赞同' : '赞同'}：${post.title || post.author}`} aria-pressed={active} onClick={() => onToggle(post.id)}><Heart size={compact ? 15 : 18} weight={active ? 'fill' : 'regular'} />{(post.likes + (active ? 1 : 0)).toLocaleString('en-US')}</button>;
}

function Meta({ post, liked, onToggle, onOpen, count }) {
  return <div className="sd-meta"><Avatar name={post.author} kind={post.avatar} /><strong>{post.author}</strong><span className="sd-level">Lv.{post.level}</span><span className="sd-meta-spacer" /><Like post={post} liked={liked} onToggle={onToggle} /><button type="button" aria-label={`查看${post.title}的回复`} onClick={() => onOpen(post.id)}><ChatCircle size={18} />{count}</button></div>;
}

export default function SongDiscussions({ song }) {
  const storageKey = `classroom.discussions.v1.${song.id}`;
  const [initial] = useState(() => loadState(storageKey));
  const [localPosts, setLocalPosts] = useState(initial.posts || []);
  const [liked, setLiked] = useState(initial.liked || []);
  const [saved, setSaved] = useState(initial.saved || []);
  const [category, setCategory] = useState('全部');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [view, setView] = useState(null);
  const [replyTo, setReplyTo] = useState('');
  const [message, setMessage] = useState('');
  const [formError, setFormError] = useState('');
  const panel = useRef(null), replyInput = useRef(null), viewChanged = useRef(false);
  const basePosts = initialPosts(song.title);
  const posts = [...localPosts.filter(p => !basePosts.some(b => b.id === p.id)), ...basePosts.map(p => localPosts.find(l => l.id === p.id) || p)];
  const current = posts.find(p => p.id === view);
  const shown = posts.filter(p => category === '全部' || p.category === category);
  const hotPosts = category === '全部' ? shown.filter(p => !p.featured) : shown;
  const counts = post => post.comments + post.replies.filter(r => r.local).length;
  const toggleLike = id => setLiked(items => items.includes(id) ? items.filter(item => item !== id) : [...items, id]);
  const changeView = next => { viewChanged.current = true; setView(next); setReplyTo(''); setMessage(''); setFormError(''); };
  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify({ posts: localPosts, liked, saved })); }
    catch { setMessage('浏览器未能保存本次修改，关闭页面后可能丢失。'); }
  }, [storageKey, localPosts, liked, saved]);
  useEffect(() => { if (viewChanged.current) { panel.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); panel.current?.querySelector('h2')?.focus({ preventScroll: true }); viewChanged.current = false; } }, [view]);
  const updatePost = updated => setLocalPosts(previous => [updated, ...previous.filter(p => p.id !== updated.id)]);
  const reply = event => {
    event.preventDefault();
    const text = String(new FormData(event.currentTarget).get('reply') || '').trim();
    if (!text) { setFormError('请先写下你的回复。'); return; }
    updatePost({ ...current, replies: [...current.replies, { id: `reply-${crypto.randomUUID()}`, author: '音乐同学', avatar: 'star', level: 1, text, to: replyTo, likes: 0, local: true }] });
    event.currentTarget.reset(); setReplyTo(''); setFormError(''); setMessage('回复已发表，保存在本机浏览器。');
  };
  const publish = event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget), title = String(form.get('title') || '').trim(), body = String(form.get('body') || '').trim();
    if (title.length < 5 || body.length < 10) { setFormError('标题至少填写 5 个字，正文至少填写 10 个字。'); return; }
    const post = { id: `post-${crypto.randomUUID()}`, title, body, category: form.get('category'), excerpt: body, author: '音乐同学', avatar: 'star', level: 1, likes: 0, comments: 0, replies: [], local: true };
    setLocalPosts(previous => [post, ...previous]); changeView(post.id); setMessage('帖子已发布，保存在本机浏览器。');
  };

  return <section id="detail-comments" className="detail-extra-panel song-discussions" aria-labelledby="detail-comments-heading" ref={panel}>
    {!view ? <>
      <header className="sd-heading"><div className="sd-heading-title"><UsersThree size={31} /><h2 id="detail-comments-heading" tabIndex={-1}>相关讨论</h2><p>· 一起交流练习心得，寻找更合适的乐谱版本！</p></div><div className="sd-heading-actions"><span className="sd-friends">{['star', 'acous', 'lin'].map(kind => <Avatar key={kind} name="琴友" kind={kind} />)}</span><span className="sd-online">12,680 位琴友正在讨论</span><button type="button" className="sd-primary sd-publish" onClick={() => changeView('compose')}>我要发帖 <PencilSimple size={16} /></button></div></header>
      <div className="sd-featured">{posts.filter(p => p.featured).map(post => { const Icon = categoryIcons[post.category]; return <article className="sd-card" key={post.id}><button type="button" className="sd-card-open" onClick={() => changeView(post.id)}><div className="sd-card-picture"><img src={asset + `discussion-${post.image}.png`} alt={{ selection: '戴耳机的女孩对照原版与简化版乐谱', practice: '吉他练习、节拍器和热茶', theory: '晚霞下的金色稻田与乡间小路' }[post.image]} /><span className={`sd-card-badge sd-tone-${post.category}`}><Icon size={17} />{post.badge}</span></div><div className="sd-card-copy"><h3>{post.title}</h3><p>{post.excerpt}</p></div></button><Meta post={post} liked={liked} onToggle={toggleLike} onOpen={changeView} count={counts(post)} /></article>; })}</div>
      <div className="sd-hot-heading"><h3><ListBullets size={24} />更多热门讨论</h3><div className="sd-categories" role="group" aria-label="讨论分类">{categories.map(item => <button type="button" key={item} aria-pressed={category === item} className={category === item ? 'active' : ''} onClick={() => { setCategory(item); setVisibleCount(PAGE_SIZE); }}>{item}</button>)}</div></div>
      <div className="sd-hot-list" id="sd-hot-posts" aria-live="polite" aria-relevant="additions">{hotPosts.slice(0, visibleCount).map(post => { const Icon = categoryIcons[post.category] || MusicNotes; return <article key={post.id} className="sd-hot-row"><ChatCircle className="sd-row-chat" size={22} /><button type="button" className="sd-hot-open" onClick={() => changeView(post.id)}><span className={`sd-category sd-tone-${post.category}`}><Icon size={14} />{post.category}</span><strong>{post.title}</strong><span className="sd-hot-excerpt">{post.excerpt}</span></button><div className="sd-hot-author"><Avatar name={post.author} kind={post.avatar} /><span>{post.author}</span><span className="sd-level">Lv.{post.level}</span></div><Like post={post} compact liked={liked} onToggle={toggleLike} /><button type="button" className="sd-hot-replies" aria-label={`查看${post.title}的回复`} onClick={() => changeView(post.id)}><ChatCircle size={16} />{counts(post)}</button></article>; })}</div>
      {visibleCount < hotPosts.length && <div className="sd-load-more"><button type="button" aria-controls="sd-hot-posts" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>显示更多</button></div>}
    </> : view === 'compose' ? <>
      <div className="sd-view-toolbar"><button type="button" onClick={() => changeView(null)}><ArrowLeft size={18} />返回相关讨论</button><span>《{song.title}》· 发起讨论</span></div>
      <h2 id="detail-comments-heading" tabIndex={-1} className="sd-view-title"><PencilSimple size={26} />分享你的音乐练习心得</h2><p className="sd-view-intro">一个具体的问题，一段练习的收获，都值得与琴友交流。</p>
      <form className="sd-compose-form" onSubmit={publish}><label>讨论分类<select name="category" aria-label="讨论分类" defaultValue={category === '全部' ? '乐谱选择' : category}>{categories.slice(1).map(item => <option key={item}>{item}</option>)}</select></label><label>标题<input name="title" placeholder={`例如：《${song.title}》哪个版本更适合入门？`} minLength={5} maxLength={60} required /></label><label>正文<textarea name="body" rows={7} placeholder="说说你目前的水平、练习遇到的问题，或者分享一个有用的小方法…" minLength={10} maxLength={5000} required /></label><p className="sd-form-hint">请友善交流。演示帖子保存在本机浏览器，尚未接入社区服务。</p>{formError && <p className="sd-error" role="alert">{formError}</p>}<div className="sd-form-actions"><button type="button" onClick={() => changeView(null)}>取消</button><button className="sd-primary" type="submit"><PaperPlaneTilt size={18} />发布讨论</button></div></form>
    </> : current ? <>
      <div className="sd-view-toolbar"><button type="button" onClick={() => changeView(null)}><ArrowLeft size={18} />返回相关讨论</button><span>《{song.title}》· {current.category}</span></div>
      <div className="sd-thread-layout"><article className="sd-thread"><span className={`sd-category sd-tone-${current.category}`}>{current.category}</span><h2 id="detail-comments-heading" tabIndex={-1} className="sd-view-title">{current.title}</h2><div className="sd-thread-author"><Avatar name={current.author} kind={current.avatar} /><strong>{current.author}</strong><span className="sd-level">Lv.{current.level}</span><span>{current.local ? '刚刚 · 本机发布' : '3 天前 · 练习交流'}</span></div>{current.featured && <img className="sd-thread-cover" src={asset + `discussion-${current.image}.png`} alt="讨论主题插画" />}<div className="sd-thread-body">{current.body.split('\n').filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}</div><div className="sd-thread-actions"><Like post={current} liked={liked} onToggle={toggleLike} /><button type="button" aria-pressed={saved.includes(current.id)} onClick={() => setSaved(items => items.includes(current.id) ? items.filter(id => id !== current.id) : [...items, current.id])}><BookmarkSimple size={18} weight={saved.includes(current.id) ? 'fill' : 'regular'} />{saved.includes(current.id) ? '已收藏' : '收藏讨论'}</button><button type="button" onClick={() => replyInput.current?.focus()}><ChatCircle size={18} />写回复</button>{current.local && <button type="button" onClick={() => { setLocalPosts(items => items.filter(p => p.id !== current.id)); changeView(null); setMessage("已删除本机帖子。"); }}><Trash size={17} />删除我的帖子</button>}</div>
      <div className="sd-replies"><h3><ChatCircle size={22} />琴友回复 <span>（{current.replies.length} 条可读示例{current.replies.some(r => r.local) ? '与本机回复' : ''}）</span></h3>{current.replies.length ? current.replies.map((item, index) => <article className="sd-reply" key={item.id}><Avatar name={item.author} kind={item.avatar} /><div><div className="sd-reply-author"><strong>{item.author}</strong><span className="sd-level">Lv.{item.level}</span><small>{item.local ? '刚刚' : `${index + 1} 楼`}</small></div><p>{item.to && <span className="sd-reply-to">回复 @{item.to}：</span>}{item.text}</p><div className="sd-reply-actions"><Like post={item} compact liked={liked} onToggle={toggleLike} /><button type="button" onClick={() => { setReplyTo(item.author); replyInput.current?.focus(); }}>回复</button>{item.local && <button type="button" onClick={() => { updatePost({ ...current, replies: current.replies.filter(r => r.id !== item.id) }); setMessage("已删除本机回复。"); }}>删除</button>}</div></div></article>) : <p className="sd-empty">还没有回复，来分享第一个练习建议吧。</p>}</div>
      <form className="sd-reply-form" onSubmit={reply}><label htmlFor={`discussion-reply-${song.id}`}>{replyTo ? `回复 @${replyTo}` : '写下你的回复'}{replyTo && <button type="button" onClick={() => setReplyTo('')}>取消引用</button>}</label><textarea ref={replyInput} id={`discussion-reply-${song.id}`} name="reply" rows={3} maxLength={2000} placeholder="分享你的练习经验，或给琴友一点鼓励…" required />{formError && <p className="sd-error" role="alert">{formError}</p>}<div className="sd-form-actions"><span>友善交流，让练习更有收获。</span><button className="sd-primary" type="submit"><PaperPlaneTilt size={17} />发表回复</button></div></form></article>
      <aside className="sd-thread-aside"><h3><MusicNotes size={20} />正在练习《{song.title}》</h3><p>选择适合自己的版本，先放慢速度，把每一小节弹稳。</p><button type="button" onClick={() => document.getElementById('detail-versions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>看看乐谱版本 <ArrowRight size={17} /></button><h3>继续聊聊</h3>{posts.filter(p => p.id !== current.id && p.featured).map(post => <button type="button" className="sd-related-thread" key={post.id} onClick={() => changeView(post.id)}>{post.title}<ArrowRight size={16} /></button>)}</aside></div>
    </> : null}
    {message && <p className="sd-status" role="status"><CheckCircle size={17} />{message}</p>}
  </section>;
}
