'use client';

import { useCallback, useEffect, useState } from 'react';

function storageKey(dossierId: string, stepId: number) {
  return `dossier-${dossierId}-step-${stepId}-collapsed`;
}

function readInitial(dossierId: string, stepIds: number[]): Record<number, boolean> {
  const out: Record<number, boolean> = {};
  if (typeof window === 'undefined') return out;
  for (const id of stepIds) {
    try {
      out[id] = window.localStorage.getItem(storageKey(dossierId, id)) === '1';
    } catch {
      out[id] = false;
    }
  }
  return out;
}

/**
 * Persists collapsed/expanded state for each dossier timeline step in
 * localStorage, keyed per-dossier + per-step. Survives refresh, tab close
 * and navigation.
 */
export function useCollapsedSteps(dossierId: string, stepIds: number[]) {
  const [state, setState] = useState<Record<number, boolean>>(() => readInitial(dossierId, stepIds));

  // Re-read when the dossierId changes (navigation between dossiers).
  useEffect(() => {
    setState(readInitial(dossierId, stepIds));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossierId]);

  const isCollapsed = useCallback((stepId: number) => !!state[stepId], [state]);

  const toggle = useCallback(
    (stepId: number) => {
      setState((prev) => {
        const next = { ...prev, [stepId]: !prev[stepId] };
        if (typeof window !== 'undefined') {
          try {
            if (next[stepId]) window.localStorage.setItem(storageKey(dossierId, stepId), '1');
            else window.localStorage.removeItem(storageKey(dossierId, stepId));
          } catch {
            /* ignore quota */
          }
        }
        return next;
      });
      // Re-fire scroll so the active-step tracker catches up after layout shrinks.
      if (typeof window !== 'undefined') {
        queueMicrotask(() => window.dispatchEvent(new Event('scroll')));
      }
    },
    [dossierId]
  );

  return { isCollapsed, toggle };
}
