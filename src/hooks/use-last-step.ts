'use client';

import { useCallback, useEffect, useState } from 'react';

const MIN_STEP = 1;
const MAX_STEP = 6;

function storageKey(dossierId: string) {
  return `dossier-${dossierId}-step`;
}

function readInitial(dossierId: string): number {
  if (typeof window === 'undefined') return MIN_STEP;
  try {
    const raw = window.localStorage.getItem(storageKey(dossierId));
    const n = raw ? parseInt(raw, 10) : MIN_STEP;
    if (!Number.isFinite(n) || n < MIN_STEP || n > MAX_STEP) return MIN_STEP;
    return n;
  } catch {
    return MIN_STEP;
  }
}

/**
 * Remembers the last step the current user viewed for a given dossier.
 * Scoped per browser via localStorage. Returns [step, setStep].
 */
export function useLastStep(dossierId: string): [number, (n: number) => void] {
  const [step, setStepState] = useState<number>(() => readInitial(dossierId));

  // Re-read when the dossierId changes (navigation between dossiers).
  useEffect(() => {
    setStepState(readInitial(dossierId));
  }, [dossierId]);

  const setStep = useCallback(
    (n: number) => {
      const clamped = Math.max(MIN_STEP, Math.min(MAX_STEP, n));
      setStepState(clamped);
      if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(storageKey(dossierId), String(clamped)); } catch { /* ignore quota */ }
      }
    },
    [dossierId]
  );

  return [step, setStep];
}
