import { useSyncExternalStore } from 'react';
import { createCloudState } from './cloud-state-store.js';

const stores = new Map();
function storeFor(key, initial, legacyKey) {
  if (!stores.has(key)) stores.set(key, createCloudState({
    initial,
    readCache: () => {
      const raw = localStorage.getItem(`puyadao.cloud.${key}`);
      const legacy = raw === null && legacyKey ? localStorage.getItem(legacyKey) : null;
      const entry = raw !== null ? JSON.parse(raw) : legacy !== null ? { value: JSON.parse(legacy), dirty: false } : undefined;
      if (entry && Array.isArray(initial) && !Array.isArray(entry.value)) return undefined;
      if (entry && initial === null && entry.value !== null && (typeof entry.value !== 'object' || !Number.isFinite(entry.value.elapsed) || !Number.isFinite(entry.value.scrollTop) || entry.value.bpm < 40 || entry.value.bpm > 180)) return undefined;
      return entry;
    },
    writeCache: entry => localStorage.setItem(`puyadao.cloud.${key}`, JSON.stringify(entry)),
    connect: async () => (await import('./firebase.js')).connectState(key),
    onError: () => window.dispatchEvent(new Event('puyadao:sync-error')),
  }));
  return stores.get(key);
}
window.addEventListener('online', () => stores.forEach(store => store.retry()));
window.addEventListener('puyadao:retry-sync', () => stores.forEach(store => store.retry()));

export function useCloudState(key, initial, legacyKey) {
  const store = storeFor(key, initial, legacyKey);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return [snapshot.value, store.update, snapshot.status];
}

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
