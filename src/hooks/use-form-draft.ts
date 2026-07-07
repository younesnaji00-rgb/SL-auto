'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface RecoveredDraft {
  savedAt: Date;
  data: any;
}

/**
 * Crash-proof draft persistence for in-progress form edits.
 *
 * While `active` (the user is editing), the current `value` is mirrored to
 * localStorage: debounced after every change, on a fixed interval as a
 * backstop, and flushed on pagehide/beforeunload/tab-hidden — so a power cut
 * or crash mid-edit loses at most the final debounce window (~1s).
 *
 * On mount (per `storageKey`), a previously stored draft — which only exists
 * if a prior edit session ended without an explicit save or cancel — is
 * surfaced as `recovered` so the caller can offer "Restaurer / Ignorer".
 * Callers MUST `clearDraft()` on successful save and on explicit cancel.
 *
 * `value` must be JSON-serializable; Dates round-trip as ISO strings, so the
 * caller re-parses date fields when restoring.
 */
export function useFormDraft({
  storageKey,
  value,
  active,
  debounceMs = 1000,
  intervalMs = 60_000,
}: {
  storageKey: string | null;
  value: any;
  active: boolean;
  debounceMs?: number;
  intervalMs?: number;
}) {
  const [recovered, setRecovered] = useState<RecoveredDraft | null>(null);

  const valueRef = useRef(value);
  valueRef.current = value;
  const activeRef = useRef(active);
  activeRef.current = active;
  const keyRef = useRef(storageKey);
  keyRef.current = storageKey;

  // Surface any leftover draft for this key (crash / abandoned edit).
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') {
      setRecovered(null);
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setRecovered(null);
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data !== undefined) {
        setRecovered({ savedAt: new Date(parsed.savedAt || 0), data: parsed.data });
      } else {
        setRecovered(null);
      }
    } catch {
      setRecovered(null);
    }
  }, [storageKey]);

  const persistNow = useCallback(() => {
    const key = keyRef.current;
    if (!key || !activeRef.current || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({ v: 1, savedAt: Date.now(), data: valueRef.current }),
      );
    } catch (err) {
      console.warn('[form-draft] persist failed', err);
    }
  }, []);

  // Debounced persist on every change while editing.
  useEffect(() => {
    if (!active || !storageKey) return;
    const t = window.setTimeout(persistNow, debounceMs);
    return () => window.clearTimeout(t);
  }, [value, active, storageKey, debounceMs, persistNow]);

  // Interval backstop + flush when the page/tab goes away.
  useEffect(() => {
    if (!active || !storageKey) return;
    const iv = window.setInterval(persistNow, intervalMs);
    const flush = () => persistNow();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistNow();
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [active, storageKey, intervalMs, persistNow]);

  const clearDraft = useCallback(() => {
    setRecovered(null);
    const key = keyRef.current;
    try {
      if (key && typeof window !== 'undefined') window.localStorage.removeItem(key);
    } catch {}
  }, []);

  return { recovered, clearDraft, persistNow };
}
