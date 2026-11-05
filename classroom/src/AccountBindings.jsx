import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, EnvelopeSimple, Phone, ArrowsClockwise } from '@phosphor-icons/react';
import { tr, useLanguage } from './language.js';
import { bindingError, maskPhone, normalizePhone } from './account-bindings-service.js';
import { phoneVerifier } from './firebase.js';
import './account-bindings.css';

export function AccountBindings({ user, service, profileSaving, onBusyChange }) {
  useLanguage();
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const [captchaReady, setCaptchaReady] = useState(false);
  const [panel, setPanel] = useState(null), [phone, setPhone] = useState('+852 '), [email, setEmail] = useState(user.email || '');
  const [code, setCode] = useState(''), [busy, setBusy] = useState(false), [notice, setNotice] = useState(null);
  const [emailShown, setEmailShown] = useState(false), [phoneShown, setPhoneShown] = useState(false);
  const [emailSent, setEmailSent] = useState(null), [phoneSent, setPhoneSent] = useState(null);
  const [phoneUntil, setPhoneUntil] = useState(0), [emailUntil, setEmailUntil] = useState(0), [now, setNow] = useState(Date.now());
  const modal = useRef(null), opener = useRef(null), rows = useRef(null);
  const verifier = useRef(null), verifierHost = useRef(null), pendingPhone = useRef(null), lock = useRef(false), alive = useRef(true), input = useRef(null);
  const phoneWait = Math.max(0, Math.ceil((phoneUntil - now) / 1000)), emailWait = Math.max(0, Math.ceil((emailUntil - now) / 1000));
  const clearVerifier = () => { verifier.current?.clear(); verifier.current = null; };
  useEffect(() => {
    alive.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { alive.current = false; clearInterval(timer); clearVerifier(); pendingPhone.current = null; };
  }, []);
  useEffect(() => {
    if (!panel) return;
    const node = modal.current;
    if (!node.open) node.showModal();
    input.current?.focus({ preventScroll: true });
    const scroller = document.querySelector('.settings-scroll');
    // Keep the existing scrollbar visible: hiding it changes the profile width.
    // The modal makes the background inert; block background scroll gestures too.
    const preventBackgroundScroll = event => event.preventDefault();
    scroller?.addEventListener('wheel', preventBackgroundScroll, { passive: false });
    scroller?.addEventListener('touchmove', preventBackgroundScroll, { passive: false });
    return () => {
      node.close();
      scroller?.removeEventListener('wheel', preventBackgroundScroll);
      scroller?.removeEventListener('touchmove', preventBackgroundScroll);
      if (opener.current?.isConnected) opener.current.focus({ preventScroll: true });
      else rows.current?.querySelector('button')?.focus({ preventScroll: true });
    };
  }, [panel]);
  const needCaptcha = panel === 'phone' && (!phoneSent || phoneWait === 0);
  useEffect(() => {
    if (!needCaptcha) return;
    let active = true;
    setCaptchaReady(false);
    try {
      const instance = phoneVerifier(verifierHost.current, {
        callback: () => { if (active) setCaptchaReady(true); },
        'expired-callback': () => { if (active) setCaptchaReady(false); },
      });
      verifier.current = instance;
      instance.render().catch(error => { if (active) setNotice({error:true,text:bindingError(error)}); });
    } catch (error) { setNotice({error:true,text:bindingError(error)}); }
    return () => { active = false; clearVerifier(); setCaptchaReady(false); };
  }, [needCaptcha, captchaAttempt]);
  const run = async action => {
    if (lock.current || profileSaving) return;
    lock.current = true; setBusy(true); onBusyChange(true); setNotice(null);
    try { await action(); }
    catch (error) { if (alive.current) setNotice({ error: true, text: bindingError(error), reauth: error.code === 'auth/requires-recent-login', retry: error.code === 'binding/refresh-failed' }); }
    finally { lock.current = false; if (alive.current) { setBusy(false); onBusyChange(false); } }
  };
  const open = next => {
    if (lock.current || profileSaving) return;
    if (next && !panel) opener.current = document.activeElement;
    pendingPhone.current = null; setCode(''); setPhoneSent(null); setNotice(null);
    setPanel(next);
    if (next === 'email') setEmail(user.email || '');
  };
  const sendPhone = () => run(async () => {
    if (phoneWait || !captchaReady || !verifier.current) return;
    normalizePhone(phone);
    pendingPhone.current = null; setPhoneSent(null);
    try {
      const result = await service.sendPhone(user.uid, phone, verifier.current);
      if (!alive.current) return;
      pendingPhone.current = result; setPhoneSent(result.phone); setCode('');
      setPhoneUntil(Date.now() + 60000); setNow(Date.now());
      setNotice({ text: '验证码已发送，请输入收到的 6 位短信验证码。' });
    } finally { setCaptchaReady(false); setCaptchaAttempt(value => value + 1); }
  });
  const confirmPhone = () => run(async () => {
    if (!pendingPhone.current) return;
    await pendingPhone.current.confirm(code);
    pendingPhone.current = null; setPhoneSent(null); setCode(''); setPanel(null);
    setNotice({ text: '手机号已绑定。' });
  });
  const sendEmail = () => run(async () => {
    if (emailWait) return;
    const url = new URL(window.location.href);
    url.searchParams.set('accountSettings', 'profile');
    const target = await service.sendEmail(user.uid, email, url.toString());
    setEmailSent(target); setEmailUntil(Date.now() + 60000); setNow(Date.now());
    setNotice({ text: '验证邮件已发送，请点击邮件中的链接，然后刷新绑定状态。' });
  });
  const refresh = () => run(async () => {
    const updated = await service.refresh(user.uid);
    if (emailSent && updated.email?.toLowerCase() === emailSent.toLowerCase() && updated.emailVerified) {
      setEmailSent(null); setPanel(null); setNotice({text:'邮箱已验证并绑定。'});
    } else setNotice({text:'账号状态已刷新；如刚收到验证邮件，请先完成邮件中的验证。'});
  });
  const maskedEmail = user.email ? user.email.replace(/^(.).*(@.*)$/, '$1••••••$2') : tr('未绑定');
  const disabled = busy || profileSaving;
  const feedback = notice && <div className={`binding-notice${notice.error ? ' is-error' : ''}`} role={notice.error ? 'alert' : 'status'}>{tr(notice.text)}{notice.reauth && user.providerData?.some(item => item.providerId === 'google.com') && <button type="button" className="binding-link" disabled={disabled} onClick={() => run(async () => { await service.reauthenticate(user.uid); setNotice({text:'登录已重新验证，请再次发送验证邮件。'}); })}>{tr('重新验证 Google 登录')}</button>}{notice.retry && <button type="button" className="binding-link" disabled={disabled} onClick={refresh}>{tr('刷新绑定状态')}</button>}</div>;
  return <div ref={rows} className="account-bindings" aria-busy={busy} onKeyDown={event => { if (event.key === 'Enter' && event.target.tagName === 'INPUT') event.preventDefault(); }}>
    <div className="binding-row"><Phone size={23} aria-hidden="true"/><div className="binding-row-main"><strong>{tr('手机号码')}</strong><span className={user.phoneNumber ? 'binding-verified' : 'binding-muted'}>{user.phoneNumber ? (phoneShown ? user.phoneNumber : maskPhone(user.phoneNumber)) : tr('未绑定')}</span><small>{tr(user.phoneNumber ? '已通过短信验证' : '验证手机号，关联到当前账号。')}</small></div>{user.phoneNumber ? <button type="button" className="binding-link" aria-pressed={phoneShown} onClick={() => setPhoneShown(!phoneShown)}>{tr(phoneShown ? '隐藏' : '显示')}</button> : <button type="button" className="binding-outline" disabled={disabled} aria-haspopup="dialog" aria-expanded={panel === 'phone'} onClick={() => open(panel === 'phone' ? null : 'phone')}>{tr('绑定手机')}</button>}</div>
    <div className="binding-row"><EnvelopeSimple size={23} aria-hidden="true"/><div className="binding-row-main"><strong>{tr('绑定邮箱')}</strong><span>{emailShown ? user.email || tr('未绑定') : maskedEmail}{user.emailVerified && <span className="binding-verified"><Check size={14}/>{tr('已验证')}</span>}</span><small>{tr('通过验证邮件确认邮箱归属，Google 登录保持不变。')}</small></div><div className="binding-row-actions">{user.email && <button type="button" className="binding-link" aria-pressed={emailShown} onClick={() => setEmailShown(!emailShown)}>{tr(emailShown ? '隐藏' : '显示')}</button>}<button type="button" className="binding-outline" disabled={disabled} aria-haspopup="dialog" aria-expanded={panel === 'email'} onClick={() => open(panel === 'email' ? null : 'email')}>{tr(user.emailVerified ? '更换邮箱' : '绑定邮箱')}</button></div></div>
    {!panel && feedback}
    {panel && createPortal(<dialog ref={modal} className="binding-modal" aria-labelledby="binding-modal-title" aria-describedby="binding-modal-description" aria-busy={busy}
      onCancel={event => { event.preventDefault(); open(null); }}
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Tab') {
          const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href],iframe')].filter(element => element.getClientRects().length);
          const first = controls[0], last = controls.at(-1);
          if (event.shiftKey && (document.activeElement === first || document.activeElement === event.currentTarget)) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && (document.activeElement === last || document.activeElement === event.currentTarget)) { event.preventDefault(); first?.focus(); }
        }
        if (event.key === 'Escape') { event.preventDefault(); open(null); }
        if (event.key === 'Enter' && event.target.tagName === 'INPUT') event.preventDefault();
      }}
      onPointerDown={event => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) open(null);
      }}>
      <header className="binding-modal-header"><div><h3 id="binding-modal-title">{tr(panel === 'phone' ? '绑定手机' : user.emailVerified ? '更换邮箱' : '绑定邮箱')}</h3><p id="binding-modal-description">{tr(panel === 'phone' ? '验证手机号，关联到当前账号。' : '验证完成后才会更新绑定邮箱。请在邮件中点击验证链接。')}</p></div><button type="button" className="binding-modal-close" aria-label={tr('关闭绑定窗口')} disabled={disabled} onClick={() => open(null)}><X size={22}/></button></header>
    {panel === 'phone' && <fieldset className="binding-panel" disabled={disabled} aria-label={tr('绑定手机')}>
      <label htmlFor="binding-phone">{tr('手机号码（含国家或地区代码）')}</label>
      <div className="binding-input-action"><input ref={input} id="binding-phone" type="tel" autoComplete="tel" placeholder="+852 9123 4567" value={phone} disabled={!!phoneSent || disabled} onChange={event => setPhone(event.target.value)}/><button type="button" onClick={sendPhone} disabled={disabled || phoneWait > 0 || !captchaReady}>{busy ? tr('处理中…') : phoneWait ? `${phoneWait}s` : tr(phoneSent ? '重新发送' : '发送验证码')}</button></div>
      <p>{tr('手机号将发送至 Google，用于身份验证与防滥用。')}</p>
      <div ref={verifierHost} className="binding-recaptcha"/>{needCaptcha && <p>{tr('请先完成安全验证，再发送短信验证码。')}</p>}
      {phoneSent && <><label htmlFor="binding-code">{tr('短信验证码')}</label><div className="binding-input-action"><input id="binding-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder={tr('输入 6 位验证码')} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))}/><button type="button" className="binding-primary" disabled={disabled || code.length !== 6} onClick={confirmPhone}>{tr('验证并绑定')}</button></div><button type="button" className="binding-link" disabled={disabled} onClick={() => { pendingPhone.current = null; setPhoneSent(null); setCode(''); }}>{tr('修改手机号')}</button></>}
      <button type="button" className="binding-link binding-cancel" onClick={() => open(null)}>{tr('取消')}</button>
    </fieldset>}
    {panel === 'email' && <fieldset className="binding-panel" disabled={disabled} aria-label={tr('绑定邮箱')}>
      <label htmlFor="binding-email">{tr('要绑定的邮箱')}</label><div className="binding-input-action"><input ref={input} id="binding-email" type="email" autoComplete="email" maxLength={254} value={email} placeholder="name@example.com" onChange={event => setEmail(event.target.value)}/><button type="button" onClick={sendEmail} disabled={disabled || emailWait > 0 || (user.emailVerified && email.trim().toLowerCase() === user.email?.toLowerCase())}>{busy ? tr('处理中…') : emailWait ? `${emailWait}s` : tr('发送验证邮件')}</button></div>
      <div className="binding-panel-actions"><button type="button" className="binding-link" onClick={refresh}><ArrowsClockwise size={17}/>{tr('刷新绑定状态')}</button><button type="button" className="binding-link" onClick={() => open(null)}>{tr('取消')}</button></div>
    </fieldset>}
      {feedback}
    </dialog>, document.body)}
    <p className="binding-footnote">{tr('绑定通过验证即时生效，无需点击“保存修改”。')}</p>
  </div>;
}
