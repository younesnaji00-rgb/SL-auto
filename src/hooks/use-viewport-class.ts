'use client';

/**
 * Viewport class — the three shells of the mobile pass (docs/research/
 * mobile-synthesis.md §1):
 *
 *   phone   < 768 px   bottom nav bar, 48 px top bar with the page title, sheets
 *   tablet  768–1023   collapsed icon rail, 56 px top bar, centred dialogs
 *   desktop ≥ 1024     unchanged
 *
 * Reads matchMedia (not innerWidth) so it agrees with Tailwind's `md:` / `lg:`
 * classes to the pixel. SSR and the first client paint report `'desktop'` and
 * `false` for touch: the CSS classes (`max-md:`, `md:max-lg:`) already paint
 * the right layout before hydration, so no phone user sees a desktop flash —
 * only JS-driven decisions (which primitive to mount) wait one effect.
 */

import * as React from 'react';

export type ViewportClass = 'phone' | 'tablet' | 'desktop';

const PHONE_MAX = 767;
const TABLET_MAX = 1023;

function read(): ViewportClass {
  if (typeof window === 'undefined') return 'desktop';
  if (window.matchMedia(`(max-width: ${PHONE_MAX}px)`).matches) return 'phone';
  if (window.matchMedia(`(max-width: ${TABLET_MAX}px)`).matches) return 'tablet';
  return 'desktop';
}

export function useViewportClass(): ViewportClass {
  const [cls, setCls] = React.useState<ViewportClass>('desktop');
  React.useEffect(() => {
    const phone = window.matchMedia(`(max-width: ${PHONE_MAX}px)`);
    const tablet = window.matchMedia(`(max-width: ${TABLET_MAX}px)`);
    const update = () => setCls(read());
    update();
    phone.addEventListener('change', update);
    tablet.addEventListener('change', update);
    return () => {
      phone.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
    };
  }, []);
  return cls;
}

/** True below 768 px (the phone shell). */
export function useIsPhone(): boolean {
  return useViewportClass() === 'phone';
}

/**
 * True when the primary pointer is coarse (touch) — the trigger for touch
 * substitutions that are about the INPUT, not the width: tooltips off, hover
 * clusters replaced by a visible « ⋯ », native pickers, action sheets for
 * menus. A touch laptop reports fine; a tablet with a mouse reports fine.
 */
export function useIsCoarsePointer(): boolean {
  const [coarse, setCoarse] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)');
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return coarse;
}

/**
 * Phone landscape (`max-height: 500px` on a phone): the bottom bar hides and
 * the top bar drops to 40 px. Tablets never match (their short side ≥ 600).
 */
export function useIsPhoneLandscape(): boolean {
  const [land, setLand] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-height: 500px) and (orientation: landscape)');
    const update = () => setLand(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return land;
}

/**
 * True while the on-screen keyboard is open (visual viewport at least 150 px
 * shorter than the layout viewport). Used to hide the bottom bars so they
 * never float mid-screen above the keyboard.
 */
export function useKeyboardOpen(): boolean {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setOpen(window.innerHeight - vv.height > 150);
    update();
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);
  return open;
}
