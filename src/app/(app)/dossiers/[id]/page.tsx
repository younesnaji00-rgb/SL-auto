'use client';

import React, { useState, useMemo, use, useCallback, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Calculator, Camera, CalendarPlus, FileText, MessageSquarePlus, Save, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore } from '@/firebase';
import { collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore';
import { ensureSnapshotBefore, captureSnapshotAfter, markTreatmentResolved } from '@/lib/rappel-session';
import { RappelDraftContext, useRappelDraftStore, applyPendingToDossier } from './rappel-draft';
import { useToast } from '@/hooks/use-toast';
import { PageLoader } from '@/components/ui/page-loader';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useT } from '@/i18n';

// ── Timeline ─────────────────────────────────────────────────────────────────
import { Timeline } from '@/components/dossier-timeline/timeline';
import { StepTabs, type StepTab } from '@/components/dossier-timeline/step-tabs';
import { useRequiredDocsStatus } from '@/hooks/use-required-docs-status';
import { getMissingRequiredFields } from '@/lib/required-fields';
import { useFocusMode } from '@/hooks/use-focus-mode';
import {
  gotoStep,
  hubUrl,
  historiqueUrl,
  parseLegacyStepHash,
  parseStepParam,
  registerStepNavigator,
  stepTabsKey,
  stepUrl,
  HISTORIQUE_VIEW,
  STEP_PARAM,
  TAB_PARAM,
  VIEW_PARAM,
} from '@/lib/step-navigation';
import { useSidebar } from '@/components/ui/sidebar';
import { ClipboardList, FolderOpen, CalendarDays, MessageSquare } from 'lucide-react';
import {
  findStep,
  getStepStatuses,
  nextStep as computeNextStep,
  photoCategoryForStep,
  primaryActionForStep,
  stepPosition,
  visitTypeForStep,
  type StepState,
} from '@/lib/dossier-steps';
import { RecordBar, RECORD_BAR_HEIGHT } from '@/components/dossiers/record-bar';
import { DossierContextPanel } from '@/components/dossiers/dossier-context-panel';
import { useLastStep } from '@/hooks/use-last-step';
import { useIsPhone } from '@/hooks/use-viewport-class';
import { BottomActionBar, type BottomActionBarPrimary, type BottomActionBarSecondary } from '@/components/layout/bottom-action-bar';
import Step1Import from '@/components/dossier-timeline/step-1-import';
import Step2Information from '@/components/dossier-timeline/step-2-information';
import Step3Planification from '@/components/dossier-timeline/step-3-planification';
import Step4Pieces from '@/components/dossier-timeline/step-4-pieces';
import Step6Rapport from '@/components/dossier-timeline/step-6-rapport';
import TypedDocumentsGrid from '@/components/dossier-timeline/typed-documents-grid';
import ObservationsTab, { NEW_OBSERVATION_EVENT } from '@/components/observations-tab';
import PhotosTab from '@/app/(app)/dossiers/[id]/photos-tab';

// ── Phone shells (mobile pass 2026-09-06 — research mobile-record-pages.md) ──
import { PhoneHub } from './phone/hub';
import { PhoneStepScreen } from './phone/step-screen';
import { PhoneHistoriqueScreen } from './phone/historique-screen';

// ── Historique (kept for drawer dialog; full drawer in task #17) ─────────────
import HistoriqueTab from './historique-tab';
import { tourDialogGuard } from '@/lib/tutorial/dialog-guard';

// ── Modals ────────────────────────────────────────────────────────────────────
import ModalPlanification from './modal-planification';
import ModalChiffrage from './modal-chiffrage';
import { EnvoyerEmailDialog } from '@/components/dossiers/envoyer-email-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Mirrors mes-rappels/page.tsx — must stay in sync.
const RAPPEL_SESSION_KEY = (dossierId: string) => `rappel-active-session-${dossierId}`;

/**
 * `sl:capture-photos` — the bottom action bar asks the mounted Photos facet to
 * open the in-app camera. The listener lives in `photos-tab.tsx`, which owns
 * the camera; kept as a literal so the two files stay independent.
 */
const CAPTURE_PHOTOS_EVENT = 'sl:capture-photos';

/**
 * Bottom-bar labels (E4: ONE primary, ≤ 24 characters, a French verb phrase —
 * the phrase IS the affordance, so no FAB). Shorter than the desktop record
 * bar's labels, which have the whole width of a 1 280 px row to spend.
 */
