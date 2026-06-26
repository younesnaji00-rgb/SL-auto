'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
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
  const { profile } = useCurrentUser();
  const uid = profile?.uid || '';
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !uid) {
      setRappels([]);
      setLoading(!!db && !uid); // still loading if profile hasn't resolved
      return;
    }
    const q = query(collection(db, 'rappels'), where('recipientUid', '==', uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        // Skip stale empty-cache snapshots so the empty state doesn't flash
        // before the server snapshot arrives (mirrors planification-tab fix).
        if (snap.metadata.fromCache && snap.size === 0) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Rappel[];
        setRappels(items);
        setLoading(false);
      },
      (err) => {
        console.warn('[useRappels] listener error', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [db, uid]);

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
  const { profile } = useCurrentUser();
  const uid = profile?.uid || '';
  const [rappels, setRappels] = useState<Rappel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !uid) {
      setRappels([]);
      setLoading(!!db && !uid);
      return;
    }
    const q = query(collection(db, 'rappels'), where('senderUid', '==', uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        // Skip stale empty-cache snapshots so the empty state doesn't flash
        // before the server snapshot arrives (mirrors useRappels behavior).
        if (snap.metadata.fromCache && snap.size === 0) return;
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Rappel[];
        setRappels(items);
        setLoading(false);
      },
      (err) => {
        console.warn('[useRappelsSent] listener error', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [db, uid]);

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
