import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, linkWithPopup, signInWithPopup, signInWithCredential, signOut, RecaptchaVerifier, linkWithPhoneNumber, sendEmailVerification, verifyBeforeUpdateEmail, reload, reauthenticateWithPopup, EmailAuthProvider, linkWithCredential, reauthenticateWithCredential, updatePassword, validatePassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { createBindingService, normalizeEmail } from './account-bindings-service.js';
import { stateClient } from './sql-state-client.js';
import { mergeAccountValue } from './account-data.js';
import { authenticateProvider, authenticatePassword } from './account-auth-flow.js';
import { sessionFromToken, captureSuccessfulLogin } from './login-history-store.js';

// Firebase web configuration is public. Access is controlled by Authentication
// and the authenticated account API; no database key belongs in the browser bundle.
const app = initializeApp({
  apiKey: 'AIzaSyDEfVuPiIw9bO9r66GVvrwZosGnbPV2RAY',
  authDomain: 'puyadao.top',
  projectId: 'puyadao-75dd0',
  appId: '1:783569378912:web:955ac462d0295906506d05',
});
export const auth = getAuth(app);
const apiBase = import.meta.env.VITE_ACCOUNT_API_BASE || '/api/account';
async function accountRequest(user, path, options = {}) {
  if (auth.currentUser?.uid !== user.uid) throw new Error('auth/session-changed');
  const token = await user.getIdToken();
  const response = await fetch(`${apiBase}${path}`, {
    ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  });
  if (auth.currentUser?.uid !== user.uid) throw new Error('auth/session-changed');
  if (!response.ok) { const error = new Error('storage/request-failed'); error.status = response.status; throw error; }
  return response.json();
}
let session;
export async function ensureVisitor() {
  await auth.authStateReady();
  if (auth.currentUser) return auth.currentUser;
  if (!session) session = signInAnonymously(auth).then(result => result.user).finally(() => { session = null; });
  return session;
}
export async function connectState(key, expectedUid) {
  const user = await ensureVisitor();
  const assertSession = () => {
    if (auth.currentUser?.uid !== user.uid || (expectedUid && expectedUid !== user.uid)) throw new Error('auth/session-changed');
  };
  assertSession();
  const client = stateClient((path, options) => { assertSession(); return accountRequest(user, path, options); });
  return {
    async read() { return (await client.read(key)).value; },
    update(change) { return client.update(key, change); },
  };
}

export async function readGuestState(uid) {
  const user = auth.currentUser;
  if (user?.uid !== uid) throw new Error('auth/session-changed');
  return accountRequest(user, '/state');
}

async function mergeGuestState(records, uid) {
  const user = auth.currentUser;
  if (user?.uid !== uid) throw new Error('auth/session-changed');
  const client = stateClient((path, options) => accountRequest(user, path, options));
  for (const { key, value } of records) {
    await client.update(key, current => mergeAccountValue(key, current, value));
  }
}

const pendingMerges = new Map();
function rememberMerge(uid, records) {
  pendingMerges.set(uid, records);
  try { localStorage.setItem(`puyadao.pending-merge.${uid}`, JSON.stringify(records)); } catch { /* Keep the in-memory copy. */ }
}
export async function resumeAccountData(user) {
  if (!user || user.isAnonymous) return;
  let records = pendingMerges.get(user.uid);
  try { records ||= JSON.parse(localStorage.getItem(`puyadao.pending-merge.${user.uid}`) || 'null'); } catch { /* No persistent backup. */ }
  if (records) {
    try { await mergeGuestState(records, user.uid); }
    catch (error) { error.code = 'auth/merge-incomplete'; throw error; }
    pendingMerges.delete(user.uid);
    try { localStorage.removeItem(`puyadao.pending-merge.${user.uid}`); } catch { /* Already merged. */ }
  }
  await saveAccountProfile(user);
}

export async function saveAccountProfile(user) {
  if (user.isAnonymous) return;
  await accountRequest(user, '/profile', {
    method: 'PUT', body: JSON.stringify({ displayName: (user.displayName || '').slice(0, 100), photoURL: user.photoURL || '' }),
  });
}

export function signInProvider(providerId, prepareGuest) {
  const provider = providerId === 'google.com' ? new GoogleAuthProvider() : providerId === 'github.com' ? new GithubAuthProvider() : new OAuthProvider('apple.com');
  if (providerId === 'google.com') provider.setCustomParameters({ prompt: 'select_account' });
  // Start the popup in the click handler; read guest data while the user grants consent.
  return authenticateProvider({
    user: auth.currentUser, prepareGuest,
    openPopup: guest => (guest ? linkWithPopup(guest, provider) : signInWithPopup(auth, provider)).then(recordLoginCredential),
    credentialFromError: error => providerId === 'google.com' ? GoogleAuthProvider.credentialFromError(error) : providerId === 'github.com' ? GithubAuthProvider.credentialFromError(error) : OAuthProvider.credentialFromError(error),
    signInCredential: credential => signInWithCredential(auth, credential).then(recordLoginCredential),
    rememberMerge, resumeData: resumeAccountData,
  });
}

export async function signOutAccount() {
  await signOut(auth);
  return ensureVisitor();
}

export function accountBindingService(changed) {
  return createBindingService({
    currentUser: () => auth.currentUser, changed, syncProfile: saveAccountProfile,
    sdk: { linkWithPhoneNumber, sendEmailVerification, verifyBeforeUpdateEmail, reload, reauthenticateWithPopup, GoogleAuthProvider, EmailAuthProvider, linkWithCredential, reauthenticateWithCredential, updatePassword, validatePassword: password => validatePassword(auth, password), sendPasswordResetEmail: (email, settings) => sendPasswordResetEmail(auth, email, settings) },
  });
}
export function phoneVerifier(element, parameters = {}) {
  return new RecaptchaVerifier(auth, element, { size: 'normal', ...parameters });
}

export function signInPassword(email, password, prepareGuest) {
  return authenticatePassword({
    user: auth.currentUser, email: normalizeEmail(email), password, prepareGuest,
    signIn: (address, secret) => signInWithEmailAndPassword(auth, address, secret).then(recordLoginCredential),
    rememberMerge, resumeData: resumeAccountData,
  });
}
export async function resetLoginPassword(email) {
  const address = normalizeEmail(email);
  try { await sendPasswordResetEmail(auth, address); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; }
}

async function readUserLoginSession(user) {
  return sessionFromToken(await user.getIdTokenResult());
}
function recordLoginCredential(result) {
  return captureSuccessfulLogin(result, {currentUser: () => auth.currentUser, readSession: readUserLoginSession, agent: navigator.userAgent});
}
export async function readAccountLoginSession(uid) {
  const user = auth.currentUser;
  if (!user || user.isAnonymous || user.uid !== uid) throw new Error('auth/session-changed');
  const session = await readUserLoginSession(user);
  if (auth.currentUser?.uid !== uid) throw new Error('auth/session-changed');
  return session;
}
