import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowsClockwise, Check, ClockCounterClockwise, Desktop, SignIn } from '@phosphor-icons/react';
import { tr, useLanguage } from './language.js';
import { loginHistory, describeLoginDevice } from './login-history-store.js';
import { readAccountLoginSession } from './firebase.js';
import './login-history.css';

const providerNames = {'google.com':'Google', password:'邮箱密码', phone:'手机号码', 'github.com':'GitHub', 'apple.com':'Apple', custom:'其他登录方式'};
export function LoginHistory({ uid, loadSession = readAccountLoginSession, history = loginHistory }) {
  const language = useLanguage(), store = history.forUser(uid);
  const records = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [session, setSession] = useState(null), [status, setStatus] = useState('loading'), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let live = true;
    setStatus('loading'); setSession(null);
    loadSession(uid).then(value => { if (live) { setSession(value); setStatus(value ? 'ready' : 'error'); } }).catch(() => { if (live) setStatus('error'); });
    return () => { live = false; };
  }, [uid, loadSession, attempt]);
  const time = at => new Intl.DateTimeFormat(language, {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(at);
  const device = describeLoginDevice(navigator.userAgent) || tr('设备信息未提供');
  return <div className="login-history">
    <section className="login-session" aria-labelledby="login-session-title" aria-busy={status === 'loading'}>
      <header><span className="login-device-icon"><Desktop size={25}/></span><div><h3 id="login-session-title">{tr('当前会话')}</h3><p>{tr('此设备上正在使用的登录会话')}</p></div><span className="login-active"><Check size={14}/>{tr('登录中')}</span></header>
      {status === 'loading' ? <p role="status">{tr('正在读取登录信息…')}</p> : status === 'error' ? <div className="login-history-error" role="alert"><p>{tr('暂时无法读取当前登录信息。')}</p><button type="button" onClick={() => setAttempt(value => value + 1)}><ArrowsClockwise size={16}/>{tr('重试')}</button></div> : <dl className="login-session-details"><div><dt>{tr('登录时间')}</dt><dd><time dateTime={new Date(session.at).toISOString()}>{time(session.at)}</time></dd></div><div><dt>{tr('登录方式')}</dt><dd>{tr(providerNames[session.provider] || '其他登录方式')}</dd></div><div><dt>{tr('当前设备')}</dt><dd>{device}</dd></div></dl>}
    </section>
    <div className="login-history-heading"><h3>{tr('最近登录')}</h3><span>{tr('本浏览器 · 最近 50 条')}</span></div>
    {records.length ? <ol className="login-history-list" aria-label={tr('最近登录')}>
      {records.map(item => <li key={`${item.at}:${item.provider}`}><span className="login-event-icon"><SignIn size={21}/></span><div><strong>{tr(providerNames[item.provider] || '其他登录方式')}<span className="login-success">{tr('登录成功')}</span></strong><p>{item.device || tr('设备信息未提供')}</p></div><time dateTime={new Date(item.at).toISOString()}>{time(item.at)}</time></li>)}
    </ol> : <div className="login-history-empty"><ClockCounterClockwise size={29}/><h3>{tr('还没有保存的登录记录')}</h3><p>{tr('之后在此浏览器成功登录时，会自动记录在这里。')}</p></div>}
    <p className="login-history-note">{tr('时间按当前设备时区显示。历史记录仅保存在此浏览器，按账号分别保存，最多 50 条；不包含其他设备、失败尝试或更早的登录。')}</p>
  </div>;
}
