import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, Camera, Check, ClockCounterClockwise, GoogleLogo, Heart, SignIn, UserCircle, X } from '@phosphor-icons/react';
import { tr, useLanguage } from './language.js';
import { SettingsLibrary } from './SettingsLibrary.jsx';
import { useCloudState } from './useCloudState.js';
import { useScoreHistory } from './score-history.js';
import { AccountBindings } from './AccountBindings.jsx';
import { prepareAvatar } from './profile-editor.js';
import { LoginHistory } from './LoginHistory.jsx';
import './account-settings.css';
import { ProfilePreferences } from './ProfilePreferences.jsx';

const sections = [
  { id: 'profile', title: '账号资料', icon: UserCircle, group: '用户设定' },
  { id: 'security', title: '登录记录', icon: ClockCounterClockwise, group: '用户设定' },
  { id: 'favorites', title: '我的收藏', icon: Heart, group: '我的音乐' },
  { id: 'scores', title: '我的乐谱', icon: BookOpen, group: '我的音乐' },
  { id: 'recent', title: '最近浏览', icon: ClockCounterClockwise, group: '我的音乐' },
];
const providerNames = { 'google.com': 'Google', 'github.com': 'GitHub', 'apple.com': 'Apple', 'phone': '手机号码', 'password': '邮箱' };

