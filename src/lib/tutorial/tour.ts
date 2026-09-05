'use client';

import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { t, getLocale } from '@/i18n';
import { BRAND } from '@/lib/brand';
import { treatedDossierKey } from './keys';
import type { PageTutorial, TourStep } from './types';

let active: Driver | null = null;
let activeKey: string | null = null;

/**
 * Step-by-step tracing. The engine logged ~10 lines per step to the console
 * on every run, in production, for every user. Opt in per browser with
 * `localStorage['<prefix>.tour.debug'] = '1'` when a tour misbehaves.
 */
const DEBUG = (() => {
  try {
    return window.localStorage.getItem(`${BRAND.storagePrefix}.tour.debug`) === '1';
  } catch {
    return false;
  }
})();
function log(...args: unknown[]): void {
  if (DEBUG) console.debug('[tour]', ...args);
}

/**
 * Set while `destroyActiveTour()` is tearing a tour down on purpose (route
 * change, a new tour starting, the user switching the tutorial off). The
 * `onDestroyStarted` hook refuses destroy requests that arrive with no recent
 * user input — a guard against driver.js's event machinery, which would
 * otherwise kill the journey around portal dialogs. That guard applied to OUR
 * OWN teardown too: navigating more than ~1.2s after the last click left the
 * overlay, the cutout and the pointing hand painted over the next page, with
 * no way to dismiss them.
 */
let forcedDestroy = false;

/**
 * Key of the tour currently on screen (null when none). The launcher uses it
 * to treat an in-flight tour as resumable progress: toggling the ATG phone
 * view swaps the whole layout under a RUNNING tour, and the "?" button must
 * restart that page's tour at its current step — not the whole lab.
 */
export function activeTourKey(): string | null {
  return active ? activeKey : null;
}

// ── "Tour running" signal ───────────────────────────────────────────────
// Components that expose journey-only affordances (self-addressed rappels,
// HTML mission import, gallery photo import…) subscribe to this so those
// affordances exist ONLY while a guided tour is on screen — see
// use-tutorial-mode.ts. The demo brand shows them unconditionally.
const tourListeners = new Set<() => void>();
function notifyTourListeners(): void {
  for (const fn of tourListeners) fn();
}
export function subscribeTourActive(fn: () => void): () => void {
  tourListeners.add(fn);
  return () => {
    tourListeners.delete(fn);
  };
}
/**
 * True while a page tour is running, or while a chained hand-off is pending
 * (the next page's tour auto-starts once its anchors exist).
 */
export function isTourRunning(): boolean {
  if (active && activeKey) return true;
  try {
    return !!window.localStorage.getItem(`${BRAND.storagePrefix}.tour.pending`);
  } catch {
    return false;
  }
}

export { treatedDossierKey };

// Tours that belong to the chained guided journey. Only these share the
// journey-wide CONTINUOUS step numbering (page 2 starts at 33, not at 1) —
// standalone tours (login) keep their own local count.
export const JOURNEY_KEYS = [
  'sidebar-intro',
  'dossiers',
  'mes-rappels',
  'dossier-detail',
  'assignations-atg',
  'atg-detail',
  'assignations-chiffrage',
  'chiffrage-detail',
  'devis-editor',
];

const journeyBaseKey = () => `${BRAND.storagePrefix}.tour.journeyBase`;

/**
 * Shared closing step appended to EVERY page tour: the product's strong
 * points, the customization pitch, and the pointer to per-page tutorials.
 * The "start the demo" (hands-on lab) button is injected on this step.
 */
const CLOSING_STEP: TourStep = {
  title: 'C’est tout pour cette page !',
  body:
    "L'IA lit les documents pour vous, les délais se suivent tout seuls — et tout peut être adapté à votre cabinet.\nLe bouton « ? » en bas à droite relance la visite guidée à tout moment.",
};

const posKey = (key: string) => `${BRAND.storagePrefix}.tour.${key}.pos`;
// Title-based resume marker for round-trip hops: numeric indexes shift when
// already-completed steps are filtered out on the return visit, titles don't.
const posTitleKey = (key: string) => `${BRAND.storagePrefix}.tour.${key}.posTitle`;
// Furthest step ever reached (by title, path-scoped): chain returns resume at
// MAX(re-entry point, furthest) so a hop never sends the user backwards
// through steps they already completed.
const farKey = (key: string) => `${BRAND.storagePrefix}.tour.${key}.far`;
// Title of the step the last run was interrupted on, path-scoped. The numeric
// marker below indexes the FILTERED step list, and that list depends on page
// state (a step whose goal is already met is dropped, a collapsed section
// hides its anchors) — so the same number can mean a different step on the
// next visit, which is how a resume landed a couple of steps away from where
// the user actually left off. The title is stable; the index stays as the
// fallback for markers written before this key existed.
const posExactKey = (key: string) => `${BRAND.storagePrefix}.tour.${key}.at`;

// Resume markers are PATH-SCOPED: tours whose route matches many pages
// (dossier detail, mission detail) must not resume dossier A's position on
// freshly opened dossier B — a stale marker means "restart", not "resume".
// Markers written from ANOTHER page (chainAt hops) use the '*' wildcard.
function readResumeIndex(key: string, steps: TourStep[]): number {
  const max = steps.length;
  try {
    // Prefer the title marker: it survives a step list that filtered
    // differently this time round.
    const ttl = readScopedTitle(posExactKey(key));
    if (ttl) {
      const idx = steps.findIndex((st) => st.title === ttl);
      if (idx > 0 && idx < max) return idx;
    }
    const raw = window.localStorage.getItem(posKey(key));
    if (raw == null) return 0;
    const at = raw.indexOf('@');
    const n = parseInt(at >= 0 ? raw.slice(0, at) : raw, 10);
    const path = at >= 0 ? raw.slice(at + 1) : null;
    if (path && path !== '*' && path !== window.location.pathname) {
      log('stale resume dropped', key, path, '!=', window.location.pathname);
      window.localStorage.removeItem(posKey(key));
      return 0;
    }
    return Number.isFinite(n) && n > 0 && n < max ? n : 0;
  } catch {
    return 0;
  }
}

function writeResumeIndex(key: string, index: number | null, title?: string): void {
  try {
    if (index == null) {
      window.localStorage.removeItem(posKey(key));
      window.localStorage.removeItem(posTitleKey(key));
      window.localStorage.removeItem(posExactKey(key));
      window.localStorage.removeItem(farKey(key));
    } else {
      window.localStorage.setItem(
        posKey(key),
        `${index}@${window.location.pathname}`,
      );
      if (title) {
        window.localStorage.setItem(
          posExactKey(key),
          `${title}@@${window.location.pathname}`,
        );
      } else {
        window.localStorage.removeItem(posExactKey(key));
      }
    }
  } catch {
    // Non-fatal.
  }
}

