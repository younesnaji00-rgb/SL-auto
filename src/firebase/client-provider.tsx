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
    
    // Trigger global seed once on startup (skip when offline to prevent duplicate seeds)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      seedAllOptions(db).catch(err => console.warn('Global seed failed:', err));
    }
  }, []);

  if (!instances) {
    // Show minimal shell while Firebase initializes — prevents blank screen flash
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground animate-pulse">Initialisation...</p>
        </div>
      </div>
    );
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
