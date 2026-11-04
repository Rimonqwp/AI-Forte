import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore, runTransaction, serverTimestamp } from 'firebase/firestore';

// Firebase web configuration is public. Access is controlled by Authentication
// and firestore.rules; no service-account key belongs in the browser bundle.
const app = initializeApp({
  apiKey: 'AIzaSyDEfVuPiIw9bO9r66GVvrwZosGnbPV2RAY',
  authDomain: 'puyadao-75dd0.firebaseapp.com',
  projectId: 'puyadao-75dd0',
  appId: '1:783569378912:web:955ac462d0295906506d05',
});
const auth = getAuth(app), db = getFirestore(app);
let session;
async function visitor() {
  if (!session) session = (async () => {
    await auth.authStateReady();
    return auth.currentUser || (await signInAnonymously(auth)).user;
  })().catch(error => { session = null; throw error; });
  return session;
}
export async function connectState(key) {
  const user = await visitor();
  const ref = doc(db, 'visitors', user.uid, 'state', key);
  return {
    async read() { const result = await getDocFromServer(ref); return result.exists() ? result.data().value : undefined; },
    update(change) {
      return runTransaction(db, async transaction => {
        const result = await transaction.get(ref);
        const value = change(result.exists() ? result.data().value : undefined);
        transaction.set(ref, { value, updatedAt: serverTimestamp() });
        return value;
      });
    },
  };
}
