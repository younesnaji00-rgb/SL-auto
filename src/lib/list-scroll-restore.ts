'use client';

/**
 * List scroll restore — phone lists remember where the reader was
 * (mobile-synthesis §4 paging; research docs/research/mobile-lists-tables.md
 * §7: Baymard's Back-button rule, NN/g "users will find themselves at the
 * top of the list"). On a row tap (and before unmount) the page saves the
 * `#main-content` scrollTop, the render cap and the tapped row id in
 * `sessionStorage`, keyed by pathname + filters signature; on mount with the
 * same key it restores the cap, scrolls back once the rows are rendered and
 * highlights the returned-from row for 1.5 s (`data-returned`).
 *
 * Exports:
 *   listScrollKey(pathname, signature)          → storage key
 *   saveListScroll(key, { scrollTop, cap, rowId })
 *   readListScroll(key) / clearListScroll(key)
 *   useListScrollRestore({ key, enabled, ready, cap, setCap, scrollerId? })
 *     → { onRowTap(rowId), returnedId, saveNow() }
 */

import * as React from 'react';

const PREFIX = 'lsr:';
const TTL_MS = 30 * 60 * 1000;
const HIGHLIGHT_MS = 1500;

export interface ListScrollState {
  scrollTop: number;
  cap: number;
  rowId?: string | null;
  at: number;
}

export function listScrollKey(pathname: string, signature: string): string {
  return `${PREFIX}${pathname}|${signature}`;
}

export function saveListScroll(key: string, state: Omit<ListScrollState, 'at'>): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ ...state, at: Date.now() }));
  } catch {
    /* ignore quota / private mode */
  }
}

export function readListScroll(key: string): ListScrollState | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ListScrollState;
    if (!parsed || typeof parsed.scrollTop !== 'number') return null;
    if (Date.now() - (parsed.at || 0) > TTL_MS) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearListScroll(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export interface UseListScrollRestoreOptions {
  key: string;
  /** Only on phones (desktop keeps its pager). */
  enabled: boolean;
  /** Rows are rendered (not loading, list non-empty) → safe to scroll. */
  ready: boolean;
  cap: number;
  setCap: (n: number) => void;
  scrollerId?: string;
}

export interface ListScrollRestore {
  /** Call from the row's onClick before navigation. */
  onRowTap: (rowId: string) => void;
  /** Id of the row to highlight (`returned` prop of RecordRow), or null. */
  returnedId: string | null;
  /** Persist the current position now (used before unmount). */
  saveNow: () => void;
}

export function useListScrollRestore({ key, enabled, ready, cap, setCap, scrollerId = 'main-content' }: UseListScrollRestoreOptions): ListScrollRestore {
  const [returnedId, setReturnedId] = React.useState<string | null>(null);
  const pendingRef = React.useRef<ListScrollState | null>(null);
  const restoredRef = React.useRef(false);
  const capRef = React.useRef(cap);
  capRef.current = cap;
  const keyRef = React.useRef(key);
  keyRef.current = key;
  const enabledRef = React.useRef(enabled);
  enabledRef.current = enabled;

  // 1. Read the saved state once, as soon as we are enabled; restore the cap
  //    immediately so the returned-from row is inside the rendered set.
  React.useEffect(() => {
    if (!enabled || restoredRef.current) return;
    restoredRef.current = true;
    const saved = readListScroll(key);
    if (!saved) return;
    pendingRef.current = saved;
    if (saved.cap > capRef.current) setCap(saved.cap);
    if (saved.rowId) setReturnedId(saved.rowId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // 2. Scroll once the rows exist.
  React.useEffect(() => {
    const saved = pendingRef.current;
    if (!saved || !ready) return;
    pendingRef.current = null;
    const el = document.getElementById(scrollerId);
    const run = () => {
      if (el) el.scrollTop = saved.scrollTop;
      // If the row is off by a few px (a live insert), bring it into view.
      if (saved.rowId) {
        const row = document.querySelector<HTMLElement>(`[data-record-id="${CSS.escape(saved.rowId)}"]`);
        if (row && el) {
          const r = row.getBoundingClientRect();
          const c = el.getBoundingClientRect();
          if (r.top < c.top || r.bottom > c.bottom) row.scrollIntoView({ block: 'center' });
        }
      }
    };
    const raf = window.requestAnimationFrame(() => window.requestAnimationFrame(run));
    clearListScroll(key);
    const timer = window.setTimeout(() => setReturnedId(null), HIGHLIGHT_MS);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const saveNow = React.useCallback(() => {
    if (!enabledRef.current) return;
    const el = document.getElementById(scrollerId);
    saveListScroll(keyRef.current, { scrollTop: el ? el.scrollTop : 0, cap: capRef.current, rowId: null });
  }, [scrollerId]);

  const onRowTap = React.useCallback(
    (rowId: string) => {
      if (!enabledRef.current) return;
      const el = document.getElementById(scrollerId);
      saveListScroll(keyRef.current, { scrollTop: el ? el.scrollTop : 0, cap: capRef.current, rowId });
    },
    [scrollerId],
  );

  // 3. Save on unmount (navigation by any other path: bottom bar, back…),
  //    but only when nothing more specific (a row tap) was just saved.
  React.useEffect(() => {
    return () => {
      if (!enabledRef.current) return;
      const existing = readListScroll(keyRef.current);
      if (existing && existing.rowId) return;
      const el = document.getElementById(scrollerId);
      if (!el) return;
      saveListScroll(keyRef.current, { scrollTop: el.scrollTop, cap: capRef.current, rowId: null });
    };
  }, [scrollerId]);

  return { onRowTap, returnedId, saveNow };
}
