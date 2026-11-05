import assert from 'node:assert/strict';
import test from 'node:test';
import { readProfileAvatar, saveProfileEdits, prepareAvatar } from '../src/profile-editor.js';
const avatar = 'data:image/jpeg;base64,aGVsbG8=';
function fixture() {
  const data = new Map(), user = { uid: 'alice', displayName: 'Alice', isAnonymous: false };
  const calls = [];
  const adapter = { currentUser: () => user, storage: {getItem: key => data.get(key), setItem: (key, value) => data.set(key, value)}, updateName: async (user, name) => { calls.push(name); user.displayName = name; }, syncProfile: async () => {}, changed: () => calls.push('refresh') };
  return { user, adapter, calls };
}
test('saving trims name, synchronizes it and stores avatar only for its UID', async () => {
  const {user, adapter, calls} = fixture();
  assert.deepEqual(await saveProfileEdits({uid:'alice', displayName:'  New name  ', photoURL:avatar}, adapter), {syncPending:false});
  assert.equal(user.displayName, 'New name'); assert.deepEqual(calls, ['New name','refresh']);
  assert.equal(readProfileAvatar('alice', adapter.storage), avatar); assert.equal(readProfileAvatar('bob', adapter.storage), null);
});
test('invalid and switched identities never write profile data', async () => {
  const {adapter, calls} = fixture();
  for (const changes of [{uid:'bob',displayName:'Bob'}, {uid:'alice',displayName:'  '}, {uid:'alice',displayName:'Alice',photoURL:'javascript:bad'}]) {
    await assert.rejects(saveProfileEdits(changes, adapter));
  }
  assert.deepEqual(calls, []);
  let identity = {uid:'alice', displayName:'Alice'};
  adapter.currentUser = () => identity;
  adapter.updateName = async () => { identity = {uid:'bob'}; };
  await assert.rejects(saveProfileEdits({uid:'alice',displayName:'New',photoURL:avatar}, adapter), /session-changed/);
  assert.equal(readProfileAvatar('alice', adapter.storage), null);
});
test('remote failure is retryable and storage failures are not reported as success', async () => {
  const {adapter} = fixture();
  adapter.updateName = async () => { throw Error('offline'); };
  await assert.rejects(saveProfileEdits({uid:'alice',displayName:'New',photoURL:avatar}, adapter));
  assert.equal(readProfileAvatar('alice', adapter.storage), null);
  adapter.storage.setItem = () => {throw Error('quota');};
  await assert.rejects(saveProfileEdits({uid:'alice',displayName:'Alice',photoURL:avatar}, adapter), /quota/);
  adapter.syncProfile = async () => {throw Error('offline');};
  assert.equal((await saveProfileEdits({uid:'alice',displayName:'Alice'}, adapter)).syncPending, true);
});
test('invalid files are rejected before decoding', async () => {
  await assert.rejects(prepareAvatar({type:'image/svg+xml',size:12}), /JPG/);
  await assert.rejects(prepareAvatar({type:'image/png',size:6*1024*1024}), /5 MB/);
});
