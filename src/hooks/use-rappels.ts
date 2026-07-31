'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useCurrentUser } from '@/hooks/use-current-user';

export interface Rappel {
  id: string;
  batchId?: string;
  recipientUid: string;
  recipientNom?: string;
  senderUid: string;
  senderNom?: string;
  dossierId: string;
  dossierRef?: string;
  dossierData?: any;
  createdAt?: any;
  read?: boolean;
  observation?: string;
  /** When the recipient first opened the dossier from this rappel. */
  seenAt?: any;
  sessionId?: string;
  /** Start of the treatment window (set with sessionId on first open). */
  sessionStartedAt?: any;
  /** End of the treatment window (set on "Valider le traitement"). */
  resolvedAt?: any;
  /**
   * Dot-paths of the dossier doc that changed between session start and
   * "Valider le traitement". Small, kept on the rappel doc so the list can
   * show a change count without loading the heavy snapshots (which live in the
   * `rappels/{id}/snapshots` subcollection: docs `before` and `after`).
   */
  changedPaths?: string[];
}

export function useRappels(): { rappels: Rappel[]; loading: boolean } {
  const db = useFirestore();
  const { profile, loading: userLoading } = useCurrentUser();
  const uid = profile?.uid || '';
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !uid) {
      setRappels([]);
      // Only keep the spinner while the profile itself is still resolving.
      // Once useCurrentUser settles without a uid there is nothing to query —
      // reporting loading=true forever would hang the page on its loader.
      setLoading(!!db && !uid && userLoading);
      return;
    }
    const q = query(collection(db, 'rappels'), where('recipientUid', '==', uid));
    const unsub = onSnapshot(
      q,
      // includeMetadataChanges is required by the empty-cache skip below: on an
      // EMPTY collection the cache→server transition is a metadata-only change,
      // and without this flag Firestore never redelivers the (skipped) snapshot
      // — the page would stay on its loader forever on a fresh project.
      { includeMetadataChanges: true },
      (snap) => {
        // Skip stale empty-cache snapshots so the empty state doesn't flash
        // before the server snapshot arrives (mirrors planification-tab fix).
        if (snap.metadata.fromCache && snap.size === 0) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Rappel[];
        setRappels(items);
        setLoading(false);
      },
      (err) => {
        // Surface listener failures (missing index → failed-precondition,
        // rules → permission-denied) instead of hanging silently.
        console.error('[useRappels] listener error', (err as any)?.code, err?.message);
        if ((err as any)?.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'rappels', operation: 'list' }));
        }
        setLoading(false);
      },
    );
    return () => unsub();
  }, [db, uid, userLoading]);

  // Client-side DESC sort on createdAt (avoids composite-index needs).
  const sorted = useMemo(() => {
    const tsOf = (e: Rappel) => {
      const t = e.createdAt as any;
      if (!t) return 0;
      if (t.toMillis) return t.toMillis();
      if (t.toDate) return t.toDate().getTime();
      const n = Number(t);
      return Number.isFinite(n) ? n : 0;
    };
    return [...rappels].sort((a, b) => tsOf(b) - tsOf(a));
  }, [rappels]);

  return { rappels: sorted, loading };
}

export function useRappelsSent(): { rappels: Rappel[]; loading: boolean } {
  const db = useFirestore();
  const { profile, loading: userLoading } = useCurrentUser();
  const uid = profile?.uid || '';
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !uid) {
      setRappels([]);
      // See useRappels: don't report loading forever once the profile settles.
      setLoading(!!db && !uid && userLoading);
      return;
    }
    const q = query(collection(db, 'rappels'), where('senderUid', '==', uid));
    const unsub = onSnapshot(
      q,
      // See useRappels: required so the server-confirmed EMPTY snapshot (a
      // metadata-only change after a skipped cached one) is still delivered.
      { includeMetadataChanges: true },
      (snap) => {
        // Skip stale empty-cache snapshots so the empty state doesn't flash
        // before the server snapshot arrives (mirrors useRappels behavior).
        if (snap.metadata.fromCache && snap.size === 0) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Rappel[];
        setRappels(items);
        setLoading(false);
      },
      (err) => {
        console.error('[useRappelsSent] listener error', (err as any)?.code, err?.message);
        if ((err as any)?.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ path: 'rappels', operation: 'list' }));
        }
        setLoading(false);
      },
    );
    return () => unsub();
  }, [db, uid, userLoading]);

  // Client-side DESC sort on createdAt (avoids composite-index needs).
  const sorted = useMemo(() => {
    const tsOf = (e: Rappel) => {
      const t = e.createdAt as any;
      if (!t) return 0;
      if (t.toMillis) return t.toMillis();
      if (t.toDate) return t.toDate().getTime();
      const n = Number(t);
      return Number.isFinite(n) ? n : 0;
    };
    return [...rappels].sort((a, b) => tsOf(b) - tsOf(a));
  }, [rappels]);

  return { rappels: sorted, loading };
}
