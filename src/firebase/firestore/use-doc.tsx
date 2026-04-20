'use client';

import { useState, useEffect, useRef } from 'react';
import {
  type DocumentReference,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { subscribe } from './listener-cache';

export function useDoc<T = DocumentData>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const pathRef = useRef<string>('');

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    const key = `doc:${ref.path}`;
    pathRef.current = ref.path;

    const { unsubscribe, cachedData, hasCache } = subscribe<T | null>(
      key,
      (onData, onError) =>
        onSnapshot(
          ref,
          (doc) => {
            if (doc.exists()) {
              onData({ ...doc.data(), id: doc.id } as T);
            } else {
              onData(null);
            }
          },
          (serverError) => {
            console.warn('[useDoc] Firestore error on', ref.path, '—', (serverError as any)?.code, serverError?.message);
            if ((serverError as any)?.code === 'permission-denied') {
              errorEmitter.emit('permission-error', new FirestorePermissionError({ path: ref.path, operation: 'get' }));
            }
            onError(serverError);
          }
        ),
      (d) => {
        setData(d);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    // If we got cached data from a shared listener, use it immediately
    if (hasCache) {
      setData(cachedData ?? null);
      setLoading(false);
    }

    return () => unsubscribe();
  }, [ref]);

  return { data, loading, error };
}
