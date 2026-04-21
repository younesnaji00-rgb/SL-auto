'use client';

import React, { useState, useMemo, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  History,
  Download,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { PageLoader } from '@/components/ui/page-loader';
import { ErrorState } from '@/components/ui/error-state';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { generateRapportPDF } from '@/lib/generate-rapport-pdf';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';

// ── Timeline ─────────────────────────────────────────────────────────────────
import { Timeline, DOSSIER_TIMELINE_STEPS } from '@/components/dossier-timeline/timeline';
import { useLastStep } from '@/hooks/use-last-step';
import Step1Import from '@/components/dossier-timeline/step-1-import';
import Step2Observations from '@/components/dossier-timeline/step-2-observations';
import Step2Information from '@/components/dossier-timeline/step-2-information';
import Step3Planification from '@/components/dossier-timeline/step-3-planification';
import Step4Pieces from '@/components/dossier-timeline/step-4-pieces';
import Step5Chiffrage from '@/components/dossier-timeline/step-5-chiffrage';
import Step6Rapport from '@/components/dossier-timeline/step-6-rapport';

// ── Historique (kept for drawer dialog; full drawer in task #17) ─────────────
import HistoriqueTab from './historique-tab';

// ── Modals ────────────────────────────────────────────────────────────────────
import ModalPlanification from './modal-planification';
import ModalChiffrage from './modal-chiffrage';
import ModalReclamation from './modal-reclamation';
import ModalDecisionStatus from './modal-decision-status';
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
  const { toast } = useToast();
  const readOnly = !canWrite('dossiers');

  const [activeStep, setActiveStep] = useLastStep(id);

  // Modal states
  const [isPlanificationModalOpen, setPlanificationModalOpen] = useState(false);
  const [planificationInitialData, setPlanificationInitialData] = useState<any>(null);
  const [isChiffrageModalOpen, setChiffrageModalOpen] = useState(false);
  const [isReclamationModalOpen, setReclamationModalOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isDecisionStatusOpen, setDecisionStatusOpen] = useState(false);
  const [isHistoriqueOpen, setHistoriqueOpen] = useState(false);

  const renderAssure = (assure: any) => {
    if (!assure) return 'N/A';
    if (typeof assure === 'string') return assure;
    return `${assure.nom || ''} ${assure.prenom || ''}`.trim() || 'N/A';
  };

  const handleEditPlanification = (data: any) => {
    setPlanificationInitialData(data);
    setPlanificationModalOpen(true);
  };

  const handleNewPlanification = () => {
    setPlanificationInitialData(null);
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
          <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(dossier.statut || 'Nouveau'))}>
            {dossier.statut || 'Nouveau'}
          </Badge>
        </div>
      </div>

      {/* ACTION BUTTONS ROW */}
      {!readOnly && (
      <div className="bg-card border-b px-6 py-2 flex flex-wrap gap-2 items-center sticky top-0 z-40">
        <Button variant="outline" size="sm" onClick={() => setChiffrageModalOpen(true)} className="h-8 text-xs gap-1.5">
          <Send className="h-3.5 w-3.5" /> Envoyer vers chiffrage
        </Button>
        <Button variant="outline" size="sm" loading={isExportingPdf} onClick={async () => {
          setIsExportingPdf(true);
          try {
            await generateRapportPDF(db, id);
            toast({ title: 'PDF exporté avec succès' });
          } catch (e: any) {
            toast({ variant: 'destructive', title: "Erreur d'export", description: e.message });
          } finally {
            setIsExportingPdf(false);
          }
        }} className="h-8 text-xs gap-1.5">
          {isExportingPdf ? null : <Download className="h-3.5 w-3.5" />} Exporter PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => setReclamationModalOpen(true)} className="h-8 text-xs gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive">
          <AlertTriangle className="h-3.5 w-3.5" /> Réclamation
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setHistoriqueOpen(true)} className="h-8 text-xs gap-1.5">
          <History className="h-3.5 w-3.5" /> Historique
        </Button>
        <Button variant="default" size="sm" onClick={() => setDecisionStatusOpen(true)} className="h-8 text-xs gap-1.5">
          <GitBranch className="h-3.5 w-3.5" /> Décision de statut
        </Button>
      </div>
      )}

      {/* TIMELINE CONTENT */}
      <div className="flex-1">
        <Timeline
          dossierId={id}
          steps={DOSSIER_TIMELINE_STEPS}
          sections={{
            1: <Step1Import dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} />,
            2: <Step2Observations dossierId={id} />,
            3: <Step2Information dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} />,
            4: <Step3Planification dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} />,
            5: <Step4Pieces dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} />,
            6: <Step5Chiffrage dossierId={id} dossier={dossier} />,
            7: <Step6Rapport dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} />,
          }}
          activeStep={activeStep}
          onActiveStepChange={setActiveStep}
        />
      </div>

      {/* MODALS */}
      <ModalPlanification open={isPlanificationModalOpen} onOpenChange={setPlanificationModalOpen} dossierId={id} initialData={planificationInitialData} dossierData={dossier} />
      <ModalChiffrage open={isChiffrageModalOpen} onOpenChange={setChiffrageModalOpen} dossierId={id} />
      <ModalReclamation open={isReclamationModalOpen} onOpenChange={setReclamationModalOpen} dossierId={id} />
      <ModalDecisionStatus
        open={isDecisionStatusOpen}
        onOpenChange={setDecisionStatusOpen}
        dossierId={id}
        currentStatus={dossier.statut || 'Nouveau'}
        dossierRef={dossier.refExpert || id}
        currentObservation={dossier.observationDecision || ''}
        currentObservationUpdatedAt={dossier.observationDecisionUpdatedAt}
        currentObservationUpdatedBy={dossier.observationDecisionUpdatedBy}
        source="dossiers"
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
