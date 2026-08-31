'use client';

/**
 * Dossier timeline — one long scrollable page of workflow sections (NN/g:
 * preferred over tabs when users need most sections in a session), with a
 * sticky stepper that scroll-spies the active section via IntersectionObserver
 * (USWDS in-page navigation). Clicking a step scrolls to the section and moves
 * focus to its heading.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TimelineBar, StepStamp, StepStatusChip } from './timeline-bar';
import { useCollapsedSteps } from '@/hooks/use-collapsed-steps';
import { DOSSIER_STEP_DEFS, type StepState } from '@/lib/dossier-steps';

export interface TimelineSectionProps {
  step: StepState;
  position: number;
  children: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  /** The step currently in view — rendered as the only elevated card. */
  active?: boolean;
}

function TimelineSection({ step, position, children, collapsed, onToggle, active = false }: TimelineSectionProps) {
  const headingId = `step-${step.id}-heading`;
  const blocked = step.status === 'blocked';
  return (
    <section
      id={`step-${step.id}`}
      data-timeline-step={step.id}
      data-status={step.status}
      aria-labelledby={headingId}
      data-active={active || undefined}
      // Every step is one paper card on the cream canvas (uniform — the
      // stepper, not a background change, says which step is current).
      // Separation between steps = spacing; separation inside a step = tabs.
      className="paper scroll-mt-[112px] px-5 py-4 2xl:scroll-mt-[64px]"
    >
      <div className={cn('flex items-center gap-3', collapsed ? 'mb-0' : 'mb-4')}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-controls={`step-${step.id}-content`}
          className="-mx-2 flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={cn(
              'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
              step.status === 'done' && 'bg-status-success-bg text-status-success-fg',
              step.status === 'in_progress' && 'bg-primary/10 text-primary',
              (step.status === 'todo' || blocked) && 'bg-muted text-muted-foreground',
            )}
          >
            {position}
          </span>
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
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

export function Timeline({ dossierId, steps, sections, activeStep, onActiveStepChange, stickyTop = 48 }: TimelineProps) {
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
      {/* Horizontal stepper: sticky under the record bar (hidden on 2xl where the rail takes over). */}
      <div
        className="sticky z-30 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85 2xl:hidden"
        style={{ top: stickyTop }}
      >
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

      <div className="mx-auto max-w-screen-xl px-3 sm:px-6 2xl:grid 2xl:max-w-none 2xl:grid-cols-[240px_minmax(0,1fr)] 2xl:gap-8">
        {/* Vertical rail on very wide screens: never clips, never scrolls. */}
        <aside className="hidden 2xl:block">
          <div className="sticky pt-4" style={{ top: stickyTop + 8 }}>
            <TimelineBar steps={steps} activeId={activeStep} onStepClick={handleStepClick} orientation="vertical" />
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 h-7 w-full justify-start gap-1 px-2 text-xs text-muted-foreground"
              onClick={() => setAll(!allCollapsed)}
            >
              {allCollapsed ? <ChevronsUpDown className="h-3.5 w-3.5" /> : <ChevronsDownUp className="h-3.5 w-3.5" />}
              {allCollapsed ? 'Tout déplier' : 'Tout replier'}
            </Button>
          </div>
        </aside>

        <div className="min-w-0 space-y-4 py-4">
          {steps.map((step, idx) => (
            <TimelineSection key={step.id} step={step} position={idx + 1} collapsed={isCollapsed(step.id)} onToggle={() => toggle(step.id)} active={step.id === activeStep}>
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
