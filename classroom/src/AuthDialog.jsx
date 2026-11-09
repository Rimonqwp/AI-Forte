import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GoogleLogo, MusicNotes, X } from '@phosphor-icons/react';
import { authErrorMessage } from './account-data.js';
import { tr } from './language.js';

export function AuthDialog({ user, busy, error, onLogin, onPasswordLogin, onPasswordReset, onRetry, onClose }) {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [resetSent, setResetSent] = useState(false);
  const dialog = useRef(null), close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const buttons = [...dialog.current.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href]')];
      if (!buttons.length) { event.preventDefault(); dialog.current.focus(); return; }
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  const retry = !!user && !user.isAnonymous && !!error;
  return createPortal(<div className="account-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title" aria-describedby="account-description" aria-busy={busy} tabIndex={-1} ref={dialog}>
      <button className="account-close" aria-label={tr('关闭登录窗口')} disabled={busy} onClick={onClose}><X size={22}/></button>
      <div className="account-mark"><MusicNotes size={34} weight="duotone"/></div>
      <span className="account-eyebrow">{tr('欢迎来到谱芽岛')}</span>
      <h2 id="account-title">{tr(retry ? '完成账号同步' : '让每一次练习，都留下足迹')}</h2>
      <p id="account-description">{tr('登录后，在不同设备上找回你的收藏和学习进度。')}</p>
      {error && <div className="account-error" role="alert">{tr(authErrorMessage(error))}</div>}
      {retry ? <button className="account-provider" disabled={busy} onClick={onRetry}>{tr(busy ? '正在同步…' : '重试账号同步')}</button> : <>
        <div className="account-password-section"><form className="account-password-form" onSubmit={async event => { event.preventDefault(); try { await onPasswordLogin(email, password); } finally { setPassword(''); } }}>
          <label htmlFor="login-email">{tr('邮箱')}</label><input id="login-email" type="email" autoComplete="username" required maxLength={254} disabled={busy} value={email} onChange={event => { setEmail(event.target.value); setResetSent(false); }}/>
          <label htmlFor="login-password">{tr('密码')}</label><input id="login-password" type="password" autoComplete="current-password" required maxLength={128} disabled={busy} value={password} onChange={event => setPassword(event.target.value)}/>
          <button type="submit" className="account-password-submit" disabled={busy}>{tr(busy ? '正在登录…' : '登录')}</button>
          <button type="button" className="binding-link" disabled={busy || !email.trim() || resetSent} onClick={async () => { setPassword(''); setResetSent(await onPasswordReset(email)); }}>{tr('忘记密码？')}</button>
          {resetSent && <p role="status">{tr('如该邮箱支持密码登录，你会收到密码重置邮件。')}</p>}
        </form></div>
        <div className="account-providers">
          <button className="account-provider google" disabled={busy} onClick={() => onLogin('google.com')}><GoogleLogo size={22} weight="bold"/><span>{tr(busy ? '正在连接 Google…' : '使用 Google 继续')}<small>{tr('支持 Gmail 和其他 Google 账号')}</small></span></button>
        </div>
      </>}
      <button className="account-later" disabled={busy} onClick={onClose}>{tr('先逛逛，稍后登录')}</button>
    </section>
  </div>, document.body);
}
