'use client';

import React, { useEffect, useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { DocumentPreviewLightbox } from '@/components/document-preview-lightbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseAccordDocType } from '@/lib/docType-accorde';
import { buildDocFamilies } from '@/lib/doc-family';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOptions } from '@/hooks/use-options';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles } from '@/lib/status-colors';
import { deriveStatus } from '@/lib/status-machine';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { useChiffrageTabs } from '@/hooks/use-chiffrage-tabs';
import { addObservation } from '@/app/(app)/dossiers/[id]/log-observation';
import ObservationsTab from '@/components/observations-tab';
import { ReformeDialog } from '@/components/chiffreurs/reforme-dialog';
import {
  EnvoyerParMailDialog,
  type EnvoyerParMailDialogDoc,
} from '@/components/chiffreurs/envoyer-par-mail-dialog';
import {
  DocumentsFilterPanel,
  ALL_TYPES_KEY,
  type DocumentsFilterPanelDoc,
} from '@/components/chiffreurs/documents-filter-panel';
import { FamilyRow } from '@/components/dossier-timeline/family-row';
import type { ExtraSlotKind, TypedDoc } from '@/components/dossier-timeline/slot-card';
import { apiFetch } from '@/lib/api-fetch';
import { useT } from '@/i18n';

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

const CATEGORY_TO_TYPE: Record<string, string> = {
  avant: 'Photos avant',
  en_cours: 'Photos en cours',
  apres: 'Photos après',
};

