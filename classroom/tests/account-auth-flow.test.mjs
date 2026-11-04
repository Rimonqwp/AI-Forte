import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticateProvider } from '../src/account-auth-flow.js';

const used = () => Object.assign(new Error('already used'), { code: 'auth/credential-already-in-use' });
function setup(overrides = {}) {
  const calls = [];
  return { calls, options: {
    user: { uid: 'guest', isAnonymous: true },
    prepareGuest: async uid => { calls.push(`read:${uid}`); return [{ key: 'favorites', value: ['star'] }]; },
    openPopup: async guest => { calls.push(`popup:${guest?.uid}`); return { user: { uid: 'guest', isAnonymous: false } }; },
    credentialFromError: () => 'google-credential',
    signInCredential: async () => { calls.push('switch'); return { user: { uid: 'member' } }; },
    rememberMerge: (uid, records) => { calls.push(`backup:${uid}`); assert.deepEqual(records[0].value, ['star']); },
    resumeData: async user => { calls.push(`resume:${user.uid}`); }, ...overrides,
  } };
}
test('first sign-in links the guest UID without moving its records', async () => {
  const f = setup(); const result = await authenticateProvider(f.options);
  assert.equal(result.changedUid, false); assert.equal(result.user.uid, 'guest');
  assert.deepEqual(f.calls, ['read:guest', 'popup:guest', 'resume:guest']);
});
test('returning-account sign-in backs up guest records before merging', async () => {
  const f = setup({ openPopup: async () => { throw used(); } });
  const result = await authenticateProvider(f.options);
  assert.equal(result.changedUid, true);
  assert.deepEqual(f.calls, ['read:guest', 'switch', 'backup:member', 'resume:member']);
});
test('failed guest export prevents switching to an existing account', async () => {
  const offline = new Error('offline');
  const f = setup({ prepareGuest: async () => { throw offline; }, openPopup: async () => { throw used(); } });
  await assert.rejects(authenticateProvider(f.options), offline);
  assert.deepEqual(f.calls, []);
});
test('popup starts without waiting for a slow guest export', async () => {
  let popup = false;
  const f = setup({ prepareGuest: () => new Promise(() => {}), openPopup: async () => { popup = true; return { user: { uid: 'guest' } }; } });
  const result = authenticateProvider(f.options); assert.equal(popup, true); await result;
});
test('cancellation does not change identities or attempt a merge', async () => {
  const cancelled = Object.assign(new Error(), { code: 'auth/popup-closed-by-user' });
  const f = setup({ openPopup: async () => { throw cancelled; } });
  await assert.rejects(authenticateProvider(f.options), cancelled);
  assert.deepEqual(f.calls, ['read:guest']);
});
test('switching a member account never exports that member’s data', async () => {
  const f = setup({ user: { uid: 'old-member', isAnonymous: false } });
  await authenticateProvider(f.options);
  assert.deepEqual(f.calls, ['popup:undefined', 'resume:guest']);
});
test('failed merge leaves a backup for a later retry', async () => {
  const failed = new Error('merge offline');
  const f = setup({ openPopup: async () => { throw used(); }, resumeData: async () => { throw failed; } });
  await assert.rejects(authenticateProvider(f.options), failed);
  assert.deepEqual(f.calls, ['read:guest', 'switch', 'backup:member']);
});
