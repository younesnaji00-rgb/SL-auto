'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  collectionGroup,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { agentTerrainStatuses } from '@/lib/dossiers-data';

const AGENT_TERRAIN_STATUS_SET = new Set<string>(agentTerrainStatuses as readonly string[]);

/**
 * Active = chiffrage.status !== 'done' (the chiffreur hasn't finalized yet, so
 * the deadline clock is still running for them). Keyed by chiffreur ID.
 */
export function useChiffreurWorkload(): Record<string, number> {
  const db = useFirestore();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'chiffrages'), (snap) => {
      const result: Record<string, number> = {};
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        if (data.status !== 'done' && data.assignedChiffreurId) {
          result[data.assignedChiffreurId] = (result[data.assignedChiffreurId] || 0) + 1;
        }
      });
      setCounts(result);
    });
    return () => unsub();
  }, [db]);

  return counts;
}

/**
 * Active = planification whose parent dossier.statut has NOT been set to one
 * of the `agentTerrainStatuses` (i.e. the agent de terrain hasn't closed out
 * the mission from their decision modal). Keyed by agent-terrain name.
 */
export function useAgentTerrainWorkload(): Record<string, number> {
  const db = useFirestore();
  const [planifs, setPlanifs] = useState<Array<{ dossierId: string; agentTerrain: string }>>([]);
  const [dossierStatuts, setDossierStatuts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collectionGroup(db, 'planifications'), (snap) => {
      const items: Array<{ dossierId: string; agentTerrain: string }> = [];
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        if (data.active === false) return;
        const agent = (data.agentTerrain || '').trim();
        if (!agent) return;
        const dossierId = data.dossierId || d.ref.parent.parent?.id || '';
        if (!dossierId) return;
        items.push({ dossierId, agentTerrain: agent });
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

  return useMemo(() => {
    const result: Record<string, number> = {};
    planifs.forEach((p) => {
      const statut = dossierStatuts[p.dossierId] || '';
      if (AGENT_TERRAIN_STATUS_SET.has(statut)) return;
      result[p.agentTerrain] = (result[p.agentTerrain] || 0) + 1;
    });
    return result;
  }, [planifs, dossierStatuts]);
}
