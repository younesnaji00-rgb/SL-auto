'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * The sliding selection surface for segmented controls (owner ruling
 * 2026-09-02, motion-spec addendum ter: selection travel = ONE surface that
 * morphs to the new choice, 300ms standard curve — same family as the
 * sidebar row indicator and the tab carrier).
 *
 * Drop it as the FIRST child of a `relative isolate` group; it tracks the
 * descendant carrying `data-seg-active="true"` (measured via the offset
 * chain — CSS-zoom- and scroll-safe; re-measured when the group resizes).
 * The active button paints its label ABOVE the thumb (`relative z-[1]`) and
 * should suppress its own selected background — the thumb IS the selection
 * paint. Reduced motion: it snaps.
 */
export function SlidingThumb({
  className,
  deps,
}: {
  /** The thumb's look (fill, radius, shadow) — the group decides. */
  className?: string;
  /** Re-measure when these change (the selected value, option count…). */
  deps: React.DependencyList;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const readyRef = React.useRef(false);

  const measure = React.useCallback(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!el || !container) return;
    const btn = container.querySelector<HTMLElement>('[data-seg-active="true"]');
    if (!btn) {
      setBox(null);
      return;
    }
    let top = 0;
    let left = 0;
    let node: HTMLElement | null = btn;
    while (node && node !== container) {
      top += node.offsetTop;
      left += node.offsetLeft;
      node = node.offsetParent as HTMLElement | null;
    }
    setBox({ top, left, width: btn.offsetWidth, height: btn.offsetHeight });
  }, []);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  React.useLayoutEffect(measure, deps);
  React.useEffect(() => {
    const container = ref.current?.parentElement;
    if (!container) return;
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure]);
  React.useEffect(() => {
    if (box) readyRef.current = true;
  }, [box]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-0',
        readyRef.current &&
          'transition-[top,left,width,height,opacity] duration-300 ease-standard motion-reduce:transition-none',
        box ? 'opacity-100' : 'opacity-0',
        className,
      )}
      style={box ?? undefined}
    />
  );
}
