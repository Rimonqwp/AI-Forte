import React, { useEffect, useRef, useState } from 'react';
import { MusicNotes, Globe, Bell, CaretDown, Heart, Check, List, PianoKeys, Guitar, UserCircle, SignOut, GearSix } from '@phosphor-icons/react';
import { useAccount } from './account-context.js';
import { languages, setLanguage, tr, useLanguage } from './language.js';
import { BrandIdentity } from './BrandIdentity.jsx';
import './classroom-header.css';

export function shortenName(name) {
  const characters = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(name)].map(item => item.segment)
    : Array.from(name);
  return characters.length > 4 ? characters.slice(0, 4).join('') + '.....' : name;
}

export function ClassroomHeader({ userName = '音乐同学', assets, isSearchPage, onHome, onResults, onCommunity, onOpen, checkedIn, onCheckIn, savedCount }) {
  const language = useLanguage();
  const account = useAccount();
  const signedIn = !!account.user && !account.user.isAnonymous;
  const [menu, setMenu] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const header = useRef(null);
  const profile = useRef(null);
  const course = useRef(null);
  const languageMenu = useRef(null);
  const notifications = useRef(null);
  const fullName = signedIn ? account.user.displayName || account.user.email?.split('@')[0] || tr('我的账号') : tr('登录 / 注册');
  const run = action => { setMenu(null); setMobileNav(false); action(); };
  const toggle = value => setMenu(previous => previous === value ? null : value);

  useEffect(() => {
    const dismiss = event => {
      const active = menu === 'profile' ? profile : menu === 'course' ? course : menu === 'notification' ? notifications : languageMenu;
      if (!active.current?.contains(event.target)) setMenu(null);
      if (!header.current?.contains(event.target)) setMobileNav(false);
    };
    const escape = event => {
      if (event.key !== 'Escape' || event.isComposing) return;
      const active = menu === 'profile' ? profile : menu === 'course' ? course : menu === 'notification' ? notifications : languageMenu;
      if (menu) active.current?.querySelector('button')?.focus();
      setMenu(null); setMobileNav(false);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, [menu]);

  return <header className="site-header" ref={header}>
    <div className="header-inner">
      <a href="#" className="brand" aria-label={tr('谱芽岛') + ' · ' + tr('首页')} onClick={event => { event.preventDefault(); run(onHome); }}><BrandIdentity/></a>
      <nav aria-label={tr('主导航')} className={mobileNav ? 'open' : ''}>
        <button className={!isSearchPage ? 'nav-active' : ''} onClick={() => run(onHome)}>{tr('首页')}</button>
        <button className={isSearchPage ? 'nav-active' : ''} onClick={() => run(() => onResults())}>{tr('乐谱')}</button>
        <button onClick={() => run(() => onResults(''))}>{tr('乐谱练习')}</button>
        <div className="dropdown-wrap" ref={course}><button aria-expanded={menu === 'course'} aria-controls="header-course-menu" onClick={() => toggle('course')}>{tr('乐器课程')} <CaretDown size={13}/></button><div id="header-course-menu" className={`dropdown course-menu ${menu === 'course' ? 'is-open' : ''}`} aria-hidden={menu !== 'course'} inert={menu !== 'course'}>{['钢琴', '吉他', '尤克里里'].map(name => <button key={name} onClick={() => run(() => onOpen({ type: 'lesson', title: name + '入门课程' }))}>{name === '钢琴' ? <PianoKeys size={20}/> : <Guitar size={20}/>} {tr(name + '入门课程')}</button>)}</div></div>
        <button onClick={() => run(onCheckIn)}>{tr(checkedIn ? '已打卡' : '每日打卡')}</button>
        <button onClick={() => run(onCommunity)}>{tr('社区问答')}</button>
      </nav>
      <div className="header-actions">
        <div className="dropdown-wrap language-wrap" ref={languageMenu}>
          <button className="icon-button language-trigger" aria-label={tr('语言')} title={languages.find(item => item.code === language).label} aria-expanded={menu === 'language'} aria-controls="header-language-menu" onClick={() => toggle('language')}><Globe size={23}/></button>
          {menu === 'language' && <div className="dropdown language-menu" id="header-language-menu" role="group" aria-label={tr('语言')}>{languages.map(item => <button key={item.code} lang={item.code} aria-pressed={language === item.code} onClick={() => { setLanguage(item.code); setMenu(null); languageMenu.current?.querySelector('button')?.focus(); }}><span>{item.label}</span>{language === item.code && <Check size={16}/>}</button>)}</div>}
        </div>
        <div className="dropdown-wrap notification-wrap" ref={notifications}>
          <button className="icon-button notification" aria-label={tr('学习通知')} aria-expanded={menu === 'notification'} aria-controls="header-notification-menu" onClick={() => toggle('notification')}><Bell size={23}/><span>1</span></button>
          {menu === 'notification' && <section className="dropdown notification-menu" id="header-notification-menu" aria-labelledby="header-notification-heading">
            <h2 id="header-notification-heading">{tr('学习通知')}</h2>
            <div className="notification-message"><MusicNotes size={26} weight="duotone" aria-hidden="true"/><div><h3>{tr('欢迎来到谱芽岛')}</h3><p>{tr('你的音乐旅程从这里开始。试试收藏一首喜欢的曲子，完成今天的第一段练习吧。')}</p></div></div>
            <button className="notification-discover" onClick={() => run(() => onResults(''))}>{tr('发现我的第一首乐谱')}</button>
          </section>}
        </div>
        <div className="dropdown-wrap" ref={profile}>
          <button className={`profile ${signedIn ? '' : 'login-trigger'}`} title={fullName} aria-label={fullName} aria-expanded={signedIn ? menu === 'profile' : undefined} aria-controls={signedIn ? 'header-profile-menu' : undefined} onClick={() => signedIn ? toggle('profile') : run(account.openLogin)}>{signedIn ? <img src={account.user.photoURL || assets + 'avatar-musician.png'} referrerPolicy="no-referrer" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = assets + 'avatar-musician.png'; }} alt={tr('我的头像')}/> : <UserCircle size={25}/>}<span>{signedIn ? shortenName(fullName) : fullName}</span>{signedIn && <CaretDown size={13}/>}</button>
          {menu === 'profile' && signedIn && <div className="dropdown profile-menu" id="header-profile-menu"><strong>{tr('你好，')}{fullName}</strong><small className="account-email">{account.user.email}</small><button onClick={() => run(() => account.openSettings('favorites'))}><Heart size={18}/>{tr('我的收藏')}（{savedCount}）</button><button onClick={() => run(account.openSettings)}><GearSix size={18}/>{tr('设定')}</button><div className="account-menu-divider" role="separator"/><button className="account-signout" disabled={account.busy} onClick={() => run(account.logout)}><SignOut size={18}/>{tr('退出登录')}</button></div>}
        </div>
        <button className="icon-button mobile-toggle" aria-label={tr('展开导航')} aria-expanded={mobileNav} onClick={() => { setMenu(null); setMobileNav(previous => !previous); }}><List size={25}/></button>
      </div>
    </div>
  </header>;
}
