'use client';

import { useState, useEffect } from 'react';
import {
  type Query,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { errorEmitter } from '../error-emitter';
import { FirestorePermissionError } from '../errors';
import { subscribe } from './listener-cache';
import { useListenerEpoch } from '@/hooks/use-listener-epoch';

// Stable dedup key for a Firestore query. Everything that changes the result
// is in it: path OR collection group, filters, ORDER, LIMIT and cursors. The
// old key held only path + filters, so every collection-group query shared
// « col:unknown » and an ordered / limited query shared the unordered
// listener of the same collection.
export function queryKey(q: Query<any>): string {
  try {
    const iq = (q as any)._query;
    return `col:${JSON.stringify({
      p: iq?.path?.canonicalString?.() ?? iq?.path?.toString?.() ?? null,
      g: iq?.collectionGroup ?? null,
      f: iq?.filters ?? [],
      o: iq?.explicitOrderBy ?? [],
      l: iq?.limit ?? null,
      t: iq?.limitType ?? null,
      s: iq?.startAt ?? null,
      e: iq?.endAt ?? null,
    })}`;
  } catch {
    return `col:${Math.random()}`;
  }
}

export function useCollection<T = DocumentData>(query: Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // A failed listener is dead: re-subscribe (fresh token, new listener)
  // instead of leaving the last rows frozen on screen, and again whenever the
  // signed-in account changes under this tab.
  const { epoch, onDenied, onHealthy } = useListenerEpoch();

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
            const path = (query as any)?._query?.path?.canonicalString?.() ?? (query as any)?._query?.path?.toString?.() ?? '(query)';
            console.warn('[useCollection] Firestore error on', path, '—', (serverError as any)?.code, serverError?.message);
            if ((serverError as any)?.code === 'permission-denied') {
              errorEmitter.emit('permission-error', new FirestorePermissionError({ path, operation: 'list' }));
            }
            onError(serverError);
          }
        ),
      (d) => {
        setData(d);
        setError(null);
        setLoading(false);
        onHealthy();
      },
      (err) => {
        // Retry budget left: keep what is shown, the epoch re-subscribes.
        if (onDenied()) return;
        setError(err);
        setLoading(false);
      }
    );

    if (hasCache) {
      setData(cachedData ?? null);
      setLoading(false);
    }

    return () => unsubscribe();
    // onDenied / onHealthy are stable (useCallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, epoch]);

  return { data, loading, error };
}
