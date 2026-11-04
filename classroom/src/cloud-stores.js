import { createCloudState } from './cloud-state-store.js';
import { cacheKey } from './account-data.js';

const stores = new Map();
export function cloudStoreFor(uid, key, initial, legacyKey) {
  const id = `${uid}/${key}`;
  if (!stores.has(id)) stores.set(id, createCloudState({
    initial,
    readCache: () => {
      let owner = localStorage.getItem('puyadao.legacy-cache-owner');
      if (!owner && uid !== 'offline') { localStorage.setItem('puyadao.legacy-cache-owner', uid); owner = uid; }
      const raw = localStorage.getItem(cacheKey(uid, key)) ?? (owner === uid ? localStorage.getItem(`puyadao.cloud.${key}`) : null);
      const legacy = raw === null && legacyKey && owner === uid ? localStorage.getItem(legacyKey) : null;
      const entry = raw !== null ? JSON.parse(raw) : legacy !== null ? { value: JSON.parse(legacy), dirty: false } : undefined;
      if (entry && Array.isArray(initial) && !Array.isArray(entry.value)) return undefined;
      if (entry && initial === null && entry.value !== null && (typeof entry.value !== 'object' || !Number.isFinite(entry.value.elapsed) || !Number.isFinite(entry.value.scrollTop) || entry.value.bpm < 40 || entry.value.bpm > 180)) return undefined;
      return entry;
    },
    writeCache: entry => localStorage.setItem(cacheKey(uid, key), JSON.stringify(entry)),
    connect: async () => (await import('./firebase.js')).connectState(key, uid),
    onError: error => { if (error.message !== 'auth/session-changed') window.dispatchEvent(new Event('puyadao:sync-error')); },
  }));
  return stores.get(id);
}

export async function flushCloudStates(uid) {
  const active = [...stores].filter(([key]) => key.startsWith(`${uid}/`)).map(([, store]) => store);
  await Promise.all(active.map(store => store.retry()));
  return active.every(store => store.getSnapshot().status === 'synced');
}
window.addEventListener('online', () => stores.forEach(store => store.retry()));
window.addEventListener('puyadao:retry-sync', () => stores.forEach(store => store.retry()));
