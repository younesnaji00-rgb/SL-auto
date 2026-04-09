'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './use-network-status';
import { useFirestore, useStorage } from '@/firebase';
import { uploadProcessor, onSyncChange } from '@/lib/offline/upload-processor';
import { getPendingCount } from '@/lib/offline/upload-queue';

export function useOfflineSync() {
  const isOnline = useNetworkStatus();
  const storage = useStorage();
  const db = useFirestore();
  const [pendingCount, setPendingCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
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

  return { isOnline, pendingCount };
}
