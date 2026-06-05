import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCVP_zYN5n2MI-tXjbcknQS1DGqOHCYZ2U",
  authDomain: "studio-9568416614-6523a.firebaseapp.com",
  projectId: "studio-9568416614-6523a",
  storageBucket: "studio-9568416614-6523a.firebasestorage.app",
  messagingSenderId: "588304904574",
  appId: "1:588304904574:web:26b8dd1d7f19241c7c832f",
};

const useEmulator =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

export function initializeFirebase() {
  if (getApps().length > 0) {
    const app = getApps()[0];
    return {
      app,
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app),
    };
  }

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  // Local (not session) persistence — token survives tab/browser close so
  // users don't have to re-authenticate on every reopen (matters on mobile).
  // The token lives in IndexedDB shared across ALL tabs of this browser, so
  // two tabs cannot host different accounts independently — a sign-in in
  // one tab silently flips the other tab's onAuthStateChanged user too.
  // `use-current-user.tsx` defends against that by stamping a per-tab
  // EXPECTED_UID_KEY in sessionStorage and soft-evicting (no global
  // firebaseSignOut) any tab whose live auth UID drifts from what it
  // originally signed in as. Cross-device single-session is enforced
  // separately via the `currentSessionId` snapshot listener.
  setPersistence(auth, browserLocalPersistence);
  // Persistent IndexedDB cache so dossiers stay readable offline and writes
  // queued while offline get flushed on reconnect. Falls back to in-memory
  // cache on the server (no IndexedDB) and in browsers that refuse it
  // (private mode, storage quota exceeded, unsupported).
  const canPersist = typeof window !== 'undefined' && 'indexedDB' in window;
  const db = initializeFirestore(app, {
    localCache: canPersist
      ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      : memoryLocalCache(),
    // Force long-polling unconditionally. AutoDetect was insufficient in
    // some Firefox + network combos and triggered the WebChannel ca9 cascade.
    experimentalForceLongPolling: true,
  });
  const storage = getStorage(app);

  if (useEmulator && typeof window !== 'undefined') {
    const host = '127.0.0.1';
    connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, host, 8080);
    connectStorageEmulator(storage, host, 9199);
  }

  return { app, auth, db, storage };
}

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
