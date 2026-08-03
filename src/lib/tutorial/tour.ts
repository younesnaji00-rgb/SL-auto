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
    if (index == null) window.localStorage.removeItem(posKey(key));
    else window.localStorage.setItem(posKey(key), String(index));
  } catch {
    // Non-fatal.
  }
}

/** Kill any running tour (call on route change/unmount to avoid stranded overlays). */
export function destroyActiveTour(): void {
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
  opts?: { onComplete?: () => void },
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
  const resumeAt = readResumeIndex(tut.key, steps.length);
  let completed = false;

  // Run a step's `click` preparation (open tab/menu) BEFORE driver resolves
  // the anchor, then continue.
  const prepare = (index: number, done: () => void) => {
    const s: TourStep | undefined = steps[index];
    if (s?.click) {
      const el = document.querySelector<HTMLElement>(`[data-tour="${s.click}"]`);
      if (el) {
        el.click();
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
    prepare(next, () => d.moveTo(next));
  };
  const beginInteract = (i: number, el: HTMLElement) => {
    cleanupInteract();
    const s = steps[i];
    if (s.interact === 'click') {
      const h = () => {
        // Chain hand-off: the click is about to navigate — the pending flag
        // must be written BEFORE the destination page's launcher reads it.
        if (s.chain) {
          try {
            window.localStorage.setItem(`${BRAND.storagePrefix}.tour.pending`, s.chain);
          } catch { /* non-fatal */ }
        }
        window.setTimeout(() => advanceFrom(i), 500);
      };
      el.addEventListener('click', h, { capture: true, once: true });
      interactCleanup = () => el.removeEventListener('click', h, true);
    } else if (s.interact === 'until' && s.until) {
      const iv = window.setInterval(() => {
        try {
          if (s.until!()) advanceFrom(i);
        } catch { /* keep polling */ }
      }, 450);
      interactCleanup = () => window.clearInterval(iv);
    }
  };

  const d = driver({
    showProgress: true,
    overlayOpacity: 0.55,
    stagePadding: 6,
    stageRadius: 10,
    popoverClass: 'sl-tour',
    nextBtnText: t('Suivant'),
    prevBtnText: t('Précédent'),
    doneBtnText: t('Terminer'),
    progressText: '{{current}} / {{total}}',
    onDestroyStarted: () => {
      // Interrupted mid-way (overlay click, Escape, navigation) → remember
      // the step so the next open resumes there. On the closing step →
      // start fresh next time. Must call destroy() ourselves: providing
      // this hook makes driver.js wait for it.
      const at = d.getActiveIndex() ?? 0;
      if (at >= steps.length - 1) {
        completed = true;
        writeResumeIndex(tut.key, null);
      } else writeResumeIndex(tut.key, at);
      d.destroy();
    },
    onHighlightStarted: () => cleanupInteract(),
    onDestroyed: () => {
      cleanupInteract();
      if (active === d) active = null;
      if (completed) opts?.onComplete?.();
    },
    onNextClick: () => {
      const next = (d.getActiveIndex() ?? 0) + 1;
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
        if (s.interact && el && el !== document.body) beginInteract(i, el as HTMLElement);
      },
      popover: {
        ...(s.interact ? { showButtons: ['close', 'previous'] as any } : {}),
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
  prepare(resumeAt, () => d.drive(resumeAt));
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
