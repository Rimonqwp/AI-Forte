import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
import { auth, ensureVisitor, readGuestState, signInProvider, signOutAccount, resumeAccountData } from './firebase.js';
import { flushCloudStates } from './cloud-stores.js';
import { AuthDialog } from './AuthDialog.jsx';
import { AccountSettings } from './AccountSettings.jsx';
import './auth.css';

const AccountContext = createContext(null);
export function useAccount() { return useContext(AccountContext); }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false);
  const [opened, setOpened] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(null);
  const [settingsOpened, setSettingsOpened] = useState(false), settingsTrigger = useRef(null);
  const openSettings = () => {
    settingsTrigger.current = document.activeElement?.closest('.dropdown-wrap')?.querySelector('.profile');
    setSettingsOpened(true);
  };
  useEffect(() => onIdTokenChanged(auth, value => {
    setUser(value); setReady(!!value);
    if (!value) ensureVisitor().catch(() => setReady(true));
  }), []);

  useEffect(() => {
    if (user && !user.isAnonymous) resumeAccountData(user).catch(value => { setError(value); setOpened(true); });
  }, [user?.uid, user?.isAnonymous]);

  const login = async provider => {
    setBusy(true); setError(null);
    try {
      const result = await signInProvider(provider, async uid => {
        if (!await flushCloudStates(uid)) throw Object.assign(new Error(), { code: 'auth/guest-sync-pending' });
        return readGuestState(uid);
      });
      setUser(result.user); setOpened(false);
      if (result.changedUid) window.location.reload();
    } catch (value) { setUser(auth.currentUser); setError(value); }
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
  return <AccountContext.Provider value={{ user, ready, busy, login, logout, openSettings, openLogin: () => { setError(null); setOpened(true); } }}>
    {ready ? <React.Fragment key={user?.uid || 'offline'}>{children}</React.Fragment> : <div className="account-bootstrap" role="status">正在打开谱芽岛…</div>}
    {settingsOpened && user && !user.isAnonymous && <AccountSettings user={user} returnFocus={settingsTrigger.current} onClose={() => setSettingsOpened(false)}/>}
    {opened && <AuthDialog user={user} busy={busy} error={error} onLogin={login} onRetry={retry} onClose={() => { if (!busy) setOpened(false); }}/>}
  </AccountContext.Provider>;
}
