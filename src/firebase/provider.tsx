'use client';

import React, { createContext, useContext } from 'react';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { FirebaseStorage } from 'firebase/storage';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextType {
  app: FirebaseApp | null;
  db: Firestore | null;
  auth: Auth | null;
  storage: FirebaseStorage | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  db: null,
  auth: null,
  storage: null,
});

export function FirebaseProvider({
  children,
  app,
  db,
  auth,
  storage,
}: {
  children: React.ReactNode;
  app: FirebaseApp;
  db: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
}) {
  return (
    <FirebaseContext.Provider value={{ app, db, auth, storage }}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebaseApp = () => {
  const context = useContext(FirebaseContext);
  if (!context.app) throw new Error('useFirebaseApp must be used within a FirebaseProvider');
  return context.app;
};

export const useFirestore = () => {
  const context = useContext(FirebaseContext);
  if (!context.db) throw new Error('useFirestore must be used within a FirebaseProvider');
  return context.db;
};

export const useAuth = () => {
  const context = useContext(FirebaseContext);
  if (!context.auth) throw new Error('useAuth must be used within a FirebaseProvider');
  return context.auth;
};

export const useStorage = () => {
  const context = useContext(FirebaseContext);
  if (!context.storage) throw new Error('useStorage must be used within a FirebaseProvider');
  return context.storage;
};
