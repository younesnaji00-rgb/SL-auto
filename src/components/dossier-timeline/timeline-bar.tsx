'use client';

/**
 * Stepper with real status (GOV.UK task-list semantics on a Carbon-style
 * progress indicator): ✓ muted for done, filled accent for the active step,
 * outline for to-do, grey non-link for blocked. Whole step is the control;
 * helper text carries the "who · when" stamp.
 *
 * Horizontal variant scrolls with fade edges and auto-centres the active step
 * (never clips). Vertical variant is a sticky left rail for very wide screens.
 */

import React, { useEffect, useRef } from 'react';
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
  const base = 'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold tabular-nums transition-colors';
  if (isActive) return <span className={cn(base, 'border-primary bg-primary text-primary-foreground')}>{index + 1}</span>;
  switch (step.status) {
    case 'done':
      return (
        <span className={cn(base, 'border-status-success-fg/40 bg-status-success-bg text-status-success-fg')} aria-hidden>
          <Check className="h-3.5 w-3.5" />
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

export function TimelineBar({ steps, activeId, onStepClick, orientation = 'horizontal', className }: TimelineBarProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Keep the active step centred in the horizontal scroller.
  useEffect(() => {
    if (orientation !== 'horizontal') return;
    const el = scrollerRef.current?.querySelector<HTMLElement>('[aria-current="step"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
  }, [activeId, orientation]);

  if (orientation === 'vertical') {
    return (
      <nav aria-label="Étapes du dossier" className={cn('flex flex-col', className)}>
        <ol className="relative flex flex-col gap-1 border-l border-hairline-strong pl-0">
          {steps.map((step, idx) => {
            const isActive = step.id === activeId;
            const blocked = step.status === 'blocked';
            return (
              <li key={step.id} className="-ml-px">
                <button
                  type="button"
                  disabled={blocked}
                  title={blocked ? step.blockedReason : undefined}
                  onClick={() => onStepClick(step.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-r-md border-l-2 py-1.5 pl-3 pr-2 text-left transition-colors',
                    isActive ? 'border-primary bg-accent/40' : 'border-transparent hover:bg-surface-2',
                    blocked && 'cursor-not-allowed hover:bg-transparent',
                  )}
                >
                  <StepDot step={step} index={idx} isActive={isActive} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block truncate text-sm',
                        isActive ? 'font-semibold text-ink' : step.status === 'done' ? 'text-ink-2' : blocked ? 'text-ink-4' : 'text-ink-3',
                      )}
                    >
                      {step.label}
                    </span>
                    <span className={cn('t-caption block truncate', blocked && 'text-ink-4')}>
                      {step.doneAt ? <StepStamp step={step} /> : blocked ? step.blockedReason : step.statusLabel}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <nav aria-label="Étapes du dossier" className={cn('relative w-full', className)}>
      <div
        ref={scrollerRef}
        className="flex items-stretch gap-1 overflow-x-auto px-3 py-1.5 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden"
      >
        {steps.map((step, idx) => {
          const isActive = step.id === activeId;
          const blocked = step.status === 'blocked';
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                disabled={blocked}
                title={blocked ? step.blockedReason : step.doneAt ? `${step.longLabel} — ${step.statusLabel}` : step.longLabel}
                onClick={() => onStepClick(step.id)}
                aria-current={isActive ? 'step' : undefined}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-md px-2 py-1 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive ? 'bg-accent/40' : 'hover:bg-surface-2',
                  blocked && 'cursor-not-allowed hover:bg-transparent',
                )}
              >
                <StepDot step={step} index={idx} isActive={isActive} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span
                    className={cn(
                      'whitespace-nowrap text-xs',
                      isActive ? 'font-semibold text-ink' : step.status === 'done' ? 'text-ink-2' : blocked ? 'text-ink-4' : 'text-ink-3',
                    )}
                  >
                    {step.label}
                  </span>
                  {step.doneAt && <StepStamp step={step} className="max-w-[160px]" />}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <span
                  className={cn('my-auto h-px w-4 shrink-0 sm:w-6', step.status === 'done' ? 'bg-status-success-fg/50' : 'bg-hairline-strong')}
                  aria-hidden
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent" aria-hidden />
    </nav>
  );
}
