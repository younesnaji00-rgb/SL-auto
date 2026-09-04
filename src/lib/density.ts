/** User-selectable list density (Carbon / Slack pattern). Persisted per browser. */

export const DENSITY_KEY = 'sl-auto:density';
export type Density = 'normal' | 'compact';

export function readDensity(): Density {
  if (typeof window === 'undefined') return 'normal';
  try {
    return window.localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'normal';
  } catch {
    return 'normal';
  }
}

export function applyDensity(d: Density) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.density = d;
  try {
    window.localStorage.setItem(DENSITY_KEY, d);
  } catch {
    /* ignore */
  }
}

/** Apply the stored density once on app start (no write). */
export function initDensity() {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.density = readDensity();
}
