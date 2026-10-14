'use client';

import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from './use-network-status';
import { useFirestore, useStorage } from '@/firebase';
import { uploadProcessor, onSyncChange } from '@/lib/offline/upload-processor';
import { getQueueCounts } from '@/lib/offline/upload-queue';
import { useCurrentUser } from '@/hooks/use-current-user';

export function useOfflineSync() {
  const isOnline = useNetworkStatus();
  const storage = useStorage();
  const db = useFirestore();
  // `pendingCount`: files still being sent. `failedCount`: files the queue
  // gave up on — they wait for « Réessayer » or « Supprimer » and are no
  // longer counted as « en cours d'envoi » (owner 2026-10-05).
  const [counts, setCounts] = useState<{ sending: number; failed: number; failedIds: string[] }>({ sending: 0, failed: 0, failedIds: [] });
  // The reports of abandoned files (upload_failures) say whose device it is.
  const { profile } = useCurrentUser();
  const uid = profile?.uid;
  useEffect(() => {
    uploadProcessor.setReporter(
      uid ? { uid, nom: [ (profile as any)?.prenom, profile?.nom ].filter(Boolean).join(' ') || undefined, email: profile?.email, role: (profile as any)?.roleLabel ?? profile?.role } : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, profile?.nom, profile?.email, profile?.role]);

  const refreshCount = useCallback(async () => {
    try {
      setCounts(await getQueueCounts());
    } catch {
      // IndexedDB may not be available in SSR
    }
  }, []);

  // Process queue when coming back online — and once the account is known,
  // so the files abandoned before the reports existed get reported.
  useEffect(() => {
    if (isOnline && storage && db) {
      uploadProcessor.processQueue(storage, db).then(refreshCount);
    }
  }, [isOnline, storage, db, uid, refreshCount]);

  // Listen for sync changes from the processor
  useEffect(() => {
    const unsubscribe = onSyncChange(refreshCount);
    return unsubscribe;
  }, [refreshCount]);

  // Initial count
  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  return { isOnline, pendingCount: counts.sending, failedCount: counts.failed, failedIds: counts.failedIds };
}

/** Asks the unsent-files list to open (OfflineIndicator listens) — from the account menu once the bar was closed. */
export const OPEN_FAILED_UPLOADS_EVENT = 'sl:open-failed-uploads';
export function openFailedUploadsList(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_FAILED_UPLOADS_EVENT));
}

/**
 * How many files this device gave up sending — read only, no queue run (the
 * account menu shows « Fichiers non envoyés » with it, so the list stays
 * reachable after its bar was closed with « × »).
 */
export function useFailedUploadCount(): number {
  const [failed, setFailed] = useState(0);
  useEffect(() => {
    let alive = true;
    const read = () => {
      getQueueCounts().then((c) => { if (alive) setFailed(c.failed); }).catch(() => {});
    };
    read();
    const off = onSyncChange(read);
    return () => {
      alive = false;
      off();
    };
  }, []);
  return failed;
}
