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

export function Timeline({ steps, sections, activeStep, onActiveStepChange }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressObserverRef = useRef(false);

  // Smooth-scroll to a step when the bar is clicked.
  const handleStepClick = useCallback(
    (stepId: number) => {
      suppressObserverRef.current = true;
      onActiveStepChange(stepId);
      const el = document.getElementById(`step-${stepId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Re-enable observer after scroll settles.
      window.setTimeout(() => { suppressObserverRef.current = false; }, 700);
    },
    [onActiveStepChange]
  );

  // Observe section visibility to auto-update active step while scrolling.
  useEffect(() => {
    const nodes = steps
      .map((s) => document.getElementById(`step-${s.id}`))
      .filter((n): n is HTMLElement => !!n);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (suppressObserverRef.current) return;
        // Pick the entry closest to the top of the viewport.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const top = visible[0].target as HTMLElement;
          const id = Number(top.dataset.timelineStep);
          if (Number.isFinite(id) && id !== activeStep) {
            onActiveStepChange(id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [steps, activeStep, onActiveStepChange]);

  // Scroll to the active step on mount (restore position on return).
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    const el = document.getElementById(`step-${activeStep}`);
    if (el) {
      didInitialScrollRef.current = true;
      suppressObserverRef.current = true;
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
      window.setTimeout(() => { suppressObserverRef.current = false; }, 500);
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
