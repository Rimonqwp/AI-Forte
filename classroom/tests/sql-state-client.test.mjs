import assert from 'node:assert/strict';
import test from 'node:test';
import { stateClient } from '../src/sql-state-client.js';

const apply = (value, body) => body.value ?? [...(value || []).filter(x => !body.remove.includes(x)), ...body.add.filter(x => !(value || []).includes(x) || body.remove.includes(x))];

test('reapplies a change to the latest value after a concurrent save', async () => {
  let saved = {value: ['old'], version: 1}, attempts = 0;
  const client = stateClient(async (path, options) => {
    assert.equal(path, '/state/favorites');
    if (!options) return structuredClone(saved);
    const body = JSON.parse(options.body);
    if (!attempts++) { saved = {value: ['old', 'other-device'], version: 2}; throw Object.assign(new Error(), {status: 409}); }
    assert.equal(body.version, 2);
    assert.equal(options.method, 'PATCH');
    saved = {value: apply(saved.value, body), version: 3};
    return {version: 3};
  });
  assert.deepEqual(await client.update('favorites', value => [...value, 'new']), ['old', 'other-device', 'new']);
});

test('propagates auth and network errors without retrying a write', async () => {
  let writes = 0;
  const client = stateClient(async (path, options) => {
    if (!options) return {version: 0};
    writes++;
    throw Object.assign(new Error('unauthorized'), {status: 401});
  });
  await assert.rejects(client.update('favorites', () => ['new']), /unauthorized/);
  assert.equal(writes, 1);
});

test('bounds retries when all writes conflict', async () => {
  let writes = 0;
  const client = stateClient(async (path, options) => {
    if (!options) return {version: 0};
    writes++;
    throw Object.assign(new Error(), {status: 409});
  });
  await assert.rejects(client.update('favorites', () => []), /storage\/conflict/);
  assert.equal(writes, 8);
});

test('batches initial reads and deduplicates a requested key', async () => {
  const calls = [];
  const client = stateClient(async (path, options) => {
    calls.push(path);
    assert.equal(path, '/state:batchGet');
    const {keys} = JSON.parse(options.body);
    return {states: keys.map(key => ({key, value: [key], version: 1}))};
  });
  const one = client.read('favorites'), duplicate = client.read('favorites'), two = client.read('likes');
  assert.equal(one, duplicate);
  const values = await Promise.all([one, two]);
  assert.deepEqual(values.map(x => x.value), [['favorites'], ['likes']]);
  assert.equal(calls.length, 1);
});

test('deduplicates a key while its network request is already in flight', async () => {
  let finish;
  const client = stateClient(() => new Promise(resolve => { finish = resolve; }));
  const first = client.read('favorites');
  while (!finish) await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(client.read('favorites'), first);
  finish({value: ['star'], version: 1});
  assert.deepEqual((await first).value, ['star']);
});

test('uses cached versions, sends only changed items and skips unchanged writes', async () => {
  const calls = [];
  const client = stateClient(async (path, options) => {
    calls.push(options ? JSON.parse(options.body) : 'read');
    return options ? {version: calls.length} : {version: 1, value: ['star']};
  });
  await client.read('favorites');
  assert.deepEqual(await client.update('favorites', value => [...value, 'sunny']), ['star', 'sunny']);
  await client.update('favorites', value => value.filter(x => x !== 'star'));
  await client.update('favorites', value => value);
  assert.deepEqual(calls, ['read', {version: 1, add: ['sunny'], remove: []}, {version: 2, add: [], remove: ['star']}]);
});

test('serializes concurrent changes to the same key', async () => {
  const bodies = [];
  const client = stateClient(async (path, options) => {
    if (!options) return {value: [], version: 1};
    const body = JSON.parse(options.body);
    bodies.push(body);
    await new Promise(resolve => setTimeout(resolve, 1));
    return {version: body.version + 1};
  });
  const results = await Promise.all(['one', 'two'].map(id => client.update('favorites', value => [...value, id])));
  assert.deepEqual(results, [['one'], ['one', 'two']]);
  assert.deepEqual(bodies.map(x => x.version), [1, 2]);
});

test('uses PUT for reordering and non-list progress', async () => {
  const methods = [];
  const client = stateClient(async (path, options) => {
    if (!options) return {value: ['one', 'two'], version: 1};
    methods.push(options.method);
    return {version: 2};
  });
  await client.update('favorites', value => [...value].reverse());
  await client.update('progress-star-piano', () => ({elapsed: 5, scrollTop: 10, bpm: 96}));
  assert.deepEqual(methods, ['PUT', 'PUT']);
});

test('falls back to PUT and individual reads with an older API', async () => {
  let puts = 0;
  const client = stateClient(async (path, options) => {
    if (!options) return {value: [], version: 1};
    if (options.method === 'PUT') { puts++; return {version: 2}; }
    throw Object.assign(new Error(), {status: 405});
  });
  await Promise.all([client.read('favorites'), client.read('likes')]);
  await client.update('favorites', value => [...value, 'star']);
  assert.equal(puts, 1);
});

test('reuses a private cached value for a conditional 304 response', async () => {
  let reads = 0;
  const client = stateClient(async (path, options) => {
    if (!reads++) return {value: ['star'], version: 1, etag: 'W/"example"'};
    assert.deepEqual(options.headers, {'If-None-Match': 'W/"example"', 'X-State-If-None-Match': 'W/"example"'});
    return {notModified: true};
  });
  const first = await client.read('favorites');
  first.value.push('must-not-mutate-cache');
  assert.deepEqual((await client.read('favorites')).value, ['star']);
});

test('does not downgrade the cache when a read finishes after a newer write', async () => {
  let finish, reads = 0;
  const client = stateClient(async (path, options) => {
    if (!options) {
      if (!reads++) return {value: ['star'], version: 1};
      return new Promise(resolve => { finish = resolve; });
    }
    return {version: JSON.parse(options.body).version + 1};
  });
  await client.read('favorites');
  const stale = client.read('favorites');
  while (!finish) await new Promise(resolve => setTimeout(resolve, 0));
  await client.update('favorites', value => [...value, 'sunny']);
  finish({value: ['star'], version: 1});
  assert.deepEqual(await stale, {value: ['star', 'sunny'], version: 2});
});

test('limits batches to 32 keys and leaves callers able to retry a failed read', async () => {
  const sizes = [];
  let fail = true;
  const client = stateClient(async (path, options) => {
    if (fail) { fail = false; throw new Error('offline'); }
    if (!options) return {version: 0};
    const {keys} = JSON.parse(options.body);
    sizes.push(keys.length);
    return {states: keys.map(key => ({key, version: 0}))};
  });
  await assert.rejects(client.read('favorites'), /offline/);
  await Promise.all(Array.from({length: 65}, (_, i) => client.read(`progress-song-${i}`)));
  assert.deepEqual(sizes, [32, 32]);
});