export function AccountSettings({ user, onClose, returnFocus, onSaveProfile, bindings, initialSection = 'profile' }) {
  const language = useLanguage(), dialog = useRef(null), close = useRef(onClose), content = useRef(null);
  const [favorites] = useCloudState('favorites', []);
  const [arrangements] = useCloudState('practice-favorites', [], 'classroom.practice.saved');
  const [recent] = useScoreHistory(user.uid, 'recent');
  const [practiced] = useScoreHistory(user.uid, 'practiced');
  const counts = { favorites: favorites.length, scores: new Set([...arrangements, ...practiced.map(item => `${item.songId}:${item.versionId}`)]).size, recent: recent.length };
  const [section, setSection] = useState(() => sections.some(item => item.id === initialSection) ? initialSection : 'profile');
  close.current = onClose;
  const name = user.displayName || user.providerData?.find(item => item.displayName)?.displayName || user.email?.split('@')[0] || tr('我的账号');
  const photo = user.photoURL || user.providerData?.find(item => item.photoURL)?.photoURL || import.meta.env.BASE_URL + 'assets/avatar-musician.png';
  const providers = [...new Set((user.providerData || []).map(item => item.providerId))];
  const current = sections.find(item => item.id === section);
  const [draftName, setDraftName] = useState(name), [draftPhoto, setDraftPhoto] = useState(photo);
  const [saving, setSaving] = useState(false), [readingPhoto, setReadingPhoto] = useState(false);
  const [bindingBusy, setBindingBusy] = useState(false);
  const [nameFeedback, setNameFeedback] = useState(null), [photoFeedback, setPhotoFeedback] = useState(null);
  const fileInput = useRef(null), fileRequest = useRef(0), savePending = useRef(false);
  const savedName = useRef(name), readingPending = useRef(false), deferredAction = useRef(null);
  const finishAction = success => {
    const action = deferredAction.current; deferredAction.current = null;
    if (success) action?.();
  };
  const leaveProfile = action => {
    if (bindingBusy) return;
    if (savePending.current || readingPending.current) { deferredAction.current = action; return; }
    const value = draftName.trim();
    if (section === 'profile' && value && value.length <= 100 && value !== savedName.current) {
      deferredAction.current = action; void saveName(); return;
    }
    action();
  };
  const selectSection = id => leaveProfile(() => { setSection(id); content.current?.scrollTo({ top: 0 }); });
  const requestClose = () => leaveProfile(onClose);
  close.current = requestClose;
  const choosePhoto = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const request = ++fileRequest.current;
    readingPending.current = true; setReadingPhoto(true); setPhotoFeedback(null);
    try {
      const result = await prepareAvatar(file);
      if (request !== fileRequest.current) return;
      readingPending.current = false; setReadingPhoto(false);
      savePending.current = true; setSaving(true); setPhotoFeedback({text:'正在保存…'});
      await onSaveProfile({displayName:savedName.current, photoURL:result});
      setDraftPhoto(result); setPhotoFeedback({text:'头像已保存。'});
      savePending.current = false; setSaving(false); finishAction(true);
    } catch (error) {
      if (request === fileRequest.current) {
        setPhotoFeedback({error:true,text:savePending.current ? '头像保存失败，请重新选择图片。' : error.message});
        finishAction(false);
      }
    } finally {
      if (request === fileRequest.current) { readingPending.current = false; savePending.current = false; setReadingPhoto(false); setSaving(false); }
    }
  };
  const saveName = async () => {
    if (savePending.current || bindingBusy || readingPending.current) return;
    const value = draftName.trim();
    if (!value || value.length > 100) {
      setNameFeedback({error:true,text:'请输入 1–100 个字符的显示名称。'}); return;
    }
    if (value === savedName.current) { setDraftName(value); return; }
    savePending.current = true; setSaving(true); setNameFeedback({text:'正在保存…'});
    let success = false;
    try {
      const result = await onSaveProfile({displayName:value});
      savedName.current = value; setDraftName(value); success = true;
      setNameFeedback({text:result?.syncPending ? '资料已保存，账号信息将在下次登录时重试同步。' : '已自动保存。'});
    } catch { setNameFeedback({error:true,text:'保存未完成，请检查网络后重试。',retry:true}); }
    finally { savePending.current = false; setSaving(false); finishAction(success); }
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
            <p className="settings-description">{tr(section === 'favorites' ? '喜欢的歌曲，随时回来继续练习。' : section === 'scores' ? '收藏编配、重拾练习，让你的乐谱井井有条。' : section === 'recent' ? '找回刚刚听见、看过的旋律。' : section === 'profile' ? '让音乐伙伴认识你。' : section === 'security' ? '查看当前会话与此浏览器保存的成功登录记录。' : '选择你习惯的语言，让每一次练习更自在。')}</p>{section === 'profile' && <img className="settings-profile-art" src={import.meta.env.BASE_URL + 'assets/account-settings/score-sprout.png'} alt="" aria-hidden="true"/>}</div>
            {['favorites', 'scores', 'recent'].includes(section) && <SettingsLibrary key={section} section={section} user={user} onClose={onClose}/>}
            {section === 'profile' && <div className="profile-editor" aria-busy={saving || readingPhoto}>
              <div className="profile-avatar-row">
                <button type="button" className="profile-avatar-trigger" aria-label={tr('更换头像')} title={`${tr('更换头像')} · ${tr('支持 JPG、PNG，最大 5 MB')} · ${tr('头像仅保存在当前浏览器，按账号分别保存。')}`} disabled={saving || bindingBusy || readingPhoto} onClick={() => fileInput.current?.click()}>
                <img className="profile-avatar" src={draftPhoto} alt={tr('我的头像')} referrerPolicy="no-referrer" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = import.meta.env.BASE_URL + 'assets/avatar-musician.png'; }}/>
                  <span className="profile-avatar-camera" aria-hidden="true"><Camera size={18}/></span>
                </button>
                <div className="profile-identity-editor">
              <div className="profile-name-row"><label htmlFor="profile-display-name">{tr('显示名称')}</label><div><input id="profile-display-name" value={draftName} onChange={event => { setDraftName(event.target.value); setNameFeedback(null); }} onBlur={saveName} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.blur(); } }} maxLength={100} required disabled={saving || bindingBusy || readingPhoto} aria-invalid={nameFeedback?.error || undefined} aria-describedby="profile-name-help profile-name-status"/><p id="profile-name-help">{tr('将显示在你的演奏作品和社区互动中。')}</p><div id="profile-name-status" className={`profile-field-feedback${nameFeedback?.error ? ' is-error' : ''}`} role={nameFeedback?.error ? 'alert' : 'status'}>{nameFeedback && tr(nameFeedback.text)}{nameFeedback?.retry && <button type="button" disabled={saving} onClick={saveName}>{tr('重试')}</button>}</div></div></div>
                  {readingPhoto && <p className="profile-field-feedback" role="status">{tr('正在读取…')}</p>}
                  {photoFeedback && <p className={`profile-field-feedback${photoFeedback.error ? ' is-error' : ''}`} role={photoFeedback.error ? 'alert' : 'status'}>{tr(photoFeedback.text)}</p>}
                </div>
                <input ref={fileInput} className="profile-file-input" type="file" accept="image/jpeg,image/png" aria-label={tr('选择头像')} onChange={choosePhoto} tabIndex={-1}/>
              </div>
              <section className="profile-account-info" aria-labelledby="profile-account-heading">
                <h3 id="profile-account-heading">{tr('账号信息')}</h3>
                <div className="profile-provider-line">{providers.includes('google.com') ? <GoogleLogo size={28} weight="bold" aria-hidden="true"/> : <SignIn size={24} aria-hidden="true"/>}<strong>{providers.filter(id => !['phone', 'password'].includes(id)).map(id => providerNames[id] || id).join(' / ') || tr(providers.includes('password') ? '邮箱密码登录' : providers.includes('phone') ? '手机号码' : '第三方账号')}{' '}{tr('已连接')}</strong><span className="binding-verified"><Check size={14}/>{tr('已登录')}</span></div>
                <AccountBindings user={user} service={bindings} profileSaving={saving || readingPhoto} onBusyChange={setBindingBusy}/>
              </section>
              <ProfilePreferences/>
            </div>}
            {section === 'security' && <LoginHistory uid={user.uid}/>}

          </div>
        </div>
      </div>
    </section>
  </div>, document.body);
}
