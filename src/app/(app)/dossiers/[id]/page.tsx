'use client';

import React, { useState, useMemo, use, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  Save,
  History,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore } from '@/firebase';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { ensureSnapshotBefore, captureSnapshotAfter, markTreatmentResolved } from '@/lib/rappel-session';
import { RappelDraftContext, useRappelDraftStore, applyPendingToDossier } from './rappel-draft';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/page-loader';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDossierTabs } from '@/hooks/use-dossier-tabs';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';

// ── Timeline ─────────────────────────────────────────────────────────────────
import { Timeline } from '@/components/dossier-timeline/timeline';
import { StepTabs } from '@/components/dossier-timeline/step-tabs';
import { useRequiredDocsStatus } from '@/hooks/use-required-docs-status';
import { getMissingRequiredFields } from '@/lib/required-fields';
import { useFocusMode } from '@/hooks/use-focus-mode';
import { gotoStep, stepTabsKey } from '@/lib/step-navigation';
import { useSidebar } from '@/components/ui/sidebar';
import { ClipboardList, FolderOpen, CalendarDays, Camera, MessageSquare } from 'lucide-react';
import { getStepStatuses } from '@/lib/dossier-steps';
import { RecordBar, RECORD_BAR_HEIGHT } from '@/components/dossiers/record-bar';
import { DossierContextPanel } from '@/components/dossiers/dossier-context-panel';
import { useLastStep } from '@/hooks/use-last-step';
import Step1Import from '@/components/dossier-timeline/step-1-import';
import Step2Information from '@/components/dossier-timeline/step-2-information';
import Step3Planification from '@/components/dossier-timeline/step-3-planification';
import Step4Pieces from '@/components/dossier-timeline/step-4-pieces';
import Step6Rapport from '@/components/dossier-timeline/step-6-rapport';
import TypedDocumentsGrid from '@/components/dossier-timeline/typed-documents-grid';
import ObservationsTab from '@/components/observations-tab';
import PhotosTab from '@/app/(app)/dossiers/[id]/photos-tab';

// ── Historique (kept for drawer dialog; full drawer in task #17) ─────────────
import HistoriqueTab from './historique-tab';

// ── Modals ────────────────────────────────────────────────────────────────────
import ModalPlanification from './modal-planification';
import ModalChiffrage from './modal-chiffrage';
import { EnvoyerEmailDialog } from '@/components/dossiers/envoyer-email-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Mirrors mes-rappels/page.tsx — must stay in sync.
const RAPPEL_SESSION_KEY = (dossierId: string) => `rappel-active-session-${dossierId}`;