export default function AssignationChiffrageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useT();
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const { canWrite, profile } = useCurrentUser();
  const canEdit = canWrite('assignations-chiffrage');
  // "Envoyer par mail" is a gestionnaire-only action. Not Admins (even though
  // Admins can edit everything, they shouldn't send client mails on behalf of
  // the gestionnaire). Not chiffreurs.
  const canSendMail = profile?.role === 'Gestionnaire';

  const { openTab, refreshTabLabel } = useChiffrageTabs();

  const [chiffrage, setChiffrage] = useState<ChiffrageDoc | null>(null);
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isReformeOpen, setReformeOpen] = useState(false);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  // Lightbox preview state for slot-card document clicks (chiffreur expects a
  // preview, not direct routing to the editor — they enter the editor via the
  // floating "Éditer web" button on each family row).
  const [previewDoc, setPreviewDoc] = useState<{ url: string; nom: string } | null>(null);

  // Task #31 — DocumentsFilterPanel state (mirrors the dossier documents-tab).
  const [selectedType, setSelectedType] = useState<string>(ALL_TYPES_KEY);
  const [typeSearch, setTypeSearch] = useState('');

  // Listen to chiffrage doc
  useEffect(() => {
    if (!db || !id) return;
    const unsub = onSnapshot(doc(db, 'chiffrages', id), (snap) => {
      if (!snap.exists()) {
        toast({ variant: 'destructive', title: t('Assignation introuvable.') });
        router.push('/assignations-chiffrage');
        return;
      }
      const data = snap.data() as ChiffrageDoc;
      setChiffrage(data);
      const label = data.dossierNom || `${t('Chiffrage')} ${id.slice(0, 6)}`;
      openTab(id, label);
      refreshTabLabel(id, label);
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

  const dossierPhotosQuery = useMemo(() => {
    if (!db || !chiffrage?.dossierId) return null;
    return collection(db, 'dossiers', chiffrage.dossierId, 'photos');
  }, [db, chiffrage?.dossierId]);
  const { data: dossierPhotos } = useCollection<any>(dossierPhotosQuery);

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

  // ATG photos live in `dossiers/{id}/photos` (category-bucketed) — disjoint
  // from `dossiers/{id}/documents`. Map each photo to a synthetic
  // DocumentsFilterPanelDoc so the filter chips ("Photos avant / en cours /
  // après") surface non-empty counts and listed rows alongside Devis/Facture.
  // Photos are NOT family documents — they only feed the filter panel.
  const photoDocs = useMemo<DocumentsFilterPanelDoc[]>(() => {
    if (!dossierPhotos) return [];
    return (dossierPhotos as any[]).map((p) => ({
      id: `photo-${p.id}`,
      type: CATEGORY_TO_TYPE[p.category as string] || 'Photo',
      nom: p.name || 'photo',
      fileName: p.name || 'photo',
      storagePath: p.storagePath || '',
      uploadedAt: p.uploadedAt,
      uploadedBy: p.uploadedBy,
      // url intentionally omitted — preview is a follow-up.
    }));
  }, [dossierPhotos]);

  const combinedSortedDocs = useMemo<DocumentsFilterPanelDoc[]>(
    () => [...sortedDocs, ...photoDocs],
    [sortedDocs, photoDocs],
  );

  // Group live docs into Devis / Facture families so we can render one
  // horizontal row per parent garage, matching the gestionnaire's step-4
  // layout. Each row gets a sticky "Éditer web" button that opens the
  // devis-editor for that family's source garage.
  const families = useMemo(
    () => buildDocFamilies((dossierDocs as TypedDoc[]) || []),
    [dossierDocs],
  );

  const familyDocsByType = useMemo(() => {
    const map: Record<string, TypedDoc[]> = {};
    for (const fam of families) for (const slot of fam.slots) map[slot] = [];
    if (dossierDocs) {
      for (const d of dossierDocs as TypedDoc[]) {
        const t = d.type || d.typeDocument || '';
        if (map[t]) map[t].push(d);
      }
    }
    for (const slot of Object.keys(map)) {
      map[slot].sort((a, b) => {
        if (a.pendingUpload && !b.pendingUpload) return -1;
        if (!a.pendingUpload && b.pendingUpload) return 1;
        return (a.nom || a.fileName || '').localeCompare(b.nom || b.fileName || '');
      });
    }
    return map;
  }, [dossierDocs, families]);

  const devisFamilies = useMemo(
    () => families.filter((f) => f.sourceDocType === 'Devis Garage'),
    [families],
  );
  const factureFamilies = useMemo(
    () => families.filter((f) => f.sourceDocType === 'Facture Garage'),
    [families],
  );

  // Task #31 — Route the panel's "open" action. Editable types (and cardinal /
  // proposition-accord variants of those) deep-link into the DevisEditor using
  // the same `chiffrageId` + `docType` + optional `accordSlot` query params task
  // #29 introduced on the old per-docType group "Editer (web)" button. All other
  // types fall back to opening the raw file URL in a new tab (matches the old
  // `<a href>` behaviour on non-editable rows).
  // Eye-icon in the pièces jointes panel: preview the file in the in-app
  // lightbox instead of opening a new tab. The structured editor stays
  // reachable from the per-slot Éditer buttons (handleEditSlot below).
  const handleOpenDocument = (docEntry: DocumentsFilterPanelDoc) => {
    if (docEntry.url && !docEntry.pendingUpload) {
      setPreviewDoc({ url: docEntry.url, nom: docEntry.nom || docEntry.fileName || 'document' });
    }
  };

  const handleDownloadDocument = (docEntry: DocumentsFilterPanelDoc) => {
    if (docEntry.url) {
      window.open(docEntry.url, '_blank', 'noopener,noreferrer');
    }
  };

  // Round 9 item 004 — per-slot Éditer button. Opens the structured devis
  // editor scoped to the specific accord/proposition slot via `accordSlot`.
  // Derives the family parent from the slot via parseAccordDocType so we
  // route to the right doc type ("Devis Garage" / "Facture Garage" / etc.).
  const handleEditSlot = (parent: string, slot: string) => {
    const params = new URLSearchParams({
      chiffrageId: id,
      docType: parent,
      accordSlot: slot,
    });
    router.push(`/devis-editor?${params.toString()}`);
  };

  // Slot-card click handler: open a preview lightbox. The chiffreur enters the
  // editor explicitly via the floating "Éditer web" button on each family row —
  // clicking the doc thumbnail should preview the file, not jump into editing.
  const handleFamilyDocPreview = (d: TypedDoc) => {
    if (d.url && !d.pendingUpload) {
      setPreviewDoc({ url: d.url, nom: d.nom || d.fileName || 'document' });
    }
  };

  // No-op handlers for the chiffreur-side slot card: uploads and slot
  // management belong to the gestionnaire flow.
  const chiffreurNoOpUpload = () => {};
  const chiffreurNoOpDelete = () => {};
  const chiffreurNoOpCreateNextCardinal = () => {};
  const chiffreurNoOpCreateExtraSlot = (_kind: ExtraSlotKind, _files: File[]) => {};
  const chiffreurNoOpRename = () => {};
  const chiffreurNeverDelete = () => false;

  // Task #31 — Import is intentionally not wired to a picker here: the chiffreur
  // does not upload documents from this screen. Passing a no-op (rather than
  // `undefined`) preserves the panel's CardHeader so the disabled "Importer"
  // button + tooltip render per task #30's contract.
  const handleImportClick = () => {
    toast({
      variant: 'default',
      title: t('Import non disponible'),
      description: t('Import non disponible pour le chiffreur.'),
    });
  };

  const dossierStatut = dossier?.statut || 'Nouveau';

  // Task #36 — filter dossier docs down to accord / proposition-accord types.
  // Shape them for the EnvoyerParMailDialog. A doc is mailable iff (a) it
  // parses as an accord variant AND (b) it has a resolvable URL.
  const accordDocs = useMemo<EnvoyerParMailDialogDoc[]>(() => {
    return sortedDocs
      .filter((d) => {
        const label = (d.type || d.typeDocument || '') as string;
        return Boolean(d.url) && parseAccordDocType(label) != null;
      })
      .map((d) => ({
        id: d.id,
        type: (d.type || d.typeDocument || '') as string,
        name: (d.nom || d.fileName || d.type || 'document') as string,
        url: d.url as string,
      }));
  }, [sortedDocs]);

  // Task #36 — dossier reference used in the email subject/body template.
  // Prefer refExpert, then numero, then fall back to the dossier id.
  const dossierNumero: string =
    (dossier?.refExpert as string | undefined) ||
    (dossier?.numero as string | undefined) ||
    (chiffrage?.dossierId as string | undefined) ||
    '';

  const handleSendMail = async (payload: {
    documentId: string;
    recipient: string;
    subject: string;
    body: string;
  }) => {
    if (!db || !chiffrage?.dossierId) return;
    const selected = accordDocs.find((d) => d.id === payload.documentId);
    if (!selected) {
      toast({ variant: 'destructive', title: t('Document introuvable.') });
      return;
    }

    try {
      // 1) POST to the nodemailer endpoint (task #12 + task #36 attachments).
      const res = await apiFetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: payload.recipient,
          subject: payload.subject,
          text: payload.body,
          attachments: [{ filename: selected.name, url: selected.url }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      // 2) Transition dossier status to `Accord envoyé`.
      const newStatus = deriveStatus({ kind: 'sendByMail' });
      await updateDoc(doc(db, 'dossiers', chiffrage.dossierId), {
        statut: newStatus,
      });

      // 3) Audit trail + observation.
      const userName = profile
        ? `${profile.prenom} ${profile.nom}`.trim() || profile.email
        : 'Admin';
      const userEmail = profile?.email || '';
      const userRole = profile?.role || 'Admin';

      await logHistorique(
        db,
        chiffrage.dossierId,
        newStatus,
        userName,
        `Accord envoyé à ${payload.recipient} (${selected.type})`,
        'statut',
        profile?.nom,
      );

      await addObservation(
        db,
        chiffrage.dossierId,
        `Accord envoyé par mail à ${payload.recipient} — document : ${selected.type} (${selected.name}).`,
        'Décision de statut',
        userName,
        userEmail,
        userRole,
        'assignations-chiffrage',
      );

      toast({
        title: t('Mail envoyé'),
        description: `${t('Accord envoyé à')} ${payload.recipient}.`,
      });
    } catch (err: any) {
      console.error('Failed to send accord mail:', err);
      toast({
        variant: 'destructive',
        title: t("Échec de l'envoi"),
        description: err?.message || t("Impossible d'envoyer le mail."),
      });
      // Re-throw so the dialog keeps the form open for another attempt.
      throw err;
    }
  };

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
          <h1 className="text-xl font-bold">{chiffrage.dossierNom || t('Sans ref.')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('Correcteur :')} <span className="font-bold text-foreground">{chiffrage.assignedChiffreurNom}</span>
          </p>
        </div>
        {canSendMail && chiffrage.dossierId && (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={() => setMailDialogOpen(true)}
          >
            <Mail className="h-3.5 w-3.5" />
            {t('Envoyer par mail')}
          </Button>
        )}
        {canEdit && chiffrage.dossierId && (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5 bg-purple-600 hover:bg-purple-700"
            onClick={() => setReformeOpen(true)}
          >
            <Scale className="h-3.5 w-3.5" />
            {t('Réforme')}
          </Button>
        )}
        <Badge variant="outline" className={cn("gap-1.5 py-1 px-3 rounded-full border font-semibold", getStatusBadgeStyles(dossierStatut))}>
          {t(dossierStatut)}
        </Badge>
      </div>

      {/* Observations section */}
      <ObservationsTab dossierId={chiffrage.dossierId} section="assignations-chiffrage" variant="collapsible" />

      {/* Devis & Factures — one horizontal row per parent garage (base or
          gestionnaire-created extra). Each row has a sticky "Éditer web"
          button pinned to the left that opens the structured devis editor
          for that family's source. Mirrors the gestionnaire's step-4 layout
          in read-only mode. */}
      {(devisFamilies.length > 0 || factureFamilies.length > 0) && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('Devis & Factures')}
          </h2>
          {devisFamilies.map((group) => (
            <FamilyRow
              key={group.parent}
              group={group}
              docsByType={familyDocsByType}
              canEdit={false}
              canDeleteDoc={chiffreurNeverDelete}
              userRole={profile?.role}
              canManageExtraSlots={false}
              isUploading={() => false}
              deletingId={null}
              extraSlotKindForSlot={() => undefined}
              onUpload={chiffreurNoOpUpload}
              onDelete={chiffreurNoOpDelete}
              onCreateNextCardinal={chiffreurNoOpCreateNextCardinal}
              onCreateExtraSlot={chiffreurNoOpCreateExtraSlot}
              onRenameExtraSlot={chiffreurNoOpRename}
              onPreview={handleFamilyDocPreview}
              onEditSlot={(slot) => handleEditSlot(group.parent, slot)}
            />
          ))}
          {factureFamilies.map((group) => (
            <FamilyRow
              key={group.parent}
              group={group}
              docsByType={familyDocsByType}
              canEdit={false}
              canDeleteDoc={chiffreurNeverDelete}
              userRole={profile?.role}
              canManageExtraSlots={false}
              isUploading={() => false}
              deletingId={null}
              extraSlotKindForSlot={() => undefined}
              onUpload={chiffreurNoOpUpload}
              onDelete={chiffreurNoOpDelete}
              onCreateNextCardinal={chiffreurNoOpCreateNextCardinal}
              onCreateExtraSlot={chiffreurNoOpCreateExtraSlot}
              onRenameExtraSlot={chiffreurNoOpRename}
              onPreview={handleFamilyDocPreview}
              onEditSlot={(slot) => handleEditSlot(group.parent, slot)}
            />
          ))}
        </section>
      )}

      {/* Task #31 — Documents filter panel (mirrors the dossier documents-tab's
          "second page" / import view). Import is disabled for chiffreurs; the
          disabled button + tooltip render per task #30's contract. */}
      <DocumentsFilterPanel
        documents={combinedSortedDocs}
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

      {/* Réforme Modal */}
      {chiffrage.dossierId && (
        <ReformeDialog
          dossierId={chiffrage.dossierId}
          open={isReformeOpen}
          onOpenChange={setReformeOpen}
        />
      )}

      {/* Task #36 — Envoyer par mail dialog (gestionnaire/admin only). */}
      {canSendMail && chiffrage.dossierId && (
        <EnvoyerParMailDialog
          open={mailDialogOpen}
          onOpenChange={setMailDialogOpen}
          documents={accordDocs}
          dossierNumero={dossierNumero}
          onSend={handleSendMail}
        />
      )}

      {/* Lightbox preview — used by both the pièces-jointes eye icon and the
          slot-card thumbnail clicks. Download falls back to opening the file
          in a new tab since this page doesn't have a dedicated downloader. */}
      <DocumentPreviewLightbox
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={(d) => window.open(d.url, '_blank', 'noopener,noreferrer')}
      />
    </div>
  );
}
