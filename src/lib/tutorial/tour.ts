'use client';

import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { t, getLocale } from '@/i18n';
import { BRAND } from '@/lib/brand';
import type { PageTutorial, TourStep } from './types';

let active: Driver | null = null;

/**
 * Shared closing step appended to EVERY page tour: the product's strong
 * points, the customization pitch, and the pointer to per-page tutorials.
 * The "start the demo" (hands-on lab) button is injected on this step.
 */
const CLOSING_STEP: TourStep = {
  title: 'C’est tout pour cette page !',
  body:
    "L'IA lit les documents pour vous, les délais se suivent tout seuls — et tout peut être adapté à votre cabinet.\nChaque page a son guide : bouton « ? » en bas à droite.",
};

const posKey = (key: string) => `${BRAND.storagePrefix}.tour.${key}.pos`;
// Title-based resume marker for round-trip hops: numeric indexes shift when
// already-completed steps are filtered out on the return visit, titles don't.
const posTitleKey = (key: string) => `${BRAND.storagePrefix}.tour.${key}.posTitle`;

function readResumeIndex(key: string, max: number): number {
  try {
    const raw = window.localStorage.getItem(posKey(key));
    const n = raw == null ? 0 : parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 && n < max ? n : 0;
  } catch {
    return 0;
  }
}

function writeResumeIndex(key: string, index: number | null): void {
  try {
    if (index == null) {
      window.localStorage.removeItem(posKey(key));
      window.localStorage.removeItem(posTitleKey(key));
    } else window.localStorage.setItem(posKey(key), String(index));
  } catch {
    // Non-fatal.
  }
}

