'use client';

/**
 * Hands-on lab mode ("Démarrer la démo") — after a page's coachmark tour,
 * an animated cursor guides the user element by element. Steps with
 * action 'click' require a REAL click on the highlighted element to
 * advance; 'observe' steps show a Continue button.
 *
 * Pages define a curated `lab` in their PageTutorial; pages without one
 * fall back to replaying their anchored tour steps as observe steps.
 */

import { t } from '@/i18n';
import { BRAND } from '@/lib/brand';
import type { PageTutorial, TourStep } from './types';

export interface LabStep {
  /** data-tour anchor of the element to point at. */
  anchor: string;
  title?: string;
  body: string;
  /** 'click' = user must click the element; 'observe' = Continue button. */
  action?: 'click' | 'observe';
  /** data-tour of an element to click first (open a tab/panel). */
  click?: string;
  delay?: number;
}

let activeCleanup: (() => void) | null = null;

export function destroyActiveLab(): void {
  activeCleanup?.();
  activeCleanup = null;
}

export function labStepsFor(tut: PageTutorial): LabStep[] {
  if (tut.lab && tut.lab.length > 0) return tut.lab;
  return tut.steps
    .filter((s: TourStep) => !!s.anchor)
    .map((s: TourStep) => ({
      anchor: s.anchor as string,
      title: s.title,
      body: s.body,
      action: 'observe' as const,
      click: s.click,
      delay: s.delay,
    }));
}

const CURSOR_SVG =
  '<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M5 3l14 8-6.5 1.5L9 19 5 3z" fill="#0f766e" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';

export function startLab(tut: PageTutorial): void {
  destroyActiveLab();
  const steps = labStepsFor(tut).filter(
    (s) => s.click || document.querySelector(`[data-tour="${s.anchor}"]`),
  );
  if (steps.length === 0) return;

  const root = document.createElement('div');
  root.className = 'sl-lab';
  root.innerHTML = `
    <div class="sl-lab-cursor">${CURSOR_SVG}</div>
    <div class="sl-lab-card" role="dialog" aria-live="polite">
      <div class="sl-lab-progress"></div>
      <div class="sl-lab-title"></div>
      <div class="sl-lab-body"></div>
      <div class="sl-lab-hint"></div>
      <div class="sl-lab-actions">
        <button type="button" class="sl-lab-quit"></button>
        <button type="button" class="sl-lab-next"></button>
      </div>
    </div>`;
  document.body.appendChild(root);

  const cursor = root.querySelector<HTMLElement>('.sl-lab-cursor')!;
  const card = root.querySelector<HTMLElement>('.sl-lab-card')!;
  const elProgress = root.querySelector<HTMLElement>('.sl-lab-progress')!;
  const elTitle = root.querySelector<HTMLElement>('.sl-lab-title')!;
  const elBody = root.querySelector<HTMLElement>('.sl-lab-body')!;
  const elHint = root.querySelector<HTMLElement>('.sl-lab-hint')!;
  const btnQuit = root.querySelector<HTMLButtonElement>('.sl-lab-quit')!;
  const btnNext = root.querySelector<HTMLButtonElement>('.sl-lab-next')!;
  btnQuit.textContent = t('Quitter la démo');
  btnNext.textContent = t('Continuer');

  let index = 0;
  let target: HTMLElement | null = null;
  let clickListener: ((e: Event) => void) | null = null;

  const detach = () => {
    if (target) {
      target.classList.remove('sl-lab-target');
      if (clickListener) target.removeEventListener('click', clickListener, true);
    }
    target = null;
    clickListener = null;
  };

  const position = () => {
    if (!target) return;
    const r = target.getBoundingClientRect();
    // Cursor tip at the element's lower-right corner.
    cursor.style.transform = `translate(${Math.min(r.right - 10, window.innerWidth - 40)}px, ${Math.min(
      r.bottom - 6,
      window.innerHeight - 40,
    )}px)`;
    // Card below (or above when near the bottom), clamped into the viewport.
    const cw = card.offsetWidth || 340;
    const ch = card.offsetHeight || 160;
    let top = r.bottom + 14;
    if (top + ch > window.innerHeight - 12) top = Math.max(12, r.top - ch - 14);
    let left = Math.min(Math.max(12, r.left), window.innerWidth - cw - 12);
    card.style.transform = `translate(${left}px, ${top}px)`;
  };

  const finish = (completed: boolean) => {
    destroyActiveLab();
    if (completed) {
      try {
        window.localStorage.setItem(`${BRAND.storagePrefix}.lab.${tut.key}`, '1');
      } catch { /* non-fatal */ }
    }
  };

  const show = (i: number) => {
    index = i;
    detach();
    const step = steps[i];
    const proceed = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`);
      if (!el) {
        // Anchor vanished (collapsed layout / role gate) — skip forward.
        if (i + 1 < steps.length) show(i + 1);
        else finish(true);
        return;
      }
      target = el;
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.classList.add('sl-lab-target');
      elProgress.textContent = `${i + 1} / ${steps.length}`;
      elTitle.textContent = step.title ? t(step.title) : '';
      elBody.textContent = t(step.body);
      const isClick = step.action === 'click';
      elHint.textContent = isClick ? t("Cliquez sur l'élément encadré pour continuer.") : '';
      btnNext.style.display = isClick ? 'none' : '';
      if (isClick) {
        clickListener = () => {
          // Let the app react to the click, then advance.
          window.setTimeout(() => {
            if (i + 1 < steps.length) show(i + 1);
            else finish(true);
          }, 450);
        };
        el.addEventListener('click', clickListener, true);
      }
      // Give smooth-scroll a moment before measuring.
      window.setTimeout(position, 320);
    };
    if (step.click) {
      const trigger = document.querySelector<HTMLElement>(`[data-tour="${step.click}"]`);
      trigger?.click();
      window.setTimeout(proceed, step.delay ?? 350);
    } else {
      proceed();
    }
  };

  btnNext.onclick = () => {
    if (index + 1 < steps.length) show(index + 1);
    else finish(true);
  };
  btnQuit.onclick = () => finish(false);
  const onMove = () => position();
  window.addEventListener('scroll', onMove, true);
  window.addEventListener('resize', onMove);

  activeCleanup = () => {
    detach();
    window.removeEventListener('scroll', onMove, true);
    window.removeEventListener('resize', onMove);
    root.remove();
  };

  show(0);
}
