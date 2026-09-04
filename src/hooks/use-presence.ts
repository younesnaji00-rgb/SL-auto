'use client';

import { useEffect, useState } from 'react';

/**
 * Keeps an element mounted long enough to animate out.
 *
 *   const { mounted, shown } = usePresence(open, 300);
 *   if (!mounted) return null;
 *   <div className={shown ? 'opacity-100' : 'opacity-0'} />
 *
 * `mounted` turns true immediately when `open` becomes true and false only
 * `duration` ms after it becomes false; `shown` flips one frame after mount
 * (so the entry transition runs) and immediately on close.
 */
export function usePresence(open: boolean, duration = 300): { mounted: boolean; shown: boolean } {
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), duration);
    return () => window.clearTimeout(t);
  }, [open, duration]);

  return { mounted, shown };
}
