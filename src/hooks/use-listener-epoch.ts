'use client';

/**
 * Keeps long-lived Firestore listeners alive across auth changes (owner
 * report 2026-09-24: « Missing or insufficient permissions » over a list that
 * then stayed frozen — 6 dossiers shown while there were 7).
 *
 * An `onSnapshot` that fails is DEAD: Firestore never re-subscribes it. If
 * the request went out while the ID token was missing or expiring (sign-in
 * in progress, token refresh, a session switch in another tab), the page kept
 * the cached rows forever, under an error banner, and never received new
 * documents. Include `epoch` in the listener effect's deps and call
 * `onDenied()` from its error handler: a fresh token is requested and the
 * listener re-subscribes. Retries are capped, so a genuine refusal still
 * surfaces (`onDenied()` returns false once they are spent); call
 * `onHealthy()` on each successful snapshot so a listener that recovered
 * gets its full budget back for the next failure.
 *
 * Any listener error can go through `onDenied()`, not only permission-denied:
 * whatever the cause, the failed listener is dead and a fresh one is the only
 * way back to live data. `useCollection` / `useDoc` do this for every list.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { onIdTokenChanged } from 'firebase/auth';
// The provider module, not the '@/firebase' barrel: useCollection / useDoc
// (re-exported by the barrel) use this hook, and the barrel would be a cycle.
import { useAuth } from '@/firebase/provider';

const MAX_RETRIES = 3;
const FALLBACK_DELAY_MS = 2500;

export function useListenerEpoch(): { epoch: number; onDenied: () => boolean; onHealthy: () => void } {
  const auth = useAuth();
  const [epoch, setEpoch] = useState(0);
  const lastUid = useRef<string | null | undefined>(undefined);
  const pending = useRef(false);
  const retries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!auth) return;
    return onIdTokenChanged(auth, (user) => {
      const uid = user?.uid ?? null;
      const changed = lastUid.current !== undefined && uid !== lastUid.current;
      lastUid.current = uid;
      if (changed) retries.current = 0; // a new identity gets its own budget
      if (uid && (changed || pending.current)) {
        pending.current = false;
        if (timer.current) clearTimeout(timer.current);
        setEpoch((e) => e + 1);
      }
    });
  }, [auth]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onDenied = useCallback(() => {
    if (retries.current >= MAX_RETRIES) return false;
    retries.current += 1;
    pending.current = true;
    // A forced refresh fires onIdTokenChanged, which re-subscribes; the timer
    // covers the case where the token did not actually change.
    auth?.currentUser?.getIdToken(true).catch(() => {});
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!pending.current) return;
      pending.current = false;
      setEpoch((e) => e + 1);
    }, FALLBACK_DELAY_MS * retries.current);
    return true;
  }, [auth]);

  const onHealthy = useCallback(() => {
    retries.current = 0;
  }, []);

  return { epoch, onDenied, onHealthy };
}
