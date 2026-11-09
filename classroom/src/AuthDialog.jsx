import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, EnvelopeSimple, Eye, EyeSlash, Heart, LockKey, X } from '@phosphor-icons/react';
import { ClassroomHeader } from './ClassroomHeader.jsx';
import { BrandIdentity } from './BrandIdentity.jsx';
import { useAccount } from './account-context.js';
import { authErrorMessage } from './account-data.js';
import { tr, useLanguage } from './language.js';
import './login-page.css';

const assets = import.meta.env.BASE_URL + 'assets/';
const artwork = assets + 'login/';
export function AuthDialog({ user, busy, error, onLogin, onPasswordLogin, onPasswordReset, onRetry, onClose }) {
  useLanguage();
  const account = useAccount();
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [visiblePassword, setVisiblePassword] = useState(false), [remember, setRemember] = useState(true);
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

  return createPortal(<section className="login-page" role="dialog" aria-modal="true" aria-labelledby="login-page-title" aria-busy={busy} tabIndex={-1} ref={page}>
    <div className="login-page-shell" inert={help ? true : undefined}>
      <ClassroomHeader idPrefix="login-header" assets={assets} isSearchPage={false} isAuthPage
        onHome={() => navigate('home')} onResults={value => navigate('scores', value)}
        onCommunity={() => navigate('community')} onOpen={value => navigate('open', value)}
        onCheckIn={() => navigate('checkin')} onSettings={value => navigate('settings', value)}/>
      <main className="login-scene">
        <img className="login-background" src={artwork + 'mirrored-room-v3.png'} alt={tr('夕阳照进音乐教室，女孩戴着耳机弹尤克里里，小猫在柔软的地毯上安睡')}/>
        <section className="login-card" aria-label={tr('账号登录')}>
          <button className="login-close" aria-label={tr('关闭登录窗口')} disabled={busy} onClick={onClose}><X size={19}/></button>
          <div className="login-panel-brand brand"><BrandIdentity/></div>
          <h1 id="login-page-title" className="login-title">{tr(retry ? '完成账号同步' : '欢迎回来！')}</h1>
          <p className="login-subtitle"><Heart size={24} weight="light" aria-hidden="true"/><span>{tr('继续你的音乐学习之旅')}</span><Heart size={20} weight="light" aria-hidden="true"/></p>
          <img className="login-cat-peek" src={artwork + 'cat-peek-v3.png'} alt=""/>
          <div className="login-form-panel">
            {error && <div className="login-message is-error" role="alert">{tr(authErrorMessage(error))}</div>}
            {retry ? <button className="login-submit" disabled={busy} onClick={onRetry}>{tr(busy ? '正在同步…' : '重试账号同步')}</button> : <>
              <button className="login-google" disabled={busy} onClick={() => onLogin('google.com', remember)}><img src={artwork + 'google.svg'} alt=""/><span>{tr(busy ? '正在登录…' : '继续使用 Google')}</span></button>
              <div className="login-method-divider"><span>{tr('邮箱登录')}</span></div>
              <form className="login-form" onSubmit={async event => { event.preventDefault(); try { await onPasswordLogin(email, password, remember); } finally { setPassword(''); } }}>
                <label className="login-field"><EnvelopeSimple size={29} weight="regular" aria-hidden="true"/><span className="login-sr-only">{tr('邮箱')}</span><input aria-label={tr('邮箱账号')} name="email" type="email" autoComplete="username" placeholder={tr('邮箱')} required maxLength={254} disabled={busy} value={email} onChange={event => { setEmail(event.target.value); setResetSent(false); }}/></label>
                <label className="login-field"><LockKey size={29} weight="regular" aria-hidden="true"/><span className="login-sr-only">{tr('密码')}</span><input aria-label={tr('密码')} name="password" type={visiblePassword ? 'text' : 'password'} autoComplete="current-password" placeholder={tr('密码')} required maxLength={128} disabled={busy} value={password} onChange={event => setPassword(event.target.value)}/><button type="button" className="login-password-visibility" aria-label={tr(visiblePassword ? '隐藏密码' : '显示密码')} aria-pressed={visiblePassword} disabled={busy} onClick={() => setVisiblePassword(value => !value)}>{visiblePassword ? <Eye size={25} weight="regular"/> : <EyeSlash size={25} weight="regular"/>}</button></label>
                <div className="login-options">
                  <label className="login-remember"><input type="checkbox" role="switch" checked={remember} disabled={busy} onChange={event => setRemember(event.target.checked)}/><span>{tr('记住我')}</span></label>
                  <button type="button" className="login-text-link login-reset" disabled={busy} onClick={event => openHelp('reset', event)}>{tr('忘记密码？')}</button>
                </div>
                <button type="submit" className="login-submit" disabled={busy}>{tr(busy ? '正在登录…' : '开始登录')}</button>
              </form>
            </>}
          </div>
          <button className="login-security" type="button" aria-label={tr('服务条款')} onClick={event => openHelp('terms', event)} disabled={busy}>
            <img src={artwork + 'laurel-v2.png'} alt=""/><BookOpen size={27} weight="light" aria-hidden="true"/><span>{tr('登录后可继续练习、查看乐谱与社区内容')}</span><img className="mirrored" src={artwork + 'laurel-v2.png'} alt=""/>
          </button>
        </section>
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
