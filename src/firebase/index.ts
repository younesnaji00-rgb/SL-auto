import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, memoryLocalCache, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
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
  // Local (not session) persistence — token survives tab/browser close on
  // mobile. Single-session enforcement still works via the `currentSessionId`
  // listener in `use-current-user.tsx`: any new login elsewhere overwrites
  // that field, the local subscription detects the mismatch and signs out.
  setPersistence(auth, browserLocalPersistence);
  const db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
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
