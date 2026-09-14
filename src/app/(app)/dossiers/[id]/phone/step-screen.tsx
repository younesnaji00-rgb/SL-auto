'use client';

/**
 * ONE STEP PER SCREEN — the phone form of a dossier record (mobile redesign
 * 2026-09-14, Claude Design handoff `Phone.dc.html` « dossier detail »,
 * variant chips + swipe; supersedes the 2026-09-06 hub + « Étapes ▾ » row).
 *
 * The record lands DIRECTLY on the current step (the hub is retired): the
 * step chips row is the record's spine and the swipe moves between steps.
 *
 * Anatomy, top to bottom:
 *   identity row 12 px ink-3     plaque (mono) · compagnie · « modifié il y a … »
 *                                + right-aligned warning pill « À faire N » → BottomSheet of todos
 *   sticky step chips (glass)    one 32 px pill per step, 24 px medallion (✓ / lock / n°),
 *                                current = filled teal, blocked = dashed, not tappable
 *   step content (swipeable)     h2 longLabel + StepStatusChip, the facet tabs (StepTabs)
 *                                with their badges, then the SAME section components the
 *                                desktop timeline renders
 *   footer nav (never sticky)    « ‹ Visite avant » · « Étape 3/8 · glissez » · « Accord › »
 *
 * Swipe: pointer drag on the content, 8 px axis lock, translateX follows the
 * finger (×0.9; ×0.25 resistance toward a blocked / missing step), opacity
 * fade, 70 px threshold, 220 ms ease-standard settle. Reduced motion keeps the
 * gesture and drops the movement.
 *
 * The primary action is NOT here: it is the page's bottom action bar.
 */

import * as React from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Check, ChevronLeft, ChevronRight, ListChecks, Lock } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { StepStatusChip } from '@/components/dossier-timeline/timeline-bar';
import { StepTabs, type StepTab } from '@/components/dossier-timeline/step-tabs';
import { runDossierTodo, useDossierTodos } from '@/components/dossiers/dossier-context-panel';
import { stepUrl, stepTabsKey } from '@/lib/step-navigation';
import { STEP_COUNT, stepPosition, toDate, type StepState } from '@/lib/dossier-steps';
import type { DossierTodo, VisitType } from '@/lib/dossier-todos';
import type { RequiredDocsStatus } from '@/lib/required-docs';
import { cn } from '@/lib/utils';
import { dateFnsLocale, useT } from '@/i18n';

/** Axis lock: the finger must move this far before the gesture commits to X or Y. */
const AXIS_LOCK_PX = 8;
/** Release past this X travel switches step. */
const SWIPE_THRESHOLD_PX = 70;
/** The content follows the finger at this ratio… */
const FOLLOW = 0.9;
/** …and at this one when the direction is refused (blocked / no step). */
const RESIST = 0.25;
const SETTLE_MS = 220;
const SETTLE_EASE = 'cubic-bezier(0.2, 0, 0, 1)';

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface PhoneStepScreenProps {
  dossierId: string;
  dossier: any;
  steps: StepState[];
  step: StepState;
  /** Facets of this step, or null for a single-surface step (Rapport, Honoraires). */
  tabs: StepTab[] | null;
  /** Content of a single-surface step. */
  content?: React.ReactNode;
  /** Selected facet, mirrored in `?onglet=`. */
  activeTab: string | null;
  onTabChange: (tab: string) => void;
  /** Live required-pieces status (feeds the « À faire » rows). */
  requiredDocs: RequiredDocsStatus | null;
  readOnly: boolean;
  onGoToStep: (stepId: number, tab?: string) => void;
  onPlanifier: (type: VisitType) => void;
  onChiffrage: () => void;
}

/* ------------------------------------------------------------------ */
/* Step chips                                                          */
/* ------------------------------------------------------------------ */

