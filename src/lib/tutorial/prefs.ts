'use client';

import { BRAND } from '../brand';

/**
 * User-owned tutorial preferences — the two settings the guided tour keeps
 * per browser, outside the tour engine so the sidebar and the launcher can
 * read and write them without pulling driver.js into their chunk.
 *
 *  - `disabled`: the user turned the tutorial off for good. No welcome
 *    lightbox, no spotlight, no "?" button. Reversible from the sidebar
 *    footer, which is the only affordance left once it is set.
 *  - `position`: where the user dragged the "?" button, as a FRACTION of the
 *    viewport. Fractions (not pixels) because the same account is used on
 *    very different screens — a corner picked on a 2560px monitor must still
 *    land in the same corner on a laptop.
 *
 * Both are namespaced by `BRAND.storagePrefix`, so SL Auto and Lionheart
 * keep their own values in a shared browser profile.
 *
 * Every read is wrapped: Safari private mode and "block site data" throw on
 * `localStorage` access rather than returning null.
 */

const disabledKey = () => `${BRAND.storagePrefix}.tour.disabled`;
const positionKey = () => `${BRAND.storagePrefix}.tour.launcherPos`;

/** Fraction (0..1) of the viewport for the launcher's CENTER point. */
export interface LauncherPosition {
  x: number;
  y: number;
}

const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

/** Subscribe to preference changes (useSyncExternalStore-compatible). */
export function subscribeTutorialPrefs(fn: () => void): () => void {
  listeners.add(fn);
  // Another tab may flip the switch; `storage` only fires in OTHER tabs, which
  // is exactly the case the in-process listener set cannot cover.
  const onStorage = (e: StorageEvent) => {
    if (!e.key || e.key === disabledKey() || e.key === positionKey()) fn();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

/** True when the user has permanently turned the tutorial off. */
export function tutorialsDisabled(): boolean {
  try {
    return window.localStorage.getItem(disabledKey()) === '1';
  } catch {
    return false;
  }
}

/** Server snapshot for useSyncExternalStore — never disabled during SSR. */
export const tutorialsDisabledServer = () => false;

export function setTutorialsDisabled(off: boolean): void {
  try {
    if (off) window.localStorage.setItem(disabledKey(), '1');
    else window.localStorage.removeItem(disabledKey());
  } catch {
    // Non-fatal: the preference simply doesn't persist.
  }
  emit();
}

/** Where the user parked the "?" button, or null for the default corner. */
export function readLauncherPosition(): LauncherPosition | null {
  try {
    const raw = window.localStorage.getItem(positionKey());
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const { x, y } = parsed as Partial<LauncherPosition>;
    if (typeof x !== 'number' || typeof y !== 'number') return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x: Math.min(Math.max(x, 0), 1), y: Math.min(Math.max(y, 0), 1) };
  } catch {
    return null;
  }
}

export function writeLauncherPosition(pos: LauncherPosition | null): void {
  try {
    if (pos) window.localStorage.setItem(positionKey(), JSON.stringify(pos));
    else window.localStorage.removeItem(positionKey());
  } catch {
    // Non-fatal.
  }
  emit();
}
