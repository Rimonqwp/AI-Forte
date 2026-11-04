import React, { useEffect, useRef, useState } from 'react';
import { MusicNotes, Globe, Bell, CaretDown, Heart, BookOpen, CheckCircle, Check, List, PianoKeys, Guitar } from '@phosphor-icons/react';
import { languages, setLanguage, tr, useLanguage } from './language.js';
import './classroom-header.css';

export function shortenName(name) {
  const characters = typeof Intl.Segmenter === 'function'
    ? [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(name)].map(item => item.segment)
    : Array.from(name);
  return characters.length > 4 ? characters.slice(0, 4).join('') + '.....' : name;
}

export function ClassroomHeader({ userName = '音乐同学', assets, isSearchPage, onHome, onResults, onCommunity, onOpen, checkedIn, onCheckIn, savedCount }) {
  const language = useLanguage();
  const [menu, setMenu] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const header = useRef(null);
  const profile = useRef(null);
  const course = useRef(null);
  const languageMenu = useRef(null);
  const notifications = useRef(null);
  const fullName = userName?.trim() || '音乐同学';
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
      <a href="#" className="brand" aria-label={tr('首页')} onClick={event => { event.preventDefault(); run(onHome); }}><MusicNotes size={42} weight="duotone"/><span><strong>{tr('谱芽岛')}</strong><small>{tr('让喜欢的歌，在指尖靠岸。')} <MusicNotes size={11}/></small></span></a>
      <nav aria-label={tr('主导航')} className={mobileNav ? 'open' : ''}>
        <button className={!isSearchPage ? 'nav-active' : ''} onClick={() => run(onHome)}>{tr('首页')}</button>
        <button className={isSearchPage ? 'nav-active' : ''} onClick={() => run(() => onResults())}>{tr('乐谱')}</button>
        <button onClick={() => run(() => onResults(''))}>{tr('乐谱练习')}</button>
        <div className="dropdown-wrap" ref={course}><button aria-expanded={menu === 'course'} aria-controls="header-course-menu" onClick={() => toggle('course')}>{tr('乐器课程')} <CaretDown size={13}/></button>{menu === 'course' && <div id="header-course-menu" className="dropdown course-menu">{['钢琴', '吉他', '尤克里里'].map(name => <button key={name} onClick={() => run(() => onOpen({ type: 'lesson', title: name + '入门课程' }))}>{name === '钢琴' ? <PianoKeys size={20}/> : <Guitar size={20}/>} {tr(name + '入门课程')}</button>)}</div>}</div>
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
          <button className="profile" title={fullName} aria-label={fullName} aria-expanded={menu === 'profile'} aria-controls="header-profile-menu" onClick={() => toggle('profile')}><img src={assets + 'avatar-musician.png'} alt={tr('我的头像')}/><span>{shortenName(fullName)}</span><CaretDown size={13}/></button>
          {menu === 'profile' && <div className="dropdown profile-menu" id="header-profile-menu"><strong>{tr('你好，')}{fullName}</strong><small>{tr('每天一点点，音乐近一点')}</small><button onClick={() => run(() => onOpen({ type: 'saved' }))}><Heart size={18}/>{tr('我的收藏')}（{savedCount}）</button><button onClick={() => run(() => onOpen({ type: 'lesson', title: '我的学习计划' }))}><BookOpen size={18}/>{tr('我的学习计划')}</button><button onClick={() => run(onCheckIn)}><CheckCircle size={18}/>{tr(checkedIn ? '今日已打卡' : '完成今日打卡')}</button></div>}
        </div>
        <button className="icon-button mobile-toggle" aria-label={tr('展开导航')} aria-expanded={mobileNav} onClick={() => { setMenu(null); setMobileNav(previous => !previous); }}><List size={25}/></button>
      </div>
    </div>
  </header>;
}
