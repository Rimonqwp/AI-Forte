import { useEffect, useSyncExternalStore } from 'react';

const stores = new Map();
export const localDay = (timestamp = Date.now()) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const keyFor = uid => `puyadao.preview-time.${uid}`;
function storeFor(uid) {
  if (stores.has(uid)) return stores.get(uid);
  const listeners = new Set();
  let value = [];
  const read = () => {
    try {
      const data = JSON.parse(localStorage.getItem(keyFor(uid)) || '[]');
      value = Array.isArray(data) ? data.filter(item => typeof item.songId === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.day) && Number.isFinite(item.seconds) && item.seconds > 0).slice(-1000) : [];
    } catch { value = []; }
  };
  read();
  const notify = () => listeners.forEach(listener => listener());
  const store = {
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    snapshot: () => value,
    refresh: () => { read(); notify(); },
    update: change => {
      value = change(value).slice(-1000);
      try { localStorage.setItem(keyFor(uid), JSON.stringify(value)); } catch { /* Retain session statistics when storage is full. */ }
      notify();
    },
  };
  stores.set(uid, store);
  return store;
}
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  stores.forEach((store, uid) => { if (event.key === null || event.key === keyFor(uid)) store.refresh(); });
});
export function recordPreviewTime(uid, songId, seconds, timestamp = Date.now()) {
  if (!uid || !songId || !Number.isFinite(seconds) || seconds <= 0) return;
  const day = localDay(timestamp);
  storeFor(uid).update(items => {
    const existing = items.find(item => item.songId === songId && item.day === day);
    return [...items.filter(item => item !== existing), { songId, day, seconds: (existing?.seconds || 0) + seconds }];
  });
}
export const clearPreviewTime = uid => storeFor(uid).update(() => []);
export function usePreviewTime(uid) {
  const store = storeFor(uid);
  return useSyncExternalStore(store.subscribe, store.snapshot);
}
// Count only foreground time spent viewing the score detail, never hidden tabs.
export function useTrackScorePreview(uid, songId, enabled = true) {
  useEffect(() => {
    if (!uid || !enabled) return;
    let started = document.visibilityState === 'visible' ? Date.now() : null;
    const flush = () => {
      const now = Date.now();
      if (started !== null) {
        // Split at local midnight so daily charts and streaks remain accurate.
        let cursor = started;
        while (cursor < now) {
          const next = new Date(cursor); next.setHours(24, 0, 0, 0);
          const end = Math.min(now, next.getTime());
          recordPreviewTime(uid, songId, (end - cursor) / 1000, cursor);
          cursor = end;
        }
      }
      started = document.visibilityState === 'visible' ? now : null;
    };
    const interval = setInterval(flush, 15000);
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flush);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', flush); window.removeEventListener('pagehide', flush); flush(); };
  }, [uid, songId, enabled]);
}
export function summarizePreviewTime(items, now = Date.now()) {
  const bySong = {}, byDay = {};
  for (const item of items) {
    bySong[item.songId] = (bySong[item.songId] || 0) + item.seconds;
    byDay[item.day] = (byDay[item.day] || 0) + item.seconds;
  }
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now); date.setDate(date.getDate() - 6 + index);
    return { day: localDay(date), weekday: date.getDay(), seconds: byDay[localDay(date)] || 0 };
  });
  let streak = 0;
  const cursor = new Date(now);
  if (!byDay[localDay(cursor)]) cursor.setDate(cursor.getDate() - 1);
  while (byDay[localDay(cursor)]) { streak++; cursor.setDate(cursor.getDate() - 1); }
  const total = Object.values(bySong).reduce((sum, seconds) => sum + seconds, 0);
  return { bySong, week, streak, total, count: Object.keys(bySong).length, average: total / (Object.keys(bySong).length || 1) };
}
