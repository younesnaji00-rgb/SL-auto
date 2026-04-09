import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCVP_zYN5n2MI-tXjbcknQS1DGqOHCYZ2U",
  authDomain: "studio-9568416614-6523a.firebaseapp.com",
  projectId: "studio-9568416614-6523a",
  storageBucket: "studio-9568416614-6523a.firebasestorage.app",
  messagingSenderId: "588304904574",
  appId: "1:588304904574:web:26b8dd1d7f19241c7c832f",
};

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
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
  const storage = getStorage(app);

  return { app, auth, db, storage };
}

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
