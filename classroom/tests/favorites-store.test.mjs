import test from 'node:test';
import assert from 'node:assert/strict';
import { consecutiveDays, normalizePlaylists } from '../src/favorites-store.js';
import { favoriteEntries, favoriteFolders, folderEntries, folderCover, safeImage, normalizeMediaFavorites } from '../src/favorite-folders.js';
import { prepareFolderCover } from '../src/favorite-cover.js';

test('playlist cache removes duplicate IDs, invalid entries and repeated songs', () => {
  const result = normalizePlaylists([null, { id: 'default', name: 'overrides default' }, { id: 'a', name: '  我的练习  ', songs: ['sunny', 7, 'sunny', 'rice'], cover: 'bad' }, { id: 'a', name: 'duplicate' }]);
  assert.deepEqual(result, [{ id: 'a', name: '我的练习', items: ['score:sunny', 'score:rice'], coverImage: null }]);
  assert.deepEqual(normalizePlaylists(null), []);
  assert.deepEqual(normalizePlaylists([]), []);
});

test('migration removes untouched empty examples but retains user changes and content', () => {
  const folders = normalizePlaylists([
    { id: 'practice', name: '练习清单', songs: [], cover: 'sunny' },
    { id: 'sing', name: '轻松弹唱', songs: ['sunny'], cover: 'windmill' },
    { id: 'sleep', name: '我的睡前练习', songs: [] },
    { id: 'user-created', name: '新收藏夹', items: [] },
    { id: 'system-score', name: '覆盖系统', items: [] },
  ]);
  assert.deepEqual(folders.map(item => item.id), ['sing', 'sleep', 'user-created']);
  assert.deepEqual(folders[0].items, ['score:sunny']);
  assert.equal(folders[0].coverImage, null);
});

test('content types automatically create one folder and keep shared counts accurate', () => {
  let entries = favoriteEntries({ scores: ['sunny', 'rice', 'sunny'] }, '/assets/');
  assert.deepEqual(favoriteFolders([], entries).map(item => item.id), ['default', 'system-score']);
  entries = favoriteEntries({ scores: ['sunny'], videos: [{ id: 'a', title: '视频 A', url: 'https://example.com/a' }, { id: 'a', title: '视频 A' }], courses: [{ id: 'a', title: '课程 A' }] }, '/assets/');
  const folders = favoriteFolders([], entries);
  assert.deepEqual(folders.map(item => item.id), ['default', 'system-score', 'system-video', 'system-course']);
  assert.equal(folderEntries(folders[0], entries).length, 3);
  assert.equal(folderEntries(folders[2], entries)[0].key, 'video:a');
  assert.equal(folderEntries(folders[3], entries)[0].key, 'course:a');
  assert.deepEqual(favoriteFolders([], []).map(item => item.id), ['default']);
});

test('uploaded cover wins; otherwise use the first score in folder order and refresh after removal', () => {
  const entries = favoriteEntries({ scores: ['rice', 'sunny'] }, '/assets/');
  const folder = normalizePlaylists([{ id: 'a', name: '练习', items: ['score:rice', 'score:sunny'] }])[0];
  assert.deepEqual(folderCover(folder, folderEntries(folder, entries)), { src: '/assets/score-rice.png', kind: 'score' });
  const image = 'data:image/jpeg;base64,YQ==';
  assert.deepEqual(folderCover({ ...folder, coverImage: image }, entries), { src: image, kind: 'custom' });
  const remaining = entries.filter(item => item.id !== 'rice');
  assert.equal(folderCover(folder, folderEntries(folder, remaining)).src, '/assets/score-sunny.png');
  assert.equal(folderCover(folder, []), null);
  assert.equal(safeImage('javascript:alert(1)'), null);
  assert.equal(safeImage('data:image/svg+xml;base64,YQ=='), null);
});

test('mixed custom folders preserve membership order and safe links', () => {
  const entries = favoriteEntries({ scores: ['sunny'], videos: [{ id: 'v', title: '视频', url: 'javascript:alert(1)' }], courses: [{ id: 'c', title: '课程', url: '/course/c' }] }, '/assets/');
  const folder = normalizePlaylists([{ id: 'a', name: '混合收藏', items: ['course:c', 'video:v', 'score:sunny', 'score:sunny', 'unknown:x'] }])[0];
  assert.deepEqual(folderEntries(folder, entries).map(item => item.key), ['course:c', 'video:v', 'score:sunny']);
  assert.equal(folderEntries(folder, entries)[1].url, null);
  assert.equal(folderCover(folder, folderEntries(folder, entries)).src, '/assets/score-sunny.png');
});

test('cover validation rejects unsupported or oversized files before decoding', async () => {
  await assert.rejects(prepareFolderCover({ type: 'image/svg+xml', size: 1 }), /JPG/);
  await assert.rejects(prepareFolderCover({ type: 'image/png', size: 6 * 1024 * 1024 }), /5 MB/);
  await assert.rejects(prepareFolderCover({ type: 'image/jpeg', size: 0 }), /5 MB/);
});

test('media favorites keep the latest duplicate metadata and reject unsafe image/link values', () => {
  const items = normalizeMediaFavorites([null, { id: 'v', title: '旧名称' }, { id: 'v', title: ' 视频 ', author: '老师', image: 'data:image/svg+xml;base64,YQ==', url: 'javascript:alert(1)' }]);
  assert.deepEqual(items, [{ id: 'v', title: '视频', author: '老师', coverImage: null, url: null }]);
  assert.deepEqual(normalizeMediaFavorites({}), []);
});

test('learning streak deduplicates activity and allows the previous day until today is recorded', () => {
  const now = new Date(2026, 10, 9, 12);
  assert.equal(consecutiveDays(['2026-11-09', '2026-11-09', '2026-11-08', '2026-11-07', 'bad'], now), 3);
  assert.equal(consecutiveDays(['2026-11-08', '2026-11-07'], now), 2);
  assert.equal(consecutiveDays(['2026-11-07', '2026-11-06'], now), 0);
  assert.equal(consecutiveDays([], now), 0);
});
