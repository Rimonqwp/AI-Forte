import { useEffect, useSyncExternalStore } from 'react';
import { localDay } from './recent-preview-stats.js';

export const starterPlaylists = [
  { id: 'practice', name: '练习清单', cover: 'sunny' },
  { id: 'sing', name: '轻松弹唱', cover: 'windmill' },
  { id: 'sleep', name: '睡前听歌', cover: 'night' },
  { id: 'piano', name: '钢琴入门', cover: 'piano' },
].map(item => ({ ...item, songs: [] }));

export function normalizePlaylists(value) {
  if (!Array.isArray(value)) return starterPlaylists;
  const ids = new Set();
  return value.filter(item => item && typeof item.id === 'string' && item.id !== 'default' && !ids.has(item.id) && ids.add(item.id) && typeof item.name === 'string' && item.name.trim()).slice(0, 100).map(item => ({
    id: item.id, name: item.name.trim().slice(0, 30), cover: ['sunny', 'windmill', 'night', 'piano', 'confession'].includes(item.cover) ? item.cover : 'confession',
    songs: Array.isArray(item.songs) ? [...new Set(item.songs.filter(id => typeof id === 'string'))].slice(0, 1000) : [],
  }));
}

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
  const normalize = value => kind === 'playlists' ? normalizePlaylists(value) : Array.isArray(value) ? value.filter(item => item && /^\d{4}-\d{2}-\d{2}$/.test(item.day) && Number.isFinite(item.seconds) && item.seconds > 0).slice(-1000) : [];
  let value;
  const read = () => { try { value = normalize(JSON.parse(localStorage.getItem(key) || 'null')); } catch { value = normalize(null); } };
  read();
  const publish = () => listeners.forEach(listener => listener());
  const store = {
    snapshot: () => value,
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    update: change => { value = normalize(change(value)); try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep this session usable when storage is full. */ } publish(); },
    refresh: () => { read(); publish(); },
  };
  stores.set(key, store); return store;
}
if (typeof window !== 'undefined') window.addEventListener('storage', event => { stores.forEach((store, key) => { if (event.key === null || event.key === key) store.refresh(); }); });
export function usePlaylists(uid) {
  const store = localStore(uid, 'playlists');
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
