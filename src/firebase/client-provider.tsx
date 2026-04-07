'use client';

import React, { useEffect, useState } from 'react';
import { initializeFirebase } from './index';
import { FirebaseProvider } from './provider';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { FirebaseStorage } from 'firebase/storage';
import { seedAllOptions } from '@/lib/seed-options';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [instances, setInstances] = useState<{
    app: FirebaseApp;
    db: Firestore;
    auth: Auth;
    storage: FirebaseStorage;
  } | null>(null);

  useEffect(() => {
    const { app, db, auth, storage } = initializeFirebase();
    setInstances({ app, db, auth, storage });
    
    // Trigger global seed once on startup
    seedAllOptions(db).catch(err => console.warn('Global seed failed:', err));
  }, []);

  if (!instances) {
    return null; // Or a loading spinner
  }

  return (
    <FirebaseProvider 
      app={instances.app} 
      db={instances.db} 
      auth={instances.auth}
      storage={instances.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
