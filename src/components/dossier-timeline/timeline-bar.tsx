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
import { displayUserName } from '@/lib/display-user';
import { prefersReducedMotion } from '@/lib/motion';
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

/** A long doer name splits over two rows: prénom on the first, the family
 *  name on the second (owner ruling 2026-09-02 — keeps the bar's horizontal
 *  footprint short now that only the right-hand steps fold). */
const NAME_STACK_MIN = 14;

export function StepStamp({
  step,
  className,
  stackLongName = false,
}: {
  step: StepState;
  className?: string;
  stackLongName?: boolean;
}) {
  if (!step.doneAt) return null;
  const entry = { user: step.doneBy, userNom: step.doneByNom };
  const label = displayUserName(entry);
  const words = label.split(/\s+/);
  const stacked = stackLongName && label.length > NAME_STACK_MIN && words.length >= 2;
  return (
    <span className={cn('t-caption inline-flex items-center gap-1 truncate tabular-nums', className)}>
      {format(step.doneAt, 'dd/MM/yyyy HH:mm', { locale: fr })}
      {step.doneBy && (
        <>
          <span aria-hidden>·</span>
          <UserNameLink entry={entry} className="text-ink-3">
            {stacked ? (
              <span className="flex flex-col leading-[1.15]">
                <span>{words[0]}</span>
                <span>{words.slice(1).join(' ')}</span>
              </span>
            ) : undefined}
          </UserNameLink>
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
  const base = 'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold tabular-nums shadow-rim transition-colors';
  if (isActive) return <span className={cn(base, 'border-primary bg-primary text-primary-foreground shadow-rim-filled')}>{index + 1}</span>;
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
  // Space-stealing reveal (owner 2026-09-02: the hovered step's FULL name and
  // details must always fit): while one step is inspected, only the steps to
  // its RIGHT fold to their medallions on the same 200ms horizontal slide
  // (owner ruling 2026-09-02: the left side stays put — the reveal grows
  // rightward, so nothing the eye already passed moves). Strictly
  // horizontal, state-driven (CSS alone can't quiet the siblings).
  const [inspectedId, setInspectedId] = React.useState<number | null>(null);
  // Leaving hands over with a 100ms grace (owner 2026-09-03): while the
  // pointer crosses the connector to a neighbour, the inspection must not
  // pass through null — in that gap the old step's collapse redistributed
  // before the new freeze existed and dragged the target step ~70px left.
  const leaveTimerRef = React.useRef<number | null>(null);
  const cancelLeave = () => {
    if (leaveTimerRef.current != null) {
      window.clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };
  const inspect = (id: number) => {
    cancelLeave();
    setInspectedId(id);
  };
  const release = (id: number) => {
    cancelLeave();
    leaveTimerRef.current = window.setTimeout(() => {
      leaveTimerRef.current = null;
      setInspectedId((h) => (h === id ? null : h));
    }, 100);
  };
  React.useEffect(() => cancelLeave, []);
  const inspectedIdx = inspectedId == null ? -1 : steps.findIndex((s) => s.id === inspectedId);
  // The LAST step has no right side to grow into: it alone keeps the old
  // behaviour (grows leftward, folding its left siblings).
  const inspectedLast = inspectedIdx === steps.length - 1;

  // The hovered step itself must also grow rightward only (owner 2026-09-02):
  // all connectors are flex-1, so an expanding button would otherwise shrink
  // the LEFT connectors too and drag the hovered step's left edge. While a
  // non-last step is inspected, the connectors left of it are frozen at their
  // current width; only the right-hand connectors absorb the reveal.
  const connectorRefs = React.useRef<(HTMLElement | null)[]>([]);
  const stepBtnRefs = React.useRef<(HTMLElement | null)[]>([]);
  const unfreezeTimerRef = React.useRef<number | null>(null);
  React.useLayoutEffect(() => {
    const cons = connectorRefs.current;
    const releaseAll = () => {
      for (const el of cons) {
        if (el) {
          el.style.flex = '';
          el.style.width = '';
        }
      }
    };
    if (unfreezeTimerRef.current != null) {
      window.clearTimeout(unfreezeTimerRef.current);
      unfreezeTimerRef.current = null;
    }
    if (inspectedIdx === -1 || inspectedIdx === steps.length - 1) {
      // Release only AFTER the 200ms fold-back (owner 2026-09-03: releasing
      // on leave, while the step was still expanded, dumped its width into
      // the re-flexed left connectors — a visible left jolt). The adjacent
      // connector may have absorbed a neighbour's donated width meanwhile,
      // so the release ANIMATES each styled connector to its natural width
      // (200ms standard) instead of snapping.
      unfreezeTimerRef.current = window.setTimeout(() => {
        unfreezeTimerRef.current = null;
        const styled = cons.filter(
          (el): el is HTMLElement => !!el && (el.style.width !== '' || el.style.flex !== ''),
        );
        if (styled.length === 0) return;
        if (prefersReducedMotion()) {
          releaseAll();
          return;
        }
        const cur = styled.map((el) => el.offsetWidth);
        for (const el of styled) {
          el.style.flex = '';
          el.style.width = '';
        }
        const parent = styled[0].parentElement;
        void parent?.offsetWidth;
        const nat = styled.map((el) => el.offsetWidth);
        styled.forEach((el, i) => {
          if (Math.abs(nat[i] - cur[i]) < 1) return;
          el.style.flex = '0 0 auto';
          el.style.width = `${cur[i]}px`;
        });
        void parent?.offsetWidth;
        styled.forEach((el, i) => {
          if (el.style.width === '') return;
          el.style.transition = 'width 200ms cubic-bezier(0.2, 0, 0, 1)';
          el.style.width = `${nat[i]}px`;
        });
        window.setTimeout(() => {
          for (const el of styled) {
            el.style.transition = '';
            el.style.flex = '';
            el.style.width = '';
          }
        }, 220);
      }, 250);
      return;
    }
    const bases: number[] = [];
    for (let j = 0; j < cons.length; j++) {
      const el = cons[j];
      if (!el) continue;
      el.style.transition = '';
      if (j < inspectedIdx) {
        bases[j] = el.offsetWidth;
        el.style.width = `${bases[j]}px`;
        el.style.flex = '0 0 auto';
      } else {
        el.style.flex = '';
        el.style.width = '';
      }
    }
    // Frozen connectors pin the left side, but a LEFT BUTTON still changes
    // width while this step is inspected — hover transferred from a
    // neighbour whose details are mid-collapse (owner 2026-09-03:
    // « 2ᵉ accord » slid left, cramping the previous steps). Any left
    // button still showing its details span is such a hand-over: its
    // reveal collapses by Δ over 200ms on the standard curve, so the
    // connector right of it GROWS by the same Δ as a CSS transition with
    // the same clock, started in the same frame — the style engine then
    // keeps the pair's sum constant on every painted frame, in every
    // browser. (A rAF compensator depended on when the engine samples
    // in-flight transitions; flex-grow routing leaked the right side's
    // folded width into the left gap.)
    for (let j = 0; j < inspectedIdx; j++) {
      const btn = stepBtnRefs.current[j];
      const el = cons[j];
      if (!btn || !el) continue;
      const details = btn.querySelectorAll<HTMLElement>(':scope > span.grid')[1];
      if (!details) continue;
      const w = details.offsetWidth;
      if (w <= 0) continue;
      const delta = w + 6; // + the reveal's ml-1.5, collapsing on the same clock
      void el.offsetWidth; // commit the frozen base before transitioning
      el.style.transition = 'width 200ms cubic-bezier(0.2, 0, 0, 1)';
      el.style.width = `${(bases[j] ?? el.offsetWidth) + delta}px`;
    }
  }, [inspectedIdx, steps.length]);
  React.useEffect(
    () => () => {
      if (unfreezeTimerRef.current != null) window.clearTimeout(unfreezeTimerRef.current);
    },
    [],
  );

  // Symbiote morph for the step bar (owner 2026-09-02): the active pill's
  // surface (accent veil + rim) is ONE indicator that slides from the old
  // step to the new one; buttons keep only their text/medallion treatment.
  // Owner 2026-09-03 ("the bg colour doesn't follow the pill — foolproof
  // for all edge cases"): event-driven re-measures (RO + state deps) missed
  // POSITION shifts from connector freezes/settles, stranding the veil. The
  // indicator is now a per-frame FOLLOWER: a rAF loop measures the active
  // button's offset-chain box (zoom/scroll-safe) and writes the style
  // imperatively when it changed — idle frames touch nothing, and any
  // layout change from any cause is tracked within a frame. Discrete jumps
  // (a new active step) still glide on the 300ms standard transition; the
  // first placement snaps.
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const indicatorRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const container = scrollRef.current;
    const ind = indicatorRef.current;
    if (!container || !ind) return;
    let raf = 0;
    let placed = false;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const btn = container.querySelector<HTMLElement>('[data-step-active="true"]');
      if (!btn) {
        ind.style.opacity = '0';
        placed = false;
        return;
      }
      let top = 0;
      let left = 0;
      let node: HTMLElement | null = btn;
      while (node && node !== container) {
        top += node.offsetTop;
        left += node.offsetLeft;
        node = node.offsetParent as HTMLElement | null;
      }
      const next = {
        top: `${top}px`,
        left: `${left}px`,
        width: `${btn.offsetWidth}px`,
        height: `${btn.offsetHeight}px`,
      };
      if (
        ind.style.top !== next.top ||
        ind.style.left !== next.left ||
        ind.style.width !== next.width ||
        ind.style.height !== next.height
      ) {
        ind.style.transition =
          placed && !prefersReducedMotion()
            ? 'top 300ms cubic-bezier(0.2, 0, 0, 1), left 300ms cubic-bezier(0.2, 0, 0, 1), width 300ms cubic-bezier(0.2, 0, 0, 1), height 300ms cubic-bezier(0.2, 0, 0, 1)'
            : 'none';
        ind.style.top = next.top;
        ind.style.left = next.left;
        ind.style.width = next.width;
        ind.style.height = next.height;
        placed = true;
      }
      ind.style.opacity = '1';
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [steps.length]);

  return (
    <nav aria-label="Étapes du dossier" className={cn('relative w-full', className)}>
      <div ref={scrollRef} className="relative flex h-12 w-full items-center gap-0.5 overflow-x-auto px-3 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
        <div
          ref={indicatorRef}
          aria-hidden
          className="pointer-events-none absolute z-0 rounded-full bg-accent/50 opacity-0 shadow-rim"
        />
        {steps.map((step, idx) => {
          const isActive = step.id === activeId;
          const blocked = step.status === 'blocked';
          const inspected = inspectedId === step.id;
          const quiet =
            inspectedIdx !== -1 && (inspectedLast ? !inspected : idx > inspectedIdx);
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                ref={(el) => {
                  stepBtnRefs.current[idx] = el;
                }}
                disabled={blocked}
                title={blocked ? step.blockedReason : `${step.longLabel} — ${step.statusLabel}`}
                aria-label={`Étape ${idx + 1} : ${step.longLabel} — ${step.statusLabel}`}
                onClick={() => onStepClick(step.id)}
                onMouseEnter={() => !blocked && inspect(step.id)}
                onMouseLeave={() => release(step.id)}
                onFocus={() => !blocked && inspect(step.id)}
                onBlur={() => release(step.id)}
                aria-current={isActive ? 'step' : undefined}
                data-step-active={isActive || undefined}
                className={cn(
                  'group relative flex h-9 shrink-0 items-center rounded-full py-0.5 pl-0.5 pr-2 text-left',
                  'transition-colors duration-150 ease-standard motion-reduce:transition-none',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  // The active surface is painted by the sliding indicator.
                  !isActive && 'hover:bg-surface-2 focus-visible:bg-surface-2',
                  blocked && 'cursor-not-allowed hover:bg-transparent',
                )}
              >
                <StepDot step={step} index={idx} isActive={isActive} />

                {/* Title — always from lg (and for the active step); slides in
                    on hover below lg; folds while ANOTHER step is inspected. */}
                <span className={REVEAL_OUTER((isActive && !quiet) || inspected, !quiet)}>
                  <span
                    className={cn(
                      REVEAL_INNER((isActive && !quiet) || inspected, !quiet),
                      'text-xs',
                      isActive ? 'font-semibold text-ink' : step.status === 'done' ? 'font-medium text-ink-2' : blocked ? 'text-ink-4' : 'font-medium text-ink-3',
                    )}
                  >
                    {step.label}
                  </span>
                </span>

                {/* Details — slide in after the title on hover / focus only.
                    No width cap: the siblings' fold makes the room. */}
                <span className={REVEAL_OUTER(inspected)} aria-hidden>
                  <span className={cn(REVEAL_INNER(inspected), 'text-[11px] text-ink-3')}>
                    <span aria-hidden className="mr-1.5">·</span>
                    {step.doneAt ? <StepStamp step={step} stackLongName /> : blocked ? step.blockedReason : step.statusLabel}
                  </span>
                </span>
              </button>
              {idx < steps.length - 1 && (
                <span
                  ref={(el) => {
                    connectorRefs.current[idx] = el;
                  }}
                  // No min-width floor (owner 2026-09-03): the right-hand
                  // lines may contract to ZERO so a hovered step's reveal
                  // takes all its room from the right side — a floor forced
                  // the expansion to overflow (or read as left pressure) in
                  // tight layouts.
                  className={cn('h-px flex-1', step.status === 'done' ? 'bg-status-success-fg/50' : 'bg-hairline-strong')}
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
