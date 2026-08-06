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
import { Loader2, CalendarClock, CheckCircle2, Play, Eye, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFirestore, useDoc, useCollection } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { dateFnsLocale, useT } from '@/i18n';
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
import { tourDialogGuard } from '@/lib/tutorial/dialog-guard';

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
    return format(new Date(ms), 'dd/MM/yyyy HH:mm', { locale: dateFnsLocale() });
  } catch {
    return '—';
  }
}

/** Replica of the dossier TimelineBar — clickable step pills, scrolls to a step. */
function ReplayStepBar({
  steps,
  activeId,
  onStepClick,
}: {
  steps: { id: number; label: string }[];
  activeId: number;
  onStepClick: (id: number) => void;
}) {
  const t = useT();
  const activeIdx = steps.findIndex((s) => s.id === activeId);
  return (
    <div data-replay-bar className="sticky top-0 z-30 w-full bg-background/95 backdrop-blur border-b">
      <div className="flex items-start gap-2 px-3 sm:px-6 py-3 overflow-x-auto">
        {steps.map((step, idx) => {
          const isActive = step.id === activeId;
          const isPast = activeIdx >= 0 && idx < activeIdx;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => onStepClick(step.id)}
                className="flex items-center gap-2 shrink-0 transition-colors hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded"
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full border-2 text-xs font-bold h-7 w-7 shrink-0 transition-colors',
                    isActive && 'bg-primary text-primary-foreground border-primary',
                    !isActive && isPast && 'bg-primary/20 text-primary border-primary/50',
                    !isActive && !isPast && 'bg-muted text-muted-foreground border-muted-foreground/30',
                  )}
                >
                  {idx + 1}
                </span>
                <span className={cn('text-xs whitespace-nowrap', isActive ? 'font-bold text-primary' : 'text-muted-foreground')}>
                  {t(step.label)}
                </span>
              </button>
              {idx < steps.length - 1 && <div className="w-8 sm:w-12 h-px bg-border shrink-0 mt-3.5" aria-hidden />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default function SessionReplayDialog({ rappel, open, onOpenChange }: Props) {
  const db = useFirestore();
  const t = useT();
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-tour="rap-replay" {...tourDialogGuard()} className="max-w-6xl w-[97vw] h-[94vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader data-tour="rap-replay-head" className="px-5 py-3 border-b shrink-0 space-y-1.5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Play className="h-4 w-4 text-primary" />
            {t('Traitement du dossier')}{' '}
            <span className="font-mono text-primary">{rappel?.dossierRef || id}</span>
            <Badge variant="outline" className="ml-1 gap-1 text-[11px] text-muted-foreground">
              <Eye className="h-3 w-3" /> {t('Lecture seule')}
            </Badge>
          </DialogTitle>
          <DialogDescription asChild>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {rappel?.recipientNom && (
                <span>
                  {t('Gestionnaire :')} <span className="font-medium text-foreground">{rappel.recipientNom}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5 text-emerald-600" />
                {t('Début :')} <span className="font-medium text-foreground">{fmtDateTime(startTs)}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                {endTs ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    {t('Sauvegardé :')} <span className="font-medium text-foreground">{fmtDateTime(endTs)}</span>
                  </>
                ) : (
                  <Badge variant="outline" className="text-amber-700 border-amber-300">{t('Traitement en cours')}</Badge>
                )}
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>

        {loading || !dossier ? (
          <div className="flex-1 flex justify-center items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto">
            <ReplayStepBar steps={DOSSIER_TIMELINE_STEPS} activeId={activeStep} onStepClick={scrollToStep} />
            <div className="px-3 sm:px-6 pt-3">
              {snapsLoading ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('Analyse des modifications du gestionnaire…')}
                </div>
              ) : !hasBaseline ? (
                <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
                  <span>
                    {t("Aucun instantané de départ n'a été enregistré pour ce traitement : les modifications ne peuvent pas être mises en évidence. Le gestionnaire doit ouvrir le dossier depuis « Mes rappels » pour démarrer une session.")}
                  </span>
                </div>
              ) : summary.total === 0 ? (
                <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 shrink-0" /> {t('Aucune modification détectée pendant ce traitement.')}
                </div>
              ) : (
                <div data-tour="rap-replay-summary" className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                  <span className="font-medium text-muted-foreground">{t('Modifications du gestionnaire :')}</span>
                  {summary.added > 0 && (
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-green-700 bg-green-100/70 dark:text-green-300 dark:bg-green-900/30">
                      <span className="h-2 w-2 rounded-full bg-green-500" /> {summary.added} {summary.added > 1 ? t('ajouts') : t('ajout')}
                    </span>
                  )}
                  {summary.modified > 0 && (
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-yellow-700 bg-yellow-100/70 dark:text-yellow-300 dark:bg-yellow-900/30">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" /> {summary.modified} {summary.modified > 1 ? t('modifications') : t('modification')}
                    </span>
                  )}
                  {summary.removed > 0 && (
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold text-red-700 bg-red-100/70 dark:text-red-300 dark:bg-red-900/30">
                      <span className="h-2 w-2 rounded-full bg-red-500" /> {summary.removed} {summary.removed > 1 ? t('suppressions') : t('suppression')}
                    </span>
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
                        className="scroll-mt-20 py-6 border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                            {idx + 1}
                          </span>
                          <h2 className="text-lg font-bold leading-tight">{t(step.label)}</h2>
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
