'use client';

/**
 * Value-change flash (owner option B1 2026-09-02, motion-spec §8): the
 * 37signals "yellow fade", teal-tinted — when the AI pre-fill lands values
 * into the dossier form, each written field's row is tinted with the accent
 * and decays to nothing over ~2s, so the user can see at a glance WHICH
 * fields the scan touched. Colour-only (no movement), so it is safe under
 * prefers-reduced-motion by WCAG 2.3.3's own definition; the class is still
 * applied `motion-safe:` at the call site to stay conservative.
 */

import * as React from 'react';

export const PREFILL_FLASH_EVENT = 'sl:prefill-flash';

export interface PrefillFlashDetail {
  dossierId: string;
  /** Dossier dot-paths that were just written (same keys as FieldDef.path). */
  fields: string[];
}

export function emitPrefillFlash(dossierId: string, fields: string[]) {
  if (typeof window === 'undefined' || fields.length === 0) return;
  window.dispatchEvent(
    new CustomEvent<PrefillFlashDetail>(PREFILL_FLASH_EVENT, { detail: { dossierId, fields } }),
  );
}

/** Returns a predicate: is this dossier path currently in its flash window? */
export function usePrefillFlash(): (path?: string) => boolean {
  const [flashed, setFlashed] = React.useState<ReadonlySet<string>>(() => new Set());

  React.useEffect(() => {
    let timer: number | undefined;
    const onFlash = (e: Event) => {
      const { fields } = (e as CustomEvent<PrefillFlashDetail>).detail;
      setFlashed(new Set(fields));
      window.clearTimeout(timer);
      // Slightly past the 2s animation so a re-render can't restart it.
      timer = window.setTimeout(() => setFlashed(new Set()), 2200);
    };
    window.addEventListener(PREFILL_FLASH_EVENT, onFlash);
    return () => {
      window.removeEventListener(PREFILL_FLASH_EVENT, onFlash);
      window.clearTimeout(timer);
    };
  }, []);

  return React.useCallback((path?: string) => (path ? flashed.has(path) : false), [flashed]);
}
