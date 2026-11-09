import { songCatalog } from './library-catalog.js';

export const contentTypes = [
  { id: 'score', name: '乐谱收藏', unit: '首' },
  { id: 'video', name: '视频收藏', unit: '个' },
  { id: 'course', name: '课程收藏', unit: '个' },
  { id: 'work', name: '作品收藏', unit: '个' },
];
const legacyExamples = { practice: '练习清单', sing: '轻松弹唱', sleep: '睡前听歌', piano: '钢琴入门' };
const scoreFacts = {
  star: ['钢琴', 1, '五线谱'], sunny: ['吉他', 2, '和弦谱'], confession: ['钢琴', 3, '五线谱'], night: ['尤克里里', 2, '和弦谱'],
  castle: ['钢琴', 4, '五线谱'], rice: ['吉他', 3, '和弦谱'], fireworks: ['钢琴', 3, '五线谱'], windmill: ['吉他', 3, '和弦谱'],
  nocturne: ['钢琴', 4, '五线谱'], secret: ['钢琴', 3, '五线谱'], north: ['吉他', 3, '和弦谱'], simple: ['尤克里里', 2, '简谱'], clock: ['钢琴', 4, '五线谱'],
};
export const safeImage = value => typeof value === 'string' && value.length <= 400000 && /^(?:data:image\/(?:jpeg|png|webp);base64,[a-z\d+/=]+$|https?:\/\/|\/(?!\/))/i.test(value) ? value : null;
export const safeFavoriteLink = value => typeof value === 'string' && /^(?:https?:\/\/|\/(?!\/)|#)/i.test(value) ? value : null;

export function normalizeMediaFavorites(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return [...value].reverse().filter(item => item && typeof item.id === 'string' && item.id.trim() && typeof item.title === 'string' && item.title.trim() && !seen.has(item.id) && seen.add(item.id)).reverse().slice(-1000).map(item => ({
    id: item.id, title: item.title.trim().slice(0, 200), author: typeof item.author === 'string' ? item.author.slice(0, 100) : '',
    coverImage: safeImage(item.coverImage || item.image || item.cover), url: safeFavoriteLink(item.url),
  }));
}

export function normalizePlaylists(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set(), result = [];
  for (const item of value) {
    if (!item || typeof item.id !== 'string' || !item.id || item.id === 'default' || item.id.startsWith('system-') || seen.has(item.id) || typeof item.name !== 'string' || !item.name.trim()) continue;
    const raw = Array.isArray(item.items) ? item.items : Array.isArray(item.songs) ? item.songs.filter(id => typeof id === 'string').map(id => `score:${id}`) : [];
    const items = [...new Set(raw.filter(key => typeof key === 'string' && /^(score|video|course|work):.+/.test(key)))].slice(0, 1000);
    const coverImage = safeImage(item.coverImage);
    // Drop only untouched, empty folders that the previous UI supplied as examples.
    // Renamed folders, uploaded covers and every existing membership are preserved.
    if (!items.length && !coverImage && legacyExamples[item.id] === item.name) continue;
    seen.add(item.id);
    result.push({ id: item.id, name: item.name.trim().slice(0, 30), coverImage, items });
    if (result.length === 100) break;
  }
  return result;
}

export function favoriteEntries({ scores = [], videos = [], courses = [], works = [] }, assets) {
  const entries = [...new Set(scores)].reverse().flatMap(id => {
    const song = songCatalog.find(item => item.id === id), facts = scoreFacts[id];
    return song && facts ? [{ ...song, key: `score:${id}`, kind: 'score', instrument: facts[0], level: facts[1], notation: facts[2], image: `${assets}score-${id}.png` }] : [];
  });
  for (const [kind, records] of [['video', videos], ['course', courses], ['work', works]]) {
    const seen = new Set();
    for (const item of [...records].reverse()) {
      if (!item || typeof item.id !== 'string' || !item.id.trim() || typeof item.title !== 'string' || !item.title.trim() || seen.has(item.id)) continue;
      seen.add(item.id);
      entries.push({ id: item.id, key: `${kind}:${item.id}`, kind, title: item.title.trim(), artist: typeof item.author === 'string' ? item.author : '', image: safeImage(item.coverImage || item.image || item.cover), url: safeFavoriteLink(item.url) });
    }
  }
  return entries;
}

export function favoriteFolders(playlists, entries) {
  return [
    { id: 'default', name: '默认收藏', system: true },
    ...contentTypes.filter(type => entries.some(item => item.kind === type.id)).map(type => ({ id: `system-${type.id}`, name: type.name, kind: type.id, system: true })),
    ...playlists,
  ];
}
export function folderEntries(folder, entries) {
  if (!folder || folder.id === 'default') return entries;
  if (folder.system) return entries.filter(item => item.kind === folder.kind);
  const lookup = new Map(entries.map(item => [item.key, item]));
  return folder.items.map(key => lookup.get(key)).filter(Boolean);
}
export function folderCover(folder, entries) {
  if (safeImage(folder.coverImage)) return { src: folder.coverImage, kind: 'custom' };
  const first = entries.find(item => item.kind === 'score') || entries[0];
  return first?.image ? { src: first.image, kind: first.kind } : null;
}
