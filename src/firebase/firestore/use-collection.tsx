'use client';

import { useState, useEffect, useRef } from 'react';
import {
  type Query,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { subscribe } from './listener-cache';

// Build a stable key from a Firestore query
function queryKey(q: Query<any>): string {
  // Use the query's internal representation for dedup
  // Firestore query objects have a stable _query property,
  // but we use the converter-aware toString approach
  try {
    return `col:${(q as any)._query?.path?.toString?.() || 'unknown'}_${JSON.stringify((q as any)._query?.filters || [])}`;
  } catch {
    return `col:${Math.random()}`;
  }
}

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setLoading(false);
      return;
    }

    const key = queryKey(query);

    const { unsubscribe, cachedData, hasCache } = subscribe<T[]>(
      key,
      (onData, onError) =>
        onSnapshot(
          query,
          (snapshot) => {
            const items = snapshot.docs.map((doc) => ({
              ...doc.data(),
              id: doc.id,
            })) as unknown as T[];
            onData(items);
          },
          (serverError) => {
            const permissionError = new FirestorePermissionError({
              path: '(query)',
              operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
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

    if (hasCache) {
      setData(cachedData ?? null);
      setLoading(false);
    }

    return () => unsubscribe();
  }, [query]);

  return { data, loading, error };
}