/**
 * Forget saved positions for a set of tours. Used when the comprehensive
 * lab is (re)started from the beginning: a replay must walk the File
 * Management steps from step 1, not resume at the furthest point of the
 * previous run.
 */
export function resetTourProgress(keys: string[]): void {
  for (const k of keys) writeResumeIndex(k, null);
  try {
    window.localStorage.removeItem(journeyBaseKey());
    window.localStorage.removeItem(treatedDossierKey());
  } catch { /* non-fatal */ }
}

// Read a `value@@path`-scoped marker; null when absent or for another page.
function readScopedTitle(storageKey: string): string | null {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const sep = raw.lastIndexOf('@@');
    const ttl = sep >= 0 ? raw.slice(0, sep) : raw;
    const path = sep >= 0 ? raw.slice(sep + 2) : '*';
    if (path !== '*' && path !== window.location.pathname) return null;
    return ttl;
  } catch {
    return null;
  }
}

/** Kill any running tour (call on route change/unmount to avoid stranded overlays). */
export function destroyActiveTour(): void {
  if (active) {
    log('destroyActiveTour from',
      new Error().stack?.split('\n').slice(2, 5).join(' | ').slice(0, 180),
    );
  }
  // Tell onDestroyStarted this teardown is ours, so its "spurious destroy"
  // guard steps aside instead of stranding the overlay on the next page.
  forcedDestroy = true;
  try {
    active?.destroy();
  } catch {
    // Already destroyed.
  } finally {
    forcedDestroy = false;
  }
  active = null;
  notifyTourListeners();
}

