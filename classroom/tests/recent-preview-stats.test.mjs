import test from 'node:test';
import assert from 'node:assert/strict';
const data = new Map();
globalThis.localStorage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
globalThis.window = new EventTarget();
const { localDay, recordPreviewTime, clearPreviewTime, summarizePreviewTime } = await import('../src/recent-preview-stats.js');
const read = uid => JSON.parse(data.get(`puyadao.preview-time.${uid}`) || '[]');
const today = new Date(2026, 10, 6, 12).getTime();
const dayAgo = count => new Date(2026, 10, 6 - count, 12).getTime();
test('foreground time merges by song and local day and is isolated by account', () => {
  recordPreviewTime('alice', 'sunny', 90, today);
  recordPreviewTime('alice', 'sunny', 30, today);
  recordPreviewTime('alice', 'sunny', 60, dayAgo(1));
  recordPreviewTime('bob', 'sunny', 10, today);
  assert.equal(read('alice').length, 2);
  assert.equal(read('alice').find(item => item.day === localDay(today)).seconds, 120);
  assert.equal(read('bob')[0].seconds, 10);
});
test('weekly chart uses local calendar dates and counts continuous days', () => {
  const items = [0, 1, 2, 4, 7].map(offset => ({ songId: 'sunny', day: localDay(dayAgo(offset)), seconds: 60 }));
  const stats = summarizePreviewTime(items, today);
  assert.equal(stats.total, 300);
  assert.equal(stats.streak, 3);
  assert.equal(stats.week.length, 7);
  assert.deepEqual(stats.week.map(day => day.seconds), [0, 0, 60, 0, 60, 60, 60]);
  assert.equal(stats.week.at(-1).day, localDay(today));
});
test('streak remains available until the current day ends, average uses distinct songs', () => {
  const items = [{ songId: 'sunny', day: localDay(dayAgo(1)), seconds: 120 }, { songId: 'rice', day: localDay(dayAgo(2)), seconds: 60 }];
  const stats = summarizePreviewTime(items, today);
  assert.equal(stats.streak, 2);
  assert.equal(stats.average, 90);
  assert.equal(stats.count, 2);
  assert.equal(summarizePreviewTime(items, dayAgo(-2)).streak, 0);
});
test('invalid durations are ignored, clearing is account scoped, storage errors stay usable', () => {
  for (const value of [-10, 0, NaN, Infinity]) recordPreviewTime('invalid', 'sunny', value, today);
  assert.deepEqual(read('invalid'), []);
  clearPreviewTime('alice');
  assert.deepEqual(read('alice'), []);
  assert.equal(read('bob')[0].seconds, 10);
  const original = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('quota'); };
  assert.doesNotThrow(() => recordPreviewTime('offline', 'rice', 10, today));
  localStorage.setItem = original;
});
