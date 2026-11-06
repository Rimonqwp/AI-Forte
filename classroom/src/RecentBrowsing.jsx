import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Clock, ClockCounterClockwise, Fire, Headphones, Heart, Info, MagnifyingGlass, MusicNotes, Pause, Play, Target, Waveform, X } from '@phosphor-icons/react';
import { tr, useLanguage } from './language.js';
import { clearPreviewTime, summarizePreviewTime, usePreviewTime } from './recent-preview-stats.js';
import './recent-browsing.css';

const assets = import.meta.env.BASE_URL + 'assets/';
const duration = seconds => {
  const value = Math.floor(seconds);
  return `${Math.floor(value / 60)}${tr('分')}${value % 60}${tr('秒')}`;
};
export function RecentBrowsing({ user, entries, visible, query, setQuery, setRecent, favorites, setFavorites, open, browse, formatVisit }) {
  const language = useLanguage();
  const stats = summarizePreviewTime(usePreviewTime(user.uid));
  const [playing, setPlaying] = useState(null), [audioError, setAudioError] = useState('');
  const player = useRef(null), timer = useRef(null);
  const stop = () => { clearTimeout(timer.current); player.current?.close().catch(() => {}); player.current = null; setPlaying(null); };
  useEffect(() => () => { clearTimeout(timer.current); player.current?.close().catch(() => {}); }, []);
  useEffect(() => { stop(); }, [query]);
  const play = async song => {
    if (playing === song.id) { stop(); return; }
    stop(); setAudioError('');
    try {
      const context = new (window.AudioContext || window.webkitAudioContext)();
      player.current = context;
      await context.resume();
      if (player.current !== context) return;
      const start = context.currentTime + .04;
      [60, 64, 67, 72, 67, 64, 62, 60].forEach((note, index) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = 'triangle'; oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12);
        gain.gain.setValueAtTime(0, start + index * .42);
        gain.gain.linearRampToValueAtTime(.09, start + index * .42 + .02);
        gain.gain.exponentialRampToValueAtTime(.001, start + index * .42 + .38);
        oscillator.connect(gain); gain.connect(context.destination);
        oscillator.start(start + index * .42); oscillator.stop(start + index * .42 + .4);
      });
      setPlaying(song.id); timer.current = setTimeout(stop, 3500);
    } catch { stop(); setAudioError(tr('暂时无法播放，请稍后重试。')); }
  };
  const hours = Math.floor(stats.total / 3600), minutes = Math.floor(stats.total % 3600 / 60);
  const goal = Math.max(7200, Math.ceil((stats.total + 1) / 7200) * 7200), progress = Math.min(100, Math.floor(stats.total / goal * 100));
  const maxDay = Math.max(60, ...stats.week.map(day => day.seconds));
  const weekLabels = ['日', '一', '二', '三', '四', '五', '六'];
  return <div className="recent-browsing">
    <section className="recent-overview" style={{ '--recent-banner': `url(${assets}recent-browsing/preview-banner-island-v2.png)` }} aria-label={tr('乐谱预览统计')}>
      <div className="recent-total">
        <h3>{tr('总预览时长')}<span className="recent-info" tabIndex={0} role="img" aria-label={tr('仅统计当前浏览器中的乐谱页面前台停留时长。')}><Info size={19}/><span role="tooltip">{tr('仅统计当前浏览器中的乐谱页面前台停留时长。')}</span></span></h3>
        <p className="recent-total-value">{hours > 0 && <><strong>{hours}</strong>{tr('小时')}</>}<strong>{minutes}</strong>{tr('分')}</p>
        <div className="recent-progress-line"><progress max={100} value={progress} aria-label={tr('预览时长目标')}/><span>{progress}%</span></div>
        <p className="recent-goal"><Target size={18} weight="duotone"/>{tr('距下个小目标：再预览')} {Math.ceil((goal - stats.total) / 60)} {tr('分钟')}（{Math.round(goal / 3600)} {tr('小时')}）</p>
      </div>
      <div className="recent-activity">
        <dl className="recent-metrics">
          <div><dt><Fire size={24} weight="duotone"/>{tr('连续预览')}</dt><dd><strong>{stats.streak}</strong> {tr('天')}</dd></div>
          <div><dt><MusicNotes size={23}/>{tr('已预览')}</dt><dd><strong>{entries.length}</strong> {tr('首')}</dd></div>
          <div><dt><Clock size={23}/>{tr('平均预览')}</dt><dd><strong>{Math.floor(stats.average / 60)}</strong>{tr('分')} <strong>{Math.floor(stats.average % 60)}</strong>{tr('秒')}</dd></div>
        </dl>
        <div className="recent-week"><div><strong>{tr('近 7 天预览时长')}</strong><span>{tr('今日')} {Math.floor(stats.week.at(-1).seconds / 60)} {tr('分钟')}</span></div>
          <div className="recent-week-chart" role="img" aria-label={stats.week.map(day => `${day.day}: ${duration(day.seconds)}`).join('，')}>
            {stats.week.map((day, index) => <div key={day.day} className={index === 6 ? 'is-today' : ''}><div className="recent-chart-track"><span style={{ height: `${day.seconds ? Math.max(8, day.seconds / maxDay * 100) : 0}%` }}/></div><small>{tr(weekLabels[day.weekday])}</small></div>)}
          </div>
        </div>
      </div>
    </section>
    <div className="settings-library-toolbar"><label className="settings-library-search"><MagnifyingGlass size={20}/><input aria-label={tr('搜索我的乐谱')} placeholder={tr('搜索歌名、歌手或编配')} value={query} onChange={event => setQuery(event.target.value)}/></label><span className="settings-library-total">{tr('共')} {visible.length} {tr('首乐谱')}</span>{entries.length > 0 && <button className="settings-text-button" onClick={() => { stop(); setRecent(() => []); clearPreviewTime(user.uid); }}>{tr('清空浏览记录')}</button>}</div>
    {visible.length ? <div className="settings-score-list settings-recent-list">{visible.map(entry => {
      const { song } = entry, saved = favorites.includes(song.id);
      return <article className="settings-score-row settings-recent-row" key={song.id}>
        <button className="settings-score-open" onClick={() => open(entry)} aria-label={`${tr('打开')}《${song.title}》`}><img src={assets + `score-${song.id}.png`} alt=""/><span className="settings-score-copy"><strong>{song.title}</strong><small>{song.artist}</small></span></button>
        <div className={`recent-audio${playing === song.id ? ' is-playing' : ''}`}><button aria-label={`${tr(playing === song.id ? '暂停音色演示' : '播放音色演示')}《${song.title}》`} aria-pressed={playing === song.id} title={tr('练习音色演示，非原曲录音。')} onClick={() => play(song)}>{playing === song.id ? <Pause size={16} weight="fill"/> : <Play size={16} weight="fill"/>}</button><span className="recent-wave" aria-hidden="true">{[0, 1, 2].map(index => <Waveform size={32} weight="regular" key={index}/>)}</span></div>
        <span className="recent-duration"><Headphones size={18}/>{tr('预览')} {duration(stats.bySong[song.id] || 0)}</span>
        <time className="settings-recent-time" dateTime={new Date(entry.viewedAt).toISOString()} title={new Intl.DateTimeFormat(language, { dateStyle: 'long', timeStyle: 'short' }).format(entry.viewedAt)}>{formatVisit(entry.viewedAt)}</time>
        <button className="settings-score-favorite" aria-label={`${tr(saved ? '取消收藏' : '收藏')}《${song.title}》`} aria-pressed={saved} onClick={() => setFavorites(items => items.includes(song.id) ? items.filter(id => id !== song.id) : [...items, song.id])}><Heart size={27} weight={saved ? 'fill' : 'regular'}/></button>
        <button className="settings-recent-view" onClick={() => open(entry)} aria-label={`${tr('查看乐谱')}《${song.title}》`}>{tr('查看乐谱')}<ArrowRight size={21}/></button>
        <button className="settings-score-favorite settings-recent-remove" title={tr('移除浏览记录')} aria-label={`${tr('移除浏览记录')}《${song.title}》`} onClick={() => { if (playing === song.id) stop(); setRecent(items => items.filter(item => item.songId !== song.id)); }}><X size={15}/></button>
      </article>;
    })}</div> : <div className="settings-empty"><ClockCounterClockwise size={34}/><h3>{tr(query.trim() ? '没有找到匹配的乐谱' : '从一首喜欢的歌开始')}</h3><p>{tr(query.trim() ? '试试其他歌名、歌手或编配关键词。' : '打开过的歌曲会按最近浏览时间排列在这里。')}</p>{!query.trim() && <button onClick={browse}>{tr('发现乐谱')}</button>}</div>}
    <p className="recent-audio-status" role="status">{audioError || (playing ? tr('正在播放练习音色演示，非原曲录音。') : '')}</p>
    <p className="settings-library-note">{tr('最近浏览仅保存在当前浏览器，最多保留 50 首，按账号分别记录。')}</p>
  </div>;
}
