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
    <span className={cn('inline-flex items-center gap-1 truncate text-[11px] tabular-nums text-muted-foreground', className)}>
      {format(step.doneAt, 'dd/MM/yyyy HH:mm', { locale: fr })}
      {step.doneBy && (
        <>
          <span aria-hidden>·</span>
          <UserNameLink entry={{ user: step.doneBy }} className="text-muted-foreground" />
        </>
      )}
    </span>
  );
}

export function StepStatusChip({ status, label }: { status: StepStatus; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium',
        status === 'done' && 'bg-status-success-bg text-status-success-fg',
        status === 'in_progress' && 'bg-primary/10 text-primary',
        status === 'todo' && 'bg-muted text-muted-foreground',
        status === 'blocked' && 'bg-muted text-muted-foreground/70',
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
      return <span className={cn(base, 'border-primary/60 bg-primary/10 text-primary')}>{index + 1}</span>;
    case 'blocked':
      return (
        <span className={cn(base, 'border-dashed border-border bg-muted/60 text-muted-foreground/70')} aria-hidden>
          <Lock className="h-3 w-3" />
        </span>
      );
    default:
      return <span className={cn(base, 'border-border bg-background text-muted-foreground')}>{index + 1}</span>;
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
        <ol className="relative flex flex-col gap-1 border-l border-border pl-0">
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
                    isActive ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/60',
                    blocked && 'cursor-not-allowed opacity-70 hover:bg-transparent',
                  )}
                >
                  <StepDot step={step} index={idx} isActive={isActive} />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-sm', isActive ? 'font-semibold text-foreground' : step.status === 'done' ? 'text-foreground/80' : 'text-muted-foreground')}>
                      {step.label}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
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
                  isActive ? 'bg-primary/5' : 'hover:bg-muted/60',
                  blocked && 'cursor-not-allowed hover:bg-transparent',
                )}
              >
                <StepDot step={step} index={idx} isActive={isActive} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span
                    className={cn(
                      'whitespace-nowrap text-xs',
                      isActive ? 'font-semibold text-foreground' : step.status === 'done' ? 'text-foreground/80' : blocked ? 'text-muted-foreground/70' : 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                  {step.doneAt && <StepStamp step={step} className="max-w-[160px]" />}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <span
                  className={cn('my-auto h-px w-4 shrink-0 sm:w-6', step.status === 'done' ? 'bg-status-success-fg/50' : 'bg-border')}
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