// Example values quoted in step bodies that depend on the brand's market
// (the demo kit is Canadian, the firm works in Morocco). Bodies carry
// {addr1} / {addr2} tokens; translations keep them verbatim.
const EXAMPLE_ADDRESSES: Record<string, [string, string]> = {
  MA: ['219 Bd Mohamed Zerktouni, Maarif, Casablanca', '182 Bd Al Massira, Maarif, Casablanca'],
  CA: ['455 boul. René-Lévesque O, Montréal, QC', '1000 rue De La Gauchetière O, Montréal, QC'],
};
function substituteExamples(text: string): string {
  const [a1, a2] = EXAMPLE_ADDRESSES[BRAND.market] ?? EXAMPLE_ADDRESSES.CA;
  return text.replace(/\{addr1\}/g, a1).replace(/\{addr2\}/g, a2);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Is any element carrying this anchor actually ON SCREEN?
 *
 * Presence alone is not enough. The responsive layout keeps both variants of
 * a control mounted and hides one with CSS (`lg:hidden` on the mobile bottom
 * bar, `hidden md:block` on the breadcrumb), so a presence-only test made
 * the tour highlight an invisible element — the popover pointed at a corner
 * of the page with nothing in it. `getClientRects()` is empty for anything
 * `display:none`, which is exactly the distinction the "one step list serves
 * desktop AND mobile" convention needs.
 */
function anchorVisible(anchor: string): boolean {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`),
  ).some((el) => el.getClientRects().length > 0);
}

/**
 * Start a page tutorial. Steps whose anchor is missing from the DOM — or
 * present but hidden by the responsive layout — are skipped (unless
 * dynamic/click/expand reveals them): this is how one step list serves
 * desktop and mobile.
 */
export function startTutorial(
  tut: PageTutorial,
  opts?: { onComplete?: () => void; fresh?: boolean },
): void {
  destroyActiveTour();

  const steps = tut.steps.filter((s) => {
    // Conditional sub-flows (rappel treatment…) are dropped whole when
    // their gate is false — they must never surface on normal runs.
    if (s.onlyIf) {
      try {
        if (!s.onlyIf()) return false;
      } catch {
        return false;
      }
    }
    // Hands-on steps whose goal is ALREADY met (photos present, quote
    // imported…) are skipped — revisiting a fed dossier stays short.
    if (s.interact === 'until' && s.until) {
      try {
        if (s.until()) return false;
      } catch {
        /* keep the step */
      }
    }
    return (
      !s.anchor ||
      s.dynamic ||
      !!s.click ||
      // `expand` opens a collapsed section at step time — its anchor is
      // legitimately absent right now (see prepare()).
      !!s.expand ||
      anchorVisible(s.anchor)
    );
  });
  if (steps.length === 0) return;
  // Every tour ends on the shared strong-points/customization step —
  // except chaining tours (sidebar intro), which end on a hand-off click.
  if (!tut.noClosing) steps.push(CLOSING_STEP);
  // Journey-wide continuous numbering: this page's steps continue the count
  // of everything already walked (hand-offs bump the stored base). A fresh
  // lab start resets to zero; non-journey tours always count locally.
  const isJourneyTour = JOURNEY_KEYS.includes(tut.key);
  let journeyBase = 0;
  try {
    if (opts?.fresh) window.localStorage.setItem(journeyBaseKey(), '0');
    else if (isJourneyTour) {
      journeyBase = parseInt(window.localStorage.getItem(journeyBaseKey()) ?? '0', 10) || 0;
    }
  } catch { /* non-fatal */ }
  log('start', tut.key, 'steps', steps.length);
  // Manual starts (the "?" buttons) always begin at the very first step —
  // resume markers only serve interrupted runs and chained hops.
  let resumeAt = opts?.fresh ? 0 : readResumeIndex(tut.key, steps);
  if (opts?.fresh) writeResumeIndex(tut.key, null);
  else {
    try {
      // Title markers carry the page they were meant for ('*' = any page,
      // used by chainAt hops written from another route).
      const rawTitle = window.localStorage.getItem(posTitleKey(tut.key));
      const ttl = readScopedTitle(posTitleKey(tut.key));
      window.localStorage.removeItem(posTitleKey(tut.key));
      if (ttl) {
        let idx = steps.findIndex((s) => s.title === ttl);
        // chainResume returns ("continue after the step you left from") must
        // never send the user BACKWARDS through steps they already reached —
        // take the furthest step if it is beyond. chainAt markers ('@@*',
        // written for hidden sub-flow entries) are precise: enter exactly
        // there, or a second sub-flow run would skip its own steps.
        const isChainAt = !!rawTitle && rawTitle.endsWith('@@*');
        if (!isChainAt) {
          const far = readScopedTitle(farKey(tut.key));
          const farIdx = far ? steps.findIndex((s) => s.title === far) : -1;
          if (farIdx > idx) idx = farIdx;
        }
        if (idx >= 0) resumeAt = idx;
        log('resume-title', tut.key, ttl, 'chainAt', isChainAt, '->', idx);
      }
    } catch { /* non-fatal */ }
  }
  let completed = false;
  // Where THIS run entered the step list. Journey numbering is relative to
  // it: a mid-list entry (chainAt into a hidden sub-flow, title resume on a
  // round trip) must continue the global count (base+1, base+2, …) instead
  // of exposing the entry step's absolute position — entering the treatment
  // sub-flow used to jump the counter from ~37 to ~71 because the hidden
  // steps live at the END of the page's list.
  const entryIdx = resumeAt;

  // Run a step's `click` preparation (open tab/menu) BEFORE driver resolves
  // the anchor, then continue.
  const prepare = (index: number, done: () => void) => {
    const s: TourStep | undefined = steps[index];
    // Collapsed disclosures (the dossier timeline's per-step sections, the
    // collapsible observation panels) unmount their content, so every anchor
    // inside one is missing and the step gets filtered away — the same tour
    // walked the whole dossier for one user and half of it for another,
    // purely because of a toggle left closed weeks earlier. Open it first;
    // already-open ones are left alone so the tour never CLOSES a section the
    // user is reading.
    if (s?.expand) {
      const dis = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-tour="${s.expand}"]`),
      ).find((el) => el.getClientRects().length > 0);
      if (dis?.getAttribute('aria-expanded') === 'false') {
        log('expand', s.expand);
        dis.click();
      }
    }
    if (s?.click) {
      const el = document.querySelector<HTMLElement>(`[data-tour="${s.click}"]`);
      if (el) {
        // Radix triggers (tabs, selects) activate on pointerdown/focus, not
        // on a bare synthetic click — dispatch the full sequence.
        try {
          const opts = { bubbles: true, cancelable: true };
          el.dispatchEvent(
            typeof PointerEvent !== 'undefined'
              ? new PointerEvent('pointerdown', opts)
              : new MouseEvent('pointerdown', opts),
          );
          el.dispatchEvent(new MouseEvent('mousedown', opts));
        } catch { /* best effort */ }
        el.click();
        el.focus?.();
        window.setTimeout(done, s.delay ?? 350);
        return;
      }
    }
    done();
  };

  // The app stacks sticky bars (topbar, dossier tabs) ~110px deep; driver's
  // scroll can park a highlighted element UNDER them (visible cutout, hidden
  // element). Nudge the real scroller so the target clears the bars, then
  // re-anchor the popover.
  const clearStickyBars = (el?: HTMLElement) => {
    if (!el || el === document.body) return;
    const delta = 120 - el.getBoundingClientRect().top;
    if (delta <= 0) return;
    let p: HTMLElement | null = el.parentElement;
    let scroller: HTMLElement | null = null;
    while (p && p !== document.body) {
      const st = getComputedStyle(p);
      if (/(auto|scroll)/.test(st.overflowY) && p.scrollHeight > p.clientHeight) {
        scroller = p;
        break;
      }
      p = p.parentElement;
    }
    if (scroller) scroller.scrollTop -= delta;
    else window.scrollBy(0, -delta);
    window.setTimeout(() => {
      try {
        if (active === d) d.refresh();
      } catch { /* torn down */ }
    }, 80);
  };

  let interactCleanup: (() => void) | null = null;
  const cleanupInteract = () => {
    interactCleanup?.();
    interactCleanup = null;
  };
  const advanceFrom = (i: number) => {
    // Interact handlers fire on delayed timers; if the tour was torn down
    // in between (route change, new tour), touching `d` again would
    // resurrect a zombie overlay on top of the next tour.
    if (active !== d) return;
    cleanupInteract();
    const next = i + 1;
    if (next >= steps.length) {
      completed = true;
      writeResumeIndex(tut.key, null);
      d.destroy();
      return;
    }
    log('advance', tut.key, i, '->', next);
    prepare(next, () => {
      try {
        d.moveTo(next);
      } catch (e) {
        log('moveTo threw', e);
      }
      // Self-heal: a step change racing a dialog unmount can leave driver
      // with no popover (transition math on a detached node). Re-drive the
      // target step once if nothing is showing.
      window.setTimeout(() => {
        if (active !== d) return;
        if (!document.querySelector('.driver-popover')) {
          log('popover missing after advance — re-driving', next);
          try {
            d.moveTo(next);
          } catch { /* torn down */ }
        }
      }, 800);
    });
  };
  // Chain hand-off flags: the pending flag must be written BEFORE the
  // navigation that follows, so the destination page's launcher finds it.
  // Called from the interact click listener AND from onNextClick's
  // do-it-for-me click (idempotent — both may run for the same step).
  const writeChainFlags = (s: TourStep, i: number) => {
    if (!s.chain) return;
    try {
      window.localStorage.setItem(`${BRAND.storagePrefix}.tour.pending`, s.chain);
      // The next page continues the count right after this hand-off step —
      // counting only the steps WALKED this visit (entry-relative), so
      // round trips never double-count a page's earlier steps.
      if (isJourneyTour) {
        window.localStorage.setItem(
          journeyBaseKey(),
          String(journeyBase + Math.max(0, i - entryIdx) + 1),
        );
      }
      // Optional: enter the target tour at a specific step. Written from
      // THIS page for the target page → wildcard path scope.
      if (s.chainAt) window.localStorage.setItem(posTitleKey(s.chain), `${s.chainAt}@@*`);
      log('chain->', s.chain, 'written');
    } catch { /* non-fatal */ }
    // Round-trip hop: chaining back into THIS tour later resumes at
    // the step after the hop (stored by TITLE — indexes shift when
    // completed steps are filtered out on the return visit).
    if (s.chainResume && steps[i + 1]) {
      try {
        window.localStorage.setItem(
          posTitleKey(tut.key),
          `${steps[i + 1].title}@@${window.location.pathname}`,
        );
      } catch { /* non-fatal */ }
    }
  };
  const beginInteract = (i: number, el: HTMLElement) => {
    cleanupInteract();
    const s = steps[i];
    log('interact-attach', tut.key, i, s.anchor ?? '(modal)', s.interact);
    const cleanups: Array<() => void> = [];
    interactCleanup = () => cleanups.forEach((f) => {
      try {
        f();
      } catch { /* non-fatal */ }
    });
    // Anchorless click-steps on a body fallback would match ANY click —
    // skip those; anchored ones re-resolve their target per click.
    if (s.interact === 'click' && (s.anchor || el !== document.body)) {
      const h = (ev: Event) => {
        // Re-query the anchor at CLICK time: React may have replaced the
        // highlighted node since the step rendered (live lists re-render on
        // snapshots), which would orphan an element-attached listener.
        const target = ev.target as Node | null;
        if (s.anchor) {
          // ANY element carrying the anchor counts, not just the first:
          // list steps (mission rows, assignment rows, dossier rows) render
          // the anchor once per row, and a user who clicks the second row
          // would otherwise navigate away with no hand-off flags written —
          // the guided journey would die silently on the next page.
          const anchorEls = Array.from(
            document.querySelectorAll(`[data-tour="${s.anchor}"]`),
          );
          if (!target || !anchorEls.some((a) => a.contains(target))) return;
        } else if (!target || !el.contains(target)) {
          return;
        }
        document.removeEventListener('click', h, true);
        writeChainFlags(s, i);
        window.setTimeout(() => advanceFrom(i), 500);
      };
      // Document-level capture: survives the anchor node being replaced by
      // a re-render (the handler re-resolves the anchor per click). Steps
      // without an anchor keep element-level semantics via containment on
      // the highlighted element itself.
      document.addEventListener('click', h, true);
      cleanups.push(() => document.removeEventListener('click', h, true));
    } else if (s.interact === 'until' && s.until) {
      let polls = 0;
      const iv = window.setInterval(() => {
        try {
          const ok = s.until!();
          polls += 1;
          if (polls % 8 === 0) {
            log('until-poll', tut.key, i, 'result', ok);
          }
          if (ok) advanceFrom(i);
        } catch { /* keep polling */ }
      }, 450);
      cleanups.push(() => {
        log('until-cleanup', tut.key, i, 'after', polls, 'polls');
        window.clearInterval(iv);
      });
    }
    // Reset-watch: when the page state a step depends on is torn down by
    // the user (e.g. leaving selection mode mid reminder-flow), jump BACK
    // to the step that rebuilds it instead of describing vanished UI.
    if (s.resetIf && s.resetTo) {
      const rv = window.setInterval(() => {
        try {
          if (active !== d) {
            window.clearInterval(rv);
            return;
          }
          if (s.resetIf!()) {
            window.clearInterval(rv);
            const idx = steps.findIndex((st) => st.title === s.resetTo);
            log('reset', tut.key, i, '->', s.resetTo, idx);
            if (idx >= 0) {
              cleanupInteract();
              prepare(idx, () => {
                try {
                  d.moveTo(idx);
                } catch { /* torn down */ }
              });
            }
          }
        } catch { /* keep polling */ }
      }, 450);
      cleanups.push(() => window.clearInterval(rv));
    }
  };

  // Keep the cutout & popover glued to the highlighted element through ANY
  // scroll (user wheel, native scrollIntoView, sticky-bar correction).
  // driver.js only repositions on window resize — after a scroll the stale
  // cutout turns clicks on the "highlighted" element into overlay clicks,
  // which dismiss the tour.
  // Refresh ONLY while driver's active element is still in the DOM: when a
  // highlighted dialog/sheet unmounts, refresh() re-resolves the element to
  // document.body and the resulting re-highlight silently clears the step's
  // interact listeners — the tour stalls with no way forward. The step's own
  // advance (moveTo) re-highlights properly instead.
  // Animated pointer aimed at the highlighted area — the visual companion of
  // the contour highlight (there is no dark overlay anymore, so the cursor
  // is what pulls the eye to the right spot). Positioned above the element
  // pointing down, or below pointing up when the element hugs the top edge.
  let cursorEl: HTMLDivElement | null = null;
  const ensureCursor = (): HTMLDivElement => {
    if (cursorEl && cursorEl.isConnected) return cursorEl;
    cursorEl = document.createElement('div');
    cursorEl.className = 'sl-tour-cursor';
    // A pointing HAND (lucide "pointer" outline, ISC — same icon set as the
    // app), finger up: it sits just under the target, tapping at it. Each
    // path is drawn twice — a white halo pass then the teal stroke — so the
    // hand stays crisp on any background.
    const HAND_PATHS = [
      'M22 14a8 8 0 0 1-8 8',
      'M18 11v-1a2 2 0 0 0-2-2a2 2 0 0 0-2 2',
      'M14 10V9a2 2 0 0 0-2-2a2 2 0 0 0-2 2v1',
      'M10 9.5V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v10',
      'M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
    ];
    const pass = (stroke: string, width: number) =>
      HAND_PATHS.map(
        (p) =>
          `<path d="${p}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`,
      ).join('');
    cursorEl.innerHTML =
      '<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">' +
      pass('#ffffff', 4.4) +
      pass('#0f766e', 2) +
      '</svg>';
    document.body.appendChild(cursorEl);
    return cursorEl;
  };
  const positionCursor = () => {
    if (active !== d) return;
    const el = document.querySelector<HTMLElement>('.driver-active-element');
    const c = ensureCursor();
    const s: TourStep | undefined = steps[d.getActiveIndex() ?? 0];
    // Steps may aim the hand at a PRECISE control inside a larger highlight
    // (the checkbox in the ticked table, the Edit button in the form) via
    // cursorSel — fall back to the highlighted element when it is absent.
    let target: HTMLElement | null = null;
    if (s?.cursorSel) {
      target =
        Array.from(document.querySelectorAll<HTMLElement>(s.cursorSel)).find(
          (t) => t.getClientRects().length > 0,
        ) ?? null;
    }
    if (!target) target = el && el !== document.body ? el : null;
    if (!target) {
      c.style.display = 'none';
      return;
    }
    const r = target.getBoundingClientRect();
    if ((r.width === 0 && r.height === 0) || r.bottom < 0 || r.top > window.innerHeight) {
      c.style.display = 'none';
      return;
    }
    // The hand naturally points UP: park it just below the target. Only when
    // the target hugs the bottom edge does it flip above, pointing down.
    const flip = r.bottom + 56 > window.innerHeight;
    // Wide bars (page headers, tab strips) carry their text on the LEFT —
    // a hand at the geometric center points at empty space. Steps opt in
    // with cursorAt: 'left'.
    const anchorX =
      s?.cursorAt === 'left'
        ? r.left + Math.min(90, r.width * 0.18)
        : r.left + r.width / 2;
    const x = Math.min(Math.max(anchorX, 20), window.innerWidth - 20);
    const y = flip
      ? Math.max(r.top - 44, 6)
      : Math.min(r.bottom + 10, window.innerHeight - 46);
    c.classList.toggle('sl-tour-cursor-flip', flip);
    c.style.display = 'block';
    c.style.left = `${x}px`;
    c.style.top = `${y}px`;
  };
  const safeRefresh = () => {
    try {
      if (active !== d) return;
      if (!document.querySelector('.driver-active-element')) return;
      d.refresh();
      positionCursor();
    } catch { /* torn down */ }
  };
  // While the tour dims the page, wheel events land on the OVERLAY — whose
  // scroll chain is the document, not the app's inner scroll container, so
  // the page looks frozen. Forward wheel deltas to the scroller that holds
  // the highlighted element: the user can read the whole page (scrolling
  // stays possible) without being able to click outside the highlight.
  const onWheel = (ev: Event) => {
    if (active !== d) return;
    const e = ev as WheelEvent;
    const target = e.target as HTMLElement | null;
    // The popover and the highlighted element scroll themselves natively.
    if (target?.closest?.('.driver-popover, .driver-active-element')) return;
    const el = document.querySelector<HTMLElement>('.driver-active-element');
    let p: HTMLElement | null =
      el && el !== document.body ? el.parentElement : null;
    let scroller: HTMLElement | null = null;
    while (p && p !== document.body) {
      const st = getComputedStyle(p);
      if (/(auto|scroll)/.test(st.overflowY) && p.scrollHeight > p.clientHeight) {
        scroller = p;
        break;
      }
      p = p.parentElement;
    }
    if (scroller) {
      e.preventDefault();
      scroller.scrollTop += e.deltaY;
    }
    // No inner scroller: leave the event to the browser (document scroll).
  };
  let scrollRaf = 0;
  const onAnyScroll = () => {
    if (scrollRaf) return;
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0;
      safeRefresh();
      positionCursor();
    });
  };
  // Dialogs/sheets ANIMATE into place: driver captures their rect mid-
  // animation, leaving a stale cutout that scrolling never corrects. A slow
  // heartbeat refresh keeps the cutout glued to the element regardless of
  // what moved it.
  let refreshIv = 0;
  // Track the last pointer-down so onDestroyStarted can tell a genuine
  // overlay click from a click on the highlighted element through a STALE
  // cutout (which must not kill the tour).
  let lastPointerDown: { x: number; y: number; t: number } | null = null;
  const trackPointer = (ev: Event) => {
    const e = ev as MouseEvent;
    lastPointerDown = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  let lastEscape = 0;
  const trackKeys = (ev: Event) => {
    if ((ev as KeyboardEvent).key === 'Escape') lastEscape = Date.now();
  };

  // "Déposer les fichiers pour moi": fetch each kit file and feed it to the
  // page's REAL file input (DataTransfer + change event) — the normal upload
  // pipeline runs, and the step's until-predicate advances the tour exactly
  // as if the user had picked the files by hand.
  const onPrefillClick = (ev: Event) => {
    const btn = (ev.target as HTMLElement | null)?.closest?.(
      '.sl-tour-prefill',
    ) as HTMLElement | null;
    if (!btn || active !== d) return;
    ev.preventDefault();
    ev.stopPropagation();
    const s: TourStep | undefined = steps[d.getActiveIndex() ?? 0];
    if (!s?.prefill?.length || btn.dataset.busy) return;
    btn.dataset.busy = '1';
    btn.textContent = t('Import en cours…');
    (async () => {
      // Batch consecutive files aimed at the same input into ONE change
      // event (multi-file inputs: the 3 "before" photos, …).
      const groups: Array<{ input: string; files: Array<{ href: string; name: string }> }> = [];
      for (const f of s.prefill!) {
        const last = groups[groups.length - 1];
        if (last && last.input === f.input) last.files.push(f);
        else groups.push({ input: f.input, files: [f] });
      }
      for (const g of groups) {
        const dt = new DataTransfer();
        for (const f of g.files) {
          const res = await fetch(f.href.replace('{lang}', getLocale()));
          if (!res.ok) throw new Error(`fetch ${f.href} -> ${res.status}`);
          const blob = await res.blob();
          dt.items.add(new File([blob], f.name, { type: blob.type || 'application/octet-stream' }));
        }
        const input = document.querySelector<HTMLInputElement>(g.input);
        if (!input) throw new Error(`input not found: ${g.input}`);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        // Let each upload start (and React settle) before the next batch.
        await new Promise((r) => window.setTimeout(r, 800));
      }
      btn.textContent = t('Fichiers déposés !');
    })().catch((e) => {
      log('prefill failed', e);
      btn.textContent = t('Échec — utilisez les boutons de téléchargement');
      delete btn.dataset.busy;
    });
  };

  // Popover body HTML: the step text, its download links and the prefill
  // button. Steps may compute their text at DISPLAY time (`bodyFn`) — the
  // ATG "overdue" step reads different copy depending on whether anything is
  // actually overdue — so this runs again on every popover render.
  const describe = (s: TourStep): string => {
    let body = s.body;
    if (s.bodyFn) {
      try {
        body = s.bodyFn() || s.body;
      } catch {
        body = s.body;
      }
    }
    const linksHtml = (s.links ?? [])
      .map(
        (l) =>
          `<a class="sl-tour-link" href="${escapeHtml(
            l.href.replace('{lang}', getLocale()),
          )}"${l.download ? ' download' : ' target="_blank" rel="noopener"'}>${escapeHtml(
            t(l.label),
          )}</a>`,
      )
      .join('');
    const prefillHtml = s.prefill?.length
      ? `<button type="button" class="sl-tour-link sl-tour-prefill">${escapeHtml(
          t('Déposer les fichiers pour moi'),
        )}</button>`
      : '';
    // Say plainly what the links do: they save a file to the computer. Named
    // by COLOR (the amber buttons) so the teal prefill button below — which
    // uploads into the app instead — is explicitly not covered.
    const dlCount = (s.links ?? []).filter((l) => l.download).length;
    const hint = dlCount
      ? `<div class="sl-tour-hint">${escapeHtml(
          t(
            dlCount > 1
              ? 'Les boutons ambre téléchargent les fichiers sur votre ordinateur.'
              : 'Le bouton ambre télécharge le fichier sur votre ordinateur.',
          ),
        )}</div>`
      : '';
    return (
      escapeHtml(substituteExamples(t(body))).replace(/\n/g, '<br/>') +
      (linksHtml ? `<div class="sl-tour-links">${linksHtml}</div>${hint}` : '') +
      (prefillHtml ? `<div class="sl-tour-links">${prefillHtml}</div>` : '')
    );
  };

  const d = driver({
    showProgress: true,
    // No darkened backdrop: the highlight is a colored CONTOUR around the
    // target (see .driver-active-element in globals.css) plus the animated
    // cursor. The overlay stays — fully transparent — so clicks outside the
    // highlighted area are still blocked while scrolling remains possible.
    overlayOpacity: 0,
    stagePadding: 6,
    stageRadius: 10,
    // Glide between highlighted sections instead of teleporting — the user
    // sees WHERE on the page the next step lives. The glide is the SCROLL
    // only: driver's own popover flight (animate) is off, because tweening
    // the popover while the page smooth-scrolls sends it on a wandering
    // path ("it doesn't know where it's headed") — the popover now snaps to
    // its destination and pops in there (see .sl-tour pop-in in globals.css).
    animate: false,
    smoothScroll: true,
    popoverClass: 'sl-tour',
    // NEVER destroy on overlay clicks: the cutout can lag an animating
    // dialog/sheet, so a click on the "highlighted" element may land on the
    // painted overlay (this killed the tour at the PDF-preview step).
    // Realign instead — quitting stays available via the popover ✕ / Esc.
    overlayClickBehavior: (() => {
      log('overlay click — realigning, not closing');
      try {
        d.refresh();
      } catch { /* torn down */ }
    }) as unknown as 'close',
    nextBtnText: t('Suivant'),
    prevBtnText: t('Précédent'),
    doneBtnText: t('Terminer'),
    progressText: '{{current}} / {{total}}',
    onDestroyStarted: () => {
      const at = d.getActiveIndex() ?? 0;
      const ptrAge = lastPointerDown ? Date.now() - lastPointerDown.t : Infinity;
      const escAge = lastEscape ? Date.now() - lastEscape : Infinity;
      log('destroy-hook', tut.key, 'at', at, 'ptr-age', ptrAge, 'esc-age', escAge);
      // A quit must come from actual input (popover ✕ click or Escape).
      // Destroy requests arriving with NO recent pointer/keyboard activity
      // are spurious (event-machinery glitches around portal dialogs) and
      // must not kill the guided journey.
      if (!forcedDestroy && ptrAge > 1200 && escAge > 1200) {
        log('declined spurious destroy (no recent input)');
        try {
          d.refresh();
        } catch { /* torn down */ }
        return;
      }
      // Stale-cutout guard: if the "overlay click" that triggered this was
      // actually INSIDE the highlighted element's current rect (the cutout
      // just hadn't caught up with a dialog/sheet animation), don't kill
      // the tour — realign and carry on.
      const s: TourStep | undefined = steps[at];
      if (
        !forcedDestroy &&
        s?.anchor &&
        lastPointerDown &&
        Date.now() - lastPointerDown.t < 500
      ) {
        const els = Array.from(
          document.querySelectorAll<HTMLElement>(`[data-tour="${s.anchor}"]`),
        );
        const el = els.find((e) => e.getClientRects().length > 0);
        const r = el?.getBoundingClientRect();
        if (
          r &&
          lastPointerDown.x >= r.left &&
          lastPointerDown.x <= r.right &&
          lastPointerDown.y >= r.top &&
          lastPointerDown.y <= r.bottom
        ) {
          log('declined overlay-close — click was inside the anchor');
          try {
            d.refresh();
          } catch { /* torn down */ }
          return;
        }
      }
      // Interrupted mid-way (overlay click, Escape, navigation) → remember
      // the step so the next open resumes there. On the closing step →
      // start fresh next time. Must call destroy() ourselves: providing
      // this hook makes driver.js wait for it.
      if (at >= steps.length - 1) {
        completed = true;
        writeResumeIndex(tut.key, null);
      } else writeResumeIndex(tut.key, at, steps[at]?.title);
      d.destroy();
    },
    onHighlightStarted: () => {
      log('highlight-start', tut.key, d.getActiveIndex());
      cleanupInteract();
    },
    onDestroyed: () => {
      log('destroyed', tut.key, 'at', d.getActiveIndex(), 'completed', completed);
      cleanupInteract();
      cursorEl?.remove();
      cursorEl = null;
      window.removeEventListener('scroll', onAnyScroll, true);
      window.removeEventListener('wheel', onWheel, true);
      document.removeEventListener('pointerdown', trackPointer, true);
      document.removeEventListener('keyup', trackKeys, true);
      document.removeEventListener('click', onPrefillClick, true);
      if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
      if (refreshIv) window.clearInterval(refreshIv);
      if (active === d) active = null;
      notifyTourListeners();
      if (completed) opts?.onComplete?.();
    },
    onNextClick: () => {
      const at = d.getActiveIndex() ?? 0;
      const s: TourStep | undefined = steps[at];
      // Hands-on steps have NO working Next: the button renders greyed-out
      // (disableButtons) with a hover hint, and this guard also absorbs the
      // keyboard ArrowRight, which driver routes through the same hook. The
      // ONLY ways forward are the real action, the popover's own prefill /
      // download buttons, and the clickable step counter.
      if (s?.interact) return;
      // Advancing may leave UI open (sheet, dialog, selection mode) that
      // would bury the next step's anchor — let the step clean up after
      // itself. Runs BEFORE moveTo so the driver's cleanupInteract
      // (onHighlightStarted) still cancels this step's polling first.
      try {
        s?.onNext?.();
      } catch { /* non-fatal */ }
      const next = at + 1;
      if (next >= steps.length) {
        completed = true;
        writeResumeIndex(tut.key, null);
        d.destroy();
        return;
      }
      prepare(next, () => d.moveTo(next));
    },
    onPrevClick: () => {
      const prev = (d.getActiveIndex() ?? 0) - 1;
      if (prev < 0) return;
      prepare(prev, () => d.moveTo(prev));
    },
    // Clickable step counter: "27 / 35" turns into a number input so the
    // user can jump straight to any step instead of arrowing through.
    onPopoverRender: (
      popover:
        | { progress?: HTMLElement; description?: HTMLElement; nextButton?: HTMLElement }
        | undefined,
    ) => {
      // Steps whose copy depends on live page state recompute it here, so a
      // re-render (refresh heartbeat, resize) never restores stale text.
      const cur: TourStep | undefined = steps[d.getActiveIndex() ?? 0];
      if (cur?.bodyFn && popover?.description) {
        popover.description.innerHTML = describe(cur);
      }
      // Locked Next (hands-on steps): the hover bubble explaining WHY it is
      // greyed out reads its text from this attribute (CSS attr()).
      popover?.nextButton?.setAttribute(
        'data-tip',
        t('Réalisez l’action demandée pour continuer.'),
      );
      const prog = popover?.progress;
      // Journey-wide numbering: page 2 continues at 33, not at 1. Counted
      // from THIS run's entry step — a mid-list entry (hidden sub-flows,
      // round-trip resumes) continues the global count seamlessly.
      const shownIdx = (i: number) => journeyBase + Math.max(0, i - entryIdx) + 1;
      if (prog && !prog.querySelector('input')) {
        prog.textContent = `${shownIdx(d.getActiveIndex() ?? 0)} / ${journeyBase + Math.max(1, steps.length - entryIdx)}`;
      }
      if (!prog || prog.dataset.jumpWired) return;
      prog.dataset.jumpWired = '1';
      prog.style.cursor = 'pointer';
      prog.title = t('Cliquez pour aller directement à une étape');
      prog.addEventListener('click', () => {
        if (active !== d || prog.querySelector('input')) return;
        // Global (journey-wide) numbers; jumps are clamped to the steps
        // this run can reach on THIS page (entry step onwards).
        const current = shownIdx(d.getActiveIndex() ?? 0);
        const restore = prog.textContent;
        prog.textContent = '';
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.min = String(journeyBase + 1);
        inp.max = String(journeyBase + Math.max(1, steps.length - entryIdx));
        inp.value = String(current);
        inp.className = 'sl-tour-jump';
        inp.setAttribute('aria-label', t('Numéro d’étape'));
        let done = false;
        const toLocal = (n: number) => entryIdx + (n - journeyBase - 1);
        const finish = (target: number | null) => {
          if (done) return;
          done = true;
          prog.textContent = restore;
          if (target != null && target !== current && active === d) {
            cleanupInteract();
            prepare(toLocal(target), () => {
              try {
                d.moveTo(toLocal(target));
              } catch { /* torn down */ }
            });
          }
        };
        const clampGlobal = (n: number) =>
          Math.max(
            journeyBase + 1,
            Math.min(journeyBase + Math.max(1, steps.length - entryIdx), n),
          );
        inp.addEventListener('keydown', (e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            e.preventDefault();
            const n = parseInt(inp.value, 10);
            finish(Number.isFinite(n) ? clampGlobal(n) : null);
          } else if (e.key === 'Escape') {
            e.preventDefault();
          }
        });
        // Escape is resolved on KEYUP while the input still owns focus, so
        // driver's own window-level Escape (quit the tour) never sees it.
        inp.addEventListener('keyup', (e) => {
          e.stopPropagation();
          if (e.key === 'Escape') finish(null);
        });
        inp.addEventListener('blur', () => {
          const n = parseInt(inp.value, 10);
          finish(Number.isFinite(n) ? clampGlobal(n) : null);
        });
        prog.appendChild(inp);
        inp.focus();
        inp.select();
      });
    },
    steps: steps.map((s, i) => ({
      element: s.anchor
        ? () => {
            // Some anchors exist twice (e.g. the Devis Garage slot renders
            // in two sections) — prefer a visible match. Steps aiming at ONE
            // instance among repeated anchors (a specific table row) narrow
            // the choice with anchorPick.
            const els = Array.from(
              document.querySelectorAll<HTMLElement>(`[data-tour="${s.anchor}"]`),
            ).filter((el) => el.getClientRects().length > 0 || el === document.body);
            const all = els.length
              ? els
              : Array.from(
                  document.querySelectorAll<HTMLElement>(`[data-tour="${s.anchor}"]`),
                );
            let picked: HTMLElement | undefined;
            if (s.anchorPick) {
              try {
                picked = s.anchorPick(all) ?? undefined;
              } catch { /* fall through */ }
            }
            return (
              picked ??
              all[0] ??
              // Anchor vanished (collapsed layout) — fall back to a modal step.
              document.body
            );
          }
        : undefined,
      onHighlighted: (el?: Element) => {
        clearStickyBars(el as HTMLElement | undefined);
        positionCursor();
        // The popover teleports between steps (animate:false) — replay its
        // little pop-in so each new position announces itself.
        const pop = document.querySelector<HTMLElement>('.driver-popover');
        if (pop) {
          pop.style.animation = 'none';
          void pop.offsetWidth;
          pop.style.animation = '';
        }
        // Continuous resume marker: EVERY highlighted step saves its
        // position, so anything that tears the page down under a running
        // tour (phone-view toggle, hard reload) resumes right here instead
        // of restarting the lab.
        if (i < steps.length - 1) writeResumeIndex(tut.key, i, s.title);
        // Track the furthest step ever reached (by title, path-scoped) so
        // chain returns never send the user backwards.
        try {
          const cur = readScopedTitle(farKey(tut.key));
          const curIdx = cur ? steps.findIndex((st) => st.title === cur) : -1;
          if (i > curIdx) {
            window.localStorage.setItem(
              farKey(tut.key),
              `${s.title}@@${window.location.pathname}`,
            );
          }
        } catch { /* non-fatal */ }
        // Until-steps and reset-watched steps poll predicates — attach them
        // even on a body fallback (their element doesn't matter). Anchorless
        // click-steps need a real element (handled inside beginInteract).
        if (
          el &&
          (s.interact === 'until' ||
            s.resetIf ||
            (s.interact === 'click' && (s.anchor || el !== document.body)))
        )
          beginInteract(i, el as HTMLElement);
        // Eager hand-off: write the pending flags as soon as the step shows,
        // so ANY route to the target page (dossier tab, row click…) resumes
        // the journey — the stale-pending cleanup absorbs abandonment.
        if (s.chain && s.chainEager) writeChainFlags(s, i);
      },
      popover: {
        // Interactive steps keep their Next button VISIBLE but locked
        // (greyed out, hover explains why): the step advances only when the
        // user actually performs the action — the until-predicate or the
        // real click. driver disables the button natively; the CSS override
        // in globals.css restores hover so the explanation bubble shows,
        // and onNextClick's interact guard absorbs keyboard ArrowRight.
        disableButtons: s.interact ? (['next'] as 'next'[]) : undefined,
        // Extra classes let styling/tests target hands-on steps and let CSS
        // scope per-step rules (e.g. keep the table scrollbar usable).
        popoverClass:
          'sl-tour' +
          (s.interact ? ' sl-tour-interact' : '') +
          (s.anchor ? ` sl-step-${s.anchor.replace(/[^a-zA-Z0-9-]/g, '')}` : ''),
        title: escapeHtml(t(s.title)),
        // driver.js renders description as innerHTML; our texts are
        // first-party, escaped inside describe().
        description: describe(s),
        side: s.side,
        align: s.align ?? 'start',
      },
    })),
  });

  active = d;
  activeKey = tut.key;
  notifyTourListeners();
  window.addEventListener('scroll', onAnyScroll, { capture: true, passive: true });
  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
  document.addEventListener('pointerdown', trackPointer, true);
  document.addEventListener('keyup', trackKeys, true);
  document.addEventListener('click', onPrefillClick, true);
  refreshIv = window.setInterval(safeRefresh, 600);
  prepare(resumeAt, () => {
    log('drive', tut.key, 'at', resumeAt, 'active===d', active === d);
    d.drive(resumeAt);
    // Driving straight into a hands-on step (resume, chainAt re-entry):
    // make sure its interact listener is attached even if the step-level
    // onHighlighted hook didn't fire for the initial highlight. Fast first
    // attempt (users can click quickly after a resume) + a late retry.
    const s = steps[resumeAt];
    if (s?.interact || s?.resetIf) {
      const ensureAttached = () => {
        if (active !== d || interactCleanup) return;
        const el = s.anchor
          ? Array.from(
              document.querySelectorAll<HTMLElement>(`[data-tour="${s.anchor}"]`),
            ).find((e) => e.getClientRects().length > 0)
          : document.body;
        if (el) beginInteract(resumeAt, el);
      };
      ensureAttached();
      window.setTimeout(ensureAttached, 250);
      window.setTimeout(ensureAttached, 900);
    }
  });
}

