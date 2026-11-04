import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, GoogleAuthProvider, GithubAuthProvider, OAuthProvider, linkWithPopup, signInWithPopup, signInWithCredential, signOut } from 'firebase/auth';
import { collection, doc, getDocFromServer, getDocsFromServer, getFirestore, runTransaction, serverTimestamp } from 'firebase/firestore';
import { mergeAccountValue } from './account-data.js';
import { authenticateProvider } from './account-auth-flow.js';

// Firebase web configuration is public. Access is controlled by Authentication
// and firestore.rules; no service-account key belongs in the browser bundle.
const app = initializeApp({
  apiKey: 'AIzaSyDEfVuPiIw9bO9r66GVvrwZosGnbPV2RAY',
  authDomain: 'puyadao-75dd0.firebaseapp.com',
  projectId: 'puyadao-75dd0',
  appId: '1:783569378912:web:955ac462d0295906506d05',
});
export const auth = getAuth(app);
const db = getFirestore(app);
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
  const ref = doc(db, 'visitors', user.uid, 'state', key);
  return {
    async read() { assertSession(); const result = await getDocFromServer(ref); assertSession(); return result.exists() ? result.data().value : undefined; },
    update(change) {
      assertSession();
      return runTransaction(db, async transaction => {
        assertSession();
        const result = await transaction.get(ref);
        assertSession();
        const value = change(result.exists() ? result.data().value : undefined);
        transaction.set(ref, { value, updatedAt: serverTimestamp() });
        return value;
      });
    },
  };
}

export async function readGuestState(uid) {
  if (auth.currentUser?.uid !== uid) throw new Error('auth/session-changed');
  const records = await getDocsFromServer(collection(db, 'visitors', uid, 'state'));
  return records.docs.map(record => ({ key: record.id, value: record.data().value }));
}

async function mergeGuestState(records, uid) {
  for (const { key, value } of records) {
    const ref = doc(db, 'visitors', uid, 'state', key);
    await runTransaction(db, async transaction => {
      if (auth.currentUser?.uid !== uid) throw new Error('auth/session-changed');
      const current = await transaction.get(ref);
      transaction.set(ref, { value: mergeAccountValue(key, current.exists() ? current.data().value : undefined, value), updatedAt: serverTimestamp() });
    });
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
  const ref = doc(db, 'users', user.uid);
  await runTransaction(db, async transaction => {
    const current = await transaction.get(ref);
    transaction.set(ref, {
      displayName: (user.displayName || '').slice(0, 100), email: user.email || '', photoURL: user.photoURL || '',
      providers: user.providerData.map(item => item.providerId),
      createdAt: current.exists() ? current.data().createdAt : serverTimestamp(), updatedAt: serverTimestamp(),
    });
  });
}

export function signInProvider(providerId, prepareGuest) {
  const provider = providerId === 'google.com' ? new GoogleAuthProvider() : providerId === 'github.com' ? new GithubAuthProvider() : new OAuthProvider('apple.com');
  if (providerId === 'google.com') provider.setCustomParameters({ prompt: 'select_account' });
  // Start the popup in the click handler; read guest data while the user grants consent.
  return authenticateProvider({
    user: auth.currentUser, prepareGuest,
    openPopup: guest => guest ? linkWithPopup(guest, provider) : signInWithPopup(auth, provider),
    credentialFromError: error => providerId === 'google.com' ? GoogleAuthProvider.credentialFromError(error) : providerId === 'github.com' ? GithubAuthProvider.credentialFromError(error) : OAuthProvider.credentialFromError(error),
    signInCredential: credential => signInWithCredential(auth, credential),
    rememberMerge, resumeData: resumeAccountData,
  });
}

export async function signOutAccount() {
  await signOut(auth);
  return ensureVisitor();
}
