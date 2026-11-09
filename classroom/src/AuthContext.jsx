import React, { useEffect, useRef, useState } from 'react';
import { onIdTokenChanged, updateProfile, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth, ensureVisitor, readGuestState, signInProvider, signOutAccount, resumeAccountData, saveAccountProfile, accountBindingService, signInPassword, resetLoginPassword } from './firebase.js';
import { flushCloudStates } from './cloud-stores.js';
import { AuthDialog } from './AuthDialog.jsx';
import { AccountSettings } from './AccountSettings.jsx';
import './auth.css';

import { readProfileAvatar, saveProfileEdits } from './profile-editor.js';
import { AccountContext } from './account-context.js';
export { useAccount } from './account-context.js';

export function AuthProvider({ children }) {
  const [, refreshProfile] = useState(0);
  const [user, setUser] = useState(null), [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(() => new URLSearchParams(window.location.search).get('login') === '1'), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const closeLogin = () => {
    setOpened(false);
    const url = new URL(window.location.href);
    if (url.searchParams.has('login')) { url.searchParams.delete('login'); window.history.replaceState(window.history.state, '', url); }
  };
  const [settingsSection, setSettingsSection] = useState(null), settingsTrigger = useRef(null);
  const openSettings = (section = 'profile') => {
    settingsTrigger.current = document.activeElement?.closest('.dropdown-wrap')?.querySelector('.profile');
    setSettingsSection(section);
  };
  useEffect(() => onIdTokenChanged(auth, value => {
    setUser(value); setReady(!!value);
    if (!value) ensureVisitor().catch(() => setReady(true));
  }), []);

  useEffect(() => {
    if (user && !user.isAnonymous) resumeAccountData(user).catch(value => { setError(value); setOpened(true); });
  }, [user?.uid, user?.isAnonymous]);

  const login = async (provider, remember = true) => {
    setBusy(true); setError(null);
    try {
      const result = await signInProvider(provider, async uid => {
        if (!await flushCloudStates(uid)) throw Object.assign(new Error(), { code: 'auth/guest-sync-pending' });
        return readGuestState(uid);
      });
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      setUser(result.user); closeLogin();
      if (result.changedUid) window.location.reload();
    } catch (value) { setUser(auth.currentUser); setError(value); }
    finally { setBusy(false); }
  };
  const loginPassword = async (email, password, remember = true) => {
    setBusy(true); setError(null);
    try {
      const result = await signInPassword(email, password, async uid => {
        if (!await flushCloudStates(uid)) throw Object.assign(new Error(), {code:'auth/guest-sync-pending'});
        return readGuestState(uid);
      });
      await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
      setUser(result.user); closeLogin();
      if (result.changedUid) window.location.reload();
    } catch (value) { setUser(auth.currentUser); setError(value); }
    finally { setBusy(false); }
  };
  const requestPasswordReset = async email => {
    setBusy(true); setError(null);
    try { await resetLoginPassword(email); return true; }
    catch (value) { setError(value); return false; }
    finally { setBusy(false); }
  };
  const logout = async () => {
    setBusy(true); setError(null);
    try {
      await resumeAccountData(auth.currentUser);
      if (!await flushCloudStates(auth.currentUser.uid)) throw Object.assign(new Error(), { code: 'auth/guest-sync-pending' });
      setUser(await signOutAccount());
    } catch (value) { setError(value); setOpened(true); }
    finally { setBusy(false); }
  };
  const retry = async () => {
    setBusy(true); setError(null);
    try { await resumeAccountData(auth.currentUser); window.location.reload(); }
    catch (value) { setError(value); }
    finally { setBusy(false); }
  };
  const bindings = accountBindingService(() => refreshProfile(value => value + 1));
  useEffect(() => {
    if (!user || user.isAnonymous) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get('accountSettings') !== 'profile') return;
    url.searchParams.delete('accountSettings');
    window.history.replaceState(window.history.state, '', url);
    setSettingsSection('profile');
    bindings.refresh(user.uid).catch(() => {});
  }, [user?.uid, user?.isAnonymous]);
  const displayedUser = user ? { ...user, photoURL: readProfileAvatar(user.uid) || user.photoURL } : null;
  const saveProfile = changes => saveProfileEdits({ ...changes, uid: user.uid }, {
    currentUser: () => auth.currentUser,
    updateName: (member, displayName) => updateProfile(member, { displayName }),
    syncProfile: saveAccountProfile,
    changed: () => refreshProfile(value => value + 1),
  });
  useEffect(() => {
    const refresh = () => refreshProfile(value => value + 1);
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);
  return <AccountContext.Provider value={{ user: displayedUser, ready, busy, login, logout, openSettings, openLogin: () => { setError(null); setOpened(true); } }}>
    {ready ? <React.Fragment key={user?.uid || 'offline'}>{children}</React.Fragment> : <div className="account-bootstrap" role="status">正在打开谱芽岛…</div>}
    {settingsSection && user && !user.isAnonymous && <AccountSettings key={`settings-${user.uid}-${settingsSection}`} initialSection={settingsSection} user={displayedUser} onSaveProfile={saveProfile} bindings={bindings} returnFocus={settingsTrigger.current} onClose={() => setSettingsSection(null)}/>}
    {opened && <AuthDialog user={user} busy={busy} error={error} onLogin={login} onPasswordLogin={loginPassword} onPasswordReset={requestPasswordReset} onRetry={retry} onClose={() => { if (!busy) closeLogin(); }}/>}
  </AccountContext.Provider>;
}
