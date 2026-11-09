import { useEffect, useSyncExternalStore } from 'react';
import { contentRequest } from './content-api.js';
import { songCatalog, versions, setCatalog } from './library-catalog.js';

// Shared live metadata; never mask an outage with bundled example data.
let snapshot = {songs: songCatalog, versions, loading: true, error: ''};
let pending;
const listeners = new Set();
const subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener); };
const publish = value => { snapshot = value; listeners.forEach(listener => listener()); };
export function loadCatalog() {
  if (pending) return pending;
  publish({...snapshot, loading: true, error: ''});
  pending = contentRequest('/catalog').then(data => {
    setCatalog(data);
    publish({songs: songCatalog, versions, loading: false, error: ''});
  }).catch(error => publish({...snapshot, loading: false, error: error.message}))
    .finally(() => { pending = null; });
  return pending;
}
export function useCatalog() {
  const value = useSyncExternalStore(subscribe, () => snapshot);
  useEffect(() => { if (snapshot.loading && !pending) void loadCatalog(); }, []);
  return {...value, retry: loadCatalog};
}
