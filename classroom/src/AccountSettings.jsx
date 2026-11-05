import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowSquareOut, BookOpen, Camera, CaretRight, Check, ClockCounterClockwise, Globe, GoogleLogo, Heart, SignIn, ShieldCheck, UserCircle, X } from '@phosphor-icons/react';
import { languages, setLanguage, tr, useLanguage } from './language.js';
import { SettingsLibrary } from './SettingsLibrary.jsx';
import { useCloudState } from './useCloudState.js';
import { useScoreHistory } from './score-history.js';
import { AccountBindings } from './AccountBindings.jsx';
import { prepareAvatar } from './profile-editor.js';
import './account-settings.css';

const sections = [
  { id: 'profile', title: '账号资料', icon: UserCircle, group: '用户设定' },
  { id: 'security', title: '登录与安全', icon: ShieldCheck, group: '用户设定' },
  { id: 'favorites', title: '我的收藏', icon: Heart, group: '我的音乐' },
  { id: 'scores', title: '我的乐谱', icon: BookOpen, group: '我的音乐' },
  { id: 'recent', title: '最近浏览', icon: ClockCounterClockwise, group: '我的音乐' },
  { id: 'language', title: '语言', icon: Globe, group: '偏好设定' },
];
const providerNames = { 'google.com': 'Google', 'github.com': 'GitHub', 'apple.com': 'Apple', 'phone': '手机号码', 'password': '邮箱' };

