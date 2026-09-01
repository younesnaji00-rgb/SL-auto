'use client';

/**
 * Stepper with real status (GOV.UK task-list semantics on a Carbon-style
 * progress indicator): ✓ muted for done, filled accent for the active step,
 * outline for to-do, grey non-link for blocked.
 *
 * Compact "dock" presentation (user decision): every step is a 28 px medallion
 * so all of them fit in one row without scrolling; the active step keeps its
 * label. Moving the pointer along the row magnifies the step under the
 * cursor and, less, its neighbours — a distance-based fisheye like the macOS
 * Dock — and the magnified step unfolds its label and "who · when" stamp.
 * Keyboard focus unfolds the same way. Under prefers-reduced-motion nothing
 * scales; hover/focus simply shows the label.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
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

/** Fisheye radius (px) and peak magnification of the Dock effect. */
const DOCK_RADIUS = 96;
const DOCK_BOOST = 0.3;
/** Within this distance of a medallion's centre the step counts as hovered. */
const HOVER_REACH = 44;

export function TimelineBar({ steps, activeId, onStepClick, className }: TimelineBarProps) {
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Pointer X in viewport coordinates while over the bar; null otherwise.
  const [pointerX, setPointerX] = useState<number | null>(null);
  const [focusId, setFocusId] = useState<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const frame = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return; // touch: no fisheye, tap = click
    const x = e.clientX;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setPointerX(x));
  }, []);
  const onPointerLeave = useCallback(() => {
    cancelAnimationFrame(frame.current);
    setPointerX(null);
  }, []);

  // Per-step magnification from the pointer's distance to the medallion centre.
  const scaleFor = (idx: number): number => {
    if (reduceMotion || pointerX === null) return 1;
    const el = itemRefs.current[idx];
    if (!el) return 1;
    const dot = el.querySelector<HTMLElement>('[data-dot]') ?? el;
    const r = dot.getBoundingClientRect();
    const d = Math.abs(pointerX - (r.left + r.width / 2));
    if (d >= DOCK_RADIUS) return 1;
    const t = 1 - d / DOCK_RADIUS;
    return 1 + DOCK_BOOST * t * t;
  };
  // The one step whose label unfolds: focused, else nearest to the pointer.
  let hoveredId: number | null = focusId;
  if (hoveredId === null && pointerX !== null) {
    let best = Infinity;
    steps.forEach((s, idx) => {
      const el = itemRefs.current[idx];
      if (!el) return;
      const dot = el.querySelector<HTMLElement>('[data-dot]') ?? el;
      const r = dot.getBoundingClientRect();
      const d = Math.abs(pointerX - (r.left + r.width / 2));
      if (d < best && d <= HOVER_REACH) {
        best = d;
        hoveredId = s.id;
      }
    });
  }

  return (
    <nav aria-label="Étapes du dossier" className={cn('relative w-full', className)}>
      <div
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        // Steps are spread over the whole bar (connectors flex); below lg the
        // row can still scroll and non-active titles fold away.
        className="flex h-12 w-full items-center gap-0.5 overflow-x-auto px-3 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden"
      >
        {steps.map((step, idx) => {
          const isActive = step.id === activeId;
          const blocked = step.status === 'blocked';
          const unfolded = isActive || hoveredId === step.id;
          const scale = scaleFor(idx);
          return (
            <React.Fragment key={step.id}>
              <button
                ref={(el) => {
                  itemRefs.current[idx] = el;
                }}
                type="button"
                disabled={blocked}
                title={blocked ? step.blockedReason : `${step.longLabel} — ${step.statusLabel}`}
                aria-label={`Étape ${idx + 1} : ${step.longLabel} — ${step.statusLabel}`}
                onClick={() => onStepClick(step.id)}
                onFocus={() => setFocusId(step.id)}
                onBlur={() => setFocusId((v) => (v === step.id ? null : v))}
                aria-current={isActive ? 'step' : undefined}
                style={{ transform: `scale(${scale.toFixed(3)})` }}
                className={cn(
                  // Width unfolds via the label's grid column; scale is the Dock
                  // fisheye. Both on the shared standard curve; nothing under
                  // reduced motion.
                  'relative z-0 flex shrink-0 origin-center items-center rounded-full py-0.5 pl-0.5 pr-0.5 text-left lg:pr-2.5',
                  'transition-[transform,background-color,padding] duration-150 ease-standard motion-reduce:transition-none',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  unfolded && 'z-10 pr-2.5',
                  isActive ? 'bg-accent/50' : unfolded ? 'bg-surface-2 shadow-card' : 'bg-transparent',
                  blocked && 'cursor-not-allowed',
                )}
              >
                <span data-dot className="inline-flex">
                  <StepDot step={step} index={idx} isActive={isActive} />
                </span>
                {/* Title: always visible from lg up (and for the active step);
                    below lg it unfolds horizontally on hover/focus. */}
                <span
                  className={cn(
                    'grid min-w-0 transition-[grid-template-columns,opacity,margin] duration-150 ease-standard motion-reduce:transition-none',
                    unfolded ? 'ml-2 grid-cols-[1fr] opacity-100' : 'ml-0 grid-cols-[0fr] opacity-0 lg:ml-2 lg:grid-cols-[1fr] lg:opacity-100',
                  )}
                >
                  <span className="flex min-w-0 flex-col overflow-hidden leading-tight">
                    <span
                      className={cn(
                        'whitespace-nowrap text-xs',
                        isActive ? 'font-semibold text-ink' : step.status === 'done' ? 'font-medium text-ink-2' : blocked ? 'text-ink-4' : 'font-medium text-ink-3',
                      )}
                    >
                      {step.label}
                    </span>
                    {/* Details: unfold vertically under the title on hover/focus. */}
                    <span
                      aria-hidden={!unfolded}
                      className={cn(
                        'grid transition-[grid-template-rows,opacity] duration-150 ease-standard motion-reduce:transition-none',
                        unfolded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                      )}
                    >
                      <span className="min-h-0 overflow-hidden whitespace-nowrap text-[11px] leading-[1.2] text-ink-3">
                        {step.doneAt ? <StepStamp step={step} className="max-w-[180px]" /> : blocked ? step.blockedReason : step.statusLabel}
                      </span>
                    </span>
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