const PHONE_PRIMARY_LABEL: Record<string, string> = {
  planifier: 'Planifier la visite',
  chiffrage: 'Envoyer au chiffrage',
  rapport: 'Générer le rapport',
  honoraires: 'Déposer les honoraires',
};

type PhoneActionKind = 'planifier' | 'chiffrage' | 'rapport' | 'honoraires' | 'photos' | 'observation';

interface PhoneAction {
  label: string;
  kind: PhoneActionKind;
  icon: React.ReactNode;
  /** Visit phase / photo category the action targets. */
  stepId: number;
}

/**
 * The primary of a FACET (E4). A facet the reader can only read (Informations,
 * a documents grid with no send action) returns null and the caller falls back
 * to the step's own workflow action.
 */
function facetAction(step: StepState, tab: string | null): PhoneAction | null {
  if (!tab) return null;
  if (tab === 'photos') return { label: 'Prendre des photos', kind: 'photos', icon: <Camera />, stepId: step.id };
  if (tab === 'planification') return { label: 'Nouvelle planification', kind: 'planifier', icon: <CalendarPlus />, stepId: step.id };
  if (tab === 'observations') return { label: 'Nouvelle observation', kind: 'observation', icon: <MessageSquarePlus />, stepId: step.id };
  return null;
}

/** The step's own workflow action, or null when it has none. */
function workflowAction(step: StepState | null): PhoneAction | null {
  if (!step) return null;
  const a = primaryActionForStep(step.id);
  if (!a.kind) return null;
  return {
    label: PHONE_PRIMARY_LABEL[a.kind] ?? a.label,
    kind: a.kind,
    icon: a.kind === 'chiffrage' ? <Calculator /> : a.kind === 'planifier' ? <CalendarPlus /> : <FileText />,
    stepId: step.id,
  };
}

export default function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useT();
  // `useSearchParams` (the phone step grammar, E12) must sit under a Suspense
  // boundary — Next bails the tree out to the client otherwise.
  return (
    <Suspense fallback={<PageLoader label={t('Chargement du dossier…')} />}>
      <DossierDetail id={id} />
    </Suspense>
  );
}

