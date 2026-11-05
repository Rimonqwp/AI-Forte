import React, { useState } from 'react';
import { tr } from './language.js';
import { validatePasswordDraft, passwordError } from './account-bindings-service.js';

export function PasswordFields({ hasPassword, verifiedEmail, busy, resetWait, inputRef, onSave, onReset, onCancel, onEdit, onVerifyEmail }) {
  const [current, setCurrent] = useState(''), [password, setPassword] = useState(''), [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false), [error, setError] = useState(null);
  const edit = setter => event => { setter(event.target.value); setError(null); onEdit(); };
  const submit = async () => {
    try { validatePasswordDraft(password, confirmation, hasPassword ? current : undefined); }
    catch (error) { setError(passwordError(error)); return; }
    try { await onSave({ password, confirmation, currentPassword: current }); }
    finally { setCurrent(''); setPassword(''); setConfirmation(''); setVisible(false); }
  };
  return <fieldset className="binding-panel password-fields" disabled={busy} aria-label={tr(hasPassword ? '修改密码' : '设置密码')}>
    {!verifiedEmail ? <><p>{tr('请先验证绑定邮箱，再设置登录密码。')}</p><button type="button" className="binding-link" onClick={onVerifyEmail}>{tr('前往验证邮箱')}</button></> : <>
      {hasPassword && <><label htmlFor="password-current">{tr('当前密码')}</label><input ref={inputRef} id="password-current" type={visible ? 'text' : 'password'} autoComplete="current-password" maxLength={128} value={current} onChange={edit(setCurrent)}/></>}
      <label htmlFor="password-new">{tr('新密码')}</label><input ref={hasPassword ? undefined : inputRef} id="password-new" type={visible ? 'text' : 'password'} autoComplete="new-password" maxLength={128} value={password} onChange={edit(setPassword)} aria-describedby="password-help"/>
      <p id="password-help">{tr('使用 8–128 个字符，并满足账号的密码安全要求。')}</p>
      <label htmlFor="password-confirm">{tr('确认新密码')}</label><input id="password-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" maxLength={128} value={confirmation} onChange={edit(setConfirmation)}/>
      <label className="password-visibility"><input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)}/>{tr('显示密码')}</label>
      {error && <p className="password-error" role="alert">{tr(error)}</p>}
      <div className="password-submit"><button type="button" className="binding-link" onClick={onCancel}>{tr('取消')}</button><button type="button" className="binding-primary" disabled={busy} onClick={submit}>{tr(busy ? '处理中…' : hasPassword ? '更新密码' : '设置密码')}</button></div>
      {hasPassword && <div className="password-reset"><p>{tr('忘记当前密码？可向绑定邮箱发送重置邮件。')}</p><button type="button" className="binding-link" disabled={busy || resetWait > 0} onClick={onReset}>{resetWait ? `${resetWait}s` : tr('发送密码重置邮件')}</button></div>}
    </>}
  </fieldset>;
}
