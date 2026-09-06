'use client';

/**
 * ONE STEP PER SCREEN — the phone form of a dossier timeline section (mobile
 * pass 2026-09-06; research docs/research/mobile-record-pages.md E2, binding
 * synthesis §6).
 *
 * The desktop long page + 8-medallion strip fails on 390 px: the strip's
 * titles clip, its hover details never fire on touch, and BUX/OSU measured
 * "more rage clicks … in the higher tab-menu, in mobile views" for exactly
 * this shape. So a step is a screen, addressed by `?etape=N` on the same route
 * (E12: one history entry per screen, so back unwinds one level at a time).
 *
 * Anatomy:
 *   sticky 40 px « Étapes ▾ »   — switch step without going back to the hub
 *   facet tabs (E5)             — fixed, full width, ≤ 3, `?onglet=` mirrored
 *   status line                 — step status + StepStamp, one caption line
 *   the SAME section components the desktop timeline renders, one column
 *   non-sticky 48 px « ‹ Étape 2/8 › » footer (Material text mobile stepper)
 *
 * The primary action is NOT here: it is the page's bottom action bar (E4).
 * Must not (E2 do-not list): scroll-spy, slide transitions between steps
 * (motion spec: fade only), the desktop « Comparer » focus mode.
 */

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { StepStamp, StepStatusChip } from '@/components/dossier-timeline/timeline-bar';
import { StepTabs, type StepTab } from '@/components/dossier-timeline/step-tabs';
import { stepUrl, stepTabsKey } from '@/lib/step-navigation';
import { STEP_COUNT, stepPosition, type StepState } from '@/lib/dossier-steps';
import { StepPickerSheet } from './step-picker-sheet';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

export interface PhoneStepScreenProps {
  dossierId: string;
  steps: StepState[];
  step: StepState;
  /** Facets of this step, or null for a single-surface step (Rapport, Honoraires). */
  tabs: StepTab[] | null;
  /** Content of a single-surface step. */
  content?: React.ReactNode;
  /** Selected facet, mirrored in `?onglet=`. */
  activeTab: string | null;
  onTabChange: (tab: string) => void;
}

export function PhoneStepScreen({ dossierId, steps, step, tabs, content, activeTab, onTabChange }: PhoneStepScreenProps) {
  const t = useT();
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const position = stepPosition(step.id);
  const idx = steps.findIndex((s) => s.id === step.id);
  const prev = idx > 0 ? steps[idx - 1] : null;
  const next = idx >= 0 && idx < steps.length - 1 ? steps[idx + 1] : null;

  // The top bar's title (« 2 · Visite avant », ≤ 15 characters — Apple HIG
  // Toolbars) and its up-link to the HUB are published by the record page
  // through <RecordBar>: ONE registrar per route, so returning to the hub
  // cannot leave the bar without a title.

  return (
    <div className="pb-4">
      {/* Step switcher — the ONE sticky row under the top bar (E3 budget). */}
      <div className="sticky top-0 z-30 glass-bar border-b border-hairline">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-haspopup="dialog"
          className="flex h-10 w-full items-center gap-1.5 px-4 text-left text-[13px] font-medium text-ink-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="truncate">{t('Étapes')}</span>
          <span className="t-caption tabular-nums">
            {position}/{STEP_COUNT}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </div>

      <StepPickerSheet open={pickerOpen} onOpenChange={setPickerOpen} dossierId={dossierId} steps={steps} currentStepId={step.id} />

      <div className="px-4 pt-3">
        {/* Step state as ONE caption line — the heading itself is in the top bar. */}
        <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StepStatusChip status={step.status} label={step.statusLabel} />
          {step.doneAt && <StepStamp step={step} />}
          {step.status === 'blocked' && step.blockedReason && <span className="t-caption">{t(step.blockedReason)}</span>}
        </div>

        {tabs && tabs.length > 0 ? (
          // The tab strip is full-bleed (fixed cells edge to edge), the panels
          // keep the page's 16 px rhythm.
          <div className="-mx-4">
            <StepTabs
              tabs={tabs}
              storageKey={stepTabsKey(dossierId, step.id)}
              value={activeTab ?? undefined}
              onValueChange={onTabChange}
              className="[&>[role=tabpanel]]:px-4"
            />
          </div>
        ) : (
          content
        )}
      </div>

      {/* « ‹ Étape 2/8 › » — Material's TEXT mobile stepper, at the END of the
          content and never sticky (owner call, E-Q5: sequential readers keep
          a way forward without a third bar). */}
      <nav aria-label={t('Navigation entre étapes')} className="mt-8 flex items-stretch justify-between border-t border-hairline px-2">
        <StepArrow href={prev ? stepUrl(dossierId, prev.id) : null} dir="prev" label={t('Étape précédente')} />
        <span className="flex min-h-[48px] items-center px-2 text-[13px] tabular-nums text-ink-2">
          {t('Étape')} {position}/{STEP_COUNT}
        </span>
        <StepArrow href={next ? stepUrl(dossierId, next.id) : null} dir="next" label={t('Étape suivante')} />
      </nav>
    </div>
  );
}

function StepArrow({ href, dir, label }: { href: string | null; dir: 'prev' | 'next'; label: string }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  const cls = 'inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-md text-ink-2 transition-colors';
  if (!href) {
    return (
      <span className={cn(cls, 'text-ink-4')} aria-hidden>
        <Icon className="h-5 w-5" />
      </span>
    );
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className={cn(cls, 'hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}>
      <Icon className="h-5 w-5" aria-hidden />
    </Link>
  );
}

export default PhoneStepScreen;
