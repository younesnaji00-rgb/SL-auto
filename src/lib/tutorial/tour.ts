'use client';

import { driver, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { t } from '@/i18n';
import { BRAND } from '@/lib/brand';
import { startLab, destroyActiveLab } from './lab';
import type { PageTutorial, TourStep } from './types';

let active: Driver | null = null;

/**
 * Shared closing step appended to EVERY page tour: the product's strong
 * points, the customization pitch, and the pointer to per-page tutorials.
 * The "start the demo" (hands-on lab) button is injected on this step.
 */
const CLOSING_STEP: TourStep = {
  title: 'Prêt à passer à la pratique ?',
  body:
    "Ce que vous venez de voir élimine les tâches répétitives : plus de ressaisie des documents de mission, des devis garage ni des plaques — l'IA les lit pour vous ; les délais, relances et statuts se suivent tout seuls ; et les responsables voient chaque étape de chaque dossier en temps réel.\nEn tant que client, chaque étape peut être personnalisée et adaptée à vos processus.\nChaque page a son propre tutoriel — bouton « ? » en bas à droite.",
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
export function startTutorial(tut: PageTutorial): void {
  destroyActiveTour();
  destroyActiveLab();

  const steps = tut.steps.filter(
    (s) =>
      !s.anchor ||
      s.dynamic ||
      !!s.click ||
      !!document.querySelector(`[data-tour="${s.anchor}"]`),
  );
  if (steps.length === 0) return;
  // Every tour ends on the shared strong-points/customization step, which
  // also hosts the "start the hands-on demo" button.
  steps.push(CLOSING_STEP);
  const resumeAt = readResumeIndex(tut.key, steps.length);

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
    onPopoverRender: (popover) => {
      // "Start the demo" (hands-on lab) button on the closing step.
      const isLast = (d.getActiveIndex() ?? 0) === steps.length - 1;
      if (!isLast) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sl-tour-lab-btn';
      btn.textContent = t('Démarrer la démo interactive');
      btn.onclick = () => {
        writeResumeIndex(tut.key, null);
        d.destroy();
        startLab(tut);
      };
      popover.footerButtons.prepend(btn);
    },
    onDestroyStarted: () => {
      // Interrupted mid-way (overlay click, Escape, navigation) → remember
      // the step so the next open resumes there. On the closing step →
      // start fresh next time. Must call destroy() ourselves: providing
      // this hook makes driver.js wait for it.
      const at = d.getActiveIndex() ?? 0;
      if (at >= steps.length - 1) writeResumeIndex(tut.key, null);
      else writeResumeIndex(tut.key, at);
      d.destroy();
    },
    onDestroyed: () => {
      if (active === d) active = null;
    },
    onNextClick: () => {
      const next = (d.getActiveIndex() ?? 0) + 1;
      if (next >= steps.length) {
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
  prepare(resumeAt, () => d.drive(resumeAt));
}

/**
 * Spotlight the "?" launcher with the SAME driver.js overlay the tutorials
 * use: the whole screen dims except the button, with a tutorial-style
 * popover beside it. Used for per-page tutorial discovery.
 */
export function pointToLauncher(onClosed?: () => void): void {
  destroyActiveTour();
  if (!document.querySelector('[data-tour="tutorial-launcher"]')) return;
  const d = driver({
    overlayOpacity: 0.55,
    stagePadding: 8,
    stageRadius: 999,
    popoverClass: 'sl-tour',
    showButtons: ['close'],
    steps: [
      {
        element: '[data-tour="tutorial-launcher"]',
        popover: {
          title: escapeHtml(t('Le tutoriel de chaque page est ici, à tout moment.')),
          description: escapeHtml(
            t('Cliquez sur le bouton « ? » en bas à droite pour le lancer.'),
          ),
          side: 'top',
          align: 'end',
        },
      },
    ],
    onDestroyed: () => {
      if (active === d) active = null;
      onClosed?.();
    },
  });
  active = d;
  d.drive(0);
}