function ChipMedallion({ step, position, current }: { step: StepState; position: number; current: boolean }) {
  const done = step.status === 'done';
  const blocked = step.status === 'blocked';
  const prog = step.status === 'in_progress';
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
        current && 'bg-primary-foreground/20 text-primary-foreground',
        !current && done && 'bg-status-success-bg text-status-success-fg',
        !current && prog && 'bg-primary text-primary-foreground',
        !current && step.status === 'todo' && 'text-ink-3 shadow-[inset_0_0_0_1.5px_hsl(var(--hairline-strong))]',
        !current && blocked && 'text-ink-4 shadow-[inset_0_0_0_1.5px_hsl(var(--hairline))]',
      )}
    >
      {done ? <Check className="h-3 w-3" strokeWidth={2.5} /> : blocked ? <Lock className="h-[11px] w-[11px]" /> : position}
    </span>
  );
}

function StepChips({ dossierId, steps, currentId }: { dossierId: string; steps: StepState[]; currentId: number }) {
  const t = useT();
  const trackRef = React.useRef<HTMLDivElement>(null);

  // Keep the current chip centred in the strip when the step changes (the
  // strip's own scroll, never the page's).
  React.useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const chip = track.querySelector<HTMLElement>('[aria-current="step"]');
    if (!chip) return;
    const left = chip.offsetLeft - (track.clientWidth - chip.offsetWidth) / 2;
    track.scrollTo({ left: Math.max(0, left), behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [currentId]);

  return (
    <div className="sticky top-0 z-30 glass-bar border-b border-hairline">
      <div
        ref={trackRef}
        role="list"
        aria-label={t('Étapes')}
        className="flex snap-x snap-proximity gap-1.5 overflow-x-auto whitespace-nowrap px-4 pb-2.5 pt-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {steps.map((s, idx) => {
          const current = s.id === currentId;
          const blocked = s.status === 'blocked';
          const cls = cn(
            'inline-flex h-8 flex-none snap-center items-center gap-1.5 rounded-full pl-1 pr-2.5 text-[13px] transition-colors duration-200 ease-standard motion-reduce:transition-none',
            current && 'bg-primary font-semibold text-primary-foreground shadow-rim-filled',
            !current && !blocked && 'bg-card font-medium text-ink shadow-rim hover:bg-surface-2',
            !current && blocked && 'cursor-default bg-card font-medium text-ink-4 [outline:1.5px_dashed_hsl(var(--hairline-strong))] outline-offset-[-1.5px]',
          );
          const inner = (
            <>
              <ChipMedallion step={s} position={idx + 1} current={current} />
              {t(s.label)}
            </>
          );
          return (
            <span key={s.id} role="listitem" className="flex flex-none">
              {blocked && !current ? (
                // Not a link (GOV.UK: a blocked task is not actionable); the
                // reason prints under the heading of its own screen.
                <span className={cls} aria-disabled title={s.blockedReason ? t(s.blockedReason) : undefined}>
                  {inner}
                </span>
              ) : (
                <Link
                  href={stepUrl(dossierId, s.id)}
                  scroll={false}
                  aria-current={current ? 'step' : undefined}
                  className={cn(cls, 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background')}
                >
                  {inner}
                </Link>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* « À faire » sheet                                                   */
/* ------------------------------------------------------------------ */

function TodosSheet({
  open,
  onOpenChange,
  todos,
  onRun,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todos: DossierTodo[];
  onRun: (todo: DossierTodo) => void;
}) {
  const t = useT();
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={`${t('À faire')} · ${todos.length}`} flush>
      <ul className="divide-y divide-hairline">
        {todos.map((todo) => (
          <li key={todo.id}>
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onRun(todo);
              }}
              className="flex min-h-[52px] w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2"
            >
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[15px] leading-snug', todo.waiting ? 'text-ink-2' : 'font-medium text-ink')}>{todo.label}</span>
                {todo.detail && <span className="block truncate text-[12px] text-ink-3">{todo.detail}</span>}
              </span>
              <span className="shrink-0 text-[12px] text-ink-3">{todo.target}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export function PhoneStepScreen({
  dossierId,
  dossier,
  steps,
  step,
  tabs,
  content,
  activeTab,
  onTabChange,
  requiredDocs,
  readOnly,
  onGoToStep,
  onPlanifier,
  onChiffrage,
}: PhoneStepScreenProps) {
  const t = useT();
  const [todosOpen, setTodosOpen] = React.useState(false);
  const todos = useDossierTodos(dossier, steps, requiredDocs);

  const position = stepPosition(step.id);
  const idx = steps.findIndex((s) => s.id === step.id);
  const prev = idx > 0 ? steps[idx - 1] : null;
  const next = idx >= 0 && idx < steps.length - 1 ? steps[idx + 1] : null;
  // A blocked neighbour refuses the swipe and the footer arrow alike; the
  // chips row still reaches every open step.
  const canPrev = !!prev && prev.status !== 'blocked';
  const canNext = !!next && next.status !== 'blocked';

  const modifiedAt = toDate(dossier?.updatedAt ?? dossier?.lastStatusChange?.at ?? dossier?.createdAt);

  // ── Swipe between steps ──────────────────────────────────────────────────
  // The content element is moved directly (style on the DOM node) so a drag
  // never re-renders the forms it carries; React only sees the step change.
  const contentRef = React.useRef<HTMLDivElement>(null);
  const ptrRef = React.useRef<{ id: number; x: number; y: number; lock: 'x' | 'y' | null; dx: number } | null>(null);
  const dragEndAtRef = React.useRef(0);
  // Direction of the last committed swipe: the incoming step slides in from
  // that side (the settle the prototype animates on the outgoing content).
  const enterFromRef = React.useRef<'left' | 'right' | null>(null);
  const [enterFrom, setEnterFrom] = React.useState<'left' | 'right' | null>(null);

  React.useEffect(() => {
    // Consume the direction once per step change, then clear it so a plain
    // chip tap does not replay the last swipe.
    setEnterFrom(enterFromRef.current);
    enterFromRef.current = null;
  }, [step.id]);

  const resetContent = React.useCallback((animate: boolean) => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = animate && !prefersReducedMotion() ? `transform ${SETTLE_MS}ms ${SETTLE_EASE}, opacity ${SETTLE_MS}ms ${SETTLE_EASE}` : 'none';
    el.style.transform = '';
    el.style.opacity = '';
    el.classList.remove('select-none');
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    ptrRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, lock: null, dx: 0 };
    const el = contentRef.current;
    if (el) el.style.transition = 'none';
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = ptrRef.current;
    const el = contentRef.current;
    if (!p || !el || e.pointerId !== p.id) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.lock) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      p.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (p.lock === 'x') {
        el.classList.add('select-none');
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* capture unavailable */
        }
      }
    }
    if (p.lock !== 'x') return;
    const canGo = dx < 0 ? canNext : canPrev;
    p.dx = dx * (canGo ? FOLLOW : RESIST);
    if (prefersReducedMotion()) return;
    el.style.transform = `translateX(${p.dx}px)`;
    el.style.opacity = String(Math.max(0.35, 1 - Math.abs(p.dx) / 360));
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const p = ptrRef.current;
    if (!p || e.pointerId !== p.id) return;
    ptrRef.current = null;
    const el = contentRef.current;
    if (p.lock === 'x') {
      // The tap that ends a drag must not click what is under the finger.
      dragEndAtRef.current = Date.now();
      try {
        el?.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (!cancelled && p.lock === 'x' && Math.abs(p.dx) > SWIPE_THRESHOLD_PX) {
      if (p.dx < 0 && canNext && next) {
        enterFromRef.current = 'right';
        resetContent(false);
        onGoToStep(next.id);
        return;
      }
      if (p.dx > 0 && canPrev && prev) {
        enterFromRef.current = 'left';
        resetContent(false);
        onGoToStep(prev.id);
        return;
      }
    }
    resetContent(true);
  };

  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (Date.now() - dragEndAtRef.current < 400) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const runTodo = (todo: DossierTodo) => runDossierTodo(todo, { readOnly, onGoToStep, onPlanifier, onChiffrage });

  return (
    <div className="pb-4">
      {/* Identity row — what the top bar does not carry: plaque, compagnie,
          recency, and the « À faire » pill. */}
      <div className="flex min-w-0 items-center gap-2 whitespace-nowrap px-4 pb-2 pt-2.5 text-[12px] leading-4 text-ink-3">
        {dossier?.matricule && <span className="shrink-0 font-mono tabular-nums text-ink-2">{dossier.matricule}</span>}
        {dossier?.matricule && dossier?.compagnie && <span aria-hidden>·</span>}
        {dossier?.compagnie && <span className="truncate">{dossier.compagnie}</span>}
        {modifiedAt && (dossier?.matricule || dossier?.compagnie) && <span aria-hidden>·</span>}
        {modifiedAt && (
          <span className="truncate">
            {t('modifié')} {formatDistanceToNow(modifiedAt, { locale: dateFnsLocale(), addSuffix: true })}
          </span>
        )}
        {todos.length > 0 && (
          <button
            type="button"
            onClick={() => setTodosOpen(true)}
            aria-haspopup="dialog"
            className="-my-1.5 ml-auto flex h-10 shrink-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-status-warning-bg px-2.5 text-[12px] font-semibold text-status-warning-fg">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              {t('À faire')} <span className="tabular-nums">{todos.length}</span>
            </span>
          </button>
        )}
      </div>

      <TodosSheet open={todosOpen} onOpenChange={setTodosOpen} todos={todos} onRun={runTodo} />

      <StepChips dossierId={dossierId} steps={steps} currentId={step.id} />

      {/* Step content — swipeable. `touch-pan-y` leaves vertical scrolling to
          the browser; a horizontal drag reaches the handlers above. */}
      <div
        key={step.id}
        ref={contentRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endPointer(e, false)}
        onPointerCancel={(e) => endPointer(e, true)}
        onClickCapture={onClickCapture}
        className={cn(
          'touch-pan-y px-4 pb-6 pt-3',
          enterFrom && 'animate-in fade-in-0 duration-200 ease-standard motion-reduce:animate-none',
          enterFrom === 'right' && 'slide-in-from-right-4',
          enterFrom === 'left' && 'slide-in-from-left-4',
        )}
      >
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <h2 className="font-headline text-[17px] font-semibold leading-tight text-ink">{t(step.longLabel)}</h2>
          <StepStatusChip status={step.status} label={step.statusLabel} />
        </div>
        {step.status === 'blocked' && step.blockedReason && <p className="mb-3 text-[12px] text-ink-3">{t(step.blockedReason)}</p>}

        {tabs && tabs.length > 0 ? (
          // The tab strip is full-bleed (fixed cells edge to edge), the panels
          // keep the page's 16 px rhythm.
          <div className="-mx-4">
            <StepTabs
              tabs={tabs}
              storageKey={stepTabsKey(dossierId, step.id)}
              value={activeTab ?? undefined}
              onValueChange={onTabChange}
              className="[&>[role=tabpanel]]:px-4"
            />
          </div>
        ) : (
          content
        )}
      </div>

      {/* Footer nav — at the END of the content, never sticky. */}
      <nav aria-label={t('Navigation entre étapes')} className="flex items-center justify-between gap-2 px-2 pb-4">
        <NavButton
          dir="prev"
          step={canPrev ? prev : null}
          label={prev ? t(prev.label) : ''}
          href={canPrev && prev ? stepUrl(dossierId, prev.id) : null}
        />
        <span className="min-w-0 truncate text-[12px] tabular-nums text-ink-3">
          {t('Étape')} {position}/{STEP_COUNT} · {t('glissez')}
        </span>
        <NavButton
          dir="next"
          step={canNext ? next : null}
          label={next ? t(next.label) : ''}
          href={canNext && next ? stepUrl(dossierId, next.id) : null}
        />
      </nav>
    </div>
  );
}

function NavButton({ dir, step, label, href }: { dir: 'prev' | 'next'; step: StepState | null; label: string; href: string | null }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  const cls = 'inline-flex h-12 min-w-[48px] max-w-[42vw] items-center gap-1 rounded-md px-2.5 text-[13px] transition-colors';
  const text = <span className="truncate">{label}</span>;
  if (!href || !step) {
    return (
      <span className={cn(cls, 'pointer-events-none text-ink-4')} aria-disabled aria-hidden={!label || undefined}>
        {dir === 'prev' && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
        {text}
        {dir === 'next' && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      </span>
    );
  }
  return (
    <Link
      href={href}
      scroll={false}
      className={cn(cls, 'text-ink-2 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring')}
    >
      {dir === 'prev' && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
      {text}
      {dir === 'next' && <Icon className="h-5 w-5 shrink-0" aria-hidden />}
    </Link>
  );
}

export default PhoneStepScreen;
