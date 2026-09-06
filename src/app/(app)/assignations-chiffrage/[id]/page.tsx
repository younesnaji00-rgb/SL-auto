'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { useCallback, useEffect, useState, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { collection, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore } from '@/firebase';
import { DocumentPreviewLightbox } from '@/components/document-preview-lightbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IconChip } from '@/components/ui/icon-chip';
import { ChevronLeft, ChevronRight, FileText, Mail, Scale } from 'lucide-react';
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
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { useChiffrageTabs } from '@/hooks/use-chiffrage-tabs';
import { addObservation } from '@/app/(app)/dossiers/[id]/log-observation';
import ObservationsTab from '@/components/observations-tab';
import { ReformeDialog } from '@/components/chiffreurs/reforme-dialog';
import { BRAND } from '@/lib/brand';
import {
  EnvoyerParMailDialog,
  type EnvoyerParMailDialogDoc,
} from '@/components/chiffreurs/envoyer-par-mail-dialog';
import {
  DocumentsFilterPanel,
  ALL_TYPES_KEY,
  type DocumentsFilterPanelDoc,
} from '@/components/chiffreurs/documents-filter-panel';
import { AccordPipeline } from '@/components/chiffrage/accord-pipeline';
import type { TypedDoc } from '@/components/dossier-timeline/slot-card';
import {
  getQueueContext,
  getTraitementState,
  skipInTraitement,
  stopTraitement,
  type QueueContext,
  type TraitementState,
} from '@/lib/queue-session';
import { apiFetch } from '@/lib/api-fetch';
import Loading from './loading';
import { useIsPhone } from '@/hooks/use-viewport-class';
import { usePhoneChrome, useRegisterPageTitle } from '@/components/layout/page-chrome';
import { BottomActionBar, type BottomActionBarSecondary } from '@/components/layout/bottom-action-bar';
import type { ActionItem } from '@/components/ui/action-sheet';
import { intlLocale, useT } from '@/i18n';

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
  /** Stamped by the devis-editor save flow — drives the B6 completion banner. */
  completedAt?: unknown;
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
  // Lightbox preview state for slot-card / pièces-jointes clicks — the
  // chiffreur enters the editor via the pipeline's Éditer socket (spec B3).
  const [previewDoc, setPreviewDoc] = useState<{ url: string; nom: string } | null>(null);

  // Task #31 — DocumentsFilterPanel state (mirrors the dossier documents-tab).
  const [selectedType, setSelectedType] = useState<string>(ALL_TYPES_KEY);
  const [typeSearch, setTypeSearch] = useState('');

  // Queue spine (spec B5/B6, lib/queue-session D1). sessionStorage is
  // client-only: read in an effect so the first render matches SSR.
  const [queueCtx, setQueueCtx] = useState<QueueContext | null>(null);
  const [traitement, setTraitement] = useState<TraitementState | null>(null);
  // « Rester » dismisses the completion banner (strip reverts to normal).
  const [banniereRestee, setBanniereRestee] = useState(false);

  useEffect(() => {
    setQueueCtx(getQueueContext(id));
    setTraitement(getTraitementState());
    setBanniereRestee(false);
  }, [id]);

  // Prev/Suivant + Mode traitement all navigate the same way the queue page
  // does: mint/refresh the workspace tab, then route.
  const goToChiffrage = useCallback(
    (targetId: string) => {
      openTab(targetId);
      router.push(`/assignations-chiffrage/${targetId}`);
    },
    [openTab, router],
  );

  const handleSkip = () => {
    const next = queueCtx?.nextId ?? null;
    skipInTraitement(id);
    setTraitement(getTraitementState());
    if (next) goToChiffrage(next);
  };

  const handleQuitTraitement = () => {
    stopTraitement();
    setTraitement(null);
  };

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
  // surface cardinal-accord + proposition-accord docTypes as their own pipeline
  // stages (with their own deep-link to the editor) alongside the always-present slots.
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

  // Group live docs into Devis / Facture families for the accord pipeline
  // (spec B1): one aligned row band per parent garage, versions as shared
  // columns. Same buildDocFamilies grouping the FamilyRow strips used.
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

  const orderedFamilies = useMemo(
    () => [
      ...families.filter((f) => f.sourceDocType === 'Devis Garage'),
      ...families.filter((f) => f.sourceDocType === 'Facture Garage'),
    ],
    [families],
  );

  // Task #31 — Route the panel's "open" action. Eye-icon in the pièces
  // jointes panel: preview the file in the in-app lightbox instead of opening
  // a new tab. The structured editor stays reachable from the pipeline's
  // Éditer socket (handleEditSlot below).
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

  // Spec B3 — pipeline Éditer socket. Opens the structured devis editor
  // scoped to the target accord/proposition slot via `accordSlot`; the
  // 1er-accord slot doubles as the SOURCE editing entry (devis-editor treats
  // ordinal-1 accords as the primary session — no cardinal-revision seeding).
  const handleEditSlot = (parent: string, slot: string) => {
    const params = new URLSearchParams({
      chiffrageId: id,
      docType: parent,
      accordSlot: slot,
    });
    router.push(`/devis-editor?${params.toString()}`);
  };

  // Slot-card click handler: open a preview lightbox (« Consulter » path —
  // clicking a doc thumbnail previews the file, never jumps into editing).
  const handleFamilyDocPreview = (d: TypedDoc, _pages?: TypedDoc[]) => {
    if (d.url && !d.pendingUpload) {
      setPreviewDoc({ url: d.url, nom: d.nom || d.fileName || 'document' });
    }
  };

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

  // ── Phone (E11) ───────────────────────────────────────────────────────────
  // The page header, the queue spine and the « Mode traitement » glass bar are
  // three rows of chrome on a 390 px screen. Below `md` they collapse into the
  // shell's top bar (back to the queue · ref · assuré · « ⋯ »), one 40 px
  // caption row, and a bottom action bar carrying the queue spine + the single
  // primary — actions at the bottom edge (Hoober), never a second header.
  const isPhone = useIsPhone();
  const assurePhone = assureName(dossier?.assure);
  useRegisterPageTitle(chiffrage?.dossierNom || null);
  const phoneSecondary = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];
    if (canEdit && chiffrage?.dossierId) items.push({ key: 'reforme', label: t('Réforme'), icon: <Scale />, onSelect: () => setReformeOpen(true) });
    items.push({
      key: 'observations',
      label: t('Observations'),
      icon: <FileText />,
      onSelect: () => document.querySelector('[data-tour="chd-observations"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    });
    if (traitement?.active) {
      items.push({ key: 'skip', label: t('Passer'), icon: <ChevronRight />, disabled: !queueCtx?.nextId, onSelect: handleSkip });
      items.push({ key: 'quit', label: t('Quitter le mode'), icon: <ChevronLeft />, onSelect: handleQuitTraitement });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canEdit, chiffrage?.dossierId, traitement?.active, queueCtx?.nextId, t]);
  const phoneChrome = useMemo(
    () =>
      isPhone
        ? {
            upHref: '/assignations-chiffrage',
            upLabel: 'Chiffrage',
            subtitle: assurePhone || null,
            secondaryActions: phoneSecondary,
            primaryAction: null,
          }
        : null,
    [isPhone, assurePhone, phoneSecondary],
  );
  usePhoneChrome(phoneChrome);

  if (loading || !chiffrage) {
    // Loading (element-specs §15): the route skeleton mirrors this exact layout.
    return <Loading />;
  }

  const showMailPrimary = canSendMail && !!chiffrage.dossierId;
  const showReforme = canEdit && !!chiffrage.dossierId;
  const assure = assureName(dossier?.assure);
  const plate = dossier?.matricule || dossier?.vehicule?.immatriculation || '';
  const chiffrageDone = chiffrage.status === 'done' || !!chiffrage.completedAt;
  const traitementActif = !!traitement?.active;
  const showCompletionBanner = traitementActif && chiffrageDone && !banniereRestee;
  // « Reçu le … » — the assignation's own creation stamp (send-to-chiffrage).
  const receivedRaw = (chiffrage as any).createdAt;
  const receivedAt = receivedRaw
    ? (receivedRaw.toDate ? receivedRaw.toDate() : new Date(receivedRaw)).toLocaleDateString(intlLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    // max-w-7xl (owner 2026-09-04: the document grid was ringed by dead
    // space) — the extra 16rem goes to the thumbnails and to the pipeline's
    // version columns; the header and observations simply centre wider.
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page header (element-specs §1: Polaris Page ✓ "always provide
          breadcrumbs when a page has a parent", the primary as ONE filled
          button at the right end; GOV.UK button ✓ no second default button).
          Compact record header: back link · t-title · subtitle · meta chips;
          queue spine ‹ n/N › (spec B5) then Réforme `outline`; "Envoyer par
          mail" is the page's only `default` and sits LAST. Chips (§11):
          dossier status pair, plate (neutral, mono), correction state
          (success once done, info while open).
          The tour anchor `chd-header` lives on a plain wrapper because
          PageHeader does not forward arbitrary DOM props. */}
      {/* Phone: the identity lives in the top bar; only the two facts it has
          no room for stay here as ONE 40 px caption row (E11). */}
      <div className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1 px-4 md:hidden">
        <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(dossierStatut))}>
          {t(dossierStatut)}
        </Badge>
        <span className="t-caption truncate">
          {t('Correcteur :')} {chiffrage.assignedChiffreurNom || '—'}
          {receivedAt && <> · {t('Reçu le')} {receivedAt}</>}
        </span>
        {traitementActif && queueCtx && (
          <span className="t-caption w-full tabular-nums">
            {t('Mode traitement')} · {queueCtx.index + 1}/{queueCtx.total}
            {chiffrageDone && <> — {queueCtx.nextId ? t('Chiffrage terminé') : t('File terminée')}</>}
          </span>
        )}
      </div>

      <div data-tour="chd-header" className="max-md:hidden">
        <PageHeader
          size="compact"
          backHref="/assignations-chiffrage"
          backLabel={t('Assignations au chiffrage')}
          title={chiffrage.dossierNom || t('Sans réf.')}
          titleText={chiffrage.dossierNom || t('Sans réf.')}
          subtitle={
            <>
              {t('Correcteur :')} <span className="font-semibold text-ink">{chiffrage.assignedChiffreurNom || '—'}</span>
              {assure && <> · {assure}</>}
              {dossier?.compagnie && <> · {dossier.compagnie}</>}
            </>
          }
          meta={
            <>
              <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(dossierStatut))}>
                {t(dossierStatut)}
              </Badge>
              {plate && <Badge variant="neutral" className="font-mono">{plate}</Badge>}
              <Badge variant={chiffrageDone ? 'success' : 'info'}>
                {chiffrageDone ? t('Correction terminée') : t('Correction en cours')}
              </Badge>
            </>
          }
          actions={
            <>
              {/* Queue spine (B5): hidden when the queue page stored no order. */}
              {queueCtx && (
                <div className="mr-1 flex items-center gap-0.5" data-tour="chd-queue-spine">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={!queueCtx.prevId}
                    onClick={() => queueCtx.prevId && goToChiffrage(queueCtx.prevId)}
                    aria-label={t('Chiffrage précédent')}
                    title={t('Chiffrage précédent')}
                  >
                    <ChevronLeft />
                  </Button>
                  <span
                    className="t-caption px-1 tabular-nums"
                    aria-label={`${t('Position')} ${queueCtx.index + 1} ${t('sur')} ${queueCtx.total}`}
                  >
                    {queueCtx.index + 1} / {queueCtx.total}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    disabled={!queueCtx.nextId}
                    onClick={() => queueCtx.nextId && goToChiffrage(queueCtx.nextId)}
                    aria-label={t('Chiffrage suivant')}
                    title={t('Chiffrage suivant')}
                  >
                    <ChevronRight />
                  </Button>
                </div>
              )}
              {showReforme && (
                <Button variant="outline" data-tour="chd-reforme" onClick={() => setReformeOpen(true)}>
                  <Scale />
                  {t('Réforme')}
                </Button>
              )}
              {showMailPrimary && (
                <Button variant="default" data-tour="chd-mail" onClick={() => setMailDialogOpen(true)}>
                  <Mail />
                  {t('Envoyer par mail')}
                </Button>
              )}
            </>
          }
        />
      </div>

      {/* Mode traitement strip (spec B6): slim glass row under the header.
          One-shot fade-in only (motion-spec: transform/opacity, ease token,
          motion-reduce safe). When the chiffrage completes while in mode the
          strip swaps to the completion banner — auto-advance is offered,
          never forced (« Rester » reverts to the normal strip). */}
      {traitementActif && (
        // Phone: the mode's state is already the caption row above, and its
        // controls are in « ⋯ » — a second glass bar is chrome, not content.
        <div data-tour="chd-mode-traitement" className="glass-bar flex h-11 items-center gap-3 rounded-lg px-4 animate-in fade-in-0 duration-250 ease-enter motion-reduce:animate-none max-md:hidden">
          {showCompletionBanner ? (
            queueCtx?.nextId ? (
              <>
                <span className="t-body-sm font-medium">{t('Chiffrage terminé')}</span>
                <span className="flex-1" aria-hidden />
                <Button variant="tonal" size="sm" onClick={() => goToChiffrage(queueCtx.nextId!)}>
                  {t('Dossier suivant')}
                  <ChevronRight />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setBanniereRestee(true)}>
                  {t('Rester')}
                </Button>
              </>
            ) : (
              <>
                <span className="t-body-sm font-medium">{t('File terminée')}</span>
                <span className="flex-1" aria-hidden />
                <Button variant="ghost" size="sm" onClick={() => router.push('/assignations-chiffrage')}>
                  {t('Retour à la file')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setBanniereRestee(true)}>
                  {t('Rester')}
                </Button>
              </>
            )
          ) : (
            <>
              <span className="t-body-sm font-medium">{t('Mode traitement')}</span>
              {queueCtx && (
                <span className="t-caption tabular-nums">
                  {queueCtx.index + 1} / {queueCtx.total}
                </span>
              )}
              <span className="flex-1" aria-hidden />
              <Button variant="ghost" size="sm" disabled={!queueCtx?.nextId} onClick={handleSkip}>
                {t('Passer')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleQuitTraitement}>
                {t('Quitter le mode')}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Devis & factures — accord pipeline (spec B1–B3): the actionable
          object first (B4, fold research), versions as shared columns,
          families as aligned row bands. Plain section: `t-heading` title
          (element-specs §5 — no card around papers). */}
      {orderedFamilies.length > 0 && (
        <section className="space-y-4" aria-label={t('Devis et factures')} data-tour="chd-familles">
          {/* The page's ONE neutral IconChip (addendum 1b) beside the title of
              the section that anchors the chiffreur's work — away from the
              status chips in the header meta. */}
          <div className="flex items-center gap-2">
            <IconChip>
              <FileText />
            </IconChip>
            <h2 className="t-heading">{t('Devis & factures')}</h2>
          </div>
          <AccordPipeline
            families={orderedFamilies}
            docsByType={familyDocsByType}
            dossierStatut={dossierStatut}
            userRole={profile?.role}
            onPreview={handleFamilyDocPreview}
            onEditSlot={handleEditSlot}
          />
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
        // Demo: the greyed-out "Importer" button only ever surfaced a tooltip
        // saying it does nothing — drop it, keeping the card header.
        onImportClick={BRAND.id === 'demo' ? undefined : handleImportClick}
        alwaysShowHeader
        canDelete={false}
        onOpenDocument={handleOpenDocument}
        onDownloadDocument={handleDownloadDocument}
      />

      {/* Observations LAST (spec B4 — workspace R8: the pipeline is the
          actionable object; the thread stays collapsible, unseen count on
          the collapsed bar). */}
      <div data-tour="chd-observations">
        <ObservationsTab dossierId={chiffrage.dossierId} section="assignations-chiffrage" variant="collapsible" />
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

      {/* Bottom action bar (E4/E11): the queue spine moves out of the header
          to the thumb zone, flanking the page's ONE primary. Disabled with a
          caption rather than silently — « disabled buttons without
          explanation » is the do-not. Phone only: the bar publishes
          `hideBottomNav`, which would reserve 56 px on a desktop page. */}
      {isPhone && (
      <BottomActionBar
        secondary={[
          queueCtx && { label: t('Chiffrage précédent'), icon: <ChevronLeft />, disabled: !queueCtx.prevId, onClick: () => queueCtx.prevId && goToChiffrage(queueCtx.prevId) },
          queueCtx && { label: t('Chiffrage suivant'), icon: <ChevronRight />, disabled: !queueCtx.nextId, onClick: () => queueCtx.nextId && goToChiffrage(queueCtx.nextId) },
        ].filter(Boolean) as BottomActionBarSecondary[]}
        primary={
          showMailPrimary
            ? {
                label: t('Envoyer par mail'),
                icon: <Mail />,
                onClick: () => setMailDialogOpen(true),
                disabled: accordDocs.length === 0,
                dataTour: 'chd-mail-phone',
              }
            : null
        }
        caption={showMailPrimary && accordDocs.length === 0 ? t('Aucun accord à envoyer') : undefined}
      />
      )}
    </div>
  );
}
