import assert from 'node:assert/strict';
import test from 'node:test';
import { stateClient } from '../src/sql-state-client.js';

test('reapplies a change to the latest value after a concurrent save', async () => {
  let saved = { value: ['old'], version: 1 }, attempts = 0;
  const client = stateClient(async (path, options) => {
    assert.equal(path, '/state/favorites');
    if (!options) return structuredClone(saved);
    const body = JSON.parse(options.body);
    if (!attempts++) { saved = { value: ['old', 'other-device'], version: 2 }; throw Object.assign(new Error(), { status: 409 }); }
    assert.equal(body.version, 2);
    saved = { value: body.value, version: 3 };
    return saved;
  });
  assert.deepEqual(await client.update('favorites', value => [...value, 'new']), ['old', 'other-device', 'new']);
});

test('propagates auth and network errors without retrying a write', async () => {
  let writes = 0;
  const client = stateClient(async (path, options) => {
    if (!options) return { version: 0 };
    writes++;
    throw Object.assign(new Error('unauthorized'), { status: 401 });
  });
  await assert.rejects(client.update('favorites', () => ['new']), /unauthorized/);
  assert.equal(writes, 1);
});

test('bounds retries when all writes conflict', async () => {
  let writes = 0;
  const client = stateClient(async (path, options) => {
    if (!options) return { version: 0 };
    writes++;
    throw Object.assign(new Error(), { status: 409 });
  });
  await assert.rejects(client.update('favorites', () => []), /storage\/conflict/);
  assert.equal(writes, 8);
});
