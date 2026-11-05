const supported = new Set(['google.com', 'password', 'phone', 'github.com', 'apple.com', 'custom']);
export function sessionFromToken(result) {
  const at = Date.parse(result.authTime);
  if (!Number.isFinite(at) || at <= 0 || !supported.has(result.signInProvider)) return null;
  return { at, provider: result.signInProvider };
}

// Browser information is approximate; never infer IP addresses or locations.
export function describeLoginDevice(agent = '') {
  const os = /Android/.test(agent) ? 'Android' : /iPhone|iPad|iPod/.test(agent) ? 'iOS / iPadOS' : /Windows/.test(agent) ? 'Windows' : /Macintosh|Mac OS X/.test(agent) ? 'macOS' : /Linux/.test(agent) ? 'Linux' : '';
  const browser = /Edg\//.test(agent) ? 'Edge' : /Firefox\//.test(agent) ? 'Firefox' : /Chrome\/|CriOS\//.test(agent) ? 'Chrome' : /Safari\//.test(agent) ? 'Safari / WebKit' : '';
  return [os, browser].filter(Boolean).join(' · ');
}

export function createLoginHistory(getStorage = () => localStorage) {
  const stores = new Map();
  const valid = item => Number.isFinite(item?.at) && item.at > 0 && supported.has(item.provider) && typeof item.device === 'string' && item.device.length <= 100;
  const clean = items => [...new Map((Array.isArray(items) ? items : []).filter(valid).map(({at, provider, device}) => [`${at}:${provider}`, {at, provider, device}])).values()].sort((a,b) => b.at - a.at).slice(0, 50);
  const forUser = uid => {
    if (!uid) throw new Error('login-history/missing-uid');
    if (stores.has(uid)) return stores.get(uid);
    const key = `puyadao.login-history.${uid}`, listeners = new Set();
    let value = [], volatile = [];
    const read = () => { try { return clean(JSON.parse(getStorage().getItem(key) || '[]')); } catch { return []; } };
    value = read();
    const publish = () => listeners.forEach(listener => listener());
    const store = {
      getSnapshot: () => value,
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
      record: item => {
        if (!valid(item)) return;
        // Read again so another tab's recent login is not lost.
        value = clean([item, ...volatile, ...read()]);
        try { getStorage().setItem(key, JSON.stringify(value)); volatile = []; }
        catch { volatile = value; }
        publish();
      },
      refresh: () => { value = clean([...volatile, ...read()]); publish(); },
    };
    stores.set(uid, store); return store;
  };
  return { forUser, refresh: key => { stores.forEach((store,uid) => { if (!key || key === `puyadao.login-history.${uid}`) store.refresh(); }); } };
}
export const loginHistory = createLoginHistory();
if (typeof window !== 'undefined') window.addEventListener('storage', event => loginHistory.refresh(event.key));

// Called only after successful explicit sign-in, before unrelated data merging.
// Logging must never make authentication fail or store the raw token.
export async function captureSuccessfulLogin(result, { currentUser, readSession, history = loginHistory, agent = '' }) {
  try {
    const user = result.user;
    if (!user || user.isAnonymous || currentUser()?.uid !== user.uid) return result;
    const session = await readSession(user);
    if (session && currentUser()?.uid === user.uid) history.forUser(user.uid).record({...session, device:describeLoginDevice(agent)});
  } catch { /* Logging is best effort when storage or the network is unavailable. */ }
  return result;
}
