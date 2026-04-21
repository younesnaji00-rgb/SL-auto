'use client';

import React, { useState, useMemo, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  AlertTriangle,
  History,
  AlertCircle,
  Download,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';
import { generateRapportPDF } from '@/lib/generate-rapport-pdf';

// ── Timeline ─────────────────────────────────────────────────────────────────
import { Timeline, DOSSIER_TIMELINE_STEPS } from '@/components/dossier-timeline/timeline';
import { useLastStep } from '@/hooks/use-last-step';
import Step1Import from '@/components/dossier-timeline/step-1-import';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const STATUS_COLORS: Record<string, string> = {
  'Nouveau':    'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  'En cours':   'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  'Cloture':    'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  'Annule':     'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
};

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
    return (
      <div className="flex flex-col gap-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!dossier) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Dossier introuvable</h2>
        <p className="text-muted-foreground">
          Le dossier que vous recherchez n'existe pas ou a été supprimé.
        </p>
        <Link href="/dossiers">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste
          </Button>
        </Link>
      </div>
    );
  }

  const statutColor = STATUS_COLORS[dossier.statut] ?? 'bg-muted text-muted-foreground border-border';

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
          <span className={cn('inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border', statutColor)}>
            {dossier.statut || 'Nouveau'}
          </span>
        </div>
      </div>

      {/* ACTION BUTTONS ROW */}
      {!readOnly && (
      <div className="bg-card border-b px-6 py-2 flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" onClick={() => setChiffrageModalOpen(true)} className="h-8 text-xs gap-1.5">
          <Send className="h-3.5 w-3.5" /> Envoyer vers chiffrage
        </Button>
        <Button variant="outline" size="sm" disabled={isExportingPdf} onClick={async () => {
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
          {isExportingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Exporter PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => setReclamationModalOpen(true)} className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" /> Réclamation
        </Button>
        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => setHistoriqueOpen(true)} className="h-8 text-xs gap-1.5">
          <History className="h-3.5 w-3.5" /> Historique
        </Button>
        <Button variant="default" size="sm" onClick={() => setDecisionStatusOpen(true)} className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700">
          <GitBranch className="h-3.5 w-3.5" /> Décision de statut
        </Button>
      </div>
      )}

      {/* TIMELINE CONTENT */}
      <div className="flex-1">
        <Timeline
          steps={DOSSIER_TIMELINE_STEPS}
          sections={{
            1: <Step1Import dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} />,
            2: <Step2Information dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} />,
            3: <Step3Planification dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} />,
            4: <Step4Pieces dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} />,
            5: <Step5Chiffrage dossierId={id} dossier={dossier} />,
            6: <Step6Rapport dossierId={id} dossier={dossier} dossierRef={dossierRef} readOnly={readOnly} />,
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
      <Dialog open={isHistoriqueOpen} onOpenChange={setHistoriqueOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Historique</DialogTitle></DialogHeader>
          <HistoriqueTab dossierId={id} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