/**
 * Discovery spotlight: dims the screen (same driver.js overlay as the
 * tutorials) and points at the single "?" button — the entry to the
 * comprehensive hands-on lab.
 */
/**
 * Keep a popover fully inside the window. driver.js places it from the
 * anchor's rect and only flips sides for overflows it knows about — a button
 * parked in a corner (which the launcher now can be, anywhere the user drags
 * it) still ended up with the bubble hanging off the edge, hiding its
 * buttons. Written on the inline style, which is exactly where driver.js
 * writes its own coordinates, so its next reposition overwrites us cleanly.
 */
function clampPopoverIntoView(): void {
  const pop = document.querySelector<HTMLElement>('.driver-popover');
  if (!pop) return;
  const M = 8; // breathing room from the window edge
  const r = pop.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return;
  const x = Math.min(Math.max(r.left, M), Math.max(M, window.innerWidth - r.width - M));
  const y = Math.min(Math.max(r.top, M), Math.max(M, window.innerHeight - r.height - M));
  const dx = x - r.left;
  const dy = y - r.top;
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
  pop.style.left = `${parseFloat(pop.style.left || '0') + dx}px`;
  pop.style.top = `${parseFloat(pop.style.top || '0') + dy}px`;
  // Moved far enough that the arrow would point at empty space: hide it
  // rather than leave a stray tick floating beside the box.
  const arrow = pop.querySelector<HTMLElement>('.driver-popover-arrow');
  if (arrow) arrow.style.visibility = Math.abs(dx) > 12 || Math.abs(dy) > 12 ? 'hidden' : '';
}

