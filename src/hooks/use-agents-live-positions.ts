'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useFirestore } from '@/firebase';

/**
 * Live positions of every Agent de Terrain (users/{uid}.currentLocation —
 * written by the GPS publisher; same source as use-agent-live-location.ts,
 * but across ALL agents for the dispatch map). Positions older than
 * MAX_AGE_MS are dropped; freshness classification (FRESH_MS, mirrors the
 * single-agent hook) is left to the consumer via `updatedAtMs`.
 */

export const AGENT_POSITION_FRESH_MS = 10 * 60 * 1000;
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface AgentLivePosition {
  uid: string;
  name: string;
  lat: number;
  lng: number;
  updatedAtMs: number;
}

export function useAgentsLivePositions(
  enabled: boolean,
  /** Restrict to one uid (an ATG sees only their own marker). */
  onlyUid?: string | null,
): AgentLivePosition[] {
  const db = useFirestore();
  const [positions, setPositions] = useState<AgentLivePosition[]>([]);

  useEffect(() => {
    if (!db || !enabled) {
      setPositions([]);
      return;
    }
    const q = query(collection(db, 'users'), where('role', '==', 'Agent de Terrain'));
    const unsub = onSnapshot(q, (snap) => {
      const now = Date.now();
      const next: AgentLivePosition[] = [];
      snap.forEach((d) => {
        if (onlyUid && d.id !== onlyUid) return;
        const data = d.data() as any;
        const loc = data?.currentLocation;
        const updatedAtMs: number | undefined =
          typeof loc?.updatedAt?.toMillis === 'function' ? loc.updatedAt.toMillis() : undefined;
        if (
          typeof loc?.lat === 'number' &&
          typeof loc?.lng === 'number' &&
          typeof updatedAtMs === 'number' &&
          now - updatedAtMs < MAX_AGE_MS
        ) {
          next.push({
            uid: d.id,
            name: (data?.nom || '').trim() || 'Agent',
            lat: loc.lat,
            lng: loc.lng,
            updatedAtMs,
          });
        }
      });
      next.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      setPositions(next);
    }, (err) => {
      console.warn('[use-agents-live-positions] subscription failed:', err);
      setPositions([]);
    });
    return () => unsub();
  }, [db, enabled, onlyUid]);

  return positions;
}
