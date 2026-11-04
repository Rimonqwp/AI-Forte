import React, { useEffect, useRef, useState } from 'react';
import { CaretDown, SignOut, UserCircle } from '@phosphor-icons/react';
import { useAccount } from './AuthContext.jsx';
import { shortenName } from './ClassroomHeader.jsx';
import { tr } from './language.js';

// The standalone song page shares the same identity and logout behavior.
export function AccountShortcut({ assets }) {
  const account = useAccount(), [opened, setOpened] = useState(false), wrap = useRef(null);
  const signedIn = !!account.user && !account.user.isAnonymous;
  const name = signedIn ? account.user.displayName || account.user.email?.split('@')[0] || tr('我的账号') : tr('登录 / 注册');
  useEffect(() => {
    const outside = event => { if (!wrap.current?.contains(event.target)) setOpened(false); };
    const escape = event => { if (event.key === 'Escape') { setOpened(false); if (opened) wrap.current?.querySelector('button')?.focus(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('focusin', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('focusin', outside); document.removeEventListener('keydown', escape); };
  }, [opened]);
  return <div className="dropdown-wrap" ref={wrap}><button className={`profile ${signedIn ? '' : 'login-trigger'}`} title={name} aria-label={name} aria-expanded={signedIn ? opened : undefined} onClick={() => signedIn ? setOpened(!opened) : account.openLogin()}>{signedIn ? <img src={account.user.photoURL || assets + 'avatar-musician.png'} referrerPolicy="no-referrer" alt={tr('我的头像')}/> : <UserCircle size={25}/>}<span>{signedIn ? shortenName(name) : name}</span>{signedIn && <CaretDown size={13}/>}</button>{opened && signedIn && <div className="dropdown profile-menu"><strong>{name}</strong><small className="account-email">{account.user.email}</small><small className="account-connected">{tr('已登录 · 学习记录随账号同步')}</small><button className="account-signout" disabled={account.busy} onClick={() => { setOpened(false); account.logout(); }}><SignOut size={18}/>{tr('退出登录')}</button></div>}</div>;
}