export default function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const db = useFirestore();
  const dossierRef = useMemo(() => doc(db, 'dossiers', id), [db, id]);
  const { data: dossier, loading } = useDoc(dossierRef);
  // Badges the Pièces tab (n/m required pieces) so its state is visible
  // without opening it.
  const requiredDocs = useRequiredDocsStatus(id);
  // Focus mode (raised by « Comparer »): collapse the app sidebar, retract the
  // steps rail and the context column so the section gets the full width.
  const focusMode = useFocusMode();
  const { open: sidebarOpen, setOpen: setSidebarOpen, isMobile: sidebarIsMobile } = useSidebar();
  const sidebarWasOpen = useRef<boolean | null>(null);
  useEffect(() => {
    if (sidebarIsMobile) return;
    if (focusMode) {
      if (sidebarWasOpen.current === null) sidebarWasOpen.current = sidebarOpen;
      setSidebarOpen(false);
    } else if (sidebarWasOpen.current !== null) {
      setSidebarOpen(sidebarWasOpen.current);
      sidebarWasOpen.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMode, sidebarIsMobile]);
  const { canWrite, profile } = useCurrentUser();
  const readOnly = !canWrite('dossiers');
  const { toast } = useToast();

  // Active rappel-treatment session for this dossier (recipient-only).
  // Drives the sticky "Valider le traitement" banner. Looked up via the
  // localStorage handshake set by mes-rappels/page.tsx on row click.
  const [activeRappel, setActiveRappel] = useState<{ id: string; sessionId: string } | null>(null);
  const [validating, setValidating] = useState(false);

  // Rappel draft buffer — while a rappel session is active, dossier-field
  // writes from the editing surfaces are held here (mirrored to localStorage)
  // and only reach Firestore when « Sauvegarder » flushes them. Keyed by
  // sessionId so a later, different rappel never inherits stale edits.
  const draftStore = useRappelDraftStore({
    dossierId: id,
    storageKey: activeRappel ? `rappel-draft-${id}-${activeRappel.sessionId}` : null,
    active: !!activeRappel && !readOnly,
  });

  // What the page (and every child editing surface) displays: the live
  // snapshot with the pending buffer applied on top. Identical to `dossier`
  // outside a rappel session.
  const effectiveDossier = useMemo(
    () => (draftStore.active ? applyPendingToDossier(dossier, draftStore.pending) : dossier),
    [dossier, draftStore.active, draftStore.pending],
  );

  // Recipient-side read receipt: on dossier mount, mark any unread rappels
  // for the current user × this dossier as read. Idempotent — no-op when
  // there are no unread rappels.
  useEffect(() => {
    if (!db || !id || !profile?.uid) return;
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, 'rappels'),
          where('recipientUid', '==', profile.uid),
          where('dossierId', '==', id),
          where('read', '==', false),
        );
        const snap = await getDocs(q);
        if (cancelled || snap.empty) return;
        const batch = writeBatch(db);
        snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
        await batch.commit();
      } catch (err) {
        console.warn('[dossier-page] read-receipt update failed', err);
      }
    })();
    return () => { cancelled = true; };
  }, [db, id, profile?.uid]);

  // Resolve the active rappel session (if any) tied to this dossier × user.
  // Reads the localStorage handshake set by mes-rappels/page.tsx, then looks
  // up the unresolved rappel doc. If the handshake is stale (no matching
  // unresolved rappel), clear it.
  useEffect(() => {
    if (!db || !id || !profile?.uid) {
      setActiveRappel(null);
      return;
    }
    let cancelled = false;
    let sid: string | null = null;
    try {
      if (typeof window !== 'undefined') {
        sid = window.localStorage.getItem(RAPPEL_SESSION_KEY(id));
      }
    } catch {
      sid = null;
    }
    if (!sid) {
      setActiveRappel(null);
      return;
    }
    (async () => {
      try {
        const q = query(
          collection(db, 'rappels'),
          where('recipientUid', '==', profile.uid),
          where('dossierId', '==', id),
          where('sessionId', '==', sid),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        // Show the "Sauvegarder" button whenever this dossier was opened from a
        // rappel (localStorage handshake) and a matching rappel exists — even if
        // it was already saved once (resolvedAt set), so the gestionnaire can
        // re-save after further edits. The key is set ONLY by the mes-rappels
        // row click, so a plain "Gestion des dossiers" visit never shows it.
        const match = snap.docs[0];
        if (match) {
          setActiveRappel({ id: match.id, sessionId: sid! });
        } else {
          setActiveRappel(null);
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem(RAPPEL_SESSION_KEY(id));
            }
          } catch {}
        }
      } catch (err) {
        console.warn('[dossier-page] active rappel lookup failed', err);
        setActiveRappel(null);
      }
    })();
    return () => { cancelled = true; };
  }, [db, id, profile?.uid]);

  // Freeze the dossier + subcollections at session start (once), so the
  // manager's read-only replica can diff exactly what the gestionnaire
  // added / modified / removed. Idempotent — only the first call writes.
  const baselineCapturedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!db || !activeRappel || !dossier) return;
    if (baselineCapturedRef.current === activeRappel.id) return;
    baselineCapturedRef.current = activeRappel.id;
    ensureSnapshotBefore(db, activeRappel.id, id, dossier);
  }, [db, activeRappel, dossier, id]);

  const handleValiderTraitement = async () => {
    if (!db || !activeRappel || validating) return;
    setValidating(true);
    try {
      // 1. Publish the session's buffered edits — this is the ONLY moment the
      //    dossier document receives what was done from Mes Rappels.
      await draftStore.flush();
      // 2. Freeze the dossier as the gestionnaire leaves it, diff it against
      //    the session-start snapshot, and record the add/modify/remove sets.
      //    `effectiveDossier` (live snapshot + buffer) equals the post-flush
      //    state without waiting for the listener to catch up. The
      //    localStorage key is cleared LAST so in-flight tagged writes still land.
      await captureSnapshotAfter(db, activeRappel.id, id, effectiveDossier);
      await markTreatmentResolved(db, activeRappel.id);
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(RAPPEL_SESSION_KEY(id));
        }
      } catch {}
      setActiveRappel(null);
      toast({ title: 'Traitement sauvegardé', description: 'Vos modifications ont été enregistrées pour le responsable.' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder le traitement.', variant: 'destructive' });
    } finally {
      setValidating(false);
    }
  };

  // Tab registration + label sync live in <RecordBar> (one label everywhere).
  const [activeStep, setActiveStep] = useLastStep(id);
  // The one way to jump to a step from the record bar / context column: the
  // Timeline unfolds + scrolls it, StepTabs switches tab (lib/step-navigation).
  const goToStep = useCallback(
    (stepId: number, tab?: string) => {
      setActiveStep(stepId);
      gotoStep(id, stepId, tab);
    },
    [id, setActiveStep],
  );
  // Deep link: `/dossiers/{id}#step-N` (Suivi d'équipe drawer, rappels) lands
  // on that step once the timeline is mounted. Runs once per dossier load.
  const hashHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !dossier) return;
    const m = /^#step-(d+)$/.exec(window.location.hash);
    if (!m || hashHandledRef.current === id) return;
    hashHandledRef.current = id;
    goToStep(Number(m[1]));
  }, [loading, dossier, id, goToStep]);

  // Per-step status computed from dossier data — drives the stepper, the
  // section chips and the record bar's primary action.
  const stepStates = useMemo(() => getStepStatuses(effectiveDossier ?? dossier), [effectiveDossier, dossier]);

  // Modal states
  const [isPlanificationModalOpen, setPlanificationModalOpen] = useState(false);
  const [planificationInitialData, setPlanificationInitialData] = useState<any>(null);
  const [planificationDefaultType, setPlanificationDefaultType] = useState<'Avant' | 'En cours' | 'Après' | null>(null);
  const [isChiffrageModalOpen, setChiffrageModalOpen] = useState(false);
  const [isHistoriqueOpen, setHistoriqueOpen] = useState(false);
  const [isEmailDialogOpen, setEmailDialogOpen] = useState(false);

  const renderAssure = (assure: any) => {
    if (!assure) return 'N/A';
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || 'N/A';
  };

  const handleEditPlanification = (data: any) => {
    setPlanificationInitialData(data);
    setPlanificationModalOpen(true);
  };

  const handleNewPlanification = (defaultType?: 'Avant' | 'En cours' | 'Après') => {
    setPlanificationInitialData(null);
    setPlanificationDefaultType(defaultType ?? null);
    setPlanificationModalOpen(true);
  };

  if (loading) {
    return <PageLoader label="Chargement du dossier…" />;
  }

  if (!dossier) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <ErrorState
          title="Dossier introuvable"
          description="Le dossier que vous recherchez n'existe pas ou a été supprimé."
          className="max-w-md"
        />
        <Link href="/dossiers" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste
          </Button>
        </Link>
      </div>
    );
  }

  // Non-null view of the dossier for the render tree (`dossier` is non-null
  // past the guard above; the overlay of a non-null doc is non-null).
  const viewDossier = effectiveDossier ?? dossier;
  // Badges the Informations tab with the number of still-empty required fields.
  const missingFields = getMissingRequiredFields(viewDossier);

  return (
    <RappelDraftContext.Provider value={draftStore}>
    <div className="flex min-h-full flex-col">
      {/* RECORD BAR — the only sticky row above the stepper */}
      <RecordBar
        dossierId={id}
        dossier={viewDossier}
        steps={stepStates}
        readOnly={readOnly}
        activeStepId={activeStep}
        rappel={
          activeRappel
            ? {
                active: true,
                pendingCount: draftStore.pendingCount,
                validating,
                onSave: handleValiderTraitement,
                onDiscard: () => {
                  if (window.confirm('Abandonner les modifications non sauvegardées de cette session de rappel ?')) {
                    draftStore.discard();
                  }
                },
              }
            : undefined
        }
        onEmail={() => setEmailDialogOpen(true)}
        onHistorique={() => setHistoriqueOpen(true)}
        onPlanifier={(type) => handleNewPlanification(type)}
        onChiffrage={() => setChiffrageModalOpen(true)}
        onGoToStep={goToStep}
      />

      {/* TIMELINE CONTENT (+ context column on wide screens) */}
      <div
        className={cn(
          'flex-1 transition-[grid-template-columns,gap,padding] duration-300 ease-standard motion-reduce:transition-none xl:grid',
          focusMode ? 'xl:grid-cols-[minmax(0,1fr)_0px] xl:gap-0 xl:pr-0' : 'xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-6 xl:pr-5',
        )}
      >
        <Timeline
          focus={focusMode}
          dossierId={id}
          stickyTop={RECORD_BAR_HEIGHT}
          steps={stepStates}
          sections={{
            1: (
              <StepTabs
                storageKey={stepTabsKey(id, 1)}
                tabs={[
                  {
                    value: 'informations', label: 'Informations', icon: <ClipboardList />,
                    badge: missingFields.length > 0
                      ? { kind: 'warn', label: `${missingFields.length} champ${missingFields.length > 1 ? 's' : ''} manquant${missingFields.length > 1 ? 's' : ''}` }
                      : undefined,
                    content: (
                      <div className="space-y-6">
                        {/* One-line pre-fill row (picker + source status); the source
                            document itself is shown beside the form by Step2Information. */}
                        <Step1Import dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} compact />
                        <Step2Information dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} />
                      </div>
                    ),
                  },
                  {
                    value: 'documents', label: 'Pièces', icon: <FolderOpen />,
                    badge: requiredDocs.loading
                      ? undefined
                      : { kind: requiredDocs.received >= requiredDocs.total ? 'ok' : 'progress', label: `${requiredDocs.received}/${requiredDocs.total}` },
                    // No « Envoyer vers chiffrage » in step 1 (user ruling); the
                    // record bar's primary action covers it when the step is ready.
                    content: <Step4Pieces dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} hidePhotos hideAccordSlots showBaseGarageSlots hideOtherSlots showAllNonAccordSlots />,
                  },
                ]}
              />
            ),
            4: (
              <StepTabs
                storageKey={stepTabsKey(id, 4)}
                tabs={[
                  { value: 'planification', label: 'Planification', icon: <CalendarDays />, content: <Step3Planification dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="Avant" /> },
                  { value: 'photos', label: 'Photos', icon: <Camera />, content: <PhotosTab dossierId={id} onlyCategory="avant" /> },
                  { value: 'observations', label: 'Observations', icon: <MessageSquare />, content: <ObservationsTab dossierId={id} section="dossiers" variant="tab" contextPhase="Avant" /> },
                ]}
              />
            ),
            6: (
              <StepTabs
                storageKey={stepTabsKey(id, 6)}
                tabs={[
                  { value: 'documents', label: 'Documents', icon: <FolderOpen />, content: <Step4Pieces dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onSendToChiffrage={() => setChiffrageModalOpen(true)} hidePhotos showOnlyAccordSlots hideCardinalPlus onlyImportTab showReformeSlots /> },
                  { value: 'observations', label: 'Observations', icon: <MessageSquare />, content: <ObservationsTab dossierId={id} section="dossiers" variant="tab" contextAccord="1er accord" /> },
                ]}
              />
            ),
            9: (
              <StepTabs
                storageKey={stepTabsKey(id, 9)}
                tabs={[
                  { value: 'planification', label: 'Planification', icon: <CalendarDays />, content: <Step3Planification dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="En cours" /> },
                  { value: 'photos', label: 'Photos', icon: <Camera />, content: <PhotosTab dossierId={id} onlyCategory="en_cours" /> },
                  { value: 'observations', label: 'Observations', icon: <MessageSquare />, content: <ObservationsTab dossierId={id} section="dossiers" variant="tab" contextPhase="En cours" /> },
                ]}
              />
            ),
            11: (
              <StepTabs
                storageKey={stepTabsKey(id, 11)}
                tabs={[
                  { value: 'documents', label: 'Documents', icon: <FolderOpen />, content: <Step4Pieces dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onSendToChiffrage={() => setChiffrageModalOpen(true)} requireFirstAccordFilled hidePhotos showOnlyAccordSlots onlyImportTab cardinalFilter="2-plus" /> },
                  { value: 'observations', label: 'Observations', icon: <MessageSquare />, content: <ObservationsTab dossierId={id} section="dossiers" variant="tab" contextAccord="2ème accord ou +" /> },
                ]}
              />
            ),
            10: (
              <StepTabs
                storageKey={stepTabsKey(id, 10)}
                tabs={[
                  { value: 'planification', label: 'Planification', icon: <CalendarDays />, content: <Step3Planification dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="Après" /> },
                  { value: 'photos', label: 'Photos', icon: <Camera />, content: <PhotosTab dossierId={id} onlyCategory="apres" /> },
                  { value: 'observations', label: 'Observations', icon: <MessageSquare />, content: <ObservationsTab dossierId={id} section="dossiers" variant="tab" contextPhase="Après" /> },
                ]}
              />
            ),
            7: <Step6Rapport dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} />,
            8: (
              <TypedDocumentsGrid dossierId={id} showOnlyNoteHonoraire />
            ),
          }}
          activeStep={activeStep}
          onActiveStepChange={setActiveStep}
        />
        <div className="hidden min-w-0 overflow-clip xl:sticky xl:top-[60px] xl:block xl:self-start" aria-hidden={focusMode || undefined}>
        <DossierContextPanel
          dossierId={id}
          dossier={viewDossier}
          steps={stepStates}
          requiredDocs={requiredDocs.status}
          readOnly={readOnly}
          onOpenHistorique={() => setHistoriqueOpen(true)}
          onGoToStep={goToStep}
          onPlanifier={(type) => handleNewPlanification(type)}
          onChiffrage={() => setChiffrageModalOpen(true)}
          className={cn(
            // Fade-through weighting (owner option D2): out 100ms, in 200ms
            // after the tracks have moved (delay 100).
            'flex w-[280px] max-h-[calc((100svh-7rem)/var(--app-zoom))] overflow-y-auto overflow-x-hidden pt-4 scrollbar-thin transition-[opacity,transform] ease-standard motion-reduce:transition-none',
            focusMode ? '-translate-x-3 opacity-0 duration-100' : 'translate-x-0 opacity-100 duration-200 delay-100',
          )}
        />
        </div>
      </div>

      {/* MODALS */}
      <ModalPlanification open={isPlanificationModalOpen} onOpenChange={setPlanificationModalOpen} dossierId={id} initialData={planificationInitialData} dossierData={viewDossier} defaultTypeMission={planificationDefaultType ?? undefined} />
      <ModalChiffrage open={isChiffrageModalOpen} onOpenChange={setChiffrageModalOpen} dossierId={id} />
      <EnvoyerEmailDialog
        open={isEmailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        dossierId={id}
        refExpert={viewDossier.refExpert as string | undefined}
      />
      <Sheet open={isHistoriqueOpen} onOpenChange={setHistoriqueOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Historique</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <HistoriqueTab dossierId={id} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
    </RappelDraftContext.Provider>
  );
}
