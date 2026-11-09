import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, BookOpen, ChartBar, Check, CheckCircle, Devices, EnvelopeSimple, Eye, EyeSlash, GraduationCap, Heart, LockKey, MusicNotes, ShieldCheck, Target, UsersThree, X } from '@phosphor-icons/react';
import { ClassroomHeader } from './ClassroomHeader.jsx';
import { useAccount } from './account-context.js';
import { authErrorMessage } from './account-data.js';
import { tr, useLanguage } from './language.js';
import './login-page.css';

const assets = import.meta.env.BASE_URL + 'assets/';
const artwork = assets + 'login/';
const features = [
  { Icon: BookOpen, title: '海量精选乐谱', description: '从流行到经典，总有你想弹的歌' },
  { Icon: Target, title: '跟弹练习模式', description: '边看边弹，轻松上手' },
  { Icon: ChartBar, title: '系统化提升', description: '由入门到进阶，稳步提高演奏力' },
  { Icon: UsersThree, title: '音乐社区交流', description: '分享作品、交流经验，遇见同好' },
];
const statistics = [
  { Icon: UsersThree, value: '200万+', description: '音乐学习者的选择', demo: true },
  { Icon: MusicNotes, value: '50万+', description: '高质量乐谱资源', demo: true },
  { Icon: GraduationCap, value: '100+', description: '系统化课程内容', demo: true },
  { Icon: Devices, value: '多设备同步', description: '随时随地继续练习' },
];

