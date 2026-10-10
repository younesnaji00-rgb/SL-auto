'use client';

import { useCallback, useEffect, useState } from 'react';
import { collection, type Firestore } from 'firebase/firestore';
import { getDocs } from '@/lib/firestore-logged';
import { useFirestore } from '@/firebase';

/**
 * « Prénom Nom » of an account from its uid or its e-mail — for audit stamps
 * that stored only one of them (the « Mission » step keeps the creator's uid,
 * the visit / rapport / honoraires steps an e-mail). Without it those stamps
 * read « Utilisateur inconnu » (live, 2026-10-09: a123643's steps).
 *
 * The accounts are read once per page load and shared by every caller.
 */
let cache: Map<string, string> | null = null;
let pending: Promise<Map<string, string>> | null = null;

function load(db: Firestore): Promise<Map<string, string>> {
  if (cache) return Promise.resolve(cache);
  if (!pending) {
    pending = getDocs(collection(db, 'users'))
      .then((snap) => {
        const map = new Map<string, string>();
        for (const d of snap.docs) {
          const data = d.data() as { prenom?: string; nom?: string; email?: string };
          const full = `${data.prenom || ''} ${data.nom || ''}`.trim();
          if (!full) continue;
          map.set(d.id, full);
          if (data.email) map.set(data.email.trim().toLowerCase(), full);
        }
        cache = map;
        return map;
      })
      .catch((err) => {
        pending = null;
        console.warn('[use-user-names] users read failed', err);
        return new Map<string, string>();
      });
  }
  return pending;
}

export function useUserNames(): (key: string | null | undefined) => string | null {
  const db = useFirestore();
  const [map, setMap] = useState<Map<string, string> | null>(cache);
  useEffect(() => {
    if (!db || cache) return;
    let alive = true;
    load(db).then((m) => { if (alive) setMap(m); });
    return () => { alive = false; };
  }, [db]);
  // Stable until the names arrive, so callers can list it as a dependency.
  return useCallback(
    (key: string | null | undefined) => {
      const k = (key || '').trim();
      if (!k || !map) return null;
      return map.get(k) ?? map.get(k.toLowerCase()) ?? null;
    },
    [map],
  );
}