export function AccountSettings({ user, onClose, returnFocus, onSaveProfile, bindings }) {
  const language = useLanguage(), dialog = useRef(null), close = useRef(onClose), content = useRef(null);
  const [favorites] = useCloudState('favorites', []);
  const [arrangements] = useCloudState('practice-favorites', [], 'classroom.practice.saved');
  const [recent] = useScoreHistory(user.uid, 'recent');
  const [practiced] = useScoreHistory(user.uid, 'practiced');
  const counts = { favorites: favorites.length, scores: new Set([...arrangements, ...practiced.map(item => `${item.songId}:${item.versionId}`)]).size, recent: recent.length };
  const [section, setSection] = useState('profile');
  close.current = onClose;
  const name = user.displayName || user.providerData?.find(item => item.displayName)?.displayName || user.email?.split('@')[0] || tr('我的账号');
  const photo = user.photoURL || user.providerData?.find(item => item.photoURL)?.photoURL || import.meta.env.BASE_URL + 'assets/avatar-musician.png';
  const providers = [...new Set((user.providerData || []).map(item => item.providerId))];
  const current = sections.find(item => item.id === section);
  const [draftName, setDraftName] = useState(name), [draftPhoto, setDraftPhoto] = useState(photo);
  const [saving, setSaving] = useState(false), [readingPhoto, setReadingPhoto] = useState(false);
  const [bindingBusy, setBindingBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const fileInput = useRef(null), fileRequest = useRef(0), savePending = useRef(false);
  const dirty = draftName !== name || draftPhoto !== photo;
  const resetDraft = () => {
    fileRequest.current++;
    setReadingPhoto(false); setDraftName(name); setDraftPhoto(photo); setFeedback(null);
    if (fileInput.current) fileInput.current.value = '';
  };
  const selectSection = id => {
    if (savePending.current || bindingBusy) return;
    resetDraft(); setSection(id); content.current?.scrollTo({ top: 0 });
  };
  const requestClose = () => { if (!savePending.current && !bindingBusy) onClose(); };
  close.current = requestClose;
  const choosePhoto = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const request = ++fileRequest.current;
    setReadingPhoto(true); setFeedback(null);
    try {
      const result = await prepareAvatar(file);
      if (request === fileRequest.current) setDraftPhoto(result);
    } catch (error) {
      if (request === fileRequest.current) setFeedback({ error: true, text: error.message });
    } finally { if (request === fileRequest.current) setReadingPhoto(false); }
  };
  const saveProfile = async event => {
    event.preventDefault();
    if (savePending.current || bindingBusy || readingPhoto) return;
    if (!draftName.trim() || draftName.trim().length > 100) {
      setFeedback({ error: true, text: '请输入 1–100 个字符的显示名称。' }); return;
    }
    savePending.current = true; setSaving(true); setFeedback(null);
    try {
      const result = await onSaveProfile({ displayName: draftName.trim(), photoURL: draftPhoto === photo ? undefined : draftPhoto });
      setDraftName(draftName.trim());
      setFeedback({ text: result?.syncPending ? '资料已保存，账号信息将在下次登录时重试同步。' : '资料已保存。' });
    } catch { setFeedback({ error: true, text: '保存未完成，请检查网络或浏览器存储后重试。' }); }
    finally { savePending.current = false; setSaving(false); }
  };
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...dialog.current.querySelectorAll('button:not(:disabled),select,input,a[href]')].filter(el => el.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      returnFocus?.focus();
    };
  }, [returnFocus]);
  return createPortal(<div className="account-backdrop settings-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) requestClose(); }}>
    <section className="account-settings" role="dialog" aria-modal="true" aria-labelledby="account-settings-title" tabIndex={-1} ref={dialog}>
      <aside className="settings-sidebar">
        <div className="settings-identity"><img src={photo} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = import.meta.env.BASE_URL + 'assets/avatar-musician.png'; }}/><div><strong>{name}</strong><span>{tr('账号设定')}</span></div></div>
        <nav className="settings-navigation" aria-label={tr('账号设定导航')}>
          {sections.map((item, index) => <React.Fragment key={item.id}>
            {(index === 0 || sections[index - 1].group !== item.group) && <span className="settings-nav-group">{tr(item.group)}</span>}
            <button aria-current={section === item.id ? 'page' : undefined} aria-controls="settings-content" onClick={() => selectSection(item.id)}><item.icon size={20}/>{tr(item.title)}{counts[item.id] !== undefined && <span>{counts[item.id]}</span>}</button>
          </React.Fragment>)}
        </nav>
        <div className="settings-sidebar-footer"><img className="settings-brand-logo" src={import.meta.env.BASE_URL + 'assets/brand/puyadao-sprout-icon.png'} alt={tr('谱芽岛')}/><div className="settings-footer-copy"><strong>{tr('谱芽岛')}</strong><small>{tr('让喜欢的歌，在指尖靠岸。')}</small></div></div>
      </aside>
      <div className="settings-workspace">
        <header className="settings-topbar"><div><span id="account-settings-title">{tr('账号设定')}</span><span className="settings-breadcrumb">/</span><strong>{tr(current.title)}</strong></div><button className="settings-close" aria-label={tr('关闭账号设定')} disabled={saving || bindingBusy} onClick={requestClose}><X size={20}/></button></header>
        <div className="settings-scroll" ref={content}>
          <div className={`settings-content${section === 'profile' ? ' settings-profile-content' : ''}`} id="settings-content" key={section}>
            <div className="settings-page-heading"><h2>{tr(current.title)}</h2>
            <p className="settings-description">{tr(section === 'favorites' ? '喜欢的歌曲，随时回来继续练习。' : section === 'scores' ? '收藏编配、重拾练习，让你的乐谱井井有条。' : section === 'recent' ? '找回刚刚听见、看过的旋律。' : section === 'profile' ? '让音乐伙伴认识你。' : section === 'security' ? '查看当前账号使用的登录方式。' : '选择你习惯的语言，让每一次练习更自在。')}</p>{section === 'profile' && <img className="settings-profile-art" src={import.meta.env.BASE_URL + 'assets/account-settings/score-sprout.png'} alt="" aria-hidden="true"/>}</div>
            {['favorites', 'scores', 'recent'].includes(section) && <SettingsLibrary key={section} section={section} user={user} onClose={onClose}/>}
            {section === 'profile' && <form className="profile-editor" noValidate onSubmit={saveProfile} aria-busy={saving}>
              <div className="profile-avatar-row">
                <img className="profile-avatar" src={draftPhoto} alt={tr('我的头像')} referrerPolicy="no-referrer" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = import.meta.env.BASE_URL + 'assets/avatar-musician.png'; }}/>
                <div className="profile-avatar-controls"><button type="button" className="profile-avatar-button" disabled={saving || bindingBusy || readingPhoto} onClick={() => fileInput.current?.click()}><Camera size={22}/>{tr(readingPhoto ? '正在读取…' : '更换头像')}</button><span>{tr('支持 JPG、PNG，最大 5 MB')}</span><small>{tr('头像仅保存在当前浏览器，按账号分别保存。')}</small></div>
                <input ref={fileInput} className="profile-file-input" type="file" accept="image/jpeg,image/png" aria-label={tr('选择头像')} onChange={choosePhoto} tabIndex={-1}/>
              </div>
              <div className="profile-name-row"><label htmlFor="profile-display-name">{tr('显示名称')}</label><div><input id="profile-display-name" value={draftName} onChange={event => { setDraftName(event.target.value); setFeedback(null); }} maxLength={100} required disabled={saving || bindingBusy} aria-describedby="profile-name-help"/><p id="profile-name-help">{tr('将显示在你的演奏作品和社区互动中。')}</p></div></div>
              <section className="profile-account-info" aria-labelledby="profile-account-heading">
                <h3 id="profile-account-heading">{tr('账号信息')}</h3>
                <div className="profile-provider-line">{providers.includes('google.com') ? <GoogleLogo size={28} weight="bold" aria-hidden="true"/> : <SignIn size={24} aria-hidden="true"/>}<strong>{providers.filter(id => !['phone', 'password'].includes(id)).map(id => providerNames[id] || id).join(' / ') || tr('第三方账号')}{' '}{tr('已连接')}</strong><span className="binding-verified"><Check size={14}/>{tr('已登录')}</span></div>
                <AccountBindings user={user} service={bindings} profileSaving={saving} onBusyChange={setBindingBusy}/>
              </section>
              <div className={`profile-feedback${feedback?.error ? ' is-error' : ''}`} role={feedback?.error ? 'alert' : 'status'}>{feedback && tr(feedback.text)}</div>
              <footer className="profile-editor-footer"><button type="button" className="profile-security-link" disabled={saving || bindingBusy} onClick={() => selectSection('security')}>{tr('登录与安全')}<CaretRight size={18}/></button><div><button type="button" className="profile-cancel" disabled={saving || bindingBusy} onClick={resetDraft}>{tr('取消')}</button><button type="submit" className="profile-save" disabled={saving || bindingBusy || readingPhoto || !dirty}>{tr(saving ? '正在保存…' : '保存修改')}</button></div></footer>
            </form>}
            {section === 'security' && <>
              <h3 className="settings-subheading">{tr('关联账号')}</h3>
              <div className="settings-connected-list">{providers.length ? providers.map(id => <div className="settings-connected" key={id}><ShieldCheck size={24}/><div><strong>{tr(providerNames[id] || id)}</strong><span>{tr('已关联')}</span></div><span className="settings-status"><Check size={14}/>{tr('当前登录方式')}</span></div>) : <p>{tr('未提供')}</p>}</div>
              <div className="settings-note"><ShieldCheck size={22}/><div><h3>{tr('第三方账号登录')}</h3><p>{tr('你通过关联账号登录谱芽岛，无需单独设置本站密码。密码与两步验证请在对应账号中管理。')}</p></div></div>
              {providers.includes('google.com') && <a className="settings-external" href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer">{tr('管理 Google 账号安全设置')}<ArrowSquareOut size={18}/></a>}
            </>}
            {section === 'language' && <>
              <fieldset className="settings-language-options"><legend>{tr('界面语言')}</legend>{languages.map(item => <label key={item.code} className={language === item.code ? 'selected' : ''}><span><strong>{item.label}</strong><small>{item.code === 'zh-CN' ? 'Simplified Chinese' : item.code === 'zh-TW' ? 'Traditional Chinese' : 'English'}</small></span><input type="radio" aria-label={item.label} name="settings-language" value={item.code} checked={language === item.code} onChange={() => setLanguage(item.code)}/></label>)}</fieldset>
              <p className="settings-saved" role="status"><Check size={17}/>{tr('语言选择会自动保存在当前浏览器。')}</p>
            </>}
          </div>
        </div>
      </div>
    </section>
  </div>, document.body);
}
