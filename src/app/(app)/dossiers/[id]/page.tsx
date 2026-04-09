'use client';

import React, { useState, useMemo, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Send,
  Calculator,
  Camera,
  AlertTriangle,
  ClipboardList,
  BarChart2,
  History,
  AlertCircle,
  FileText,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useDoc, useFirestore } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ── Tabs ─────────────────────────────────────────────────────────────────────
import InformationTab from './information-tab';
import DocumentsTab from './documents-tab';
import PhotosTab from './photos-tab';
import ChiffrageTab from './chiffrage-tab';
import CommentairesTab from './commentaires-tab';
import RapportTab from './rapport-tab';
import HistoriqueTab from './historique-tab';

// ── Modals ────────────────────────────────────────────────────────────────────
import ModalPlanification from './modal-planification';
import ModalChiffrage from './modal-chiffrage';
import ModalReclamation from './modal-reclamation';
import ModalExportPdf from './modal-export-pdf';

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'informations',  label: 'Informations',   icon: ClipboardList },
  { id: 'photos',        label: 'Photos',         icon: Camera },
  { id: 'documents',     label: 'Documents',      icon: FileText },
  { id: 'chiffrage',     label: 'Chiffrage',      icon: Calculator },
  { id: 'rapport',       label: 'Rapport',        icon: BarChart2 },
  { id: 'historique',    label: 'Historique',     icon: History },
] as const;

type TabId = (typeof TABS)[number]['id'];

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

  const [activeTab, setActiveTab] = useState<TabId>('informations');

  // Modal states
  const [isPlanificationModalOpen, setPlanificationModalOpen] = useState(false);
  const [planificationInitialData, setPlanificationInitialData] = useState<any>(null);
  const [isChiffrageModalOpen, setChiffrageModalOpen] = useState(false);
  const [isReclamationModalOpen, setReclamationModalOpen] = useState(false);
  const [isExportModalOpen, setExportModalOpen] = useState(false);

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
      <div className="bg-card border-b px-6 py-2 flex flex-wrap gap-2 items-center">
        <Button variant="outline" size="sm" onClick={() => setChiffrageModalOpen(true)} className="h-8 text-xs gap-1.5">
          <Send className="h-3.5 w-3.5" /> Envoyer vers chiffrage
        </Button>
        <Button variant="outline" size="sm" onClick={() => setExportModalOpen(true)} className="h-8 text-xs gap-1.5">
          <Download className="h-3.5 w-3.5" /> Exporter PDF
        </Button>
        <Button variant="outline" size="sm" onClick={() => setReclamationModalOpen(true)} className="h-8 text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
          <AlertTriangle className="h-3.5 w-3.5" /> Réclamation
        </Button>
      </div>

      {/* TABS */}
      <div className="bg-card border-b shadow-sm sticky top-0 z-20">
        <div className="flex overflow-x-auto no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 focus:outline-none',
                  isActive ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex-1 p-6">
        {activeTab === 'informations' && (
          <div className="flex flex-col gap-6">
            <InformationTab dossier={dossier} dossierRef={dossierRef} dossierId={id} onEditPlanification={handleEditPlanification} onNewPlanification={handleNewPlanification} />
            <Card><CardContent className="pt-5"><h2 className="text-base font-semibold mb-4">Discussion</h2><CommentairesTab dossierId={id} /></CardContent></Card>
          </div>
        )}
        {activeTab === 'photos'     && <PhotosTab    dossierId={id} />}
        {activeTab === 'documents'  && <DocumentsTab dossierId={id} />}
        {activeTab === 'chiffrage'  && <ChiffrageTab dossierId={id} />}
        {activeTab === 'rapport'    && <RapportTab   dossierId={id} />}
        {activeTab === 'historique' && <HistoriqueTab dossierId={id} />}
      </div>

      {/* MODALS */}
      <ModalPlanification open={isPlanificationModalOpen} onOpenChange={setPlanificationModalOpen} dossierId={id} initialData={planificationInitialData} dossierData={dossier} />
      <ModalChiffrage open={isChiffrageModalOpen} onOpenChange={setChiffrageModalOpen} dossierId={id} />
      <ModalReclamation open={isReclamationModalOpen} onOpenChange={setReclamationModalOpen} dossierId={id} />
      <ModalExportPdf open={isExportModalOpen} onOpenChange={setExportModalOpen} dossierId={id} />
    </div>
  );
}
