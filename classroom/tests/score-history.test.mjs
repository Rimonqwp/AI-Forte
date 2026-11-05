import test from 'node:test';
import assert from 'node:assert/strict';

const data = new Map();
globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
globalThis.window = new EventTarget();
const { recordScoreVisit } = await import('../src/score-history.js');
const read = (uid, kind) => JSON.parse(data.get(`puyadao.score-history.${uid}.${kind}`) || '[]');

test('reopening a score moves it to the front without duplicating it', () => {
  recordScoreVisit('order', 'recent', 'sunny');
  recordScoreVisit('order', 'recent', 'rice');
  recordScoreVisit('order', 'recent', 'sunny');
  assert.deepEqual(read('order', 'recent').map(item => item.songId), ['sunny', 'rice']);
});
test('practice remembers exact versions and keeps accounts and view history separate', () => {
  recordScoreVisit('alice', 'practiced', 'rice', 'piano-easy');
  recordScoreVisit('alice', 'practiced', 'rice', 'guitar-sing');
  recordScoreVisit('bob', 'recent', 'star');
  assert.deepEqual(read('alice', 'practiced').map(item => item.versionId), ['guitar-sing', 'piano-easy']);
  assert.deepEqual(read('alice', 'recent'), []);
  assert.deepEqual(read('bob', 'practiced'), []);
  assert.equal(read('bob', 'recent')[0].songId, 'star');
});
test('history retains only the 50 most recent entries', () => {
  for (let index = 0; index < 60; index++) recordScoreVisit('limit', 'recent', `song-${index}`);
  const items = read('limit', 'recent');
  assert.equal(items.length, 50);
  assert.equal(items[0].songId, 'song-59');
  assert.equal(items.at(-1).songId, 'song-10');
});
test('storage failure leaves visit recording usable', () => {
  const original = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('storage unavailable'); };
  assert.doesNotThrow(() => recordScoreVisit('offline', 'recent', 'rice'));
  localStorage.setItem = original;
});
