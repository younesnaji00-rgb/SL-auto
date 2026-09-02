'use client';

/**
 * "Symbiote" active-tab morph (owner ruling 2026-09-02: the active highlight
 * must visibly travel from the old tab to the new one, on EVERY tab strip).
 *
 * Mechanism: a GHOST element wearing `.tab-slope-ghost .tab-slope-active`
 * (globals.css draws the full seated teal shape — body, feet, contour — on
 * any element with the active class) is appended to the strip at the OLD
 * tab's position and flown to the NEW tab's over 200ms on the standard
 * curve, then removed. Underneath it the old tab's fill drains and the new
 * one fills (the existing 120ms crossfade), so when the ghost lands and
 * vanishes the real tab is already seated — the handoff reads as one
 * organism moving. This is the shared-element indicator pattern
 * (motion-spec §7: Motion.dev smooth tabs, Kowalski's clip-path tabs,
 * Vercel's animated active tab) built with WAAPI instead of a JS library.
 *
 * Positions are measured with the offsetTop/offsetLeft chain (layout px —
 * safe under the app's CSS zoom, unaffected by strip scrolling). The strip
 * must be `position: relative`.
 *
 * Selection is detected via a MutationObserver on `data-state` /
 * `aria-selected`, so the same hook serves Radix Tabs, the step facets and
 * the workspace strip without value plumbing. Reduced motion: no ghost —
 * the crossfade alone remains.
 */

import * as React from 'react';
import { prefersReducedMotion } from '@/lib/motion';

type Box = { top: number; left: number; width: number; height: number };

const ACTIVE_SELECTOR =
  '.tab-slope[data-state="active"], .tab-slope[aria-selected="true"], .tab-slope.tab-slope-active';

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

function fly(container: HTMLElement, from: Box, to: Box) {
  const ghost = document.createElement('div');
  ghost.className = 'tab-slope tab-slope-active tab-slope-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  Object.assign(ghost.style, {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: '3',
    top: `${to.top}px`,
    left: `${to.left}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
  });
  container.appendChild(ghost);
  const anim = ghost.animate(
    [
      { top: `${from.top}px`, left: `${from.left}px`, width: `${from.width}px`, height: `${from.height}px` },
      { top: `${to.top}px`, left: `${to.left}px`, width: `${to.width}px`, height: `${to.height}px` },
    ],
    { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
  );
  const done = () => ghost.remove();
  anim.onfinish = done;
  anim.oncancel = done;
  // Safety net if WAAPI events never fire (detached document, etc.).
  window.setTimeout(done, 400);
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
      box &&
      prevBox &&
      !prefersReducedMotion() &&
      typeof HTMLElement.prototype.animate === 'function'
    ) {
      fly(container, prevBox, box);
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
