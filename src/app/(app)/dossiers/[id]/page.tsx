'use client';

import React, { useState, useMemo, use, useEffect, useRef } from 'react';
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

  return (
    <RappelDraftContext.Provider value={draftStore}>
    <div className="flex min-h-full flex-col bg-background">
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
        onGoToStep={(stepId) => {
          setActiveStep(stepId);
          document.getElementById(`step-${stepId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />

      {/* TIMELINE CONTENT (+ context column on wide screens) */}
      <div className="flex-1 xl:grid xl:grid-cols-[minmax(0,1fr)_280px] xl:gap-6 xl:pr-5">
        <Timeline
          dossierId={id}
          stickyTop={RECORD_BAR_HEIGHT}
          steps={stepStates}
          sections={{
            1: (
              <>
                <Step1Import dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} />
                <div className="mt-4">
                  <Step2Information dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} />
                </div>
                <div className="mt-4">
                  <Step4Pieces dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onSendToChiffrage={() => setChiffrageModalOpen(true)} hidePhotos hideAccordSlots showBaseGarageSlots hideOtherSlots showAllNonAccordSlots />
                </div>
              </>
            ),
            4: (
              <>
                <Step3Planification dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="Avant" />
                <div className="mt-4">
                  <PhotosTab dossierId={id} onlyCategory="avant" />
                </div>
                <div className="mt-4">
                  <ObservationsTab dossierId={id} section="dossiers" variant="collapsible" contextPhase="Avant" />
                </div>
              </>
            ),
            6: (
              <>
                <Step4Pieces dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onSendToChiffrage={() => setChiffrageModalOpen(true)} hidePhotos showOnlyAccordSlots hideCardinalPlus onlyImportTab showReformeSlots />
                <div className="mt-4">
                  <ObservationsTab dossierId={id} section="dossiers" variant="collapsible" contextAccord="1er accord" />
                </div>
              </>
            ),
            9: (
              <>
                <Step3Planification dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="En cours" />
                <div className="mt-4">
                  <PhotosTab dossierId={id} onlyCategory="en_cours" />
                </div>
                <div className="mt-4">
                  <ObservationsTab dossierId={id} section="dossiers" variant="collapsible" contextPhase="En cours" />
                </div>
              </>
            ),
            11: (
              <>
                <Step4Pieces dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onSendToChiffrage={() => setChiffrageModalOpen(true)} requireFirstAccordFilled hidePhotos showOnlyAccordSlots onlyImportTab cardinalFilter="2-plus" />
                <div className="mt-4">
                  <ObservationsTab dossierId={id} section="dossiers" variant="collapsible" contextAccord="2ème accord ou +" />
                </div>
              </>
            ),
            10: (
              <>
                <Step3Planification dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="Après" />
                <div className="mt-4">
                  <PhotosTab dossierId={id} onlyCategory="apres" />
                </div>
                <div className="mt-4">
                  <ObservationsTab dossierId={id} section="dossiers" variant="collapsible" contextPhase="Après" />
                </div>
              </>
            ),
            7: <Step6Rapport dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} />,
            8: (
              <TypedDocumentsGrid dossierId={id} showOnlyNoteHonoraire />
            ),
          }}
          activeStep={activeStep}
          onActiveStepChange={setActiveStep}
        />
        <DossierContextPanel
          dossierId={id}
          onOpenHistorique={() => setHistoriqueOpen(true)}
          onGoToStep={(stepId) => {
            setActiveStep(stepId);
            document.getElementById(`step-${stepId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="hidden xl:flex xl:sticky xl:top-[60px] xl:max-h-[calc(100svh-7rem)] xl:self-start xl:overflow-y-auto xl:pt-4"
        />
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
