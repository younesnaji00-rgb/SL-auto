'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CalendarClock, Check, CheckCircle2, Eye, AlertTriangle, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Rappel } from '@/hooks/use-rappels';
import { tsToMillis, classifyDossierChanges, diffCollectionById, docPathStatus, type CollectionDiff } from '@/lib/rappel-snapshot';
import { loadReplaySnapshots, type ReplaySnapshots, SNAP_SUBCOLLECTIONS } from '@/lib/rappel-session';
import { ReadOnlyUserScope } from '@/hooks/use-current-user';
import {
  ReplayHighlightProvider,
  type ChangeStatus,
  type ReplayHighlightValue,
} from '@/components/dossier-timeline/replay-highlight';
import { DOSSIER_TIMELINE_STEPS } from '@/components/dossier-timeline/timeline';

// The real dossier-timeline components — rendered read-only + live so the
// replica is the exact detail page (every field, photo, table), not an
// approximation. Read-only is enforced by ReadOnlyUserScope + a disabled
// fieldset, so the frozen tab components are untouched.
import Step1Import from '@/components/dossier-timeline/step-1-import';
import Step2Information from '@/components/dossier-timeline/step-2-information';
import Step3Planification from '@/components/dossier-timeline/step-3-planification';
import Step4Pieces from '@/components/dossier-timeline/step-4-pieces';
import Step6Rapport from '@/components/dossier-timeline/step-6-rapport';
import TypedDocumentsGrid from '@/components/dossier-timeline/typed-documents-grid';
import ObservationsTab from '@/components/observations-tab';
import PhotosTab from '@/app/(app)/dossiers/[id]/photos-tab';

