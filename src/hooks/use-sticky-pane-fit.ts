'use client';

/**
 * Fits a sticky side pane to the page scroller (`#main-content`), not to the
 * viewport (QA Chiffreur 009).
 *
 * The devis editor's source pane used `h-[calc((100dvh-2rem)/var(--app-zoom))]`.
 * The scroller does not start at the top of the window: the workspace tabs
 * bar, and the « Synchronisation en cours » banner while files upload, sit
 * above it. So the pane ran past the bottom of the screen and its zoom pill
 * (− 100 % + ⟳, pinned at the pane's bottom) was half hidden.
 *
 * Returns the pane's sticky `top` and its `height`, in CSS px, or null before
 * the first measure (callers keep their CSS fallback until then):
 *   - `top` = where the pane naturally starts inside the scroller (the page
 *     padding above the split), so it never moves when it sticks;
 *   - `height` = the scroller's visible height minus that top and a small
 *     bottom margin, so the whole pane — pill included — is on screen.
 *
 * `ref` is the sticky element itself; its parent is measured (a sticky box
 * reports its stuck position, its parent does not). Units: `clientHeight` and
 * `scrollTop` are CSS px, `getBoundingClientRect()` is zoomed px under the
 * density `zoom` on <html> — the rect gap is divided by the scroller's own
 * rect/offset ratio to bring it back to CSS px.
 */

import { useEffect, useState, type RefObject } from 'react';

/** The pane never sits lower than this when stuck (banners above the split). */
const MAX_TOP_PX = 96;
/** Breathing room under the pane. */
const BOTTOM_GAP_PX = 8;
/** Below this the pane would be useless; let it overflow instead. */
const MIN_HEIGHT_PX = 240;

export interface StickyPaneFit {
  top: number;
  height: number;
}

export function useStickyPaneFit(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  scrollerId = 'main-content',
): StickyPaneFit | null {
  const [fit, setFit] = useState<StickyPaneFit | null>(null);

  useEffect(() => {
    if (!enabled) {
      setFit(null);
      return;
    }
    const scroller = document.getElementById(scrollerId);
    const anchor = ref.current?.parentElement;
    if (!scroller || !anchor) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const sRect = scroller.getBoundingClientRect();
      const zoom = scroller.offsetHeight > 0 ? sRect.height / scroller.offsetHeight : 1;
      const naturalTop = (anchor.getBoundingClientRect().top - sRect.top) / (zoom || 1) + scroller.scrollTop;
      const top = Math.round(Math.max(0, Math.min(naturalTop, MAX_TOP_PX)));
      const height = Math.round(Math.max(MIN_HEIGHT_PX, scroller.clientHeight - top - BOTTOM_GAP_PX));
      setFit((prev) => (prev && prev.top === top && prev.height === height ? prev : { top, height }));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    // The scroller resizes when a banner comes or goes; its content resizes
    // when something above the split (save banner, extraction notice) does.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    ro?.observe(scroller);
    if (scroller.firstElementChild) ro?.observe(scroller.firstElementChild);
    window.addEventListener('resize', schedule);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', schedule);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled, ref, scrollerId]);

  return fit;
}
