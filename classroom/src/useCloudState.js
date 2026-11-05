import { useSyncExternalStore } from 'react';
import { cloudStoreFor } from './cloud-stores.js';
import { useAccount } from './account-context.js';

export function useCloudState(key, initial, legacyKey) {
  const { user } = useAccount();
  const store = cloudStoreFor(user?.uid || 'offline', key, initial, legacyKey);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return [snapshot.value, store.update, snapshot.status];
}

export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