type Props = {
  rappel: Rappel | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const noop = () => {};

function fmtDateTime(ts: any): string {
  const ms = tsToMillis(ts);
  if (!ms) return '—';
  try {
    return format(new Date(ms), 'dd/MM/yyyy HH:mm', { locale: fr });
  } catch {
    return '—';
  }
}

/**
 * Replica of the dossier TimelineBar — clickable steps, scrolls to a step.
 *
 * Stepper (element-specs §16: Carbon progress indicator — status indicator +
 * a 1–2-word label, states complete / current / not started, numbering makes
 * the progression obvious; blueprint §5 — horizontal bar, 28 px medallions,
 * active = primary fill + rim-filled, done = ink-3 outline with a check).
 * Sits on `.glass-bar` since the replica scrolls under it (§23: one sticky
 * bar, ≤ 48 px content).
 */
function ReplayStepBar({
  steps,
  activeId,
  onStepClick,
}: {
  steps: { id: number; label: string }[];
  activeId: number;
  onStepClick: (id: number) => void;
}) {
  const activeIdx = steps.findIndex((s) => s.id === activeId);
  return (
    <div data-replay-bar className="glass-bar sticky top-0 z-30 w-full border-b border-hairline">
      <div className="flex items-start gap-2 overflow-x-auto px-3 py-2 sm:px-6">
        {steps.map((step, idx) => {
          const isActive = step.id === activeId;
          const isPast = activeIdx >= 0 && idx < activeIdx;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => onStepClick(step.id)}
                className="flex shrink-0 items-center gap-2 rounded-md transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums transition-colors',
                    isActive && 'bg-primary text-primary-foreground shadow-rim-filled',
                    !isActive && isPast && 'border border-ink-3 bg-transparent text-ink-3',
                    !isActive && !isPast && 'bg-card text-ink-3 shadow-rim',
                  )}
                >
                  {!isActive && isPast ? <Check className="h-3.5 w-3.5" aria-hidden /> : idx + 1}
                </span>
                <span className={cn('whitespace-nowrap text-xs', isActive ? 'font-semibold text-ink' : 'text-ink-3')}>
                  {step.label}
                </span>
              </button>
              {idx < steps.length - 1 && <div className="mt-3.5 h-px w-8 shrink-0 bg-hairline sm:w-12" aria-hidden />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function SessionReplayDialog({ rappel, open, onOpenChange }: Props) {
  const db = useFirestore();
  const id = rappel?.dossierId ?? null;
  const startTs = rappel?.sessionStartedAt ?? null;
  const endTs = rappel?.resolvedAt ?? null;

  const [activeStep, setActiveStep] = useState<number>(DOSSIER_TIMELINE_STEPS[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const suppressSpyRef = useRef(false);

  const dossierRef = useMemo(() => (db && id && open ? doc(db, 'dossiers', id) : null), [db, id, open]);
  const { data: dossier, loading } = useDoc(dossierRef as any);

  // ── Change awareness: diff the LIVE dossier against the session-start
  // snapshot so the real components can tint changed fields/entries. The
  // authoritative "what the gestionnaire changed" is the diff stored at save
  // time (before→after, both real snapshots); for an in-progress treatment we
  // fall back to diffing the start snapshot against the live dossier. ──
  const rappelId = rappel?.id ?? null;
  const [snaps, setSnaps] = useState<ReplaySnapshots | null>(null);
  const [snapsLoading, setSnapsLoading] = useState(false);
  useEffect(() => {
    if (!open || !db || !rappelId) {
      setSnaps(null);
      setSnapsLoading(false);
      return;
    }
    let cancelled = false;
    setSnapsLoading(true);
    loadReplaySnapshots(db, rappelId).then((s) => {
      if (!cancelled) {
        setSnaps(s);
        setSnapsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, db, rappelId]);
  const before = snaps?.before ?? null;
  const storedDiff = snaps?.diff ?? null;

  const ready = !!db && !!id && open;
  const obsQ = useMemo(() => (ready ? collection(db, 'dossiers', id!, 'observations') : null), [db, id, ready]);
  const planifQ = useMemo(() => (ready ? collection(db, 'dossiers', id!, 'planifications') : null), [db, id, ready]);
  const photosQ = useMemo(() => (ready ? collection(db, 'dossiers', id!, 'photos') : null), [db, id, ready]);
  const docsQ = useMemo(() => (ready ? collection(db, 'dossiers', id!, 'documents') : null), [db, id, ready]);
  const piecesQ = useMemo(() => (ready ? collection(db, 'dossiers', id!, 'rapport_pieces') : null), [db, id, ready]);
  const { data: observations } = useCollection<any>(obsQ as any);
  const { data: planifications } = useCollection<any>(planifQ as any);
  const { data: photos } = useCollection<any>(photosQ as any);
  const { data: documents } = useCollection<any>(docsQ as any);
  const { data: rapportPieces } = useCollection<any>(piecesQ as any);

  const liveDocDiff = useMemo(
    () => (before?.dossier && dossier ? classifyDossierChanges(before.dossier, dossier) : null),
    [before, dossier],
  );
  const liveSubDiffs = useMemo(() => {
    if (!before) return null;
    const live: Record<string, any[]> = {
      observations: observations || [],
      planifications: planifications || [],
      photos: photos || [],
      documents: documents || [],
      rapport_pieces: rapportPieces || [],
    };
    const out: Record<string, CollectionDiff> = {};
    for (const name of SNAP_SUBCOLLECTIONS) out[name] = diffCollectionById(before.subs?.[name], live[name]);
    return out;
  }, [before, observations, planifications, photos, documents, rapportPieces]);

  // Prefer the live recompute against the session-start snapshot — it reflects
  // the current data AND the latest (canonicalising) diff logic, so it doesn't
  // inherit a stale diff frozen by an earlier save. Only fall back to the
  // stored diff when there's no start snapshot to compare against.
  const docDiff = useMemo(
    () => liveDocDiff ?? storedDiff?.doc ?? null,
    [liveDocDiff, storedDiff],
  );
  const subDiffs = useMemo(
    () => liveSubDiffs ?? storedDiff?.subs ?? null,
    [liveSubDiffs, storedDiff],
  );

  const hasBaseline = !!before || !!storedDiff;
  const summary = useMemo(() => {
    let added = 0, modified = 0, removed = 0;
    if (docDiff) {
      added += docDiff.added.length;
      modified += docDiff.modified.length;
      removed += docDiff.removed.length;
    }
    if (subDiffs) {
      for (const c of Object.values(subDiffs)) {
        added += c.added.length;
        modified += c.modified.length;
        removed += c.removed.length;
      }
    }
    return { added, modified, removed, total: added + modified + removed };
  }, [docDiff, subDiffs]);

  const hlValue = useMemo<ReplayHighlightValue>(
    () => ({
      active: !!docDiff || !!subDiffs,
      statusForPath: (path: string): ChangeStatus => (docDiff ? docPathStatus(docDiff, path) : null),
      statusForEntry: (coll: string, entryId: string): ChangeStatus => {
        const d = subDiffs?.[coll];
        if (!d) return null;
        if (d.added.includes(entryId)) return 'added';
        if (d.modified.includes(entryId)) return 'modified';
        if (d.removed.includes(entryId)) return 'removed';
        return null;
      },
    }),
    [docDiff, subDiffs],
  );

  const scrollToStep = useCallback((stepId: number) => {
    const el = document.getElementById(`replay-step-${stepId}`);
    const container = scrollRef.current;
    if (!el || !container) return;
    suppressSpyRef.current = true;
    setActiveStep(stepId);
    const bar = container.querySelector('[data-replay-bar]') as HTMLElement | null;
    const barH = bar?.offsetHeight ?? 56;
    const top =
      container.scrollTop + (el.getBoundingClientRect().top - container.getBoundingClientRect().top) - barH - 8;
    container.scrollTo({ top, behavior: 'smooth' });
    window.setTimeout(() => {
      suppressSpyRef.current = false;
    }, 600);
  }, []);

  const onScroll = useCallback(() => {
    if (suppressSpyRef.current) return;
    const container = scrollRef.current;
    if (!container) return;
    const cTop = container.getBoundingClientRect().top;
    let active = DOSSIER_TIMELINE_STEPS[0].id;
    for (const s of DOSSIER_TIMELINE_STEPS) {
      const el = document.getElementById(`replay-step-${s.id}`);
      if (!el) continue;
      if (el.getBoundingClientRect().top - cTop <= 80) active = s.id;
    }
    setActiveStep((prev) => (prev === active ? prev : active));
  }, []);

  // Section composition — mirrors src/app/(app)/dossiers/[id]/page.tsx. Keep in
  // sync if the dossier timeline composition changes. readOnly + no-op handlers;
  // editing is hard-disabled by ReadOnlyUserScope + the disabled fieldset.
  const renderStep = (stepId: number) => {
    if (!id || !dossier || !dossierRef) return null;
    const common = { dossierId: id, dossier, dossierRef, readOnly: true };
    switch (stepId) {
      case 1:
        return (
          <>
            <Step1Import {...common} />
            <div className="mt-4">
              <Step2Information {...common} onEditPlanification={noop} onNewPlanification={noop} />
            </div>
            <div className="mt-4">
              <Step4Pieces {...common} onSendToChiffrage={noop} hidePhotos hideAccordSlots showBaseGarageSlots hideOtherSlots showAllNonAccordSlots />
            </div>
          </>
        );
      case 4:
        return (
          <>
            <Step3Planification {...common} onEditPlanification={noop} onNewPlanification={noop} typeFilter="Avant" />
            <div className="mt-4"><PhotosTab dossierId={id} onlyCategory="avant" /></div>
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" contextPhase="Avant" /></div>
          </>
        );
      case 6:
        return (
          <>
            <Step4Pieces {...common} onSendToChiffrage={noop} hidePhotos showOnlyAccordSlots hideCardinalPlus onlyImportTab showReformeSlots />
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" contextAccord="1er accord" /></div>
          </>
        );
      case 9:
        return (
          <>
            <Step3Planification {...common} onEditPlanification={noop} onNewPlanification={noop} typeFilter="En cours" />
            <div className="mt-4"><PhotosTab dossierId={id} onlyCategory="en_cours" /></div>
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" contextPhase="En cours" /></div>
          </>
        );
      case 11:
        return (
          <>
            <Step4Pieces {...common} onSendToChiffrage={noop} requireFirstAccordFilled hidePhotos showOnlyAccordSlots onlyImportTab cardinalFilter="2-plus" />
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" contextAccord="2ème accord ou +" /></div>
          </>
        );
      case 10:
        return (
          <>
            <Step3Planification {...common} onEditPlanification={noop} onNewPlanification={noop} typeFilter="Après" />
            <div className="mt-4"><PhotosTab dossierId={id} onlyCategory="apres" /></div>
            <div className="mt-4"><ObservationsTab dossierId={id} section="dossiers" variant="collapsible" contextPhase="Après" /></div>
          </>
        );
      case 7:
        return <Step6Rapport {...common} />;
      case 8:
        return <TypedDocumentsGrid dossierId={id} showOnlyNoteHonoraire />;
      default:
        return null;
    }
  };

  return (
    // Dialog (element-specs §13: Material 3 — brief, clear headline; the panel
    // is `.glass-strong` from the primitive, bottom sheet below `lg`). This one
    // is a full replica of a dossier — a read view that cannot fit in a row —
    // so it takes the wide, tall frame; no footer actions (nothing to confirm).
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[calc(97vw/var(--app-zoom))] h-[calc(94vh/var(--app-zoom))] p-0 gap-0 flex flex-col overflow-hidden">
        {/* Header: `t-title` headline (the ref stays in t-mono — numbers never
            in the display face) + one `t-caption` line of session facts. */}
        <DialogHeader className="shrink-0 space-y-1.5 border-b border-hairline px-6 py-4">
          <DialogTitle className="t-title flex flex-wrap items-center gap-2">
            Traitement du dossier{' '}
            <span className="t-mono text-base font-semibold">{rappel?.dossierRef || id}</span>
            {/* Read-only marker (§11): neutral pair, icon + label. */}
            <Badge variant="neutral" className="ml-1 gap-1 font-normal">
              <Eye className="h-3 w-3" aria-hidden /> Lecture seule
            </Badge>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="t-caption flex flex-wrap items-center gap-x-4 gap-y-1">
              {rappel?.recipientNom && (
                <span>
                  Gestionnaire : <span className="font-medium text-ink">{rappel.recipientNom}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                Début : <span className="font-medium text-ink">{fmtDateTime(startTs)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                {endTs ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-status-success-fg" aria-hidden />
                    Sauvegardé : <span className="font-medium text-ink">{fmtDateTime(endTs)}</span>
                  </>
                ) : (
                  // Status pair with its label (§11) — the treatment is still open.
                  <Badge variant="warning">Traitement en cours</Badge>
                )}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {loading || !dossier ? (
          // Skeleton shaped like the replica (§15): step bar + first step paper.
          <div className="flex-1 space-y-4 overflow-hidden px-3 py-4 sm:px-6" aria-busy="true" aria-live="polite">
            <div className="flex gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-28 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
            <ReplayStepBar steps={DOSSIER_TIMELINE_STEPS} activeId={activeStep} onStepClick={scrollToStep} />
            {/* Change summary (§14: Carbon notification — inline, persists,
                every status with its icon; §11 counts as status-pair chips
                with their label). */}
            <div className="px-3 pt-3 sm:px-6">
              {snapsLoading ? (
                <div className="t-caption flex items-center gap-2 rounded-[10px] bg-surface-2 px-3 py-2" aria-busy="true">
                  <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden /> Analyse des modifications du gestionnaire…
                </div>
              ) : !hasBaseline ? (
                <Alert variant="warning">
                  <AlertTriangle />
                  <AlertDescription>
                    Aucun instantané de départ n&apos;a été enregistré pour ce traitement&nbsp;: les modifications
                    ne peuvent pas être mises en évidence. Le gestionnaire doit ouvrir le dossier depuis
                    «&nbsp;Mes rappels&nbsp;» pour démarrer une session.
                  </AlertDescription>
                </Alert>
              ) : summary.total === 0 ? (
                <Alert>
                  <Info />
                  <AlertDescription>Aucune modification détectée pendant ce traitement.</AlertDescription>
                </Alert>
              ) : (
                <div className="t-caption flex flex-wrap items-center gap-2 rounded-[10px] bg-surface-2 px-3 py-2">
                  <span className="font-medium text-ink-2">Modifications du gestionnaire&nbsp;:</span>
                  {summary.added > 0 && (
                    <Badge variant="success">{summary.added} ajout{summary.added > 1 ? 's' : ''}</Badge>
                  )}
                  {summary.modified > 0 && (
                    <Badge variant="warning">{summary.modified} modification{summary.modified > 1 ? 's' : ''}</Badge>
                  )}
                  {summary.removed > 0 && (
                    <Badge variant="danger">{summary.removed} suppression{summary.removed > 1 ? 's' : ''}</Badge>
                  )}
                </div>
              )}
            </div>
            <ReplayHighlightProvider value={hlValue}>
              <ReadOnlyUserScope>
                {/* disabled fieldset = hard read-only safety net (blocks any
                    role-based action button the display mode doesn't already hide) */}
                <fieldset disabled className="min-w-0 border-0 p-0 m-0">
                  <div className="px-3 sm:px-6 py-4 max-w-screen-xl mx-auto">
                    {DOSSIER_TIMELINE_STEPS.map((step, idx) => (
                      <section
                        key={step.id}
                        id={`replay-step-${step.id}`}
                        className="scroll-mt-20 border-b border-hairline py-6 last:border-b-0"
                      >
                        {/* Section title: ordinal medallion (surface-3 + rim, Inter
                            tabular digit) beside the step name in t-title. */}
                        <div className="mb-4 flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-[11px] font-semibold tabular-nums text-ink-2 shadow-rim">
                            {idx + 1}
                          </span>
                          <h2 className="t-title">{step.label}</h2>
                        </div>
                        {renderStep(step.id)}
                      </section>
                    ))}
                  </div>
                </fieldset>
              </ReadOnlyUserScope>
            </ReplayHighlightProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
