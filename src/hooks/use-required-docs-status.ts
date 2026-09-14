'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { computeRequiredDocsStatus, REQUIRED_SOURCE_SLOTS, type RequiredDocLike, type RequiredDocsStatus } from '@/lib/required-docs';
import { parseAccordDocType } from '@/lib/docType-accorde';

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
  /**
   * At least one 1er accord / 1ère proposition is filled — the extra condition
   * the « 2ème accord et + » send is gated on (step-4-pieces
   * `requireFirstAccordFilled`), surfaced here so the phone action bar can
   * apply the same rule.
   */
  firstAccordFilled: boolean;
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

  const firstAccordFilled = useMemo(() => {
    if (!docs) return false;
    for (const d of docs) {
      if (!d?.url || d.pendingUpload) continue;
      const parsed = parseAccordDocType(((d.type || d.typeDocument || '') as string).trim());
      if (parsed?.ordinal === 1 && (parsed.kind === 'accord' || parsed.kind === 'proposition-accord')) return true;
    }
    return false;
  }, [docs]);

  return useMemo(() => {
    if (docs === null) return { status: null, received: 0, total: REQUIRED_SOURCE_SLOTS.length + 1, loading: true, firstAccordFilled };
    const status = computeRequiredDocsStatus(docs);
    // Required source slots + the garage pair count as one slot each.
    const total = REQUIRED_SOURCE_SLOTS.length + 1;
    const receivedSources = REQUIRED_SOURCE_SLOTS.filter((t) => status.filledTypes.has(t)).length;
    const received = receivedSources + (status.garageFilled ? 1 : 0);
    return { status, received, total, loading: false, firstAccordFilled };
  }, [docs, firstAccordFilled]);
}
