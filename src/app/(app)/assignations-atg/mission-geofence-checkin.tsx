'use client';

/**
 * Automatic arrival (owner ruling 2026-09-25: the app « should automatically
 * know whether the agent de terrain is near the destination » — the one-tap
 * « Confirmer l'arrivée » suggestion and buttons are gone for the agent).
 *
 * While the agent has the missions open, the phone's position is watched.
 * When it stays within reach of a mission's address for DWELL_MS — every fix
 * accurate to MAX_ACCURACY_M, and no later fix leaving the area — the arrival
 * is stamped on the planification: time, position, distance and
 * `checkinAuto: true`. Only missions of the day or overdue qualify: passing an
 * address days before the rendez-vous is not an arrival.
 *
 * Where the address is:
 *  1. Nominatim (lib/geocode.ts, cached per address) → straight-line distance,
 *     within RADIUS_M;
 *  2. when Nominatim has no answer (most Moroccan street addresses), the ROAD
 *     distance Google computes from the agent's position to the address
 *     (/api/arrival-distance, the same resolution the route checks use),
 *     within ROAD_RADIUS_M — asked at most every 30 s near the address and
 *     sparingly when far from it.
 *
 * Renders nothing, except a notice when location is refused: without it the
 * arrival cannot be recorded.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { MapPinOff } from 'lucide-react';
import { useFirestore, useAuth } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { geocodeAddress, type GeoPoint } from '@/lib/geocode';
import { apiFetch } from '@/lib/api-fetch';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

export interface GeofenceCandidate {
  key: string;
  dossierId: string;
  planifId: string;
  refLabel: string;
  adresse: string;
  /** RDV time; a mission planned after today is not a candidate. Unknown = eligible. */
  rdvMs?: number | null;
}

const RADIUS_M = 150;
const ROAD_RADIUS_M = 250;
const MAX_ACCURACY_M = 150;
const DWELL_MS = 15_000;
const MAX_CANDIDATES = 20;

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

type Fix = { lat: number; lng: number; accuracy: number; atMs: number };
type Road = { lat: number; lng: number; atMs: number; meters: number | null };

/** When the road distance may be asked again for a candidate. */
function roadDue(last: Road | undefined, fix: Fix, now: number): boolean {
  if (!last) return true;
  const age = now - last.atMs;
  if (last.meters !== null && last.meters <= 1000) return age >= 30_000;
  const moved = haversineM(last.lat, last.lng, fix.lat, fix.lng);
  return (age >= 60_000 && moved >= 300) || age >= 10 * 60_000;
}