function DossierDetail({ id }: { id: string }) {
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
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPhone = useIsPhone();

  // ── URL grammar (E12) ─────────────────────────────────────────────────────
  // `?etape=N&onglet=x` · `?vue=historique`, all on THIS route so the live
  // listeners and the workspace tab survive a step change. Harmless on desktop
  // (the long timeline ignores them).
  const urlStep = parseStepParam(searchParams.get(STEP_PARAM));
  const urlTab = searchParams.get(TAB_PARAM);
  const historiqueView = searchParams.get(VIEW_PARAM) === HISTORIQUE_VIEW;

  // Tab registration + label sync live in <RecordBar> (one label everywhere).
  const [activeStep, setActiveStep] = useLastStep(id);

  // On phones `gotoStep()` resolves to a real navigation — one history entry
  // per screen (E12) — so every existing caller (record bar, context column,
  // todos, « Voir » links) lands on the step screen without knowing it.
  useEffect(() => {
    if (!isPhone) return;
    return registerStepNavigator((dossierId, stepId, tab) => {
      router.push(stepUrl(dossierId, stepId, tab), { scroll: false });
    });
  }, [isPhone, router]);

  // The one way to jump to a step from the record bar / context column: the
  // Timeline unfolds + scrolls it, StepTabs switches tab (lib/step-navigation).
  const goToStep = useCallback(
    (stepId: number, tab?: string) => {
      // The phone never restores a "last viewed step" (GOV.UK's tested
      // finding, E12) — so it never writes one either: a phone visit must not
      // change where the desktop timeline opens.
      if (!isPhone) setActiveStep(stepId);
      gotoStep(id, stepId, tab);
    },
    [id, setActiveStep, isPhone],
  );

  // Legacy deep link `/dossiers/{id}#step-N` (Suivi d'équipe drawer, rappel
  // e-mails) → `?etape=N`. Desktop keeps scrolling the long page; the phone
  // gets a real step screen. Runs once per dossier load.
  const hashHandledRef = useRef<string | null>(null);
  useEffect(() => {
    if (loading || !dossier) return;
    const stepId = parseLegacyStepHash(window.location.hash);
    if (!stepId || hashHandledRef.current === id) return;
    hashHandledRef.current = id;
    if (isPhone) {
      // `replace`: the hash URL is not a screen the reader should come back to.
      router.replace(stepUrl(id, stepId), { scroll: false });
    } else {
      goToStep(stepId);
    }
  }, [loading, dossier, id, goToStep, isPhone, router]);

  // Per-step status computed from dossier data — drives the stepper, the
  // section chips and the record bar's primary action.
  // (`effectiveDossier` is defined below; the memo reads it lazily.)

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
      toast({ title: t('Traitement sauvegardé'), description: t('Vos modifications ont été enregistrées pour le responsable.') });
    } catch {
      toast({ title: t('Erreur'), description: t('Impossible de sauvegarder le traitement.'), variant: 'destructive' });
    } finally {
      setValidating(false);
    }
  };

  const stepStates = useMemo(() => getStepStatuses(effectiveDossier ?? dossier), [effectiveDossier, dossier]);

  // Modal states
  const [isPlanificationModalOpen, setPlanificationModalOpen] = useState(false);
  const [planificationInitialData, setPlanificationInitialData] = useState<any>(null);
  const [planificationDefaultType, setPlanificationDefaultType] = useState<'Avant' | 'En cours' | 'Après' | null>(null);
  const [isChiffrageModalOpen, setChiffrageModalOpen] = useState(false);
  const [isHistoriqueOpen, setHistoriqueOpen] = useState(false);
  const [isEmailDialogOpen, setEmailDialogOpen] = useState(false);

  const handleEditPlanification = (data: any) => {
    setPlanificationInitialData(data);
    setPlanificationModalOpen(true);
  };

  const handleNewPlanification = useCallback((defaultType?: 'Avant' | 'En cours' | 'Après') => {
    setPlanificationInitialData(null);
    setPlanificationDefaultType(defaultType ?? null);
    setPlanificationModalOpen(true);
  }, []);

  // Historique: a full screen on phones (`?vue=historique`, E9), the existing
  // right-hand Sheet on desktop.
  const openHistorique = useCallback(() => {
    if (isPhone) router.push(historiqueUrl(id), { scroll: false });
    else setHistoriqueOpen(true);
  }, [isPhone, router, id]);

  // `?onglet=` is a facet change inside the current screen, not a screen of
  // its own → `replace` (E12: one history entry per SCREEN).
  const setFacet = useCallback(
    (stepId: number, tab: string) => {
      router.replace(stepUrl(id, stepId, tab), { scroll: false });
    },
    [router, id],
  );

  if (loading) {
    return <PageLoader label={t('Chargement du dossier…')} />;
  }

  if (!dossier) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6">
        <ErrorState
          title={t('Dossier introuvable')}
          description={t("Le dossier que vous recherchez n'existe pas ou a été supprimé.")}
          className="max-w-md"
        />
        <Link href="/dossiers" className="mt-4">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('Retour à la liste')}
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

  // ── Facets, declared once ────────────────────────────────────────────────
  // The desktop timeline wraps each list in a <StepTabs>; the phone step
  // screen consumes the SAME arrays so a facet is described in one place and
  // the bottom action bar can read which one is open.
  const stepTabs: Record<number, StepTab[]> = {
    1: [
      {
        value: 'informations', label: t('Informations'), icon: <ClipboardList />,
        badge: missingFields.length > 0
          ? { kind: 'warn', label: `${missingFields.length} ${missingFields.length > 1 ? t('champs manquants') : t('champ manquant')}` }
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
        value: 'documents', label: t('Pièces'), icon: <FolderOpen />,
        badge: requiredDocs.loading
          ? undefined
          : { kind: requiredDocs.received >= requiredDocs.total ? 'ok' : 'progress', label: `${requiredDocs.received}/${requiredDocs.total}` },
        // No « Envoyer vers chiffrage » in step 1 (user ruling); the
        // record bar's primary action covers it when the step is ready.
        content: <Step4Pieces dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} hidePhotos hideAccordSlots showBaseGarageSlots hideOtherSlots showAllNonAccordSlots />,
      },
    ],
    4: [
      { value: 'planification', label: t('Planification'), icon: <CalendarDays />, content: <Step3Planification dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="Avant" /> },
      { value: 'photos', label: t('Photos'), icon: <Camera />, content: <PhotosTab dossierId={id} onlyCategory="avant" /> },
      // data-tour: the guided tour points at the observations pane here.
      { value: 'observations', label: t('Observations'), icon: <MessageSquare />, content: <div data-tour="dosd-observations"><ObservationsTab dossierId={id} section="dossiers" variant="tab" contextPhase="Avant" /></div> },
    ],
    6: [
      { value: 'documents', label: t('Documents'), icon: <FolderOpen />, content: <Step4Pieces dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onSendToChiffrage={() => setChiffrageModalOpen(true)} hidePhotos showOnlyAccordSlots hideCardinalPlus onlyImportTab showReformeSlots /> },
      { value: 'observations', label: t('Observations'), icon: <MessageSquare />, content: <ObservationsTab dossierId={id} section="dossiers" variant="tab" contextAccord="1er accord" /> },
    ],
    9: [
      { value: 'planification', label: t('Planification'), icon: <CalendarDays />, content: <Step3Planification dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="En cours" /> },
      { value: 'photos', label: t('Photos'), icon: <Camera />, content: <PhotosTab dossierId={id} onlyCategory="en_cours" /> },
      { value: 'observations', label: t('Observations'), icon: <MessageSquare />, content: <ObservationsTab dossierId={id} section="dossiers" variant="tab" contextPhase="En cours" /> },
    ],
    11: [
      // data-tour: the guided tour explains the cardinal-accord
      // serialization on this wrapper.
      { value: 'documents', label: t('Documents'), icon: <FolderOpen />, content: <div data-tour="dosd-accord2"><Step4Pieces dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onSendToChiffrage={() => setChiffrageModalOpen(true)} requireFirstAccordFilled hidePhotos showOnlyAccordSlots onlyImportTab cardinalFilter="2-plus" /></div> },
      { value: 'observations', label: t('Observations'), icon: <MessageSquare />, content: <ObservationsTab dossierId={id} section="dossiers" variant="tab" contextAccord="2ème accord ou +" /> },
    ],
    10: [
      { value: 'planification', label: t('Planification'), icon: <CalendarDays />, content: <Step3Planification dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="Après" /> },
      { value: 'photos', label: t('Photos'), icon: <Camera />, content: <PhotosTab dossierId={id} onlyCategory="apres" /> },
      { value: 'observations', label: t('Observations'), icon: <MessageSquare />, content: <ObservationsTab dossierId={id} section="dossiers" variant="tab" contextPhase="Après" /> },
    ],
  };

  /** Steps whose section is a single surface, not a facet strip. */
  const singleSections: Record<number, React.ReactNode> = {
    7: <Step6Rapport dossierId={id} dossier={viewDossier} dossierRef={dossierRef} readOnly={readOnly} />,
    8: <TypedDocumentsGrid dossierId={id} showOnlyNoteHonoraire />,
  };

  const sections: Record<number, React.ReactNode> = {
    ...Object.fromEntries(
      Object.entries(stepTabs).map(([stepId, tabs]) => [
        Number(stepId),
        <StepTabs key={stepId} storageKey={stepTabsKey(id, Number(stepId))} tabs={tabs} />,
      ]),
    ),
    ...singleSections,
  };

  // ── Phone: hub · step screen · historique screen ─────────────────────────
  const phoneStep = isPhone ? findStep(stepStates, urlStep) : null;
  const phoneTabs = phoneStep ? stepTabs[phoneStep.id] ?? null : null;
  const phoneFacet = phoneStep
    ? (phoneTabs && phoneTabs.some((tab) => tab.value === urlTab) ? urlTab : phoneTabs?.[0]?.value ?? null)
    : null;

  const runPhoneAction = (action: PhoneAction) => {
    switch (action.kind) {
      case 'planifier':
        return handleNewPlanification(visitTypeForStep(action.stepId) ?? undefined);
      case 'chiffrage':
        return setChiffrageModalOpen(true);
      case 'rapport':
        return goToStep(7);
      case 'honoraires':
        return goToStep(8);
      case 'photos':
        // The mounted Photos facet owns the camera (photos-tab.tsx listens).
        return window.dispatchEvent(
          new CustomEvent(CAPTURE_PHOTOS_EVENT, { detail: { category: photoCategoryForStep(action.stepId) ?? undefined } }),
        );
      case 'observation':
        return window.dispatchEvent(new CustomEvent(NEW_OBSERVATION_EVENT));
    }
  };

  // ONE primary (E4): the next step's workflow action on the hub, the facet's
  // own primary on a step screen (falling back to that step's workflow action).
  // Read-only roles get no bar at all — the content takes the height back.
  const next = computeNextStep(stepStates);
  // On a step screen an action that only NAVIGATES to the step already in view
  // (Rapport, Note d'honoraire — those surfaces carry their own generate
  // button) is not an action: the bar stays empty rather than offering a
  // button that does nothing.
  const ownStepAction = (() => {
    if (!phoneStep) return null;
    const a = workflowAction(phoneStep);
    return a && (a.kind === 'rapport' || a.kind === 'honoraires') ? null : a;
  })();
  const barAction: PhoneAction | null = readOnly
    ? null
    : phoneStep
      ? facetAction(phoneStep, phoneFacet) ?? ownStepAction
      : workflowAction(next);

  // A blocked step's primary stays visible but disabled, with the reason as
  // the caption — "disabled buttons without explanation" is the do-not.
  const barBlockedReason = phoneStep?.status === 'blocked' ? phoneStep.blockedReason : undefined;

  // The phone top bar's title + up-link, resolved for the screen in view (E3).
  // « ‹ Dossier » from a sub-screen, « ‹ Dossiers » from the hub.
  const phoneTitle = historiqueView
    ? t('Historique')
    : phoneStep
      ? `${stepPosition(phoneStep.id)} · ${t(phoneStep.label)}`
      : null;
  const onSubScreen = historiqueView || !!phoneStep;

  // A read-only reader never gets a bar — not even the rappel one (the draft
  // buffer is inactive for them, so there would be nothing to save).
  const rappelActive = !!activeRappel && !readOnly;
  const barPrimary: BottomActionBarPrimary | null = rappelActive
    ? {
        // The rappel session owns the bar while it runs (E4): the amber save
        // that used to be squeezed into the 48 px record bar.
        label: draftStore.pendingCount > 0 ? `${t('Sauvegarder')} (${draftStore.pendingCount})` : t('Sauvegarder'),
        icon: <Save />,
        variant: 'amber',
        onClick: handleValiderTraitement,
        loading: validating,
        dataTour: 'dosd-rappel-save-phone',
      }
    : barAction
      ? {
          label: t(barAction.label),
          icon: barAction.icon,
          onClick: () => runPhoneAction(barAction),
          disabled: !!barBlockedReason,
        }
      : null;

  const barSecondary: BottomActionBarSecondary[] =
    rappelActive && draftStore.pendingCount > 0
      ? [
          {
            label: t('Annuler'),
            icon: <Undo2 />,
            onClick: () => {
              if (window.confirm(t('Abandonner les modifications non sauvegardées de cette session de rappel ?'))) {
                draftStore.discard();
              }
            },
          },
        ]
      : [];

  const phoneBar =
    isPhone && !historiqueView && (barPrimary || barSecondary.length > 0) ? (
      <BottomActionBar
        primary={barPrimary}
        secondary={barSecondary}
        caption={barBlockedReason ? t(barBlockedReason) : undefined}
      />
    ) : null;

  return (
    <RappelDraftContext.Provider value={draftStore}>
    <div className="flex min-h-full flex-col">
      {/* RECORD BAR — the only sticky row above the stepper. Below `md` it
          paints nothing and publishes itself into the phone top bar (E3);
          the step / historique screens override the title and the up-link. */}
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
                  if (window.confirm(t('Abandonner les modifications non sauvegardées de cette session de rappel ?'))) {
                    draftStore.discard();
                  }
                },
              }
            : undefined
        }
        onEmail={() => setEmailDialogOpen(true)}
        onHistorique={openHistorique}
        onPlanifier={(type) => handleNewPlanification(type)}
        onChiffrage={() => setChiffrageModalOpen(true)}
        onGoToStep={goToStep}
        phoneTitle={phoneTitle}
        upHref={onSubScreen ? hubUrl(id) : '/dossiers'}
        upLabel={onSubScreen ? 'Dossier' : 'Dossiers'}
      />

      {isPhone ? (
        historiqueView ? (
          <PhoneHistoriqueScreen dossierId={id} />
        ) : phoneStep ? (
          <PhoneStepScreen
            dossierId={id}
            steps={stepStates}
            step={phoneStep}
            tabs={phoneTabs}
            content={singleSections[phoneStep.id]}
            activeTab={phoneFacet}
            onTabChange={(tab) => setFacet(phoneStep.id, tab)}
          />
        ) : (
          <PhoneHub
            dossierId={id}
            dossier={viewDossier}
            steps={stepStates}
            requiredDocs={requiredDocs.status}
            readOnly={readOnly}
            onGoToStep={goToStep}
            onPlanifier={(type) => handleNewPlanification(type)}
            onChiffrage={() => setChiffrageModalOpen(true)}
          />
        )
      ) : (
        /* TIMELINE CONTENT (+ context column on wide screens) — unchanged. */
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
            sections={sections}
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
            onOpenHistorique={openHistorique}
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
      )}

      {phoneBar}

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
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto"
          data-tour="dosd-historique-sheet"
          {...tourDialogGuard()}
        >
          <SheetHeader>
            <SheetTitle>{t('Historique')}</SheetTitle>
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
