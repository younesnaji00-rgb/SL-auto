'use client';

import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { t } from '@/i18n';
import type { PageTutorial, TourStep } from './types';

let active: Driver | null = null;

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
export function startTutorial(tut: PageTutorial): void {
  destroyActiveTour();

  const steps = tut.steps.filter(
    (s) =>
      !s.anchor ||
      s.dynamic ||
      !!s.click ||
      !!document.querySelector(`[data-tour="${s.anchor}"]`),
  );
  if (steps.length === 0) return;

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
    onDestroyed: () => {
      if (active === d) active = null;
    },
    onNextClick: () => {
      const next = (d.getActiveIndex() ?? 0) + 1;
      if (next >= steps.length) {
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
    steps: steps.map((s) => ({
      element: s.anchor
        ? () =>
            (document.querySelector(`[data-tour="${s.anchor}"]`) as Element | null) ??
            // Anchor vanished (collapsed layout) — fall back to a modal step.
            document.body
        : undefined,
      popover: {
        title: escapeHtml(t(s.title)),
        // driver.js renders description as innerHTML; our texts are
        // first-party, escape then reintroduce intentional line breaks.
        description: escapeHtml(t(s.body)).replace(/\n/g, '<br/>'),
        side: s.side,
        align: s.align ?? 'start',
      },
    })),
  });

  active = d;
  prepare(0, () => d.drive(0));
}
