'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';

/**
 * Native background location publisher for the Agent de Terrain.
 *
 * The web `useGpsPublisher` uses `navigator.geolocation.watchPosition`, which
 * the browser/TWA freezes the moment the app is backgrounded or the screen
 * locks — so the agent's position stops updating and the gestionnaire sees a
 * stale location. This hook is the native counterpart: inside the Capacitor
 * Android shell it drives `@capacitor-community/background-geolocation`, which
 * runs an Android foreground service and keeps delivering positions every
 * minute even when the app is backgrounded or the phone is locked.
 *
 * It writes the EXACT same `users/{uid}.currentLocation` shape the web
 * publisher writes, so the gestionnaire read side (`useAgentLiveLocation`,
 * `ModalPlanification`) needs no changes.
 *
 * On the web (plain browser / TWA / PWA) `Capacitor.isNativePlatform()` is
 * false and the whole hook is an inert no-op — `useGpsPublisher` keeps owning
 * the foreground web path there.
 */

// Republish at least once per minute so a *stationary* agent stays "fresh" on
// the gestionnaire side (which treats a location as stale after 10 minutes).
// This is what makes the requested "keep taking the location every minute"
// behaviour hold even when the agent is not moving.
const HEARTBEAT_MS = 60_000;
// Tick faster than the heartbeat so we reliably cross the 60s boundary.
const HEARTBEAT_TICK_MS = 30_000;
// When moving, push sooner than the heartbeat, but never faster than this.
const MOVE_THROTTLE_MS = 15_000;
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

export type NativeGpsStatus = 'inactive' | 'starting' | 'tracking' | 'denied';

export function useNativeBgGeolocation(): {
  /** True only inside the native Android shell. */
  isNative: boolean;
  status: NativeGpsStatus;
} {
  const db = useFirestore();
  const { firebaseUser } = useCurrentUser();
  const [status, setStatus] = useState<NativeGpsStatus>('inactive');

  const lastKnownRef = useRef<{ lat: number; lng: number; accuracy: number } | null>(null);
  const lastWriteRef = useRef<{ ms: number; lat: number; lng: number } | null>(null);

  const isNative =
    typeof window !== 'undefined' &&
    typeof Capacitor?.isNativePlatform === 'function' &&
    Capacitor.isNativePlatform();

  const writePosition = useCallback(
    async (lat: number, lng: number, accuracy: number, opts?: { force?: boolean }) => {
      if (!db || !firebaseUser?.uid) return;
      const now = Date.now();
      const prev = lastWriteRef.current;
      if (!opts?.force && prev) {
        const since = now - prev.ms;
        const moved = haversineMeters(prev, { lat, lng });
        // Never write faster than the move throttle...
        if (since < MOVE_THROTTLE_MS) return;
        // ...and if the agent hasn't meaningfully moved, only write on the
        // ~1-minute heartbeat so we keep the position fresh without spamming.
        if (moved < MIN_MOVEMENT_M && since < HEARTBEAT_MS) return;
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
        console.warn('[use-native-bg-geolocation] write failed:', err);
      }
    },
    [db, firebaseUser?.uid],
  );

  useEffect(() => {
    if (!isNative || !firebaseUser?.uid) return;

    const BackgroundGeolocation =
      registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');

    let watcherId: string | null = null;
    let cancelled = false;

    setStatus('starting');
    BackgroundGeolocation.addWatcher(
      {
        // Ask for (and require) "Allow all the time" background location.
        requestPermissions: true,
        // Deliver a fresh fix on every callback rather than a possibly cached one.
        stale: false,
        // Wake us on meaningful movement; the heartbeat below covers the
        // stationary case so we still publish at least once per minute.
        distanceFilter: 25,
        backgroundTitle: `${BRAND.productName} — suivi de position`,
        backgroundMessage:
          'Votre position est partagée pour la planification des missions.',
      },
      (location, error) => {
        if (error) {
          if (error.code === 'NOT_AUTHORIZED') setStatus('denied');
          else console.warn('[use-native-bg-geolocation] watch error:', error);
          return;
        }
        if (!location) return;
        setStatus('tracking');
        const accuracy = location.accuracy ?? 0;
        lastKnownRef.current = {
          lat: location.latitude,
          lng: location.longitude,
          accuracy,
        };
        void writePosition(location.latitude, location.longitude, accuracy);
      },
    )
      .then((id) => {
        if (cancelled) {
          void BackgroundGeolocation.removeWatcher({ id });
          return;
        }
        watcherId = id;
      })
      .catch((err) => {
        console.warn('[use-native-bg-geolocation] addWatcher failed:', err);
      });

    // Heartbeat: republish the last known position at least once per minute so
    // a stationary agent (e.g. parked at a garage) does not go stale on the
    // gestionnaire side. The foreground service keeps this context alive in the
    // background; if the OS ever freezes JS, the plugin's own location
    // callbacks remain the primary update path.
    const heartbeat = setInterval(() => {
      const lk = lastKnownRef.current;
      if (lk) void writePosition(lk.lat, lk.lng, lk.accuracy);
    }, HEARTBEAT_TICK_MS);

    return () => {
      cancelled = true;
      clearInterval(heartbeat);
      if (watcherId) {
        void BackgroundGeolocation.removeWatcher({ id: watcherId }).catch(() => {});
      }
      setStatus('inactive');
    };
  }, [isNative, firebaseUser?.uid, writePosition]);

  return { isNative, status };
}
