'use client';

import React, { useState, useMemo, use, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  History,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PageLoader } from '@/components/ui/page-loader';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDossierTabs } from '@/hooks/use-dossier-tabs';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';

// ── Timeline ─────────────────────────────────────────────────────────────────
import { Timeline, DOSSIER_TIMELINE_STEPS } from '@/components/dossier-timeline/timeline';
import { useLastStep } from '@/hooks/use-last-step';
import Step1Import from '@/components/dossier-timeline/step-1-import';
import Step2Information from '@/components/dossier-timeline/step-2-information';
import Step3Planification from '@/components/dossier-timeline/step-3-planification';
import Step4Pieces from '@/components/dossier-timeline/step-4-pieces';
import Step5Chiffrage from '@/components/dossier-timeline/step-5-chiffrage';
import Step6Rapport from '@/components/dossier-timeline/step-6-rapport';
import ObservationsTab from '@/components/observations-tab';
import PhotosTab from '@/app/(app)/dossiers/[id]/photos-tab';

// ── Historique (kept for drawer dialog; full drawer in task #17) ─────────────
import HistoriqueTab from './historique-tab';

// ── Modals ────────────────────────────────────────────────────────────────────
import ModalPlanification from './modal-planification';
import ModalChiffrage from './modal-chiffrage';
import { EnvoyerEmailDialog } from '@/components/dossiers/envoyer-email-dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export default function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const db = useFirestore();
  const dossierRef = useMemo(() => doc(db, 'dossiers', id), [db, id]);
  const { data: dossier, loading } = useDoc(dossierRef);
  const { canWrite } = useCurrentUser();
  const readOnly = !canWrite('dossiers');
  const { openTab, refreshTabLabel } = useDossierTabs();

  // Register this dossier as an open tab (handles deep links) and keep the label in sync.
  useEffect(() => {
    if (!id) return;
    openTab(id);
  }, [id, openTab]);

  useEffect(() => {
    if (!id || !dossier) return;
    const d = dossier as { assure?: any };
    const a = d.assure;
    let label = '';
    if (typeof a === 'string') {
      label = a.trim();
    } else if (a && typeof a === 'object') {
      label = `${a.prenom || ''} ${a.nom || ''}`.trim();
    }
    if (!label) label = 'Sans nom';
    refreshTabLabel(id, label);
  }, [id, dossier, refreshTabLabel]);

  const [activeStep, setActiveStep] = useLastStep(id);

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

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* TOP HEADER */}
      <div className="bg-card px-6 py-4 border-b">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/dossiers">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-bold leading-tight">
                Dossier : <span className="text-primary">{dossier.refExpert || 'Sans Ref.'}</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {renderAssure(dossier.assure)} &bull; {dossier.compagnie || 'N/A'} &bull; {dossier.matricule || 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {dossier.lastObservation?.text && (
              <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/50">
                {dossier.lastObservation.text}
              </Badge>
            )}
            <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(dossier.statut || 'Nouveau'))}>
              {dossier.statut || 'Nouveau'}
            </Badge>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS ROW */}
      {!readOnly && (
      <div className="bg-card border-b px-6 py-2 flex flex-wrap gap-2 items-center sticky top-0 z-40">
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setEmailDialogOpen(true)} className="h-8 text-xs gap-1.5">
          <Mail className="h-3.5 w-3.5" /> Envoyer un email
        </Button>
        <Button variant="outline" size="sm" onClick={() => setHistoriqueOpen(true)} className="h-8 text-xs gap-1.5">
          <History className="h-3.5 w-3.5" /> Historique
        </Button>
      </div>
      )}

      {/* TIMELINE CONTENT */}
      <div className="flex-1">
        <Timeline
          dossierId={id}
          steps={DOSSIER_TIMELINE_STEPS}
          sections={{
            1: (
              <>
                <Step1Import dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} />
                <div className="mt-4">
                  <Step2Information dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} />
                </div>
                <div className="mt-4">
                  <Step4Pieces dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} onSendToChiffrage={() => setChiffrageModalOpen(true)} hidePhotos hideAccordSlots />
                </div>
              </>
            ),
            4: (
              <>
                <Step3Planification dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="Avant" />
                <div className="mt-4">
                  <PhotosTab dossierId={id} onlyCategory="avant" />
                </div>
                <div className="mt-4">
                  <ObservationsTab dossierId={id} section="dossiers" variant="collapsible" />
                </div>
              </>
            ),
            6: (
              <>
                <Step4Pieces dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} hidePhotos showOnlyAccordSlots hideCardinalPlus onlyImportTab />
                <div className="mt-4">
                  <Step5Chiffrage dossierId={id} cardinalFilter="1-only" hideEmptyState />
                </div>
                <div className="mt-4">
                  <ObservationsTab dossierId={id} section="dossiers" variant="collapsible" />
                </div>
              </>
            ),
            9: (
              <>
                <Step3Planification dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="En cours" />
                <div className="mt-4">
                  <PhotosTab dossierId={id} onlyCategory="en_cours" />
                </div>
                <div className="mt-4">
                  <ObservationsTab dossierId={id} section="dossiers" variant="collapsible" />
                </div>
              </>
            ),
            11: (
              <Step5Chiffrage dossierId={id} cardinalFilter="2-plus" />
            ),
            10: (
              <>
                <Step3Planification dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} typeFilter="Après" />
                <div className="mt-4">
                  <PhotosTab dossierId={id} onlyCategory="apres" />
                </div>
                <div className="mt-4">
                  <ObservationsTab dossierId={id} section="dossiers" variant="collapsible" />
                </div>
              </>
            ),
            7: <Step6Rapport dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} />,
            8: (
              <div className="rounded-lg border border-dashed border-border/40 bg-muted/20 p-8 text-center">
                <p className="text-sm font-semibold">Note d'honoraire</p>
                <p className="mt-1 text-xs text-muted-foreground">Cette section sera disponible ultérieurement.</p>
              </div>
            ),
          }}
          activeStep={activeStep}
          onActiveStepChange={setActiveStep}
        />
      </div>

      {/* MODALS */}
      <ModalPlanification open={isPlanificationModalOpen} onOpenChange={setPlanificationModalOpen} dossierId={id} initialData={planificationInitialData} dossierData={dossier} defaultTypeMission={planificationDefaultType ?? undefined} />
      <ModalChiffrage open={isChiffrageModalOpen} onOpenChange={setChiffrageModalOpen} dossierId={id} />
      <EnvoyerEmailDialog
        open={isEmailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        dossierId={id}
        refExpert={dossier.refExpert as string | undefined}
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
  );
}
