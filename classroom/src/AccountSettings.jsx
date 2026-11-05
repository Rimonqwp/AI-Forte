import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowSquareOut, BookOpen, Check, ClockCounterClockwise, Globe, Heart, ShieldCheck, UserCircle, X } from '@phosphor-icons/react';
import { languages, setLanguage, tr, useLanguage } from './language.js';
import { SettingsLibrary } from './SettingsLibrary.jsx';
import { useCloudState } from './useCloudState.js';
import { useScoreHistory } from './score-history.js';
import './account-settings.css';

const sections = [
  { id: 'profile', title: '账号资料', icon: UserCircle, group: '用户设定' },
  { id: 'security', title: '登录与安全', icon: ShieldCheck, group: '用户设定' },
  { id: 'favorites', title: '我的收藏', icon: Heart, group: '我的音乐' },
  { id: 'scores', title: '我的乐谱', icon: BookOpen, group: '我的音乐' },
  { id: 'recent', title: '最近浏览', icon: ClockCounterClockwise, group: '我的音乐' },
  { id: 'language', title: '语言', icon: Globe, group: '偏好设定' },
];
const providerNames = { 'google.com': 'Google', 'github.com': 'GitHub', 'apple.com': 'Apple' };

export function AccountSettings({ user, onClose, returnFocus }) {
  const language = useLanguage(), dialog = useRef(null), close = useRef(onClose), content = useRef(null);
  const [favorites] = useCloudState('favorites', []);
  const [arrangements] = useCloudState('practice-favorites', [], 'classroom.practice.saved');
  const [recent] = useScoreHistory(user.uid, 'recent');
  const [practiced] = useScoreHistory(user.uid, 'practiced');
  const counts = { favorites: favorites.length, scores: new Set([...arrangements, ...practiced.map(item => `${item.songId}:${item.versionId}`)]).size, recent: recent.length };
  const [section, setSection] = useState('profile'), [emailVisible, setEmailVisible] = useState(false);
  close.current = onClose;
  const name = user.displayName || user.providerData?.find(item => item.displayName)?.displayName || user.email?.split('@')[0] || tr('我的账号');
  const photo = user.photoURL || user.providerData?.find(item => item.photoURL)?.photoURL || import.meta.env.BASE_URL + 'assets/avatar-musician.png';
  const providers = [...new Set((user.providerData || []).map(item => item.providerId))];
  const email = user.email || tr('未提供');
  const maskedEmail = user.email ? user.email.replace(/^(.).*(@.*)$/, '$1••••••$2') : email;
  const current = sections.find(item => item.id === section);
  const selectSection = id => { setSection(id); content.current?.scrollTo({ top: 0 }); };
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
  return createPortal(<div className="account-backdrop settings-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="account-settings" role="dialog" aria-modal="true" aria-labelledby="account-settings-title" tabIndex={-1} ref={dialog}>
      <aside className="settings-sidebar">
        <div className="settings-identity"><img src={photo} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = import.meta.env.BASE_URL + 'assets/avatar-musician.png'; }}/><div><strong>{name}</strong><span>{tr('账号设定')}</span></div></div>
        <nav className="settings-navigation" aria-label={tr('账号设定导航')}>
          {sections.map((item, index) => <React.Fragment key={item.id}>
            {(index === 0 || sections[index - 1].group !== item.group) && <span className="settings-nav-group">{tr(item.group)}</span>}
            <button aria-current={section === item.id ? 'page' : undefined} aria-controls="settings-content" onClick={() => selectSection(item.id)}><item.icon size={20}/>{tr(item.title)}{counts[item.id] !== undefined && <span>{counts[item.id]}</span>}</button>
          </React.Fragment>)}
        </nav>
        <div className="settings-sidebar-footer"><span>{tr('谱芽岛')}</span><small>{tr('让喜欢的歌，在指尖靠岸。')}</small></div>
      </aside>
      <div className="settings-workspace">
        <header className="settings-topbar"><div><span id="account-settings-title">{tr('账号设定')}</span><span className="settings-breadcrumb">/</span><strong>{tr(current.title)}</strong></div><button className="settings-close" aria-label={tr('关闭账号设定')} onClick={onClose}><X size={20}/></button></header>
        <div className="settings-scroll" ref={content}>
          <div className="settings-content" id="settings-content" key={section}>
            <h2>{tr(current.title)}</h2>
            <p className="settings-description">{tr(section === 'favorites' ? '喜欢的歌曲，随时回来继续练习。' : section === 'scores' ? '收藏编配、重拾练习，让你的乐谱井井有条。' : section === 'recent' ? '找回刚刚听见、看过的旋律。' : section === 'profile' ? '在这里查看你的个人资料和账号信息。' : section === 'security' ? '查看当前账号使用的登录方式。' : '选择你习惯的语言，让每一次练习更自在。')}</p>
            {['favorites', 'scores', 'recent'].includes(section) && <SettingsLibrary key={section} section={section} user={user} onClose={onClose}/>}
            {section === 'profile' && <>
              <div className="settings-profile-summary"><img src={photo} alt={tr('我的头像')} referrerPolicy="no-referrer" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = import.meta.env.BASE_URL + 'assets/avatar-musician.png'; }}/><div><strong>{name}</strong><span>{providers.map(id => providerNames[id] || id).join(' / ') || tr('我的账号')}</span></div><span className="settings-status"><Check size={14}/>{tr('已登录')}</span></div>
              <dl className="settings-details">
                <div><dt>{tr('显示名称')}</dt><dd>{name}</dd></div>
                <div><dt>{tr('邮箱')}</dt><dd><span>{emailVisible ? email : maskedEmail}</span>{user.email && <button className="settings-text-button" aria-pressed={emailVisible} onClick={() => setEmailVisible(!emailVisible)}>{tr(emailVisible ? '隐藏' : '显示')}</button>}</dd></div>
                <div><dt>{tr('登录方式')}</dt><dd>{providers.map(id => providerNames[id] || id).join(' / ') || tr('未提供')}</dd></div>
              </dl>
              <div className="settings-section-link"><div><h3>{tr('登录与安全')}</h3><p>{tr('查看关联账号和登录说明。')}</p></div><button onClick={() => selectSection('security')}>{tr('查看')}<ShieldCheck size={17}/></button></div>
            </>}
            {section === 'security' && <>
              <h3 className="settings-subheading">{tr('关联账号')}</h3>
              <div className="settings-connected-list">{providers.length ? providers.map(id => <div className="settings-connected" key={id}><ShieldCheck size={24}/><div><strong>{providerNames[id] || id}</strong><span>{tr('已关联')}</span></div><span className="settings-status"><Check size={14}/>{tr('当前登录方式')}</span></div>) : <p>{tr('未提供')}</p>}</div>
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
