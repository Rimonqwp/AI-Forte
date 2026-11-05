import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppleLogo, GithubLogo, GoogleLogo, MusicNotes, ShieldCheck, X } from '@phosphor-icons/react';
import { authErrorMessage } from './account-data.js';
import { tr } from './language.js';

export function AuthDialog({ user, busy, error, onLogin, onRetry, onClose }) {
  const dialog = useRef(null), close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; dialog.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const buttons = [...dialog.current.querySelectorAll('button:not(:disabled),a[href]')];
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
      {retry ? <button className="account-provider" disabled={busy} onClick={onRetry}>{tr(busy ? '正在同步…' : '重试账号同步')}</button> : <div className="account-providers">
        <button className="account-provider google" disabled={busy} onClick={() => onLogin('google.com')}><GoogleLogo size={22} weight="bold"/><span>{tr(busy ? '正在连接 Google…' : '使用 Google 继续')}<small>{tr('支持 Gmail 和其他 Google 账号')}</small></span></button>
        <button className="account-provider" disabled><GithubLogo size={23} weight="fill"/><span>GitHub</span><small>{tr('暂未开放')}</small></button>
        <button className="account-provider" disabled><AppleLogo size={24} weight="fill"/><span>Apple</span><small>{tr('暂未开放')}</small></button>
      </div>}
      <p className="account-privacy"><ShieldCheck size={16}/>{tr('仅用于身份验证，不读取你的邮件或代码仓库。')}</p>
      <p className="account-preserve">{tr('当前访客的收藏与进度会随登录保留。')}</p>
      <button className="account-later" disabled={busy} onClick={onClose}>{tr('先逛逛，稍后登录')}</button>
    </section>
  </div>, document.body);
}
