import test from 'node:test';
import assert from 'node:assert/strict';
import { consecutiveDays, normalizePlaylists, starterPlaylists } from '../src/favorites-store.js';

test('playlist cache removes duplicate IDs, invalid entries and repeated songs', () => {
  const result = normalizePlaylists([null, { id: 'default', name: 'overrides default' }, { id: 'a', name: '  我的练习  ', songs: ['sunny', 7, 'sunny', 'rice'], cover: 'bad' }, { id: 'a', name: 'duplicate' }]);
  assert.deepEqual(result, [{ id: 'a', name: '我的练习', songs: ['sunny', 'rice'], cover: 'confession' }]);
  assert.deepEqual(normalizePlaylists(null), starterPlaylists);
  assert.deepEqual(normalizePlaylists([]), []);
  assert.ok(starterPlaylists.every(item => item.songs.length === 0), 'starter folders never seed fake favorites');
});

test('learning streak deduplicates activity and allows the previous day until today is recorded', () => {
  const now = new Date(2026, 10, 9, 12);
  assert.equal(consecutiveDays(['2026-11-09', '2026-11-09', '2026-11-08', '2026-11-07', 'bad'], now), 3);
  assert.equal(consecutiveDays(['2026-11-08', '2026-11-07'], now), 2);
  assert.equal(consecutiveDays(['2026-11-07', '2026-11-06'], now), 0);
  assert.equal(consecutiveDays([], now), 0);
});
