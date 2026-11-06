import { useSyncExternalStore } from 'react';
const key = 'puyadao.display-preferences.v1';
const defaults = { theme: 'light', textSize: 'standard', reducedMotion: false };
export function normalizePreferences(value) {
  return { theme: ['light', 'dark', 'system'].includes(value?.theme) ? value.theme : 'light', textSize: value?.textSize === 'large' ? 'large' : 'standard', reducedMotion: value?.reducedMotion === true };
}
let preferences = defaults, storageFailed = false;
try { preferences = normalizePreferences(JSON.parse(localStorage.getItem(key))); } catch { /* Keep defaults when storage is unavailable. */ }
const listeners = new Set();
const media = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function apply() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = preferences.theme === 'system' ? (media?.matches ? 'dark' : 'light') : preferences.theme;
  document.documentElement.dataset.textSize = preferences.textSize;
  document.documentElement.dataset.reducedMotion = String(preferences.reducedMotion);
}
apply();
media?.addEventListener('change', apply);
if (typeof window !== 'undefined') window.addEventListener('storage', event => {
  if (event.key !== key && event.key !== null) return;
  try { preferences = normalizePreferences(JSON.parse(event.newValue)); } catch { preferences = defaults; }
  apply(); listeners.forEach(listener => listener());
});
export function setDisplayPreference(patch) {
  preferences = normalizePreferences({ ...preferences, ...patch });
  try { localStorage.setItem(key, JSON.stringify(preferences)); storageFailed = false; } catch { storageFailed = true; }
  apply(); listeners.forEach(listener => listener());
}
export function useDisplayPreferences() {
  const value = useSyncExternalStore(listener => { listeners.add(listener); return () => listeners.delete(listener); }, () => preferences);
  return { ...value, storageFailed, setPreference: setDisplayPreference };
}
