import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GearSix, X } from '@phosphor-icons/react';
import { languages, setLanguage, tr, useLanguage } from './language.js';
import './account-settings.css';

export function AccountSettings({ user, onClose, returnFocus }) {
  const language = useLanguage(), dialog = useRef(null), close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled),select')];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      returnFocus?.focus();
    };
  }, [returnFocus]);
  const providers = [...new Set((user.providerData || []).map(item => ({ 'google.com': 'Google', 'github.com': 'GitHub', 'apple.com': 'Apple' }[item.providerId] || item.providerId)))];
  return createPortal(<div className="account-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-dialog account-settings" role="dialog" aria-modal="true" aria-labelledby="account-settings-title" tabIndex={-1} ref={dialog}>
      <button className="account-close" aria-label={tr('关闭账号设定')} onClick={onClose}><X size={22}/></button>
      <div className="account-mark"><GearSix size={32}/></div>
      <h2 id="account-settings-title">{tr('账号设定')}</h2>
      <h3>{tr('账号资料')}</h3>
      <dl className="account-settings-details">
        <div><dt>{tr('显示名称')}</dt><dd>{user.displayName || tr('未提供')}</dd></div>
        <div><dt>{tr('邮箱')}</dt><dd>{user.email || tr('未提供')}</dd></div>
        <div><dt>{tr('登录方式')}</dt><dd>{providers.join(' / ') || tr('未提供')}</dd></div>
      </dl>
      <label className="account-settings-language" htmlFor="account-settings-language">{tr('界面语言')}
        <select id="account-settings-language" value={language} onChange={event => setLanguage(event.target.value)}>{languages.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select>
      </label>
      <p>{tr('语言选择会自动保存在当前浏览器。')}</p>
      <button className="account-settings-done" onClick={onClose}>{tr('完成')}</button>
    </section>
  </div>, document.body);
}