export function AuthDialog({ user, busy, error, onLogin, onPasswordLogin, onPasswordReset, onRetry, onClose }) {
  useLanguage();
  const account = useAccount();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false), [remember, setRemember] = useState(false);
  const [agreed, setAgreed] = useState(true), [agreementError, setAgreementError] = useState(false);
  const [help, setHelp] = useState(null), [resetSent, setResetSent] = useState(false);
  const page = useRef(null), helpDialog = useRef(null), helpTrigger = useRef(null);
  const latest = useRef({ busy, help, onClose });
  latest.current = { busy, help, onClose };
  const retry = !!user && !user.isAnonymous && !!error;

  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    const root = document.getElementById('root'), previousInert = root?.inert;
    document.body.style.overflow = 'hidden';
    if (root) root.inert = true;
    page.current?.focus({ preventScroll: true });
    const keydown = event => {
      if (event.isComposing) return;
      const current = latest.current;
      if (event.key === 'Escape') {
        if (page.current?.querySelector('.site-header button[aria-expanded="true"]')) return;
        event.preventDefault(); event.stopImmediatePropagation();
        if (current.busy) return;
        if (current.help) setHelp(null); else current.onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const container = current.help ? helpDialog.current : page.current;
      const controls = [...container.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')]
        .filter(element => element.getClientRects().length && !element.closest('[inert]'));
      const first = controls[0], last = controls.at(-1);
      if (!first) { event.preventDefault(); container.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === container)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === container)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.body.style.overflow = overflow;
      if (root) root.inert = previousInert;
      document.removeEventListener('keydown', keydown, true);
      previous?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!help) return;
    helpDialog.current?.focus({ preventScroll: true });
    return () => helpTrigger.current?.focus({ preventScroll: true });
  }, [help]);

  const openHelp = (type, event) => { helpTrigger.current = event.currentTarget; setHelp(type); };
  const navigate = (action, value) => {
    if (busy) return;
    onClose();
    requestAnimationFrame(() => {
      if (action === 'settings') account.openSettings(value);
      else window.dispatchEvent(new CustomEvent('classroom:login-navigation', { detail: { action, value } }));
    });
  };
  const checkAgreement = () => { setAgreementError(!agreed); return agreed; };

  return createPortal(<section className="login-page" role="dialog" aria-modal="true" aria-labelledby="login-page-title" aria-busy={busy} tabIndex={-1} ref={page}>
    <div className="login-page-shell" inert={help ? true : undefined}>
      <ClassroomHeader idPrefix="login-header" assets={assets} isSearchPage={false}
        onHome={() => navigate('home')} onResults={value => navigate('scores', value)}
        onCommunity={() => navigate('community')} onOpen={value => navigate('open', value)}
        onCheckIn={() => navigate('checkin')} onSettings={value => navigate('settings', value)}/>
      <main className="login-scene">
        <header className="login-introduction">
          <h1 id="login-page-title"><MusicNotes className="login-title-note" weight="light" aria-hidden="true"/><span>{tr('登录谱芽岛，')}<br className="login-mobile-break"/>{tr('开始你的')}<em>{tr('音乐练习')}<img src={artwork + 'handdrawn-underline.png'} alt=""/></em></span><Heart className="login-title-heart" weight="light" aria-hidden="true"/></h1>
          <div className="login-promises">{['海量优质乐谱', '智能跟弹练习', '系统化提升演奏力'].map(text => <span key={text}><CheckCircle size={26} aria-hidden="true"/>{tr(text)}</span>)}</div>
        </header>

        <div className="login-card">
          <button className="login-close" aria-label={tr('关闭登录窗口')} disabled={busy} onClick={onClose}><X size={19}/></button>
          <section className="login-story" aria-label={tr('在谱芽岛，让音乐学习更简单、更有趣！')}>
            <div className="login-story-heading"><MusicNotes size={33} weight="light" aria-hidden="true"/><h2>{tr('在谱芽岛，')}<br/>{tr('让音乐学习更简单、更有趣！')}</h2><img src={artwork + 'handdrawn-underline.png'} alt=""/></div>
            <img className="login-island" src={artwork + 'spring-island.png'} alt=""/>
            <img className="login-character" src={artwork + 'girl-ukulele-cat.png'} alt={tr('女孩戴着耳机弹尤克里里，小猫在身旁安睡')}/>
            <div className="login-feature-list">{features.map(({ Icon, title, description }) => <div className="login-feature" key={title}><Icon size={38} weight="light" aria-hidden="true"/><span><strong>{tr(title)}</strong><small>{tr(description)}</small></span></div>)}</div>
          </section>

          <section className="login-form-panel" aria-label={tr('账号登录')}>
            <h2 className="login-welcome"><MusicNotes size={44} weight="light" aria-hidden="true"/><span>{tr(retry ? '完成账号同步' : '欢迎回来，谱芽岛的音乐学习者！')}</span><Heart size={23} weight="light" aria-hidden="true"/></h2>
            {error && <div className="login-message is-error" role="alert">{tr(authErrorMessage(error))}</div>}
            {retry ? <button className="login-submit" disabled={busy} onClick={onRetry}>{tr(busy ? '正在同步…' : '重试账号同步')}</button> : <>
              <button className="login-google" disabled={busy} onClick={() => { if (checkAgreement()) onLogin('google.com', remember); }}><img src={artwork + 'google.svg'} alt=""/><span>{tr(busy ? '正在登录…' : '谷歌快捷登录')}</span></button>
              <div className="login-method-divider"><span>{tr('或使用邮箱')}</span></div>
              <form className="login-form" onSubmit={async event => { event.preventDefault(); if (!checkAgreement()) return; try { await onPasswordLogin(email, password, remember); } finally { setPassword(''); } }}>
                <label className="login-field"><EnvelopeSimple size={27} weight="light" aria-hidden="true"/><span className="login-sr-only">{tr('邮箱账号')}</span><input aria-label={tr('邮箱账号')} name="email" type="email" autoComplete="username" placeholder={tr('邮箱账号')} required maxLength={254} disabled={busy} value={email} onChange={event => { setEmail(event.target.value); setResetSent(false); }}/></label>
                <label className="login-field"><LockKey size={27} weight="light" aria-hidden="true"/><span className="login-sr-only">{tr('密码')}</span><input aria-label={tr('密码')} name="password" type={visiblePassword ? 'text' : 'password'} autoComplete="current-password" placeholder={tr('输入密码')} required maxLength={128} disabled={busy} value={password} onChange={event => setPassword(event.target.value)}/><button type="button" className="login-password-visibility" aria-label={tr(visiblePassword ? '隐藏密码' : '显示密码')} aria-pressed={visiblePassword} disabled={busy} onClick={() => setVisiblePassword(value => !value)}>{visiblePassword ? <Eye size={24} weight="light"/> : <EyeSlash size={24} weight="light"/>}</button></label>
                <div className="login-options">
                  <div className="login-agreement"><label><input type="checkbox" checked={agreed} disabled={busy} onChange={event => { setAgreed(event.target.checked); setAgreementError(false); }}/><Check className="login-checkbox-check" size={15} weight="bold" aria-hidden="true"/><span>{tr('同意')}</span></label><button type="button" className="login-text-link" disabled={busy} onClick={event => openHelp('terms', event)}>{tr('服务条款')}</button></div>
                  <label className="login-remember"><input type="checkbox" checked={remember} disabled={busy} onChange={event => setRemember(event.target.checked)}/><Check className="login-checkbox-check" size={15} weight="bold" aria-hidden="true"/><span>{tr('记住我')}</span></label>
                  <button type="button" className="login-text-link login-reset" disabled={busy} onClick={event => openHelp('reset', event)}>{tr('找回密码')}</button>
                </div>
                {agreementError && <p className="login-message is-error" role="alert">{tr('请先阅读并同意服务条款。')}</p>}
                <button type="submit" className="login-submit" disabled={busy}><span>{tr(busy ? '正在登录…' : '立即登录')}</span><ArrowRight size={30} weight="light" aria-hidden="true"/></button>
              </form>
            </>}
            <p className="login-security"><ShieldCheck size={25} weight="light" aria-hidden="true"/><span>{tr('安全登录，支持多设备同步学习记录')}</span></p>
          </section>
        </div>

        <footer className="login-statistics" aria-label={tr('音乐学习概览')}>
          <img className="login-laurel" src={artwork + 'laurel.png'} alt=""/>
          <div className="login-statistics-items">{statistics.map(({ Icon, value, description, demo }) => <div className="login-statistic" key={value}><Icon size={45} weight="light" aria-hidden="true"/><span><strong>{tr(value)}{demo && <sup>{tr('示例')}</sup>}</strong><small>{tr(description)}</small></span></div>)}</div>
          <img className="login-laurel mirrored" src={artwork + 'laurel.png'} alt=""/>
        </footer>
      </main>
    </div>
    {help && <div className="login-help-backdrop" onPointerDown={event => { if (!busy && event.target === event.currentTarget) setHelp(null); }}><section className="login-help-dialog" role="dialog" aria-modal="true" aria-labelledby="login-help-title" ref={helpDialog} tabIndex={-1}>
      <button className="login-close" aria-label={tr('关闭')} disabled={busy} onClick={() => setHelp(null)}><X size={21}/></button>
      <h2 id="login-help-title">{tr(help === 'reset' ? '找回密码' : '服务条款')}</h2>
      {help === 'reset' ? <form onSubmit={async event => { event.preventDefault(); setPassword(''); setResetSent(await onPasswordReset(email)); }}>
        <p>{tr('请输入账号绑定的邮箱，我们会向该邮箱发送密码重置链接。')}</p>
        <label className="login-field"><EnvelopeSimple size={24}/><span className="login-sr-only">{tr('找回密码邮箱')}</span><input type="email" autoComplete="email" aria-label={tr('找回密码邮箱')} required maxLength={254} value={email} placeholder={tr('邮箱账号')} disabled={busy} onChange={event => { setEmail(event.target.value); setResetSent(false); }}/></label>
        {error && <p className="login-message is-error" role="alert">{tr(authErrorMessage(error))}</p>}
        {resetSent && <p className="login-message" role="status">{tr('如该邮箱支持密码登录，你会收到密码重置邮件。')}</p>}
        <button className="login-submit" disabled={busy || resetSent}>{tr(busy ? '正在发送…' : resetSent ? '邮件已发送' : '发送重置邮件')}</button>
      </form> : <div className="login-terms"><p>{tr('谱芽岛目前提供音乐学习体验演示，部分乐谱、社区内容和展示数据为示例。')}</p><p>{tr('登录用于关联账号、收藏和学习进度；请妥善保管账号，并仅上传或使用你有权使用的内容。')}</p><p>{tr('“记住我”会在此浏览器保留登录状态；不勾选时，登录状态仅在当前会话内保留。')}</p><p>{tr('此处为演示使用说明，正式服务条款以网站后续公布的版本为准。')}</p><button className="login-submit" onClick={() => setHelp(null)}>{tr('返回登录')}</button></div>}
    </section></div>}
  </section>, document.body);
}
