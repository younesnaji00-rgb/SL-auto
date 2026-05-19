'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';

export type GpsPermission = 'granted' | 'denied' | 'prompt' | 'unavailable';

const WRITE_THROTTLE_MS = 30_000;
const MIN_MOVEMENT_M = 50;

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(sa)));
}

export function useGpsPublisher(): { permission: GpsPermission; retry: () => void } {
  const db = useFirestore();
  const { firebaseUser } = useCurrentUser();
  const [permission, setPermission] = useState<GpsPermission>('prompt');
  const lastWriteRef = useRef<{ ms: number; lat: number; lng: number } | null>(null);

  const writePosition = useCallback(
    async (lat: number, lng: number, accuracy: number, opts?: { force?: boolean }) => {
      if (!db || !firebaseUser?.uid) return;
      const now = Date.now();
      const prev = lastWriteRef.current;
      if (
        !opts?.force &&
        prev &&
        now - prev.ms < WRITE_THROTTLE_MS &&
        haversineMeters(prev, { lat, lng }) < MIN_MOVEMENT_M
      ) {
        return;
      }
      lastWriteRef.current = { ms: now, lat, lng };
      try {
        await setDoc(
          doc(db, 'users', firebaseUser.uid),
          {
            currentLocation: {
              lat,
              lng,
              accuracy,
              updatedAt: serverTimestamp(),
            },
          },
          { merge: true },
        );
      } catch (err) {
        console.warn('[use-gps-publisher] write failed:', err);
      }
    },
    [db, firebaseUser?.uid],
  );

  // Listen for incoming location requests from gestionnaires. When a new
  // request arrives, force a one-shot position push bypassing the movement/
  // throttle gate.
  //
  // Bootstrap: the ref starts as `null`, NOT `Date.now()`. On the first
  // snapshot after mount we either fire (if the latest request is recent —
  // last 5 min) or seed the ref (if it's older — likely already answered
  // from a previous session). This is what makes the "tap notification →
  // app opens → position pushed" path work: under the old `Date.now()`
  // bootstrap, the first snapshot's `requestedAtMs` was always ≤ mount time
  // and the geolocation read was silently skipped.
  const lastHandledRequestMsRef = useRef<number | null>(null);
  const RECENT_REQUEST_WINDOW_MS = 5 * 60 * 1000;
  useEffect(() => {
    if (!db || !firebaseUser?.uid) return;
    const q = query(
      collection(db, 'location_requests'),
      where('agentUid', '==', firebaseUser.uid),
      orderBy('requestedAt', 'desc'),
      limit(1),
    );
    const unsub = onSnapshot(q, (snap) => {
      const top = snap.docs[0]?.data() as any | undefined;
      const requestedAtMs: number | undefined =
        typeof top?.requestedAt?.toMillis === 'function' ? top.requestedAt.toMillis() : undefined;
      if (typeof requestedAtMs !== 'number') return;

      if (lastHandledRequestMsRef.current === null) {
        // First snapshot after mount. Old requests are seeded silently;
        // recent ones fall through and trigger the geolocation read.
        if (Date.now() - requestedAtMs > RECENT_REQUEST_WINDOW_MS) {
          lastHandledRequestMsRef.current = requestedAtMs;
          return;
        }
      } else if (requestedAtMs <= lastHandledRequestMsRef.current) {
        return;
      }
      lastHandledRequestMsRef.current = requestedAtMs;
      if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void writePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, { force: true });
        },
        (err) => {
          console.warn('[use-gps-publisher] forced push failed:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
      );
    });
    return () => unsub();
  }, [db, firebaseUser?.uid, writePosition]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('geolocation' in navigator)) {
      setPermission('unavailable');
      return;
    }
    if (!firebaseUser?.uid) return;

    let watchId: number | null = null;
    let cancelled = false;

    const start = () => {
      if (cancelled) return;
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setPermission('granted');
          void writePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setPermission('denied');
          } else {
            console.warn('[use-gps-publisher] watch error:', err);
          }
        },
        { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 },
      );
    };

    if ('permissions' in navigator && typeof navigator.permissions.query === 'function') {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((status) => {
          if (cancelled) return;
          if (status.state === 'denied') {
            setPermission('denied');
            return;
          }
          setPermission(status.state === 'granted' ? 'granted' : 'prompt');
          start();
          status.onchange = () => {
            if (status.state === 'denied') {
              setPermission('denied');
              if (watchId != null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
              }
            } else if (status.state === 'granted') {
              setPermission('granted');
              if (watchId == null) start();
            }
          };
        })
        .catch(() => {
          if (!cancelled) start();
        });
    } else {
      start();
    }

    return () => {
      cancelled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [firebaseUser?.uid, writePosition]);

  const retry = useCallback(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPermission('granted');
        void writePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setPermission('denied');
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );
  }, [writePosition]);

  return { permission, retry };
}
