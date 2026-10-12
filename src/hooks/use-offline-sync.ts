'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './use-network-status';
import { useFirestore, useStorage } from '@/firebase';
import { uploadProcessor, onSyncChange } from '@/lib/offline/upload-processor';
import { getQueueCounts } from '@/lib/offline/upload-queue';

export function useOfflineSync() {
  const isOnline = useNetworkStatus();
  const storage = useStorage();
  const db = useFirestore();
  // `pendingCount`: files still being sent. `failedCount`: files the queue
  // gave up on — they wait for « Réessayer » or « Supprimer » and are no
  // longer counted as « en cours d'envoi » (owner 2026-10-05).
  const [counts, setCounts] = useState({ sending: 0, failed: 0 });

  const refreshCount = useCallback(async () => {
    try {
      setCounts(await getQueueCounts());
    } catch {
      // IndexedDB may not be available in SSR
    }
  }, []);

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline && storage && db) {
      uploadProcessor.processQueue(storage, db).then(refreshCount);
    }
  }, [isOnline, storage, db, refreshCount]);

  // Listen for sync changes from the processor
  useEffect(() => {
    const unsubscribe = onSyncChange(refreshCount);
    return unsubscribe;
  }, [refreshCount]);

  // Initial count
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  return { isOnline, pendingCount: counts.sending, failedCount: counts.failed };
}
