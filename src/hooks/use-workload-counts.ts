'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collectionGroup,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { subscribeAllChiffreurOpenCounts } from '@/lib/chiffreur-workload';
import { isAtgCompletedStatus } from '@/lib/status-machine';

/**
 * Active = chiffrage.status is not terminal (the chiffreur hasn't finalized
 * yet, so the deadline clock is still running for them). Keyed by chiffreur
 * ID. Backed by the shared `subscribeAllChiffreurOpenCounts` helper so that
 * this hook and the assignations-page chiffreur filter always agree.
 */
export function useChiffreurWorkload(): Record<string, number> {
  const db = useFirestore();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!db) return;
    const unsub = subscribeAllChiffreurOpenCounts(db, setCounts);
    return () => unsub();
  }, [db]);

  return counts;
}

/**
 * Active = planification whose parent dossier.statut has not yet reached the
 * terminal closed state (Accord envoyé). Keyed by agent-terrain name.
 *
 * When `dayFilter` is provided, only planifications whose `dateRDV` falls on
 * that calendar day are counted — used by the planification modal so the agent
 * picker reflects each agent's load for the day being scheduled. Called with no
 * argument, the count spans all days (the assignations-ATG workload overview).
 *
 * NOTE: prior to task #47 this predicate skipped dossiers whose status was in
 * the 6 "agentTerrainStatuses" planification labels — but after task #2
 * repointed that export at the canonical planification labels, those are the
 * in-flight statuses, not the completed ones. The correct "ATG done" check is
 * `isAtgCompletedStatus` (alias of `isClosedStatus`).
 */
export function useAgentTerrainWorkload(dayFilter?: Date | null): Record<string, number> {
  const db = useFirestore();
  const [planifs, setPlanifs] = useState<Array<{ dossierId: string; agentTerrain: string; dateRDVMs: number | null }>>([]);
  const [dossierStatuts, setDossierStatuts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collectionGroup(db, 'planifications'), (snap) => {
      const items: Array<{ dossierId: string; agentTerrain: string; dateRDVMs: number | null }> = [];
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        if (data.active === false) return;
        const agent = (data.agentTerrain || '').trim();
        if (!agent) return;
        const dossierId = data.dossierId || d.ref.parent.parent?.id || '';
        if (!dossierId) return;
        const ts = data.dateRDV;
        const dateRDVMs = ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null;
        items.push({ dossierId, agentTerrain: agent, dateRDVMs });
      });
      setPlanifs(items);
    });
    return () => unsub();
  }, [db]);

  const dossierIdsKey = useMemo(
    () => [...new Set(planifs.map((p) => p.dossierId))].sort().join(','),
    [planifs],
  );

  useEffect(() => {
    if (!db || !dossierIdsKey) {
      setDossierStatuts({});
      return;
    }
    const ids = dossierIdsKey.split(',');
    const unsubs = ids.map((did) =>
      onSnapshot(doc(db, 'dossiers', did), (snap) => {
        if (!snap.exists()) return;
        const statut = (snap.data() as any).statut || '';
        setDossierStatuts((prev) => (prev[did] === statut ? prev : { ...prev, [did]: statut }));
      }),
    );
    return () => unsubs.forEach((u) => u());
  }, [db, dossierIdsKey]);

  // Calendar-day bounds for the optional day filter. Computed as a memoized
  // scalar pair so the counting memo below only re-runs when the day changes,
  // not on every new Date identity. Uses setDate (not +86_400_000) so DST days
  // stay correct — mirrors dayBounds() in use-atg-feasibility.
  const dayBounds = useMemo(() => {
    if (!dayFilter) return null;
    const start = new Date(dayFilter);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }, [dayFilter]);

  return useMemo(() => {
    const result: Record<string, number> = {};
    planifs.forEach((p) => {
      const statut = dossierStatuts[p.dossierId] || '';
      if (isAtgCompletedStatus(statut)) return;
      if (dayBounds) {
        if (p.dateRDVMs == null || p.dateRDVMs < dayBounds.startMs || p.dateRDVMs >= dayBounds.endMs) return;
      }
      result[p.agentTerrain] = (result[p.agentTerrain] || 0) + 1;
    });
    return result;
  }, [planifs, dossierStatuts, dayBounds]);
}
