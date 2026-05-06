'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { collection, orderBy, query } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { TimelineBar, type TimelineStep } from './timeline-bar';
import { useCollapsedSteps } from '@/hooks/use-collapsed-steps';
import { useCollection, useFirestore } from '@/firebase';

export interface TimelineSectionProps {
  id: number;
  label: string;
  children: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
  /** Latest workflow entry that matched this step's keyword, or null. */
  stamp: { date: Date; user: string } | null;
}

function TimelineSection({ id, label, children, collapsed, onToggle, stamp }: TimelineSectionProps) {
  return (
    <section
      id={`step-${id}`}
      data-timeline-step={id}
      className="scroll-mt-24 py-6 border-b last:border-b-0"
    >
      <button
        type="button"
        onClick={onToggle}
        className="mb-4 flex items-baseline gap-2 w-full text-left hover:bg-accent/40 rounded px-2 -mx-2 py-1 transition-colors"
        aria-expanded={!collapsed}
      >
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
          {id}
        </span>
        <div className="flex-1 flex flex-col items-start min-w-0">
          <h2 className="text-lg font-bold leading-tight">{label}</h2>
          <span className="text-xs text-muted-foreground mt-0.5 truncate max-w-full">
            {stamp
              ? `${format(stamp.date, 'dd/MM/yyyy HH:mm', { locale: fr })} — ${stamp.user}`
              : '—'}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            collapsed && '-rotate-90'
          )}
        />
      </button>
      {!collapsed && children}
    </section>
  );
}

// Keyword heuristic: for each step id, the (lowercased) action substring(s) that
// indicate that step. Order in `keywords` doesn't matter — a match is a match.
// Sourced from the task spec; aligns with the strings used by existing
// `logWorkflow` callers (e.g. "Création de planification", "Dossier envoyé vers
// chiffrage", "Rapport mis à jour", "Nouveau document ajouté", etc.).
const STEP_KEYWORDS: Record<number, string[]> = {
  1: ['import', 'information'],
  4: ['planification'],
  6: ['chiffrage'],
  7: ['rapport'],
};

function matchStepId(action: string): number | null {
  const lower = (action ?? '').toLowerCase();
  for (const [idStr, kws] of Object.entries(STEP_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) return Number(idStr);
  }
  return null;
}

export interface TimelineProps {
  /** Dossier ID — used to scope per-step localStorage keys for collapse state. */
  dossierId: string;
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

export function Timeline({ dossierId, steps, sections, activeStep, onActiveStepChange }: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressScrollRef = useRef(false);

  const orderedSteps = useMemo(() => [...steps], [steps]);
  const stepIds = useMemo(() => orderedSteps.map((s) => s.id), [orderedSteps]);
  const { isCollapsed, toggle } = useCollapsedSteps(dossierId, stepIds);

  // Subscribe once to dossiers/{dossierId}/workflow, ordered newest first, then
  // pick the latest entry whose `action` matches each step's keyword. Single
  // pass — see STEP_KEYWORDS above.
  const db = useFirestore();
  const workflowQuery = useMemo(() => {
    if (!db || !dossierId) return null;
    return query(
      collection(db, 'dossiers', dossierId, 'workflow'),
      orderBy('date', 'desc')
    );
  }, [db, dossierId]);
  const { data: workflowEntries } = useCollection<any>(workflowQuery);
  const stampByStep = useMemo(() => {
    const map = new Map<number, { date: Date; user: string }>();
    if (!workflowEntries) return map;
    // workflowEntries is ordered date desc, so the first match for a step id
    // wins (latest entry for that step).
    for (const entry of workflowEntries) {
      if (!entry?.action || !entry?.date?.toDate) continue;
      const stepId = matchStepId(entry.action);
      if (stepId == null || map.has(stepId)) continue;
      map.set(stepId, {
        date: entry.date.toDate(),
        user: entry.user || 'Admin',
      });
    }
    return map;
  }, [workflowEntries]);

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
    // Also listen on window so our programmatic dispatchEvent from the collapse
    // toggle reaches us even when the true scroll container is an ancestor.
    if (scrollTarget !== window) {
      window.addEventListener('scroll', onScroll, { passive: true });
    }
    onScroll(); // run once on mount
    return () => {
      scrollTarget.removeEventListener('scroll', onScroll);
      if (scrollTarget !== window) {
        window.removeEventListener('scroll', onScroll);
      }
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

  return (
    <div ref={containerRef} className="w-full">
      <TimelineBar steps={orderedSteps} activeId={activeStep} onStepClick={handleStepClick} />
      <div className="px-3 sm:px-6 max-w-screen-xl mx-auto">
        {orderedSteps.map((step) => (
          <TimelineSection
            key={step.id}
            id={step.id}
            label={step.label}
            collapsed={isCollapsed(step.id)}
            onToggle={() => toggle(step.id)}
            stamp={stampByStep.get(step.id) ?? null}
          >
            {sections[step.id] ?? null}
          </TimelineSection>
        ))}
      </div>
    </div>
  );
}

export const DOSSIER_TIMELINE_STEPS: TimelineStep[] = [
  { id: 1, label: 'Création de mission' },
  { id: 4, label: 'Planification avant' },
  { id: 6, label: 'Accord' },
  { id: 9, label: 'Planification en cours' },
  { id: 11, label: '2ème accord et +' },
  { id: 10, label: 'Planification après' },
  { id: 7, label: 'Rapport' },
  { id: 8, label: "Note d'honoraire" },
];