/**
 * Popover side/alignment that opens AWAY from the nearest screen edges — the
 * launcher is draggable, so its bubble has to work in any corner.
 */
function placeAround(el: HTMLElement | null): {
  side: 'top' | 'bottom' | 'left' | 'right';
  align: 'start' | 'center' | 'end';
} {
  const r = el?.getBoundingClientRect();
  if (!r || (r.width === 0 && r.height === 0)) return { side: 'top', align: 'end' };
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  // Open into the taller free half vertically.
  const side = cy > window.innerHeight - cy ? 'top' : 'bottom';
  // Horizontally, anchor the bubble on the button's own side of the screen so
  // it grows inwards: a button near the right edge gets an 'end'-aligned box.
  const third = window.innerWidth / 3;
  const align = cx < third ? 'start' : cx > window.innerWidth - third ? 'end' : 'center';
  return { side, align };
}

export function pointToLauncher(
  onClosed?: () => void,
  /**
   * Turn the tutorial off for good. THIS popover is the one users meet most
   * often — it greets them on every page they open for the first time — so
   * the way out has to be here, not only in the sign-in lightbox they may
   * have dismissed weeks ago.
   */
  onDisable?: () => void,
): void {
  destroyActiveTour();
  const targets: Array<{ sel: string; title: string; body: string }> = [
    {
      sel: '[data-tour="tutorial-launcher"]',
      title: 'La visite guidée est ici.',
      body:
        'Ce bouton lance le laboratoire guidé complet : le menu, puis un dossier suivi de A à Z.\nSi vous quittez en cours de route, il reprend exactement où vous en étiez.',
    },
  ].filter((s) => !!document.querySelector(s.sel));
  if (targets.length === 0) return;
  const d = driver({
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 999,
    popoverClass: 'sl-tour',
    showProgress: targets.length > 1,
    nextBtnText: t('Suivant'),
    prevBtnText: t('Précédent'),
    doneBtnText: t('Terminer'),
    progressText: '{{current}} / {{total}}',
    steps: targets.map((s) => ({
      element: s.sel,
      popover: {
        // The launcher used to be pinned to the bottom-right corner. The user
        // can now park it anywhere, so the bubble's side and alignment are
        // derived from where the button actually is — fixed values pushed it
        // off-screen for every other corner.
        ...placeAround(document.querySelector<HTMLElement>(s.sel)),
        title: escapeHtml(t(s.title)),
        description: escapeHtml(t(s.body)),
      },
    })),
    onPopoverRender: (popover: { description?: HTMLElement } | undefined) => {
      const desc = popover?.description;
      if (!desc || !onDisable || desc.querySelector('.sl-tour-off')) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sl-tour-off';
      btn.textContent = t('Ne plus afficher le tutoriel');
      // Capture phase + stopPropagation: driver.js listens for clicks on the
      // popover to advance, and would eat this one.
      btn.addEventListener(
        'click',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
          onDisable();
        },
        true,
      );
      desc.appendChild(btn);
    },
    onDestroyed: () => {
      if (active === d) active = null;
      window.clearInterval(guardIv);
      window.removeEventListener('resize', onResize);
      onClosed?.();
    },
  });
  active = d;
  activeKey = null;
  d.drive(0);
  // Belt and braces: re-clamp after the pop-in settles, on resize, and on a
  // slow poll (mobile URL bars and on-screen keyboards resize the viewport
  // without firing anything else useful).
  const onResize = () => {
    if (active !== d) return;
    try {
      d.refresh();
    } catch { /* torn down */ }
    clampPopoverIntoView();
  };
  const guardIv = window.setInterval(() => {
    if (active !== d) {
      window.clearInterval(guardIv);
      return;
    }
    clampPopoverIntoView();
  }, 500);
  window.addEventListener('resize', onResize);
  window.requestAnimationFrame(clampPopoverIntoView);
  window.setTimeout(clampPopoverIntoView, 220);
}
