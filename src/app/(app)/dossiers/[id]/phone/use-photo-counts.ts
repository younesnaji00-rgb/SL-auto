'use client';

/**
 * Photo count per visit category for the phone step screen's « Photos » facet
 * badge (mobile redesign 2026-09-14, `Phone.dc.html` dossier detail: the
 * facet strip shows « Photos 12 » so the state reads without opening it).
 *
 * Pass `null` to keep the listener off (desktop: the facet strip there has
 * no photo badge and must stay byte-identical).
 */

import { useEffect, useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { onSnapshot } from '@/lib/firestore-logged';
import { useFirestore } from '@/firebase';

export type PhotoCounts = Record<'avant' | 'en_cours' | 'apres', number>;

const EMPTY: PhotoCounts = { avant: 0, en_cours: 0, apres: 0 };

export function usePhotoCounts(dossierId: string | null | undefined): PhotoCounts {
  const db = useFirestore();
  const [docs, setDocs] = useState<{ category?: string; url?: string; pendingUpload?: boolean }[] | null>(null);

  useEffect(() => {
    if (!db || !dossierId) {
      setDocs(null);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'dossiers', dossierId, 'photos'),
      (snap) => setDocs(snap.docs.map((d) => d.data() as { category?: string; url?: string; pendingUpload?: boolean })),
      (err) => {
        console.warn('[use-photo-counts] listener error', err);
        setDocs([]);
      },
    );
    return () => unsub();
  }, [db, dossierId]);

  return useMemo(() => {
    if (!docs) return EMPTY;
    const out: PhotoCounts = { avant: 0, en_cours: 0, apres: 0 };
    for (const p of docs) {
      if (p.category === 'avant' || p.category === 'en_cours' || p.category === 'apres') out[p.category] += 1;
    }
    return out;
  }, [docs]);
}
