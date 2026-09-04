'use client';

import { useSyncExternalStore } from 'react';

/**
 * Focus mode — a page-level "make room" signal raised by a section that needs
 * the full width (the Informations ⇄ source-document comparison). While on:
 * the app sidebar collapses, the steps rail and the context column retract,
 * and the section splits the width 50/50. Module-level store so any component
 * can raise it without prop-drilling; the raiser resets it on unmount.
 */
let focus = false;
const listeners = new Set<() => void>();

export function setFocusMode(next: boolean) {
  if (focus === next) return;
  focus = next;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useFocusMode(): boolean {
  return useSyncExternalStore(subscribe, () => focus, () => false);
}
