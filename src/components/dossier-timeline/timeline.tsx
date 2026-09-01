'use client';

/**
 * Dossier timeline — one long scrollable page of workflow sections (NN/g:
 * preferred over tabs when users need most sections in a session), with a
 * sticky stepper that scroll-spies the active section via IntersectionObserver
 * (USWDS in-page navigation). Clicking a step scrolls to the section and moves
 * focus to its heading.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Check, ChevronDown, ChevronsDownUp, ChevronsUpDown, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TimelineBar, StepStamp, StepStatusChip } from './timeline-bar';
import { useCollapsedSteps } from '@/hooks/use-collapsed-steps';
import { DOSSIER_STEP_DEFS, type StepState } from '@/lib/dossier-steps';
import { GOTO_STEP_EVENT, type GotoStepDetail } from '@/lib/step-navigation';

export interface TimelineSectionProps {
  step: StepState;
  position: number;
  children: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  /** The step currently in view (title in full ink). */
  active?: boolean;
  /** Last step — no connecting rail below its medallion. */
  last?: boolean;
}

function TimelineSection({ step, position, children, collapsed, onToggle, active = false, last = false }: TimelineSectionProps) {
  const headingId = `step-${step.id}-heading`;
  const blocked = step.status === 'blocked';
  const done = step.status === 'done';
  return (
    <section
      id={`step-${step.id}`}
      data-timeline-step={step.id}
      data-status={step.status}
      aria-labelledby={headingId}
      data-active={active || undefined}
      // Step-by-step layout (GOV.UK "step by step" / Material vertical
      // stepper): each step is a paper card set off by a large numbered
      // medallion in a left gutter, joined by a thin rail, with 32 px of
      // canvas between cards. Boundaries come from the rail + whitespace, not
      // from heavy rules (Refactoring UI: separate with space and tone first).
      className="relative scroll-mt-[112px] pb-8 pl-12 last:pb-0 sm:pl-14"
    >
      <div aria-hidden className="absolute bottom-0 left-0 top-2.5 flex w-9 flex-col items-center sm:w-10">
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums ring-4 ring-background',
            done && 'bg-status-success-bg text-status-success-fg shadow-rim',
            step.status === 'in_progress' && 'bg-primary text-primary-foreground shadow-rim-filled',
            step.status === 'todo' && 'bg-card text-ink-3 shadow-[inset_0_0_0_1.5px_hsl(var(--hairline-strong))]',
            blocked && 'bg-card text-ink-4 shadow-[inset_0_0_0_1.5px_hsl(var(--hairline-strong))]',
          )}
        >
          {done ? <Check className="h-4 w-4" strokeWidth={2.5} /> : blocked ? <Lock className="h-3.5 w-3.5" /> : position}
        </span>
        {!last && <span className={cn('mt-1.5 w-0.5 flex-1 rounded-full', done ? 'bg-status-success-fg/40' : 'bg-hairline-strong')} />}
      </div>

      <div className="paper px-5 py-4">
        <div className={cn('flex items-center gap-3', collapsed ? 'mb-0' : 'mb-4')}>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-controls={`step-${step.id}-content`}
            className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="t-label sr-only">Étape {position}</span>
              <h2 id={headingId} tabIndex={-1} className={cn('outline-none', step.status === 'in_progress' || active ? 't-title' : 't-title text-ink-2')}>
                {step.longLabel}
              </h2>
              <StepStatusChip status={step.status} label={step.statusLabel} />
              {step.doneAt && <StepStamp step={step} />}
              {blocked && step.blockedReason && <span className="text-xs text-muted-foreground">{step.blockedReason}</span>}
            </span>
            <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none', collapsed && '-rotate-90')} />
          </button>
        </div>
        <div id={`step-${step.id}-content`} hidden={collapsed} className="space-y-4">
          {!collapsed && children}
        </div>
      </div>
    </section>
  );
}

export interface TimelineProps {
  /** Dossier ID — used to scope per-step localStorage keys for collapse state. */
  dossierId: string;
  /** Steps with computed status (see lib/dossier-steps.ts). */
  steps: StepState[];
  /** Mapping of step id → rendered content for that section. */
  sections: Record<number, React.ReactNode>;
  /** The currently-focused step (controlled). */
  activeStep: number;
  /** Focus mode: hide the steps rail/bar and use the full width. */
  focus?: boolean;
  /** Called when the user clicks a step in the bar OR when scroll auto-detects a new active section. */
  onActiveStepChange: (stepId: number) => void;
  /** Sticky offset of the horizontal bar (px from the top of the scroll container). */
  stickyTop?: number;
}

/**
 * Walk up the DOM to find the nearest scrollable ancestor. The app's scroll
 * container is `<main className="overflow-y-auto">`, not `window`.
 */
