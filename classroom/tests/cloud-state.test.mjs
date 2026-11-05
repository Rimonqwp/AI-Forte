import assert from 'node:assert/strict';
import test from 'node:test';
import { createCloudState } from '../src/cloud-state-store.js';

const turn = () => new Promise(resolve => setTimeout(resolve, 0));
function fixture({ remote, cache, read, update } = {}) {
  const writes = [];
  const state = createCloudState({
    initial: [], readCache: () => cache, writeCache: value => { cache = value; },
    connect: async () => ({ read: read || (async () => remote), update: update || (async change => { remote = change(remote); writes.push(remote); return remote; }) }),
  });
  return { state, writes, cached: () => cache };
}

test('actions made before hydration are replayed over cloud state', async () => {
  let resolve;
  const f = fixture({ remote: ['cloud'], read: () => new Promise(done => { resolve = done; }) });
  f.state.subscribe(() => {});
  const saved = f.state.update(values => [...values, 'new']);
  await turn(); resolve(['cloud']);
  assert.equal(await saved, true);
  assert.deepEqual(f.state.getSnapshot().value, ['cloud', 'new']);
  assert.deepEqual(f.writes, [['cloud', 'new']]);
});

test('an empty initial read does not prevent subsequent writes', async () => {
  const f = fixture(); f.state.subscribe(() => {}); await turn();
  await f.state.update(['first']); await f.state.update(values => [...values, 'second']);
  assert.deepEqual(f.writes, [['first'], ['first', 'second']]);
});

test('failed writes remain local and retry in order', async () => {
  let offline = true, remote = ['existing'];
  const f = fixture({ remote, update: async change => { if (offline) throw new Error('offline'); return remote = change(remote); } });
  const saved = f.state.update(values => [...values, 'new']);
  assert.equal(await saved, false);
  assert.deepEqual(f.cached(), { value: ['existing', 'new'], dirty: true });
  offline = false; await f.state.retry();
  assert.deepEqual(remote, ['existing', 'new']);
  assert.equal(f.state.getSnapshot().status, 'synced');
  assert.equal(f.cached().dirty, false);
});

test('unsynced changes survive a reload, including removing all favorites', async () => {
  const f = fixture({ remote: ['old'], cache: { value: [], dirty: true } });
  f.state.subscribe(() => {}); await turn();
  assert.deepEqual(f.writes, [[]]);
});

test('a fresh cloud value wins over a clean browser cache', async () => {
  const f = fixture({ remote: ['latest'], cache: { value: ['stale'], dirty: false } });
  f.state.subscribe(() => {}); await turn();
  assert.deepEqual(f.state.getSnapshot().value, ['latest']);
  assert.deepEqual(f.writes, []);
});

test('concurrent local actions each commit once and share one initial read', async () => {
  let reads = 0;
  const f = fixture({ read: async () => { reads++; return []; } });
  await Promise.all([f.state.update(v => [...v, 'a']), f.state.update(v => [...v, 'b'])]);
  assert.equal(reads, 1);
  assert.deepEqual(f.writes, [['a'], ['a', 'b']]);
});
