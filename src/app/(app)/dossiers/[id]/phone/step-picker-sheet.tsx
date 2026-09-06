'use client';

/**
 * « Étapes » — the 8-row task list of a dossier, and the bottom sheet that
 * carries it on a step screen (mobile pass 2026-09-06; research
 * docs/research/mobile-record-pages.md E1/E2).
 *
 * GOV.UK Task list ✓: "The whole row is linked, allowing users to select
 * anywhere within it"; statuses "use colour and a short descriptor"; "Users
 * should be able to complete tasks in whatever order they like". A blocked row
 * is NOT a link and prints its reason inline — there is no hover on touch, so
 * a tooltip would simply hide the reason (do-not list: "blocked reasons print
 * inline").
 *
 * The same rows appear twice by design: once on the hub as the record's spine,
 * once inside this sheet so a step can be switched without going back through
 * the hub (Zendesk's same-level switching). One component, two hosts.
 */

import * as React from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Lock } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { StepStatusChip } from '@/components/dossier-timeline/timeline-bar';
import { stepUrl } from '@/lib/step-navigation';
import type { StepState } from '@/lib/dossier-steps';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

/** 28 px medallion — the timeline's tokens at the row scale. */
function Medallion({ step, position }: { step: StepState; position: number }) {
  const done = step.status === 'done';
  const blocked = step.status === 'blocked';
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums',
        done && 'bg-status-success-bg text-status-success-fg shadow-rim',
        step.status === 'in_progress' && 'bg-primary text-primary-foreground shadow-rim-filled',
        step.status === 'todo' && 'bg-card text-ink-3 shadow-[inset_0_0_0_1.5px_hsl(var(--hairline-strong))]',
        blocked && 'bg-card text-ink-4 shadow-[inset_0_0_0_1.5px_hsl(var(--hairline-strong))]',
      )}
    >
      {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : blocked ? <Lock className="h-3 w-3" /> : position}
    </span>
  );
}

export interface StepRowsProps {
  dossierId: string;
  steps: StepState[];
  /** Highlighted as the screen the reader is on (the picker sheet only). */
  currentStepId?: number | null;
  /** Called after a row is chosen (the sheet closes itself). */
  onNavigate?: () => void;
}

/**
 * The list itself: 56 px rows, hairline separated, medallion · long label ·
 * status chip · chevron. Rendered full-bleed — the host owns side padding.
 */
export function StepRows({ dossierId, steps, currentStepId, onNavigate }: StepRowsProps) {
  const t = useT();
  return (
    <ul className="divide-y divide-hairline border-y border-hairline">
      {steps.map((step, idx) => {
        const blocked = step.status === 'blocked';
        const current = currentStepId === step.id;
        const inner = (
          <>
            <Medallion step={step} position={idx + 1} />
            <span className="min-w-0 flex-1">
              <span className={cn('t-body block truncate', blocked ? 'text-ink-3' : 'text-ink')}>{t(step.longLabel)}</span>
              {blocked && step.blockedReason && <span className="t-caption block truncate">{t(step.blockedReason)}</span>}
            </span>
            <StepStatusChip status={step.status} label={step.statusLabel} />
            {!blocked && <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />}
          </>
        );
        const rowCls = cn(
          'flex min-h-[56px] w-full items-center gap-3 px-4 text-left',
          current && 'bg-accent/40',
        );
        return (
          <li key={step.id}>
            {blocked ? (
              // Not a link (GOV.UK: a blocked task is not actionable).
              <div className={cn(rowCls, 'cursor-default')} aria-disabled>
                {inner}
              </div>
            ) : (
              <Link
                href={stepUrl(dossierId, step.id)}
                scroll={false}
                onClick={onNavigate}
                aria-current={current ? 'page' : undefined}
                className={cn(rowCls, 'transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2')}
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export interface StepPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dossierId: string;
  steps: StepState[];
  currentStepId: number | null;
}

/** « Étapes ▾ » on a step screen opens this (tall detent: 8 rows × 56 px). */
export function StepPickerSheet({ open, onOpenChange, dossierId, steps, currentStepId }: StepPickerSheetProps) {
  const t = useT();
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t('Étapes')} detent="tall" flush>
      <StepRows dossierId={dossierId} steps={steps} currentStepId={currentStepId} onNavigate={() => onOpenChange(false)} />
    </BottomSheet>
  );
}

export default StepPickerSheet;
