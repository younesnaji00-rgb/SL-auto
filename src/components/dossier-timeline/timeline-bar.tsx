'use client';

/**
 * Stepper with real status (GOV.UK task-list semantics on a Carbon-style
 * progress indicator): ✓ muted for done, filled accent for the active step,
 * outline for to-do, grey non-link for blocked.
 *
 * Compact presentation (user decision): 28 px medallions + titles spread over
 * the whole bar so every step fits without scrolling. Hovering (or focusing)
 * a step slides its details — "date · who" stamp, status or blocked reason —
 * in from the left, right after the title. Strictly horizontal: nothing
 * scales and nothing moves vertically; the reveal is CSS-only (`group-hover`)
 * so it never fights the pointer. Below lg only the active title stays; the
 * others slide in the same way.
 */

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserNameLink } from '@/components/user-name-link';
import type { StepState, StepStatus } from '@/lib/dossier-steps';

export type { StepState as TimelineStep } from '@/lib/dossier-steps';

export interface TimelineBarProps {
  steps: StepState[];
  activeId: number;
  onStepClick: (stepId: number) => void;
  /** Kept for API compatibility; the bar is always horizontal now. */
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function StepStamp({ step, className }: { step: StepState; className?: string }) {
  if (!step.doneAt) return null;
  return (
    <span className={cn('t-caption inline-flex items-center gap-1 truncate tabular-nums', className)}>
      {format(step.doneAt, 'dd/MM/yyyy HH:mm', { locale: fr })}
      {step.doneBy && (
        <>
          <span aria-hidden>·</span>
          <UserNameLink entry={{ user: step.doneBy }} className="text-ink-3" />
        </>
      )}
    </span>
  );
}

export function StepStatusChip({ status, label }: { status: StepStatus; label: string }) {
  return (
    <span
      className={cn(
        // done = success pair · active = accent tint · todo = ink-3 outline ·
        // blocked = dashed ink-4 (DESIGN.md §3 / §10).
        'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium',
        status === 'done' && 'bg-status-success-bg text-status-success-fg',
        status === 'in_progress' && 'bg-accent text-accent-foreground',
        status === 'todo' && 'border border-hairline-strong text-ink-3',
        status === 'blocked' && 'border border-dashed border-hairline-strong text-ink-4',
      )}
    >
      {label}
    </span>
  );
}

function StepDot({ step, index, isActive }: { step: StepState; index: number; isActive: boolean }) {
  const base = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold tabular-nums transition-colors';
  if (isActive) return <span className={cn(base, 'border-primary bg-primary text-primary-foreground')}>{index + 1}</span>;
  switch (step.status) {
    case 'done':
      return (
        <span className={cn(base, 'border-status-success-fg/40 bg-status-success-bg text-status-success-fg')} aria-hidden>
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
      );
    case 'in_progress':
      return <span className={cn(base, 'border-primary/60 bg-accent text-accent-foreground')}>{index + 1}</span>;
    case 'blocked':
      return (
        <span className={cn(base, 'border-dashed border-hairline-strong bg-transparent text-ink-4')} aria-hidden>
          <Lock className="h-3 w-3" />
        </span>
      );
    default:
      return <span className={cn(base, 'border-hairline-strong bg-card text-ink-3')}>{index + 1}</span>;
  }
}

/**
 * Horizontal slide-reveal: the column animates 0fr → 1fr while the content
 * translates in from the left. `open` forces it (active title); otherwise the
 * button's hover / focus-visible drives it through the `group` variants.
 */
const REVEAL_OUTER = (open: boolean, alwaysAtLg = false) =>
  cn(
    'grid min-w-0 transition-[grid-template-columns,margin] duration-200 ease-standard motion-reduce:transition-none',
    open
      ? 'ml-1.5 grid-cols-[1fr]'
      : cn(
          'ml-0 grid-cols-[0fr] group-hover:ml-1.5 group-hover:grid-cols-[1fr] group-focus-visible:ml-1.5 group-focus-visible:grid-cols-[1fr]',
          alwaysAtLg && 'lg:ml-1.5 lg:grid-cols-[1fr]',
        ),
  );
const REVEAL_INNER = (open: boolean, alwaysAtLg = false) =>
  cn(
    'block min-w-0 overflow-hidden whitespace-nowrap transition-[opacity,transform] duration-200 ease-standard motion-reduce:transition-none',
    open
      ? 'translate-x-0 opacity-100'
      : cn(
          '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100',
          alwaysAtLg && 'lg:translate-x-0 lg:opacity-100',
        ),
  );

export function TimelineBar({ steps, activeId, onStepClick, className }: TimelineBarProps) {
  return (
    <nav aria-label="Étapes du dossier" className={cn('relative w-full', className)}>
      <div className="flex h-12 w-full items-center gap-0.5 overflow-x-auto px-3 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
        {steps.map((step, idx) => {
          const isActive = step.id === activeId;
          const blocked = step.status === 'blocked';
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                disabled={blocked}
                title={blocked ? step.blockedReason : `${step.longLabel} — ${step.statusLabel}`}
                aria-label={`Étape ${idx + 1} : ${step.longLabel} — ${step.statusLabel}`}
                onClick={() => onStepClick(step.id)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'group flex h-9 shrink-0 items-center rounded-full py-0.5 pl-0.5 pr-2 text-left',
                  'transition-colors duration-150 ease-standard motion-reduce:transition-none',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'bg-accent/50' : 'hover:bg-surface-2 focus-visible:bg-surface-2',
                  blocked && 'cursor-not-allowed hover:bg-transparent',
                )}
              >
                <StepDot step={step} index={idx} isActive={isActive} />

                {/* Title — always from lg (and for the active step); slides in on hover below lg. */}
                <span className={REVEAL_OUTER(isActive, true)}>
                  <span
                    className={cn(
                      REVEAL_INNER(isActive, true),
                      'text-xs',
                      isActive ? 'font-semibold text-ink' : step.status === 'done' ? 'font-medium text-ink-2' : blocked ? 'text-ink-4' : 'font-medium text-ink-3',
                    )}
                  >
                    {step.label}
                  </span>
                </span>

                {/* Details — slide in after the title on hover / focus only. */}
                <span className={REVEAL_OUTER(false)} aria-hidden>
                  <span className={cn(REVEAL_INNER(false), 'text-[11px] text-ink-3')}>
                    <span aria-hidden className="mr-1.5">·</span>
                    {step.doneAt ? <StepStamp step={step} className="max-w-[200px]" /> : blocked ? step.blockedReason : step.statusLabel}
                  </span>
                </span>
              </button>
              {idx < steps.length - 1 && (
                <span
                  className={cn('h-px min-w-[10px] flex-1 sm:min-w-[16px]', step.status === 'done' ? 'bg-status-success-fg/50' : 'bg-hairline-strong')}
                  aria-hidden
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </nav>
  );
}
