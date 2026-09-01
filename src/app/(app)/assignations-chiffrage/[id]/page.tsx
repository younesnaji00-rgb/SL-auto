'use client';

import React, { useEffect, useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { DocumentPreviewLightbox } from '@/components/document-preview-lightbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, Mail, MoreHorizontal, Scale } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { parseAccordDocType } from '@/lib/docType-accorde';
import { buildDocFamilies } from '@/lib/doc-family';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOptions } from '@/hooks/use-options';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { deriveStatus } from '@/lib/status-machine';
import { assureName } from '@/lib/dossier-label';
import { useRegisterPageTitle } from '@/components/layout/page-chrome';
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

// Sticky record bar bleeds through the layout padding (p-4 md:p-6 lg:p-8) —
// this route is not in FLUSH_ROUTE_PATTERNS, so the bar reclaims the gutter itself.
const BAR_BLEED = '-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8';

/** Paper section (information-tab `Section`): hairline header row + 24 px body. */
function Section({ title, actions, children, className }: { title: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card role="region" aria-label={title} className={cn('min-w-0 overflow-hidden', className)}>
      <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-hairline px-6 py-3">
        <h2 className="t-heading truncate">{title}</h2>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </header>
      <div className="p-6">{children}</div>
    </Card>
  );
}

export default function AssignationChiffrageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
        toast({ variant: 'destructive', title: 'Assignation introuvable.' });
        router.push('/assignations-chiffrage');
        return;
      }
      const data = snap.data() as ChiffrageDoc;
      setChiffrage(data);
      const label = data.dossierNom || `Chiffrage ${id.slice(0, 6)}`;
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

  // Breadcrumb / document.title (PageHeader used to register it).
  useRegisterPageTitle(chiffrage ? chiffrage.dossierNom || `Chiffrage ${id.slice(0, 6)}` : null);

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
      title: 'Import non disponible',
      description: 'Import non disponible pour le chiffreur.',
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
      toast({ variant: 'destructive', title: 'Document introuvable.' });
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
        title: 'Mail envoyé',
        description: `Accord envoyé à ${payload.recipient}.`,
      });
    } catch (err: any) {
      console.error('Failed to send accord mail:', err);
      toast({
        variant: 'destructive',
        title: "Échec de l'envoi",
        description: err?.message || 'Impossible d\'envoyer le mail.',
      });
      // Re-throw so the dialog keeps the form open for another attempt.
      throw err;
    }
  };

  if (loading || !chiffrage) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className={cn('flex h-12 items-center gap-3 border-b border-hairline px-3 sm:px-5', BAR_BLEED)}>
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-8 w-32" />
        </div>
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="paper p-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
          <div className="paper p-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-[120px] rounded-[10px]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showMailPrimary = canSendMail && !!chiffrage.dossierId;
  const showReforme = canEdit && !!chiffrage.dossierId;
  const assure = assureName(dossier?.assure);
  const plate = dossier?.matricule || dossier?.vehicule?.immatriculation || '';
  const chiffrageDone = chiffrage.status === 'done';

  return (
    <div className="space-y-6">
      {/* Sticky identity bar — mirrors components/dossiers/record-bar.tsx
          (its props expect dossier steps, which a chiffrage record doesn't have). */}
      <div className={cn('sticky top-0 z-40 flex min-h-[48px] items-center gap-2 glass-bar border-b border-hairline px-3 sm:px-5', BAR_BLEED)} data-record-bar>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-ink-3 hover:text-ink" asChild>
              <Link href="/assignations-chiffrage" aria-label="Retour aux assignations au chiffrage">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Assignations au chiffrage</TooltipContent>
        </Tooltip>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
          <h1 className="t-mono min-w-0 truncate font-semibold tracking-tight" title={chiffrage.dossierNom || undefined}>
            {chiffrage.dossierNom || 'Sans réf.'}
          </h1>
          {assure && <span className="t-body min-w-0 truncate font-medium">{assure}</span>}
          {dossier?.compagnie && <span className="hidden truncate text-sm text-ink-3 md:inline">{dossier.compagnie}</span>}
          {plate && <span className="t-mono hidden text-ink-3 lg:inline">{plate}</span>}
          <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(dossierStatut), 'shrink-0')}>
            {dossierStatut}
          </Badge>
        </div>

        {showMailPrimary && (
          <Button size="sm" className="hidden h-8 shrink-0 gap-1.5 md:inline-flex" onClick={() => setMailDialogOpen(true)}>
            <Mail className="h-3.5 w-3.5" />
            Envoyer par mail
          </Button>
        )}
        {showReforme && (
          <Button size="sm" variant="outline" className="hidden h-8 shrink-0 gap-1.5 md:inline-flex" onClick={() => setReformeOpen(true)}>
            <Scale className="h-3.5 w-3.5" />
            Réforme
          </Button>
        )}

        {(showMailPrimary || showReforme) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0 md:hidden" aria-label="Plus d'actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="t-caption truncate font-normal">{chiffrage.dossierNom || 'Sans réf.'}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {showMailPrimary && (
                <DropdownMenuItem onSelect={() => setMailDialogOpen(true)}>
                  <Mail className="mr-2 h-4 w-4" /> Envoyer par mail
                </DropdownMenuItem>
              )}
              {showReforme && (
                <DropdownMenuItem onSelect={() => setReformeOpen(true)}>
                  <Scale className="mr-2 h-4 w-4" /> Réforme
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Assignation facts not already in the bar — label/value pairs (Refactoring UI: labels quiet, values bold). */}
        <Section title="Assignation">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <div className="min-w-0">
              <dt className="t-label">Chiffreur</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{chiffrage.assignedChiffreurNom || <span className="font-normal text-ink-3">—</span>}</dd>
            </div>
            <div className="min-w-0">
              <dt className="t-label">État du chiffrage</dt>
              <dd className="mt-0.5">
                <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium', chiffrageDone ? 'bg-status-success-bg text-status-success-fg' : 'bg-status-info-bg text-status-info-fg')}>
                  {chiffrageDone ? 'Terminé' : 'En cours'}
                </span>
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="t-label">Nature du dossier</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{dossier?.nature || <span className="font-normal text-ink-3">—</span>}</dd>
            </div>
            <div className="min-w-0">
              <dt className="t-label">Type de réforme</dt>
              <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{dossier?.reforme?.typeReforme || <span className="font-normal text-ink-3">—</span>}</dd>
            </div>
          </dl>
        </Section>

        {/* Observations section */}
        <ObservationsTab dossierId={chiffrage.dossierId} section="assignations-chiffrage" variant="collapsible" />

        {/* Devis & Factures — one horizontal row per parent garage (base or
            gestionnaire-created extra). Each row has a sticky "Éditer web"
            button pinned to the left that opens the structured devis editor
            for that family's source. Mirrors the gestionnaire's step-4 layout
            in read-only mode. */}
        {(devisFamilies.length > 0 || factureFamilies.length > 0) && (
          <Section title="Devis & factures">
            <div className="space-y-4">
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
            </div>
          </Section>
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
      </div>

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
