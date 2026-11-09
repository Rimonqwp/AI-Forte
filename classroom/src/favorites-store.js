import { useEffect, useSyncExternalStore } from 'react';
import { localDay } from './recent-preview-stats.js';
import { normalizePlaylists, normalizeMediaFavorites } from './favorite-folders.js';
export { normalizePlaylists } from './favorite-folders.js';


export function consecutiveDays(days, now = new Date()) {
  const values = new Set(days.filter(day => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)));
  const cursor = new Date(now); let count = 0;
  if (!values.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (values.has(localDay(cursor))) { count++; cursor.setDate(cursor.getDate() - 1); }
  return count;
}

const stores = new Map();
function localStore(uid, kind) {
  const key = `puyadao.music-library.${uid}.${kind}`;
  if (stores.has(key)) return stores.get(key);
  const listeners = new Set();
  const normalize = value => kind === 'playlists' ? normalizePlaylists(value) : kind !== 'practice' ? normalizeMediaFavorites(value) : Array.isArray(value) ? value.filter(item => item && /^\d{4}-\d{2}-\d{2}$/.test(item.day) && Number.isFinite(item.seconds) && item.seconds > 0).slice(-1000) : [];
  let value;
  const read = () => { try { value = normalize(JSON.parse(localStorage.getItem(key) || 'null')); } catch { value = normalize(null); } };
  read();
  const publish = () => listeners.forEach(listener => listener());
  const store = {
    snapshot: () => value,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    update: change => { value = normalize(change(value)); let persisted = true; try { localStorage.setItem(key, JSON.stringify(value)); } catch { persisted = false; } publish(); return { persisted }; },
    refresh: () => { read(); publish(); },
  };
  stores.set(key, store); return store;
}
if (typeof window !== 'undefined') window.addEventListener('storage', event => { stores.forEach((store, key) => { if (event.key === null || event.key === key) store.refresh(); }); });
export function usePlaylists(uid) {
  const store = localStore(uid, 'playlists');
  return [useSyncExternalStore(store.subscribe, store.snapshot), store.update];
}
// Media collectors share this account-isolated local store. The current account
// API accepts score IDs; media metadata must not be sent to those score endpoints.
export function useMediaFavorites(uid, kind) {
  if (!['video', 'course', 'work'].includes(kind)) throw new Error('Unsupported favorite type');
  const store = localStore(uid, `${kind}-favorites`);
  return [useSyncExternalStore(store.subscribe, store.snapshot), store.update];
}
export function usePracticeTime(uid) {
  const store = localStore(uid, 'practice');
  return useSyncExternalStore(store.subscribe, store.snapshot);
}
// Count foreground time in the practice workspace, including quiet reading.
// Historical playback positions are not durations and must not be counted.
export function useTrackPracticeTime(uid, songId) {
  useEffect(() => {
    if (!uid) return;
    let start = document.visibilityState === 'visible' ? Date.now() : null;
    const flush = () => {
      const now = Date.now();
      if (start !== null && now > start) {
        let cursor = start;
        while (cursor < now) {
          const midnight = new Date(cursor); midnight.setHours(24, 0, 0, 0);
          const end = Math.min(now, midnight.getTime()), day = localDay(cursor), seconds = (end - cursor) / 1000;
          localStore(uid, 'practice').update(items => {
            const previous = items.find(item => item.day === day);
            return [...items.filter(item => item.day !== day), { day, seconds: (previous?.seconds || 0) + seconds }];
          });
          cursor = end;
        }
      }
      start = document.visibilityState === 'visible' ? now : null;
    };
    const timer = setInterval(flush, 15000);
    document.addEventListener('visibilitychange', flush); window.addEventListener('pagehide', flush);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flush); flush(); };
  }, [uid, songId]);
}
