import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, memoryLocalCache, connectFirestoreEmulator, type Firestore } from 'firebase/firestore';
import { getStorage, connectStorageEmulator, type FirebaseStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

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

function bootstrapAppCheck(app: FirebaseApp): void {
  // Client only — App Check is browser-side.
  if (typeof window === 'undefined') return;
  // Skip in emulator mode — App Check tokens don't validate against emulators.
  if (useEmulator) return;
  // Inert until the user provisions reCAPTCHA in Firebase Console and sets this env var.
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return;
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    // HMR re-init or already-initialized — non-fatal.
    console.warn('[app-check] init failed:', err);
  }
}

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
  bootstrapAppCheck(app);
  const auth = getAuth(app);
  // Local (not session) persistence — token survives tab/browser close on
  // mobile. Single-session enforcement still works via the `currentSessionId`
  // listener in `use-current-user.tsx`: any new login elsewhere overwrites
  // that field, the local subscription detects the mismatch and signs out.
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
