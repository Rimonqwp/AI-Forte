import { useSyncExternalStore } from 'react';

const stores = new Map();
const empty = [];
const storageKey = (uid, kind) => `puyadao.score-history.${uid}.${kind}`;
function historyStore(uid, kind) {
  const key = storageKey(uid, kind);
  if (stores.has(key)) return stores.get(key);
  const listeners = new Set();
  let value = empty;
  const read = () => {
    try {
      const entries = JSON.parse(localStorage.getItem(key) || '[]');
      value = Array.isArray(entries) ? entries.filter(item => typeof item?.songId === 'string' && Number.isFinite(item.viewedAt) && (item.versionId === undefined || typeof item.versionId === 'string')).slice(0, 50) : empty;
    } catch { value = empty; }
  };
  read();
  const publish = () => listeners.forEach(listener => listener());
  const store = {
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => value,
    update: change => {
      value = change(value).slice(0, 50);
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep the current session usable if storage is unavailable. */ }
      publish();
    },
    refresh: () => { read(); publish(); },
  };
  stores.set(key, store);
  return store;
}
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key === null) stores.forEach(store => store.refresh());
  else stores.get(event.key)?.refresh();
});
export function recordScoreVisit(uid, kind, songId, versionId) {
  historyStore(uid, kind).update(items => [
    { songId, ...(versionId ? { versionId } : {}), viewedAt: Date.now() },
    ...items.filter(item => item.songId !== songId || item.versionId !== versionId),
  ]);
}
export function useScoreHistory(uid, kind) {
  const store = historyStore(uid, kind);
  return [useSyncExternalStore(store.subscribe, store.getSnapshot), store.update];
}
