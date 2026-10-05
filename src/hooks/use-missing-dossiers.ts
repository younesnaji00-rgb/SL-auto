'use client';

/**
 * Which of the dossiers a list points at no longer exist (QA GE-008: the
 * rappels of a deleted dossier stayed in « Mes rappels », the bell and the
 * badges, and opening one led to « Dossier introuvable »).
 *
 * One read per dossier id per page session, shared by every caller (bell,
 * sidebar badge, Mes rappels, dashboard): the verdicts live in this module and
 * every subscriber re-renders when one lands. `deleteDossier` marks its own
 * deletions here at once, without a read.
 *
 * Only a SERVER answer « no such document » counts as missing. A cache-only
 * answer (offline), a permission error or a network failure leaves the id
 * unknown, and an unknown id is treated as existing — nothing disappears on
 * a doubt.
 */

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { doc } from 'firebase/firestore';
import { getDoc } from '@/lib/firestore-logged';
import { useFirestore } from '@/firebase';

const verdicts = new Map<string, 'exists' | 'missing'>();
const inFlight = new Set<string>();
const listeners = new Set<() => void>();
let version = 0;

function emit(): void {
  version += 1;
  listeners.forEach((l) => l());
}
function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
const getVersion = () => version;

/** This client just deleted the dossier: its references disappear at once. */
export function markDossierDeleted(dossierId: string): void {
  if (!dossierId) return;
  verdicts.set(dossierId, 'missing');
  emit();
}

/** The ids among `dossierIds` whose dossier is confirmed deleted. */
export function useMissingDossierIds(dossierIds: readonly (string | null | undefined)[]): ReadonlySet<string> {
  const db = useFirestore();
  const tick = useSyncExternalStore(subscribe, getVersion, getVersion);
  // A stable key: the same ids in any order are the same request.
  const key = useMemo(
    () => Array.from(new Set(dossierIds.filter((id): id is string => !!id))).sort().join('|'),
    [dossierIds],
  );

  useEffect(() => {
    if (!db || !key) return;
    for (const id of key.split('|')) {
      if (verdicts.has(id) || inFlight.has(id)) continue;
      inFlight.add(id);
      getDoc(doc(db, 'dossiers', id))
        .then((snap) => {
          if (snap.exists()) verdicts.set(id, 'exists');
          else if (!snap.metadata.fromCache) verdicts.set(id, 'missing');
        })
        .catch(() => {
          /* unknown — kept visible, asked again on the next change */
        })
        .finally(() => {
          inFlight.delete(id);
          emit();
        });
    }
  }, [db, key]);

  return useMemo(() => {
    const out = new Set<string>();
    if (!key) return out;
    for (const id of key.split('|')) if (verdicts.get(id) === 'missing') out.add(id);
    return out;
    // `tick` re-reads the module verdicts when one lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);
}
