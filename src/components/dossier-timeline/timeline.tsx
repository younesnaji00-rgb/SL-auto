'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { TimelineBar, type TimelineStep } from './timeline-bar';

export interface TimelineSectionProps {
  id: number;
  label: string;
  children: React.ReactNode;
}

function TimelineSection({ id, label, children }: TimelineSectionProps) {
  return (
    <section
      id={`step-${id}`}
      data-timeline-step={id}
      className="min-h-[60vh] scroll-mt-24 py-6 border-b last:border-b-0"
    >
      <div className="mb-4 flex items-baseline gap-2">
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
          {id}
        </span>
        <h2 className="text-lg font-bold">{label}</h2>
      </div>
      {children}
    </section>
  );
}

export interface TimelineProps {
  steps: TimelineStep[];
  /** Mapping of step id → rendered content for that section. */
  sections: Record<number, React.ReactNode>;
  /** The currently-focused step (controlled). */
  activeStep: number;
  /** Called when the user clicks a step in the bar OR when scroll auto-detects a new active section. */
  onActiveStepChange: (stepId: number) => void;
}

// Just below the sticky bars (action bar ~52px + timeline bar ~56px = 108px) + small buffer.
const ACTIVE_THRESHOLD = 120;

/**
 * Walk up the DOM to find the nearest scrollable ancestor. Needed because this
 * app's main scroll container is `<main className="overflow-y-auto">` in the
 * (app) layout, not `window`.
 */
function findScrollContainer(el: HTMLElement | null): HTMLElement | Window {
  let node: HTMLElement | null = el?.parentElement ?? null;
  while (node) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
      return node;
    }
    node = node.parentElement;
  }
  return window;
}

function pickActiveStep(steps: TimelineStep[], thresholdTop: number): number | null {
  let best: { id: number; top: number } | null = null;
  for (const s of steps) {
    const el = document.getElementById(`step-${s.id}`);
    if (!el) continue;
    const top = el.getBoundingClientRect().top; // relative to viewport
    if (top <= thresholdTop) {
      // Candidate — we want the largest top among those ≤ threshold (the last
      // section whose top has crossed below the sticky bars).
      if (!best || top > best.top) best = { id: s.id, top };
    }
  }
  return best?.id ?? steps[0]?.id ?? null;
}

export function Timeline({ steps, sections, activeStep, onActiveStepChange }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressScrollRef = useRef(false);

  // Smooth-scroll to a step when the bar is clicked.
  const handleStepClick = useCallback(
    (stepId: number) => {
      suppressScrollRef.current = true;
      onActiveStepChange(stepId);
      const el = document.getElementById(`step-${stepId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Re-enable scroll listener after scroll settles.
      window.setTimeout(() => { suppressScrollRef.current = false; }, 700);
    },
    [onActiveStepChange]
  );

  // Track active step via a scroll listener on whichever ancestor actually scrolls.
  useEffect(() => {
    if (steps.length === 0) return;

    // Resolve the scroll target from a known step element. If none exist yet,
    // fall back to window — we'll re-run this effect once steps render.
    const firstStepEl = document.getElementById(`step-${steps[0].id}`);
    const scrollTarget = findScrollContainer(firstStepEl);

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        if (suppressScrollRef.current) return;
        const id = pickActiveStep(steps, ACTIVE_THRESHOLD);
        if (id != null && id !== activeStep) onActiveStepChange(id);
      });
    };

    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // run once on mount
    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [steps, activeStep, onActiveStepChange]);

  // Scroll to the active step on mount (restore position on return).
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    const el = document.getElementById(`step-${activeStep}`);
    if (el) {
      didInitialScrollRef.current = true;
      suppressScrollRef.current = true;
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      window.setTimeout(() => { suppressScrollRef.current = false; }, 500);
    }
  }, [activeStep]);

  const orderedSteps = useMemo(() => [...steps].sort((a, b) => a.id - b.id), [steps]);

  return (
    <div ref={containerRef} className="w-full">
      <TimelineBar steps={orderedSteps} activeId={activeStep} onStepClick={handleStepClick} />
      <div className="px-3 sm:px-6 max-w-screen-xl mx-auto">
        {orderedSteps.map((step) => (
          <TimelineSection key={step.id} id={step.id} label={step.label}>
            {sections[step.id] ?? null}
          </TimelineSection>
        ))}
      </div>
    </div>
  );
}

export const DOSSIER_TIMELINE_STEPS: TimelineStep[] = [
  { id: 1, label: 'Document import' },
  { id: 2, label: 'Information' },
  { id: 3, label: 'Planification' },
  { id: 4, label: 'Pièces jointes' },
  { id: 5, label: 'Chiffrage' },
  { id: 6, label: 'Rapport' },
];
