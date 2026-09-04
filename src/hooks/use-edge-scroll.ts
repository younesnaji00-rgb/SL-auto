'use client';

/**
 * Horizontal overflow state for a scroller + its « ‹ › » page buttons.
 *
 * Owner ruling 2026-09-04: any horizontal rail that can outrun its width
 * (the document-type tab strip, the accord pipeline's version columns) gets
 * arrows at BOTH ends — bare scrolling hides that there is more (Smashing,
 * "Usability Guidelines For Better Carousels UX": always include prev/next
 * buttons; group them on desktop). The arrows stay mounted while the rail
 * overflows and dim at the end of their travel, so nothing jumps.
 */

import * as React from 'react';
import { scrollBehavior } from '@/lib/motion';

export interface EdgeScroll<T extends HTMLElement> {
  ref: React.RefObject<T | null>;
  /** Scrolled away from the start — the ‹ arrow is live. */
  canScrollLeft: boolean;
  /** More content to the right — the › arrow is live. */
  canScrollRight: boolean;
  /** Render the arrow pair at all. */
  hasOverflow: boolean;
  /** Page by ~80 % of the visible width (min 160 px). */
  scrollByPage: (direction: 1 | -1) => void;
  /** Bring an element inside the scroller back into view. */
  reveal: (el: HTMLElement | null | undefined) => void;
}

export function useEdgeScroll<T extends HTMLElement>(
  /** Anything that changes the scroller's content and so its overflow. */
  watch?: React.DependencyList,
): EdgeScroll<T> {
  const ref = React.useRef<T>(null);
  const [edges, setEdges] = React.useState({ left: false, right: false });

  const measure = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // 1 px tolerance: fractional widths under `zoom` never settle on 0.
    const max = el.scrollWidth - el.clientWidth;
    const next = { left: el.scrollLeft > 1, right: el.scrollLeft < max - 1 };
    // Scroll fires continuously — only re-render when an end is reached or
    // left, or the rail re-renders on every pixel.
    setEdges((prev) => (prev.left === next.left && prev.right === next.right ? prev : next));
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of Array.from(el.children)) ro.observe(child);
    return () => {
      el.removeEventListener('scroll', measure);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...(watch ?? [])]);

  const scrollByPage = React.useCallback((direction: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({
      left: direction * Math.max(160, el.clientWidth * 0.8),
      behavior: scrollBehavior(),
    });
  }, []);

  const reveal = React.useCallback((el: HTMLElement | null | undefined) => {
    el?.scrollIntoView({ behavior: scrollBehavior(), inline: 'nearest', block: 'nearest' });
  }, []);

  return {
    ref,
    canScrollLeft: edges.left,
    canScrollRight: edges.right,
    hasOverflow: edges.left || edges.right,
    scrollByPage,
    reveal,
  };
}