/** Kill any running tour (call on route change/unmount to avoid stranded overlays). */
export function destroyActiveTour(): void {
  if (active) {
    // eslint-disable-next-line no-console
    console.debug(
      '[tour] destroyActiveTour from',
      new Error().stack?.split('\n').slice(2, 5).join(' | ').slice(0, 180),
    );
  }
  try {
    active?.destroy();
  } catch {
    // Already destroyed.
  }
  active = null;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Start a page tutorial. Steps whose anchor is missing from the DOM are
 * skipped (unless dynamic/click reveals them) — this is how one step list
 * serves desktop and mobile layouts.
 */
export function startTutorial(
  tut: PageTutorial,
  opts?: { onComplete?: () => void; fresh?: boolean },
): void {
  destroyActiveTour();

  const steps = tut.steps.filter((s) => {
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
      !!document.querySelector(`[data-tour="${s.anchor}"]`)
    );
  });
  if (steps.length === 0) return;
  // Every tour ends on the shared strong-points/customization step —
  // except chaining tours (sidebar intro), which end on a hand-off click.
  if (!tut.noClosing) steps.push(CLOSING_STEP);
  // eslint-disable-next-line no-console
  console.debug('[tour] start', tut.key, 'steps', steps.length);
  // Manual starts (the "?" buttons) always begin at the very first step —
  // resume markers only serve interrupted runs and chained hops.
  let resumeAt = opts?.fresh ? 0 : readResumeIndex(tut.key, steps.length);
  if (opts?.fresh) writeResumeIndex(tut.key, null);
  else {
    try {
      const savedTitle = window.localStorage.getItem(posTitleKey(tut.key));
      if (savedTitle) {
        window.localStorage.removeItem(posTitleKey(tut.key));
        const idx = steps.findIndex((s) => s.title === savedTitle);
        if (idx >= 0) resumeAt = idx;
        // eslint-disable-next-line no-console
        console.debug('[tour] resume-title', tut.key, savedTitle, '->', idx);
      }
    } catch { /* non-fatal */ }
  }
  let completed = false;

  // Run a step's `click` preparation (open tab/menu) BEFORE driver resolves
  // the anchor, then continue.
  const prepare = (index: number, done: () => void) => {
    const s: TourStep | undefined = steps[index];
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
    // eslint-disable-next-line no-console
    console.debug('[tour] advance', tut.key, i, '->', next);
    prepare(next, () => {
      try {
        d.moveTo(next);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug('[tour] moveTo threw', e);
      }
      // Self-heal: a step change racing a dialog unmount can leave driver
      // with no popover (transition math on a detached node). Re-drive the
      // target step once if nothing is showing.
      window.setTimeout(() => {
        if (active !== d) return;
        if (!document.querySelector('.driver-popover')) {
          // eslint-disable-next-line no-console
          console.debug('[tour] popover missing after advance — re-driving', next);
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
      // Optional: enter the target tour at a specific step.
      if (s.chainAt) window.localStorage.setItem(posTitleKey(s.chain), s.chainAt);
      // eslint-disable-next-line no-console
      console.debug('[tour] chain->', s.chain, 'written');
    } catch { /* non-fatal */ }
    // Round-trip hop: chaining back into THIS tour later resumes at
    // the step after the hop (stored by TITLE — indexes shift when
    // completed steps are filtered out on the return visit).
    if (s.chainResume && steps[i + 1]) {
      try {
        window.localStorage.setItem(posTitleKey(tut.key), steps[i + 1].title);
      } catch { /* non-fatal */ }
    }
  };
  const beginInteract = (i: number, el: HTMLElement) => {
    cleanupInteract();
    const s = steps[i];
    // eslint-disable-next-line no-console
    console.debug('[tour] interact-attach', tut.key, i, s.anchor ?? '(modal)', s.interact);
    if (s.interact === 'click') {
      const h = (ev: Event) => {
        // Re-query the anchor at CLICK time: React may have replaced the
        // highlighted node since the step rendered (live lists re-render on
        // snapshots), which would orphan an element-attached listener.
        const target = ev.target as Node | null;
        if (s.anchor) {
          const anchorEl = document.querySelector(`[data-tour="${s.anchor}"]`);
          if (!anchorEl || !target || !anchorEl.contains(target)) return;
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
      interactCleanup = () => document.removeEventListener('click', h, true);
    } else if (s.interact === 'until' && s.until) {
      let polls = 0;
      const iv = window.setInterval(() => {
        try {
          const ok = s.until!();
          polls += 1;
          if (polls % 8 === 0) {
            // eslint-disable-next-line no-console
            console.debug('[tour] until-poll', tut.key, i, 'result', ok);
          }
          if (ok) advanceFrom(i);
        } catch { /* keep polling */ }
      }, 450);
      interactCleanup = () => {
        // eslint-disable-next-line no-console
        console.debug('[tour] until-cleanup', tut.key, i, 'after', polls, 'polls');
        window.clearInterval(iv);
      };
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
  const safeRefresh = () => {
    try {
      if (active !== d) return;
      if (!document.querySelector('.driver-active-element')) return;
      d.refresh();
    } catch { /* torn down */ }
  };
  let scrollRaf = 0;
  const onAnyScroll = () => {
    if (scrollRaf) return;
    scrollRaf = window.requestAnimationFrame(() => {
      scrollRaf = 0;
      safeRefresh();
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

  const d = driver({
    showProgress: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 10,
    popoverClass: 'sl-tour',
    // NEVER destroy on overlay clicks: the cutout can lag an animating
    // dialog/sheet, so a click on the "highlighted" element may land on the
    // painted overlay (this killed the tour at the PDF-preview step).
    // Realign instead — quitting stays available via the popover ✕ / Esc.
    overlayClickBehavior: (() => {
      // eslint-disable-next-line no-console
      console.debug('[tour] overlay click — realigning, not closing');
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
      // eslint-disable-next-line no-console
      console.debug('[tour] destroy-hook', tut.key, 'at', at, 'ptr-age', ptrAge, 'esc-age', escAge);
      // A quit must come from actual input (popover ✕ click or Escape).
      // Destroy requests arriving with NO recent pointer/keyboard activity
      // are spurious (event-machinery glitches around portal dialogs) and
      // must not kill the guided journey.
      if (ptrAge > 1200 && escAge > 1200) {
        // eslint-disable-next-line no-console
        console.debug('[tour] declined spurious destroy (no recent input)');
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
          // eslint-disable-next-line no-console
          console.debug('[tour] declined overlay-close — click was inside the anchor');
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
      } else writeResumeIndex(tut.key, at);
      d.destroy();
    },
    onHighlightStarted: () => {
      // eslint-disable-next-line no-console
      console.debug('[tour] highlight-start', tut.key, d.getActiveIndex());
      cleanupInteract();
    },
    onDestroyed: () => {
      // eslint-disable-next-line no-console
      console.debug('[tour] destroyed', tut.key, 'at', d.getActiveIndex(), 'completed', completed);
      cleanupInteract();
      window.removeEventListener('scroll', onAnyScroll, true);
      document.removeEventListener('pointerdown', trackPointer, true);
      document.removeEventListener('keyup', trackKeys, true);
      if (scrollRaf) window.cancelAnimationFrame(scrollRaf);
      if (refreshIv) window.clearInterval(refreshIv);
      if (active === d) active = null;
      if (completed) opts?.onComplete?.();
    },
    onNextClick: () => {
      const at = d.getActiveIndex() ?? 0;
      const s: TourStep | undefined = steps[at];
      // Skipping the hands-on action may leave UI open (sheet, dialog,
      // selection mode) that would bury the next step's anchor — let the
      // step clean up after itself. Runs BEFORE moveTo so the driver's
      // cleanupInteract (onHighlightStarted) still cancels this step's
      // until-interval before the closing mutation can double-advance.
      try {
        s?.onNext?.();
      } catch { /* non-fatal */ }
      // Click steps: "Next" means "do it for me" — perform the real click.
      // The synthetic click flows through the document-capture interact
      // listener, which advances the tour and (for chain steps) writes the
      // pending hand-off flags. Skipping instead would strand the guide:
      // chains would die on "Done", sub-flows would lose their anchors.
      // A disabled target (nothing selected yet, incomplete form) would
      // dispatch nothing and wedge the tour — fall through to a plain
      // advance instead.
      if (s?.interact === 'click' && s.anchor) {
        const els = Array.from(
          document.querySelectorAll<HTMLElement>(`[data-tour="${s.anchor}"]`),
        );
        const el = els.find((e) => e.getClientRects().length > 0) ?? els[0];
        // Container anchors (the dossiers table on the re-entry step)
        // need the actionable child — the first row — not the wrapper.
        const target = el ? (el.querySelector<HTMLElement>('tbody tr') ?? el) : null;
        if (target && !target.matches(':disabled, [aria-disabled="true"], [data-disabled]')) {
          // Write the hand-off flags OURSELVES — the capture listener would
          // too, but it may not be attached when a resume drove straight
          // into this step, and the click is about to navigate away. No
          // advance scheduled here: chain clicks navigate (route change
          // tears the tour down) and the listener advances the rest.
          writeChainFlags(s, at);
          target.click();
          return;
        }
      }
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
    steps: steps.map((s, i) => ({
      element: s.anchor
        ? () => {
            // Some anchors exist twice (e.g. the Devis Garage slot renders
            // in two sections) — prefer a visible match.
            const els = Array.from(
              document.querySelectorAll<HTMLElement>(`[data-tour="${s.anchor}"]`),
            );
            return (
              els.find((el) => el.getClientRects().length > 0) ??
              els[0] ??
              // Anchor vanished (collapsed layout) — fall back to a modal step.
              document.body
            );
          }
        : undefined,
      onHighlighted: (el?: Element) => {
        clearStickyBars(el as HTMLElement | undefined);
        // Until-steps poll a predicate — attach them even on a body
        // fallback (their element doesn't matter). Click-steps need a real
        // anchor: containment against body would match any click.
        if (s.interact && el && (s.interact === 'until' || el !== document.body))
          beginInteract(i, el as HTMLElement);
        // Eager hand-off: write the pending flags as soon as the step shows,
        // so ANY route to the target page (dossier tab, row click…) resumes
        // the journey — the stale-pending cleanup absorbs abandonment.
        if (s.chain && s.chainEager) writeChainFlags(s, i);
      },
      popover: {
        // Interactive steps keep their Next button too — the copy invites
        // the real action, but nobody is ever forced to complete it.
        // Extra classes let styling/tests target hands-on steps and let CSS
        // scope per-step rules (e.g. keep the table scrollbar usable).
        popoverClass:
          'sl-tour' +
          (s.interact ? ' sl-tour-interact' : '') +
          (s.anchor ? ` sl-step-${s.anchor.replace(/[^a-zA-Z0-9-]/g, '')}` : ''),
        title: escapeHtml(t(s.title)),
        // driver.js renders description as innerHTML; our texts are
        // first-party, escape then reintroduce intentional line breaks.
        description:
          escapeHtml(t(s.body)).replace(/\n/g, '<br/>') +
          (s.links?.length
            ? `<div class="sl-tour-links">${s.links
                .map(
                  (l) =>
                    `<a class="sl-tour-link" href="${escapeHtml(
                      l.href.replace('{lang}', getLocale()),
                    )}"${l.download ? ' download' : ' target="_blank" rel="noopener"'}>${escapeHtml(
                      t(l.label),
                    )}</a>`,
                )
                .join('')}</div>`
            : ''),
        side: s.side,
        align: s.align ?? 'start',
      },
    })),
  });

  active = d;
  window.addEventListener('scroll', onAnyScroll, { capture: true, passive: true });
  document.addEventListener('pointerdown', trackPointer, true);
  document.addEventListener('keyup', trackKeys, true);
  refreshIv = window.setInterval(safeRefresh, 600);
  prepare(resumeAt, () => {
    // eslint-disable-next-line no-console
    console.debug('[tour] drive', tut.key, 'at', resumeAt, 'active===d', active === d);
    d.drive(resumeAt);
    // Driving straight into a hands-on step (resume, chainAt re-entry):
    // make sure its interact listener is attached even if the step-level
    // onHighlighted hook didn't fire for the initial highlight. Fast first
    // attempt (users can click quickly after a resume) + a late retry.
    const s = steps[resumeAt];
    if (s?.interact) {
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
 * tutorials) and walks the help entry points — the sidebar "?" (app-wide
 * guided tour) then the bottom-right "?" (this page's tutorial).
 */
export function pointToLauncher(onClosed?: () => void): void {
  destroyActiveTour();
  const targets: Array<{ sel: string; title: string; body: string }> = [
    {
      sel: '[data-tour="sidebar-help"]',
      title: 'La visite guidée de l’application est ici.',
      body: 'Ce bouton relance la présentation générale (menu et parcours d’un dossier) à tout moment.',
    },
    {
      sel: '[data-tour="tutorial-launcher"]',
      title: 'Le guide de chaque page est ici.',
      body: 'Ce bouton lance le guide interactif de la page où vous êtes.',
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
        title: escapeHtml(t(s.title)),
        description: escapeHtml(t(s.body)),
      },
    })),
    onDestroyed: () => {
      if (active === d) active = null;
      onClosed?.();
    },
  });
  active = d;
  d.drive(0);
}
