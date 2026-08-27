'use client';

import { useEffect, useRef, useState } from 'react';
import {
  collectionGroup,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
  evaluateChain,
  type ChainStop,
  type FeasibilityConflict,
} from '@/lib/atg-feasibility';
import type { AgentLiveLocation } from '@/hooks/use-agent-live-location';
import { apiFetch } from '@/lib/api-fetch';
import { format } from 'date-fns';

interface Args {
  agentName: string;
  dateRDV: Date | null;
  timeRDV: string;
  adresse: string;
  excludeId: string | null;
  agentLiveLocation: AgentLiveLocation | null;
}

interface Result {
  loading: boolean;
  conflicts: FeasibilityConflict[];
  unavailable: boolean;
  pastRdv: boolean;
}

function combineDateTime(date: Date, hhmm: string): Date | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mm < 0 || mm > 59) return null;
  const d = new Date(date);
  d.setHours(h, mm, 0, 0);
  return d;
}

function dayBounds(d: Date): { start: Date; end: Date } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function useAtgFeasibility({
  agentName,
  dateRDV,
  timeRDV,
  adresse,
  excludeId,
  agentLiveLocation,
}: Args): Result {
  const db = useFirestore();
  const [conflicts, setConflicts] = useState<FeasibilityConflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const agent = agentName.trim();
    const address = adresse.trim();
    const newRdv = dateRDV ? combineDateTime(dateRDV, timeRDV) : null;

    if (!db || !agent || !newRdv || !address) {
      setConflicts([]);
      setLoading(false);
      setUnavailable(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      setUnavailable(false);

      try {
        const { start, end } = dayBounds(newRdv);
        const q = query(
          collectionGroup(db, 'planifications'),
          where('agentTerrain', '==', agent),
          where('active', '==', true),
          where('dateRDV', '>=', Timestamp.fromDate(start)),
          where('dateRDV', '<', Timestamp.fromDate(end)),
        );
        const snap = await getDocs(q);
        if (controller.signal.aborted) return;

        const others: ChainStop[] = [];
        snap.docs.forEach((doc) => {
          if (doc.id === excludeId) return;
          const data = doc.data() as any;
          const ts: Timestamp | null = data.dateRDV ?? null;
          const addr: string = (data.adresse || '').trim();
          if (!ts || !addr) return;
          const ms = ts.toMillis();
          others.push({
            id: doc.id,
            address: addr,
            rdvMs: ms,
            label: `${format(new Date(ms), 'HH:mm')} — ${addr}`,
          });
        });

        const pending: ChainStop = {
          id: excludeId ?? '__pending__',
          address,
          rdvMs: newRdv.getTime(),
          label: `${format(newRdv, 'HH:mm')} — ${address} (en cours)`,
        };

        // Use the live GPS position passed in by the caller (subscribed via
        // useAgentLiveLocation). If fresh < 10 min, prepend as the chain origin
        // so the first leg is also feasibility-checked.
        const liveOrigin: ChainStop | null =
          agentLiveLocation &&
          Date.now() - agentLiveLocation.updatedAtMs < 10 * 60 * 1000
            ? {
                id: '__live_origin__',
                address: `${agentLiveLocation.lat},${agentLiveLocation.lng}`,
                rdvMs: Date.now(),
                label: 'Position actuelle',
                isOrigin: true,
              }
            : null;

        const chain = [...(liveOrigin ? [liveOrigin] : []), ...others, pending]
          .sort((a, b) => a.rdvMs - b.rdvMs);

        if (chain.length < 2) {
          setConflicts([]);
          setLoading(false);
          return;
        }

        const res = await apiFetch('/api/atg-feasibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            stops: chain.map((s) => ({
              address: s.address,
              rdvISO: new Date(s.rdvMs).toISOString(),
            })),
          }),
        });
        if (controller.signal.aborted) return;

        if (!res.ok) {
          setConflicts([]);
          setUnavailable(true);
          setLoading(false);
          return;
        }

        const data = (await res.json()) as {
          legs?: Array<{ durationSeconds: number; status: string }>;
          error?: string;
        };

        if (data.error || !Array.isArray(data.legs) || data.legs.length === 0) {
          setConflicts([]);
          setUnavailable(true);
          setLoading(false);
          return;
        }

        // Legs Google could not route are passed as NaN so evaluateChain skips
        // them instead of mistaking a failed lookup for a 0-minute drive.
        const legSecs = data.legs.map((l) => (l.status === 'OK' ? l.durationSeconds : NaN));
        setConflicts(evaluateChain(chain, legSecs));
        setLoading(false);
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('[use-atg-feasibility] error:', err);
        setConflicts([]);
        setUnavailable(true);
        setLoading(false);
      }
    }, 600);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [
    db,
    agentName,
    dateRDV,
    timeRDV,
    adresse,
    excludeId,
    agentLiveLocation?.lat,
    agentLiveLocation?.lng,
    agentLiveLocation?.updatedAtMs,
  ]);

  const pendingRdv = dateRDV ? combineDateTime(dateRDV, timeRDV) : null;
  const pastRdv = pendingRdv != null && pendingRdv.getTime() < Date.now();

  return { loading, conflicts, unavailable, pastRdv };
}