function findScrollContainer(el: HTMLElement | null): HTMLElement | null {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

export function Timeline({ dossierId, steps, sections, activeStep, onActiveStepChange, stickyTop = 48, focus = false }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressRef = useRef(false);
  const stepIds = useMemo(() => steps.map((s) => s.id), [steps]);
  const { isCollapsed, toggle, setAll, collapsedCount, total } = useCollapsedSteps(dossierId, stepIds);

  const scrollToStep = useCallback(
    (stepId: number, behavior: ScrollBehavior) => {
      const el = document.getElementById(`step-${stepId}`);
      if (!el) return;
      suppressRef.current = true;
      el.scrollIntoView({ behavior, block: 'start' });
      const heading = document.getElementById(`step-${stepId}-heading`);
      window.setTimeout(() => {
        heading?.focus({ preventScroll: true });
        suppressRef.current = false;
      }, behavior === 'smooth' ? 600 : 80);
    },
    [],
  );

  const handleStepClick = useCallback(
    (stepId: number) => {
      onActiveStepChange(stepId);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      scrollToStep(stepId, reduce ? 'auto' : 'smooth');
    },
    [onActiveStepChange, scrollToStep],
  );

  // External navigation (`gotoStep` from the record bar / context column):
  // unfold the step if it is collapsed, then scroll to it once its content
  // has rendered (two frames: React commit, then layout).
  useEffect(() => {
    const onGoto = (e: Event) => {
      const { dossierId: target, stepId } = (e as CustomEvent<GotoStepDetail>).detail;
      if (target !== dossierId) return;
      if (isCollapsed(stepId)) toggle(stepId);
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      requestAnimationFrame(() => requestAnimationFrame(() => scrollToStep(stepId, reduce ? 'auto' : 'smooth')));
    };
    window.addEventListener(GOTO_STEP_EVENT, onGoto);
    return () => window.removeEventListener(GOTO_STEP_EVENT, onGoto);
  }, [dossierId, isCollapsed, toggle, scrollToStep]);

  // Scroll-spy: the active step is the last section whose top has passed the
  // sticky bars. IntersectionObserver with a top rootMargin equal to the sticky
  // stack keeps this cheap and layout-safe.
  useEffect(() => {
    if (steps.length === 0) return;
    const first = document.getElementById(`step-${steps[0].id}`);
    const root = findScrollContainer(first);
    const tops = new Map<number, number>();
    const io = new IntersectionObserver(
      (entries) => {
        if (suppressRef.current) return;
        for (const e of entries) {
          const id = Number((e.target as HTMLElement).dataset.timelineStep);
          tops.set(id, e.boundingClientRect.top);
        }
        // Pick the section with the greatest top that is still above the threshold.
        const rootTop = root ? root.getBoundingClientRect().top : 0;
        const threshold = rootTop + stickyTop + 24;
        let best: { id: number; top: number } | null = null;
        for (const s of steps) {
          const el = document.getElementById(`step-${s.id}`);
          if (!el) continue;
          const top = el.getBoundingClientRect().top;
          if (top <= threshold && (!best || top > best.top)) best = { id: s.id, top };
        }
        const id = best?.id ?? steps[0].id;
        if (id !== activeStep) onActiveStepChange(id);
      },
      { root, rootMargin: `-${stickyTop}px 0px 0px 0px`, threshold: [0, 0.1, 0.5, 1] },
    );
    for (const s of steps) {
      const el = document.getElementById(`step-${s.id}`);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [steps, activeStep, onActiveStepChange, stickyTop]);

  // Restore the last viewed step on mount.
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    const el = document.getElementById(`step-${activeStep}`);
    if (el) {
      didInitialScrollRef.current = true;
      suppressRef.current = true;
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      window.setTimeout(() => { suppressRef.current = false; }, 300);
    }
  }, [activeStep]);

  const allCollapsed = collapsedCount === total && total > 0;

  return (
    <div ref={containerRef} className="w-full">
      {/* Horizontal stepper: sticky under the record bar at every width (user decision: one stepper, the in-content medallion rail is the vertical wayfinding). */}
      <div
        className={cn('sticky z-30 grid transition-[grid-template-rows] duration-300 ease-standard motion-reduce:transition-none', focus ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]')}
        style={{ top: stickyTop }}
        aria-hidden={focus || undefined}
      >
      <div className={cn('flex min-h-0 items-center glass-bar overflow-hidden border-b transition-opacity duration-150 ease-standard motion-reduce:transition-none', focus ? 'opacity-0' : 'opacity-100 delay-150')}>
        <TimelineBar steps={steps} activeId={activeStep} onStepClick={handleStepClick} className="min-w-0 flex-1" />
        <div className="shrink-0 border-l px-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground"
            onClick={() => setAll(!allCollapsed)}
            title={allCollapsed ? 'Tout déplier' : 'Tout replier'}
          >
            {allCollapsed ? <ChevronsUpDown className="h-3.5 w-3.5" /> : <ChevronsDownUp className="h-3.5 w-3.5" />}
            <span className="hidden md:inline">{allCollapsed ? 'Tout déplier' : 'Tout replier'}</span>
          </Button>
        </div>
      </div>
      </div>

      <div
        className={cn(
          'mx-auto px-3 transition-[max-width] duration-300 ease-standard motion-reduce:transition-none sm:px-6',
          focus ? 'max-w-[100%]' : 'max-w-[1280px]',
        )}
      >

        <div className="min-w-0 py-4">
          {steps.map((step, idx) => (
            <TimelineSection key={step.id} step={step} position={idx + 1} collapsed={isCollapsed(step.id)} onToggle={() => toggle(step.id)} active={step.id === activeStep} last={idx === steps.length - 1}>
              {sections[step.id] ?? null}
            </TimelineSection>
          ))}
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use DOSSIER_STEP_DEFS / getStepStatuses from lib/dossier-steps. */
export const DOSSIER_TIMELINE_STEPS = DOSSIER_STEP_DEFS.map(({ id, label, longLabel }) => ({ id, label: longLabel, shortLabel: label }));
