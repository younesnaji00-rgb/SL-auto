'use client';

import React, { useEffect, useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isEditableDocType } from '@/lib/devis-schema';
import { parseAccordDocType } from '@/lib/docType-accorde';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOptions } from '@/hooks/use-options';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles } from '@/lib/status-colors';
import ObservationsTab from '@/components/observations-tab';
import { ReformeDialog } from '@/components/chiffreurs/reforme-dialog';
import {
  DocumentsFilterPanel,
  ALL_TYPES_KEY,
  type DocumentsFilterPanelDoc,
} from '@/components/chiffreurs/documents-filter-panel';

interface ChiffrageFileDoc {
  name: string;
  storagePath: string;
  type: 'photo' | 'rapport';
  docType?: string;
  category?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  pdfUrl: string | null;
  annotations?: any[];
}

interface ChiffrageDoc {
  dossierId: string;
  dossierNom: string;
  assignedChiffreurNom: string;
  status: string;
  files: ChiffrageFileDoc[];
}

export default function AssignationChiffrageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const { canWrite } = useCurrentUser();
  const canEdit = canWrite('assignations-chiffrage');

  const [chiffrage, setChiffrage] = useState<ChiffrageDoc | null>(null);
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isReformeOpen, setReformeOpen] = useState(false);

  // Task #31 — DocumentsFilterPanel state (mirrors the dossier documents-tab).
  const [selectedType, setSelectedType] = useState<string>(ALL_TYPES_KEY);
  const [typeSearch, setTypeSearch] = useState('');

  // Listen to chiffrage doc
  useEffect(() => {
    if (!db || !id) return;
    const unsub = onSnapshot(doc(db, 'chiffrages', id), (snap) => {
      if (!snap.exists()) {
        toast({ variant: 'destructive', title: 'Assignation introuvable.' });
        router.push('/assignations-chiffrage');
        return;
      }
      setChiffrage(snap.data() as ChiffrageDoc);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [db, id]);

  // Listen to parent dossier doc for status + modal props
  useEffect(() => {
    if (!db || !chiffrage?.dossierId) return;
    const unsub = onSnapshot(doc(db, 'dossiers', chiffrage.dossierId), (snap) => {
      if (snap.exists()) {
        setDossier({ id: snap.id, ...snap.data() });
      }
    });
    return () => unsub();
  }, [db, chiffrage?.dossierId]);

  // Task #29 — Subscribe to the parent dossier's `documents` subcollection so we can
  // surface cardinal-accord + proposition-accord docTypes as their own groups (with
  // their own deep-link to the editor) alongside the always-present editable slots.
  const dossierDocsQuery = useMemo(() => {
    if (!db || !chiffrage?.dossierId) return null;
    return collection(db, 'dossiers', chiffrage.dossierId, 'documents');
  }, [db, chiffrage?.dossierId]);
  const { data: dossierDocs, loading: docsLoading } = useCollection<any>(dossierDocsQuery);

  // Task #31 — Same docType options the dossier documents-tab uses, so the filter
  // panel surfaces canonical types + cardinal/proposition-accord variants created
  // upstream (tasks #24/#26) alongside admin-managed types.
  const { options: dbDocTypes } = useOptions('options_types_documents', [...defaultDocTypes]);
  const docTypes = useMemo(
    () =>
      dbDocTypes.length > 0
        ? dbDocTypes
        : defaultDocTypes.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })),
    [dbDocTypes]
  );

  const sortedDocs = useMemo<DocumentsFilterPanelDoc[]>(() => {
    if (!dossierDocs) return [];
    return [...(dossierDocs as any[])].sort((a, b) => {
      const tsA = a.dateUpload || a.uploadedAt;
      const tsB = b.dateUpload || b.uploadedAt;
      const dateA = tsA?.toDate ? tsA.toDate().getTime() : (tsA || 0);
      const dateB = tsB?.toDate ? tsB.toDate().getTime() : (tsB || 0);
      return dateB - dateA;
    });
  }, [dossierDocs]);

  // Task #31 — Route the panel's "open" action. Editable types (and cardinal /
  // proposition-accord variants of those) deep-link into the DevisEditor using
  // the same `chiffrageId` + `docType` + optional `accordSlot` query params task
  // #29 introduced on the old per-docType group "Editer (web)" button. All other
  // types fall back to opening the raw file URL in a new tab (matches the old
  // `<a href>` behaviour on non-editable rows).
  const handleOpenDocument = (docEntry: DocumentsFilterPanelDoc) => {
    const label: string = (docEntry.type || docEntry.typeDocument || '') as string;
    const parsed = parseAccordDocType(label);
    if (isEditableDocType(label)) {
      router.push(`/devis-editor?chiffrageId=${id}&docType=${encodeURIComponent(label)}`);
      return;
    }
    if (parsed) {
      router.push(
        `/devis-editor?chiffrageId=${id}&docType=${encodeURIComponent(parsed.sourceDocType)}&accordSlot=${encodeURIComponent(label)}`,
      );
      return;
    }
    if (docEntry.url) {
      window.open(docEntry.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownloadDocument = (docEntry: DocumentsFilterPanelDoc) => {
    if (docEntry.url) {
      window.open(docEntry.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Task #31 — Import is intentionally not wired to a picker here: the chiffreur
  // does not upload documents from this screen. Passing a no-op (rather than
  // `undefined`) preserves the panel's CardHeader so the disabled "Importer"
  // button + tooltip render per task #30's contract.
  const handleImportClick = () => {
    toast({
      variant: 'default',
      title: 'Import non disponible',
      description: 'Import non disponible pour le chiffreur.',
    });
  };

  const dossierStatut = dossier?.statut || 'Nouveau';

  if (loading || !chiffrage) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg animate-pulse bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4 flex gap-4 items-start bg-card">
              <div className="w-24 h-24 rounded-lg animate-pulse bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/assignations-chiffrage"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{chiffrage.dossierNom || 'Sans ref.'}</h1>
          <p className="text-sm text-muted-foreground">
            Correcteur : <span className="font-bold text-foreground">{chiffrage.assignedChiffreurNom}</span>
          </p>
        </div>
        {canEdit && chiffrage.dossierId && (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 bg-purple-600 hover:bg-purple-700"
            onClick={() => setReformeOpen(true)}
          >
            <Scale className="h-3.5 w-3.5" />
            Réforme
          </Button>
        )}
        <Badge variant="outline" className={cn("gap-1.5 py-1 px-3 rounded-full border font-semibold", getStatusBadgeStyles(dossierStatut))}>
          {dossierStatut}
        </Badge>
      </div>

      {/* Task #31 — Documents filter panel (mirrors the dossier documents-tab's
          "second page" / import view). Import is disabled for chiffreurs; the
          disabled button + tooltip render per task #30's contract. */}
      <DocumentsFilterPanel
        documents={sortedDocs}
        docTypes={docTypes}
        selectedType={selectedType}
        onSelectedTypeChange={setSelectedType}
        typeSearch={typeSearch}
        onTypeSearchChange={setTypeSearch}
        loading={docsLoading}
        canImport={false}
        onImportClick={handleImportClick}
        canDelete={false}
        onOpenDocument={handleOpenDocument}
        onDownloadDocument={handleDownloadDocument}
      />

      {/* Observations section */}
      <ObservationsTab dossierId={chiffrage.dossierId} section="assignations-chiffrage" variant="collapsible" />

      {/* Réforme Modal */}
      {chiffrage.dossierId && (
        <ReformeDialog
          dossierId={chiffrage.dossierId}
          open={isReformeOpen}
          onOpenChange={setReformeOpen}
        />
      )}
    </div>
  );
}
