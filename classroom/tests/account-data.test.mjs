import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeAccountValue, cacheKey, authErrorMessage } from '../src/account-data.js';

test('returning members keep their favorites and gain guest favorites once', () => {
  const merged = mergeAccountValue('favorites', ['rice', 'star'], ['star', 'sunny']);
  assert.deepEqual(merged, ['rice', 'star', 'sunny']);
  assert.deepEqual(mergeAccountValue('favorites', merged, ['star', 'sunny']), merged);
});
test('saved member practice positions win over guest positions', () => {
  const member = { elapsed: 50, bpm: 90, scrollTop: 100 };
  assert.equal(mergeAccountValue('progress-rice-v1', member, { elapsed: 10, bpm: 60, scrollTop: 0 }), member);
  assert.equal(mergeAccountValue('progress-rice-v1', undefined, member), member);
});
test('check-in merging keeps the newest 1000 unique days', () => {
  const days = Array.from({ length: 1100 }, (_, i) => String(i).padStart(4, '0'));
  const merged = mergeAccountValue('checkins', days, ['1099', '1100']);
  assert.equal(merged.length, 1000); assert.equal(merged[0], '0101'); assert.equal(merged.at(-1), '1100');
});
test('account cache keys are scoped by UID', () => {
  assert.notEqual(cacheKey('alice', 'favorites'), cacheKey('bob', 'favorites'));
});
test('auth failures explain recovery without exposing provider errors', () => {
  assert.match(authErrorMessage({ code: 'auth/popup-blocked' }), /允许.*弹出/);
  assert.match(authErrorMessage({ code: 'auth/merge-incomplete' }), /重试同步/);
  assert.doesNotMatch(authErrorMessage({ code: 'unknown', message: 'secret' }), /secret/);
});

test('account stores isolate old caches and migrate legacy data only for its owner', async () => {
  const values = new Map([
    ['puyadao.cloud.favorites', JSON.stringify({ value: ['legacy-star'], dirty: false })],
    [cacheKey('bob', 'favorites'), JSON.stringify({ value: ['bob-rice'], dirty: false })],
  ]);
  globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  globalThis.window = { addEventListener() {} };
  const { cloudStoreFor } = await import('../src/cloud-stores.js');
  assert.deepEqual(cloudStoreFor('alice', 'favorites', []).getSnapshot().value, ['legacy-star']);
  assert.deepEqual(cloudStoreFor('bob', 'favorites', []).getSnapshot().value, ['bob-rice']);
  assert.deepEqual(cloudStoreFor('new-guest', 'favorites', []).getSnapshot().value, []);
  assert.equal(values.get('puyadao.legacy-cache-owner'), 'alice');
});
