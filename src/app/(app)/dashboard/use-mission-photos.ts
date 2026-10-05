'use client';

/**
 * The photos behind the terrain dashboards (QA bug AT 008).
 *
 * One listener per dossier of the shown missions on `dossiers/{id}/photos` —
 * the subscription the Terrain queue already keeps for its photo chips —
 * reduced to the times of the SENT photos per phase (lib/mission-photos.ts).
 * A dossier joins the index with its first snapshot; until then, or when its
 * listener is refused, `computeTerrainView` reads the stamps instead.
 *
 * `ready` holds the first paint until every dossier has answered (at most
 * READY_TIMEOUT_MS), so a visit does not flash under « Photos à envoyer » and
 * then leave. Once primed it stays true: a mission planned later only adds
 * one listener behind the live dashboard.
 */

import { useEffect, useMemo, useState } from 'react';
import { collection, type QuerySnapshot } from 'firebase/firestore';
import { onSnapshot } from '@/lib/firestore-logged';
import { useFirestore } from '@/firebase';
import { photoTimesByPhase, type PhasePhotoTimes } from '@/lib/mission-photos';
import { toDate } from './metrics';
import type { DashboardMission } from './use-dashboard-data';

/** Listener budget: the dossiers of the latest RDVs (upcoming, then recent) first. */
const MAX_DOSSIERS = 60;
const READY_TIMEOUT_MS = 4000;

export function useMissionPhotos(missions: ReadonlyArray<DashboardMission>): {
  photos: ReadonlyMap<string, PhasePhotoTimes>;
  ready: boolean;
} {
  const db = useFirestore();
  // A string key, so a planification snapshot that changes nothing here
  // (a check-in, a stamp) does not re-subscribe.
  const key = useMemo(() => {
    const latest = new Map<string, number>();
    for (const m of missions) {
      if (m.active === false || !m.dossierId) continue;
      const at = toDate(m.dateRDV)?.getTime() ?? toDate(m.createdAt)?.getTime() ?? 0;
      if (at >= (latest.get(m.dossierId) ?? Number.NEGATIVE_INFINITY)) latest.set(m.dossierId, at);
    }
    return Array.from(latest.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_DOSSIERS)
      .map(([id]) => id)
      .sort()
      .join('|');
  }, [missions]);
  const ids = useMemo(() => (key ? key.split('|') : []), [key]);

  const [photos, setPhotos] = useState<ReadonlyMap<string, PhasePhotoTimes>>(() => new Map());
  const [answered, setAnswered] = useState<ReadonlySet<string>>(() => new Set());
  const [timedOut, setTimedOut] = useState(false);
  const [primed, setPrimed] = useState(false);

  useEffect(() => {
    const keep = new Set(ids);
    // Forget the dossiers no longer shown; keep the others' photos meanwhile.
    setPhotos((prev) => {
      if (Array.from(prev.keys()).every((id) => keep.has(id))) return prev;
      return new Map(Array.from(prev.entries()).filter(([id]) => keep.has(id)));
    });
    setAnswered((prev) => new Set(Array.from(prev).filter((id) => keep.has(id))));
    setTimedOut(false);
    if (!db || ids.length === 0) return;
    const timer = window.setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS);
    const mark = (id: string) => setAnswered((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    const unsubs = ids.map((id) =>
      onSnapshot(
        collection(db, 'dossiers', id, 'photos'),
        (snap: QuerySnapshot) => {
          // `estimate`: a photo written offline has no server time yet.
          const times = photoTimesByPhase(snap.docs.map((d) => d.data({ serverTimestamps: 'estimate' })));
          setPhotos((prev) => new Map(prev).set(id, times));
          mark(id);
        },
        (err: unknown) => {
          console.warn('Dashboard photos sync error:', id, err);
          // Back to the stamps for this dossier.
          setPhotos((prev) => {
            if (!prev.has(id)) return prev;
            const next = new Map(prev);
            next.delete(id);
            return next;
          });
          mark(id);
        },
      ),
    );
    return () => {
      window.clearTimeout(timer);
      unsubs.forEach((u) => u());
    };
  }, [db, ids]);

  const allAnswered = ids.every((id) => answered.has(id));
  useEffect(() => {
    if (!primed && ids.length > 0 && (allAnswered || timedOut)) setPrimed(true);
  }, [primed, ids.length, allAnswered, timedOut]);

  return { photos, ready: !db || primed || allAnswered || timedOut };
}
