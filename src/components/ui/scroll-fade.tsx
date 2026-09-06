'use client';

/**
 * ScrollFade — horizontal-scroll cue for the tables that legitimately
 * survive on a phone (figure comparison: monitoring, utilisateurs stats,
 * compagnies amounts, jours fériés — research docs/research/
 * mobile-lists-tables.md §2; Smashing responsive tables). A 24 px
 * right-edge gradient OVERLAY (an element, not `background-attachment`)
 * over the scroll region that fades out when `scrollLeft` reaches the end,
 * plus a matching left-edge fade once the user has scrolled. The right edge
 * of the region should still cut a column mid-word (NN/g cut-off signal) —
 * the fade reinforces it, it does not replace it.
 *
 * Props:
 *   children      — the table (or any block) whose FIRST scrollable
 *                   descendant is observed (`Table` renders its own
 *                   `overflow-auto` region), or a plain block with
 *                   `scrollable` = true to make the wrapper itself scroll.
 *   selector      — CSS selector of the scroll element inside `children`
 *                   (default: `[role="region"], .overflow-auto, .overflow-x-auto`).
 *   scrollable    — wrap `children` in an `overflow-x-auto` div and observe it.
 *   edge          — fade width in px (default 24).
 *   from          — CSS colour behind the fade (default `hsl(var(--card))`);
 *                   pass `hsl(var(--background))` for a table on the canvas.
 *   className     — wrapper classes (it is `relative`).
 *   leftFade      — also fade the left edge after scrolling (default true).
 *
 * Exports: ScrollFade.
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ScrollFadeProps {
  children: React.ReactNode;
  selector?: string;
  scrollable?: boolean;
  edge?: number;
  from?: string;
  leftFade?: boolean;
  className?: string;
}

const DEFAULT_SELECTOR = '[role="region"], .overflow-auto, .overflow-x-auto';

export function ScrollFade({
  children,
  selector = DEFAULT_SELECTOR,
  scrollable = false,
  edge = 24,
  from = 'hsl(var(--card))',
  leftFade = true,
  className,
}: ScrollFadeProps) {
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [atEnd, setAtEnd] = React.useState(true);
  const [atStart, setAtStart] = React.useState(true);

  React.useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const el: HTMLElement | null = scrollable ? (wrap.firstElementChild as HTMLElement | null) : wrap.querySelector<HTMLElement>(selector);
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      setAtEnd(max <= 1 || el.scrollLeft >= max - 1);
      setAtStart(el.scrollLeft <= 1);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    if (ro && el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [selector, scrollable, children]);

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      {scrollable ? <div className="overflow-x-auto overscroll-x-contain">{children}</div> : children}
      <div
        aria-hidden
        className={cn('pointer-events-none absolute inset-y-0 right-0 z-[3] transition-opacity duration-150 ease-standard', atEnd ? 'opacity-0' : 'opacity-100')}
        style={{ width: edge, background: `linear-gradient(to right, transparent, ${from})` }}
      />
      {leftFade && (
        <div
          aria-hidden
          className={cn('pointer-events-none absolute inset-y-0 left-0 z-[3] transition-opacity duration-150 ease-standard', atStart ? 'opacity-0' : 'opacity-100')}
          style={{ width: edge, background: `linear-gradient(to left, transparent, ${from})` }}
        />
      )}
    </div>
  );
}

export default ScrollFade;