export function GeofenceAutoCheckin({
  candidates,
  className,
}: {
  candidates: GeofenceCandidate[];
  className?: string;
}) {
  const db = useFirestore();
  const auth = useAuth();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const t = useT();
  const [fix, setFix] = useState<Fix | null>(null);
  const [denied, setDenied] = useState(false);
  const [geo, setGeo] = useState<Record<string, GeoPoint | null>>({});
  const [roads, setRoads] = useState<Record<string, Road>>({});
  const [tick, setTick] = useState(0);
  const roadInFlight = useRef<Set<string>>(new Set());
  const pendingSince = useRef<Map<string, number>>(new Map());
  const stamped = useRef<Set<string>>(new Set());

  const scoped = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return candidates
      .filter((c) => c.adresse.trim() && (c.rdvMs == null || c.rdvMs <= end.getTime()))
      .slice(0, MAX_CANDIDATES);
  }, [candidates]);
  const hasCandidates = scoped.length > 0;

  // Foreground position watch — only while there is something to match.
  useEffect(() => {
    if (!hasCandidates || typeof navigator === 'undefined' || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      (p) => {
        setDenied(false);
        setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy ?? 9999, atMs: Date.now() });
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setDenied(true);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [hasCandidates]);

  // A stationary phone may stop sending fixes: re-evaluate every 5 s so a
  // started dwell completes on the last known position.
  useEffect(() => {
    if (!hasCandidates) return;
    const id = window.setInterval(() => setTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, [hasCandidates]);

  // Geocode candidate addresses (cache + throttle live in geocodeAddress).
  const addrSignature = useMemo(() => scoped.map((c) => c.adresse).join('|'), [scoped]);
  useEffect(() => {
    if (!hasCandidates) return;
    let cancelled = false;
    scoped.forEach((c) => {
      geocodeAddress(c.adresse).then((pt) => {
        if (cancelled) return;
        setGeo((prev) => (c.adresse in prev && prev[c.adresse] === pt ? prev : { ...prev, [c.adresse]: pt }));
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addrSignature, hasCandidates]);

  // Road distance where Nominatim found nothing.
  useEffect(() => {
    if (!fix || fix.accuracy > MAX_ACCURACY_M) return;
    const now = Date.now();
    for (const c of scoped) {
      if (!(c.adresse in geo) || geo[c.adresse]) continue; // not geocoded yet, or geocoded
      if (roadInFlight.current.has(c.key) || !roadDue(roads[c.key], fix, now)) continue;
      roadInFlight.current.add(c.key);
      const at = { lat: fix.lat, lng: fix.lng, atMs: now };
      apiFetch('/api/arrival-distance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: fix.lat, lng: fix.lng, address: c.adresse }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { meters?: number | null } | null) => {
          const meters = typeof data?.meters === 'number' ? data.meters : null;
          setRoads((prev) => ({ ...prev, [c.key]: { ...at, meters } }));
        })
        .catch(() => setRoads((prev) => ({ ...prev, [c.key]: { ...at, meters: null } })))
        .finally(() => roadInFlight.current.delete(c.key));
    }
  }, [fix, scoped, geo, roads, tick]);

  const stamp = useCallback(
    async (c: GeofenceCandidate, at: Fix, distanceM: number) => {
      if (!db || stamped.current.has(c.key)) return;
      stamped.current.add(c.key);
      const userEmail = auth?.currentUser?.email || 'Agent';
      try {
        await updateDoc(doc(db, 'dossiers', c.dossierId, 'planifications', c.planifId), {
          checkinAt: serverTimestamp(),
          checkinLat: at.lat,
          checkinLng: at.lng,
          checkinBy: profile?.nom || userEmail,
          checkinAuto: true,
          checkinDistanceM: Math.round(distanceM),
        });
        try {
          // Audit trail: action + details stay French (translated at display time).
          await logHistorique(
            db,
            c.dossierId,
            'Arrivée sur place',
            userEmail,
            `Arrivée détectée automatiquement (~${Math.round(distanceM)} m de l'adresse).`,
            'planification',
            profile?.nom,
          );
        } catch { /* non-fatal */ }
        toast({
          title: t('Arrivée enregistrée'),
          description: `${c.refLabel} · ${t('détectée automatiquement à ~')}${Math.round(distanceM)} m ${t('de l’adresse.')}`,
        });
      } catch (e) {
        // Let a later fix try again.
        stamped.current.delete(c.key);
        console.error('[auto-checkin] failed:', e);
      }
    },
    [db, auth, profile?.nom, toast, t],
  );

  // Decide on the latest fix (or tick): within reach → start / complete the
  // dwell; out of reach → reset it.
  useEffect(() => {
    if (!fix || fix.accuracy > MAX_ACCURACY_M) return;
    const now = Date.now();
    for (const c of scoped) {
      if (stamped.current.has(c.key)) continue;
      const pt = geo[c.adresse];
      let distance: number | null = null;
      if (pt) {
        const d = haversineM(fix.lat, fix.lng, pt.lat, pt.lon);
        if (d <= RADIUS_M) distance = d;
      } else {
        const road = roads[c.key];
        // The road answer must describe where the agent is now.
        if (road && road.meters !== null && road.meters <= ROAD_RADIUS_M && haversineM(road.lat, road.lng, fix.lat, fix.lng) <= 100) {
          distance = road.meters;
        }
      }
      if (distance === null) {
        pendingSince.current.delete(c.key);
        continue;
      }
      const since = pendingSince.current.get(c.key);
      if (since === undefined) {
        pendingSince.current.set(c.key, now);
      } else if (now - since >= DWELL_MS) {
        pendingSince.current.delete(c.key);
        void stamp(c, fix, distance);
      }
    }
  }, [fix, scoped, geo, roads, tick, stamp]);

  if (!hasCandidates || !denied) return null;
  return (
    <div
      role="status"
      className={cn('flex items-start gap-2.5 rounded-lg bg-status-warning-bg p-3 text-status-warning-fg', className)}
    >
      <MapPinOff className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <p className="text-[13px] font-medium leading-snug">
        {t('Localisation désactivée : l’arrivée ne peut pas être enregistrée automatiquement. Autorisez la localisation pour SL-auto.')}
      </p>
    </div>
  );
}
