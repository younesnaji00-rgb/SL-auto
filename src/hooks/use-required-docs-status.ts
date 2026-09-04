'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { computeRequiredDocsStatus, REQUIRED_SOURCE_SLOTS, type RequiredDocLike, type RequiredDocsStatus } from '@/lib/required-docs';

/**
 * Live required-pieces status for a dossier (same rule as the Pièces list):
 * how many of the required slots are filled, which are missing, and whether
 * the garage pair (devis OR facture) is satisfied. Used to badge the Pièces
 * tab so the state is visible without opening it.
 */
export function useRequiredDocsStatus(dossierId: string | null | undefined): {
  status: RequiredDocsStatus | null;
  received: number;
  total: number;
  loading: boolean;
} {
  const db = useFirestore();
  const [docs, setDocs] = useState<RequiredDocLike[] | null>(null);

  useEffect(() => {
    if (!db || !dossierId) return;
    const unsub = onSnapshot(
      collection(db, 'dossiers', dossierId, 'documents'),
      (snap) => setDocs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as RequiredDocLike)),
      (err) => {
        console.warn('[use-required-docs-status] listener error', err);
        setDocs([]);
      },
    );
    return () => unsub();
  }, [db, dossierId]);

  return useMemo(() => {
    if (docs === null) return { status: null, received: 0, total: REQUIRED_SOURCE_SLOTS.length + 1, loading: true };
    const status = computeRequiredDocsStatus(docs);
    // Required source slots + the garage pair count as one slot each.
    const total = REQUIRED_SOURCE_SLOTS.length + 1;
    const receivedSources = REQUIRED_SOURCE_SLOTS.filter((t) => status.filledTypes.has(t)).length;
    const received = receivedSources + (status.garageFilled ? 1 : 0);
    return { status, received, total, loading: false };
  }, [docs]);
}
