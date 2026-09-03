'use client';

/**
 * "Symbiote" active-tab morph, v2 (owner rulings 2026-09-02: the active
 * highlight must visibly travel to the clicked tab; v1's full seated shape
 * aliased on the foot arcs mid-flight, and the clicked tab seated itself
 * long before the carrier arrived).
 *
 * Mechanism now:
 *  1. The incoming tab is put ON HOLD (`.tab-morph-hold`, globals.css): its
 *     seat paint (::before/::after) is hidden and its label keeps the
 *     inactive ink, so it still LOOKS unselected while the carrier flies.
 *  2. A clean CARRIER pill (`.tab-slope-ghost` — solid teal, 10px top
 *     radius, rim; no foot gradients, so nothing to alias) flies from the
 *     old tab's rect to the new one over 300ms on the standard curve
 *     (WAAPI, layout px via the offset chain — zoom- and scroll-safe).
 *  3. On landing the hold is lifted (the tab paints its seat — the 120ms
 *     fill crossfade — its own `tab-slope-in` has long finished while
 *     hidden) and the carrier fades out over 100ms on top of it, so the
 *     handoff reads as the blob settling INTO the tab.
 *
 * Shared-element indicator pattern (motion-spec §7); selection detected via
 * MutationObserver on data-state / aria-selected so Radix Tabs, the step
 * facets and the workspace strip all use the same hook. The strip must be
 * `position: relative`. Reduced motion: no carrier, no hold — the plain
 * crossfade remains.
 */

import * as React from 'react';
import { prefersReducedMotion } from '@/lib/motion';

type Box = { top: number; left: number; width: number; height: number };

const ACTIVE_SELECTOR =
  '.tab-slope[data-state="active"], .tab-slope[aria-selected="true"], .tab-slope.tab-slope-active';

const FLIGHT_MS = 300;
const LANDING_FADE_MS = 100;
const EASE_STANDARD = 'cubic-bezier(0.2, 0, 0, 1)';

function offsetWithin(el: HTMLElement, container: HTMLElement): Box {
  let top = 0;
  let left = 0;
  let node: HTMLElement | null = el;
  while (node && node !== container) {
    top += node.offsetTop;
    left += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return { top, left, width: el.offsetWidth, height: el.offsetHeight };
}

function fly(container: HTMLElement, target: HTMLElement, from: Box, to: Box) {
  target.classList.add('tab-morph-hold');
  const ghost = document.createElement('div');
  ghost.className = 'tab-slope-ghost pointer-events-none';
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'absolute',
    // UNDER the tabs (they sit at z 1+, the strip is isolated): labels stay
    // readable for the whole flight (owner 2026-09-02 — "the morph shouldn't
    // remove the text while the animation is active").
    zIndex: '0',
    top: `${to.top}px`,
    left: `${to.left}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
  });
  container.appendChild(ghost);

  let done = false;
  const land = () => {
    if (done) return;
    done = true;
    // Reveal the real tab, then melt the carrier into it.
    target.classList.remove('tab-morph-hold');
    const fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: LANDING_FADE_MS,
      easing: 'linear',
      fill: 'forwards',
    });
    const remove = () => ghost.remove();
    fade.onfinish = remove;
    fade.oncancel = remove;
    window.setTimeout(remove, LANDING_FADE_MS * 3);
  };

  // Compositor-only flight (owner 2026-09-02: layout-animating left/width
  // dropped frames): the carrier is PLACED at the destination rect and a
  // transform carries it from the source — translate + scale, nothing
  // re-laid-out per frame. Tab heights within a strip are equal, so the
  // scale is effectively horizontal; the mild radius squish at ~1.3× is
  // invisible at 300ms.
  const sx = to.width > 0 ? from.width / to.width : 1;
  const sy = to.height > 0 ? from.height / to.height : 1;
  ghost.style.transformOrigin = '0 0';
  ghost.style.willChange = 'transform';
  const flight = ghost.animate(
    [
      { transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${sx}, ${sy})` },
      { transform: 'none' },
    ],
    { duration: FLIGHT_MS, easing: EASE_STANDARD },
  );
  flight.onfinish = land;
  flight.oncancel = land;
  // Safety net: never leave a tab stuck on hold.
  window.setTimeout(land, FLIGHT_MS * 2);
}

export function attachTabSlopeMorph(container: HTMLElement): () => void {
  let prevEl: Element | null = container.querySelector(ACTIVE_SELECTOR);
  let prevBox: Box | null =
    prevEl instanceof HTMLElement ? offsetWithin(prevEl, container) : null;

  const update = () => {
    const el = container.querySelector(ACTIVE_SELECTOR);
    if (el === prevEl) {
      // Same tab — refresh the stored position (layout may have shifted).
      if (el instanceof HTMLElement) prevBox = offsetWithin(el, container);
      return;
    }
    const box = el instanceof HTMLElement ? offsetWithin(el, container) : null;
    if (
      el instanceof HTMLElement &&
      box &&
      prevBox &&
      !prefersReducedMotion() &&
      typeof HTMLElement.prototype.animate === 'function'
    ) {
      fly(container, el, prevBox, box);
    }
    prevEl = el;
    prevBox = box;
  };

  const mo = new MutationObserver(update);
  mo.observe(container, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-state', 'aria-selected', 'class'],
  });
  return () => mo.disconnect();
}

/** Attach the morph to a tab strip. The referenced element must be the
 *  positioned (`relative`) scroll/track container holding the `.tab-slope`
 *  triggers. */
export function useTabSlopeMorph<T extends HTMLElement>(ref: React.RefObject<T | null>) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return attachTabSlopeMorph(el);
  }, [ref]);
}

/** Callback-ref variant for strips that mount conditionally (an object ref's
 *  effect never re-runs when the node appears later). Pass the returned ref
 *  to the `relative isolate` tablist container.
 *  The element lands in STATE so an effect owns the attachment — a version
 *  that attached inside the ref callback died under StrictMode's simulated
 *  remount (its unmount cleanup disposed the observer, and ref callbacks are
 *  not re-invoked, so nothing re-attached; owner 2026-09-03: « vue dessus /
 *  dessous » still didn't morph). */
export function useTabSlopeMorphRef(): (el: HTMLElement | null) => void {
  const [el, setEl] = React.useState<HTMLElement | null>(null);
  React.useEffect(() => {
    if (!el) return;
    return attachTabSlopeMorph(el);
  }, [el]);
  return setEl;
}
