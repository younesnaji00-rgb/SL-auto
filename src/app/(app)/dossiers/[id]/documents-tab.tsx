'use client';

/**
 * Pièces tab — the documents surface of the step-1 card, built on the same
 * inventory **sockets** as the accord board (`SlotCard`) so the dossier has
 * one visual language.
 *
 * Reading order, top → bottom:
 *   1. Toolbar: t-heading "Documents" + count pill · search ·
 *      Sélectionner (ghost) · types settings · the ONE filled primary passed
 *      by the caller. No "Importer" here — the SmartInbox « Ajouter des
 *      pièces » above the tab is the picker; empty sockets cover typed
 *      uploads.
 *   2. "N pièces requises manquantes" summary line (links scroll to the socket).
 *   3. Two socket grids under quiet `t-label` section labels:
 *        Pièces requises — one socket per required source slot + the two
 *        garage slots (either-or: once one is filled the other reads
 *        "Optionnel" while empty);
 *        Autres documents — one socket per other type holding files + a
 *        dashed "Autre type…" socket → the existing typed upload dialog.
 *
 * Socket states are the status (filled / empty / locked) — no chips, no
 * tick/cross column.
 */

import React, { useState, useMemo, useRef } from 'react';
import {
  CheckSquare,
  Download,
  Loader2,
  Plus,
  Search,
  Settings,
} from 'lucide-react';
import { RequiredSummaryLine } from '@/components/dossier-timeline/required-summary-line';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import { toOrdinalFr } from '@/lib/devis-schema';
import { useFirestore, useAuth, useCollection, useStorage, useDoc } from '@/firebase';
import { collection, deleteDoc, doc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { useToast } from '@/hooks/use-toast';
import { logHistorique, logWorkflow } from './log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';
import { DocumentPreviewLightbox, type DocumentPreviewLightboxDoc } from '@/components/document-preview-lightbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  REQUIRED_SOURCE_SLOTS,
  GARAGE_DOC_SLOTS,
  GARAGE_PAIR_LABEL,
  computeRequiredDocsStatus,
  requiredDocChip,
  isChiffrageOutputType,
  docTypeOf,
} from '@/lib/required-docs';
import { SlotCard, SOCKET_BASE_CLASS, SOCKET_OPEN_CLASS } from '@/components/dossier-timeline/slot-card';
import {
  docDisplayName,
  downloadFileFromUrl,
  toLightboxDoc,
  type DocDragPayload,
  type TypedDoc,
} from '@/components/documents/typed-doc';
import { reclassifyDocuments } from '@/components/documents/reclassify';
import JSZip from 'jszip';
import { useT } from '@/i18n';

type DocumentsTabProps = {
  dossierId: string;
  /** Toolbar title (t-heading). */
  title?: string;
  /**
   * The ONE filled button of the toolbar (e.g. "Envoyer vers chiffrage").
   * Hidden while selection mode is on — the batch well carries its own primary.
   */
  primaryAction?: React.ReactNode;
  /** Required hints + "pièces requises manquantes" line. */
  showRequirements?: boolean;
  /** Replay: frozen documents list rendered instead of the live subscription. */
  docsOverride?: any[];
  /** Replay: frozen photos list (used by the « Inclure photos » download variant). */
  photosOverride?: any[];
};

/** One socket of the Pièces tab. */
type SocketSpec = {
  type: string;
  hint?: string;
  emptyCaption?: string;
  docs: TypedDoc[];
};

// Broader accept than image/PDF — the typed dialog always allowed office docs.
const ACCEPT_ATTR = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp';
const acceptBrowserFile = (f: File) =>
  f.type.startsWith('image/') || /\.(pdf|docx?|xlsx?)$/i.test(f.name);

const SECTION_LABEL_CLASS = 't-label';
// TWO columns on a phone (docs/research/mobile-record-pages.md §E6 — one
// column is ~3 300 px of scroll; `sm:` was never a phone rule), 12 px gutter.
// Desktop from `xl` up is unchanged.
const SOCKET_GRID_CLASS = 'grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4';

const noop = () => {};

export default function DocumentsTab({ dossierId, title = 'Documents', primaryAction, showRequirements = true, docsOverride, photosOverride }: DocumentsTabProps) {
  const t = useT();
  const db = useFirestore();
  const { canWrite, profile } = useCurrentUser();
  const canEdit = canWrite('dossiers');
  const auth = useAuth();
  const storage = useStorage();
  const { toast } = useToast();

  const { options: dbDocTypes } = useOptions('options_types_documents', [...defaultDocTypes]);
  const docTypes = useMemo(
    () => (dbDocTypes.length > 0 ? dbDocTypes : defaultDocTypes.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true }))),
    [dbDocTypes]
  );

  // "Autre type…" socket → native picker → typed dialog.
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  // Lightbox: the page being shown + every page of that slot (enables ‹ › paging).
  const [preview, setPreview] = useState<{ doc: DocumentPreviewLightboxDoc; pages: DocumentPreviewLightboxDoc[] } | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadType, setUploadType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  /** Slot type currently receiving a direct (socket) upload. */
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  // Devis-specific variant (only shown when uploadType === 'Devis')
  const [devisVariant, setDevisVariant] = useState<'original' | 'counter'>('original');
  const [counterRoundLabel, setCounterRoundLabel] = useState<string>('');

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDownloading, setIsBatchDownloading] = useState<false | 'docs' | 'docs+photos'>(false);

  const collQuery = useMemo(() => {
    if (!db || docsOverride !== undefined) return null;
    return collection(db, 'dossiers', dossierId, 'documents');
  }, [db, dossierId, docsOverride]);

  const { data: liveDocuments, loading: liveDocsLoading } = useCollection<any>(collQuery);
  // Replay override: frozen data — no live subscription.
  const allDocuments = docsOverride !== undefined ? docsOverride : liveDocuments;
  const loading = docsOverride !== undefined ? false : liveDocsLoading;

  // Fetch parent dossier (for master-folder name: refCompagnie / assuré / compagnie)
  const dossierRef = useMemo(() => (db ? doc(db, 'dossiers', dossierId) : null), [db, dossierId]);
  const { data: dossier } = useDoc<any>(dossierRef as any);

  // Photos subcollection — needed only for the "Inclure photos" variant.
  const photosQuery = useMemo(() => {
    if (!db || photosOverride !== undefined) return null;
    return collection(db, 'dossiers', dossierId, 'photos');
  }, [db, dossierId, photosOverride]);
  const { data: livePhotos } = useCollection<any>(photosQuery);
  const allPhotos = photosOverride !== undefined ? photosOverride : livePhotos;

  const sortedDocs = useMemo<TypedDoc[]>(() => {
    if (!allDocuments) return [];
    return [...allDocuments].sort((a, b) => {
      const tsA = a.dateUpload || a.uploadedAt;
      const tsB = b.dateUpload || b.uploadedAt;
      const dateA = tsA?.toDate ? tsA.toDate().getTime() : (tsA || 0);
      const dateB = tsB?.toDate ? tsB.toDate().getTime() : (tsB || 0);
      return dateB - dateA;
    });
  }, [allDocuments]);

  /** Files grouped by their Firestore `type` label (newest first, inherited). */
  const docsByType = useMemo(() => {
    const map: Record<string, TypedDoc[]> = {};
    for (const d of sortedDocs) {
      const t = (d.type || d.typeDocument || 'Autre').toString();
      (map[t] ||= []).push(d);
    }
    return map;
  }, [sortedDocs]);

  // Required-slot awareness (shared predicate with the step gate).
  const requiredStatus = useMemo(() => computeRequiredDocsStatus(allDocuments ?? null), [allDocuments]);

  // ── Socket model ───────────────────────────────────────────────────────────

  const sockets = useMemo(() => {
    // Pièces requises — the five required sources + the either-or garage pair.
    const required: SocketSpec[] = REQUIRED_SOURCE_SLOTS.map((t) => ({
      type: t,
      hint: showRequirements ? 'obligatoire' : undefined,
      docs: docsByType[t] || [],
    }));
    const garage: SocketSpec[] = GARAGE_DOC_SLOTS.map((t) => {
      const chip = showRequirements ? requiredDocChip(t, requiredStatus) : null;
      // `null` chip on an empty garage slot = the other one is filled → optional.
      const optional = showRequirements && chip === null;
      return {
        type: t,
        hint: showRequirements ? 'au moins un des deux' : undefined,
        emptyCaption: optional ? 'Optionnel' : 'Déposer',
        docs: docsByType[t] || [],
      };
    });

    // Autres documents — every other type holding at least one file, EXCEPT
    // chiffrage outputs (accords / propositions of any cardinal, réforme,
    // rapport, note d'honoraire): those live only on the accord steps.
    const handled = new Set<string>([...REQUIRED_SOURCE_SLOTS, ...GARAGE_DOC_SLOTS]);
    const others: SocketSpec[] = Object.keys(docsByType)
      .filter((t) => !handled.has(t) && !isChiffrageOutputType(t) && (docsByType[t]?.length || 0) > 0)
      .map((t) => ({ type: t, docs: docsByType[t] }))
      .sort((a, b) => b.docs.length - a.docs.length || a.type.localeCompare(b.type, 'fr'));

    return { required: [...required, ...garage], others };
  }, [docsByType, requiredStatus, showRequirements]);

  // ── Search (type OR file name) ─────────────────────────────────────────────
  // Required sockets always show (their state must stay truthful): a type
  // match shows every file; otherwise only matching files — and when nothing
  // matches inside a filled socket, all its files stay so it never reads as
  // empty. The Autres group is filtered to matching sockets.

  const q = search.trim().toLowerCase();
  const isSearching = q.length > 0;
  const matchDocs = (s: SocketSpec): TypedDoc[] => {
    if (!q) return s.docs;
    if (s.type.toLowerCase().includes(q)) return s.docs;
    const matched = s.docs.filter((d) => docDisplayName(d).toLowerCase().includes(q));
    return matched.length > 0 ? matched : s.docs;
  };
  const socketMatches = (s: SocketSpec): boolean =>
    !q || s.type.toLowerCase().includes(q) || s.docs.some((d) => docDisplayName(d).toLowerCase().includes(q));

  const visRequired = sockets.required.map((s) => ({ spec: s, docs: matchDocs(s) }));
  const visOthers = sockets.others.filter(socketMatches).map((s) => ({ spec: s, docs: matchDocs(s) }));
  const visibleDocsFlat = [...visRequired, ...visOthers].flatMap((x) => x.docs);
  const selectableVisible = visibleDocsFlat.filter((d) => d.url && !d.pendingUpload);

  // ── Upload ─────────────────────────────────────────────────────────────────

  // Upload dialog type list: admin options ∪ required slots ∪ the preset so a
  // slot type preselected from a socket is always selectable.
  const uploadTypeOptions = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    const push = (l: string) => { if (l && !seen.has(l)) { seen.add(l); labels.push(l); } };
    docTypes.forEach((t) => push(t.label));
    REQUIRED_SOURCE_SLOTS.forEach(push);
    GARAGE_DOC_SLOTS.forEach(push);
    if (uploadType) push(uploadType);
    return labels;
  }, [docTypes, uploadType]);

  // Tally Devis-typed documents in this dossier by their variant.
  // Files missing `devisVariant` are treated as original (back-compat with older uploads).
  const devisStats = useMemo(() => {
    const devisDocs = sortedDocs.filter((d: any) => (d.type || d.typeDocument) === 'Devis');
    const originals = devisDocs.filter((d: any) => (d.devisVariant ?? 'original') === 'original').length;
    const counters = devisDocs.filter((d: any) => d.devisVariant === 'counter').length;
    return { originals, counters };
  }, [sortedDocs]);

  const canSelectCounter = devisStats.originals > 0;

  // When the user switches uploadType or opens the dialog, reset variant fields sensibly.
  React.useEffect(() => {
    if (uploadType !== 'Devis') return;
    // If no original yet → force 'original'. Otherwise default to 'original' but allow switch.
    setDevisVariant('original');
    setCounterRoundLabel(toOrdinalFr(devisStats.counters + 1) + ' accord');
  }, [uploadType, devisStats.counters, isUploadModalOpen]);

  /** Open the native picker; the typed dialog follows with `type` preselected. */
  const openImport = (type?: string) => {
    setUploadType(type ?? '');
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setUploadModalOpen(true);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * The single upload routine (dialog + socket paths): per-file
   * offline-capable upload, historique + workflow logs, toast. Returns true
   * on success.
   */
  const uploadFiles = async (
    files: File[],
    type: string,
    opts?: { devisVariant?: 'original' | 'counter'; counterRoundLabel?: string },
  ): Promise<boolean> => {
    if (files.length === 0 || !type || !db || !storage || !auth) return false;
    const userEmail = auth.currentUser?.email || 'Admin';
    const userId = auth?.currentUser?.uid || 'unknown';
    setUploadingType(type);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const timestamp = Date.now();
        const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${file.name}`;

        const isDevis = type === 'Devis';
        // When multiple counter files are selected at once, auto-increment the round label
        // so that "1er accord", "2ème accord", etc. don't collide on the same upload.
        const devisMetadata: Record<string, any> = {};
        if (isDevis && opts?.devisVariant) {
          devisMetadata.devisVariant = opts.devisVariant;
          if (opts.devisVariant === 'counter') {
            // Only keep the custom label for the first file; subsequent files get the next ordinal.
            const label = opts.counterRoundLabel?.trim() && i === 0
              ? opts.counterRoundLabel.trim()
              : toOrdinalFr(devisStats.counters + 1 + i) + ' accord';
            devisMetadata.counterRoundLabel = label;
            devisMetadata.counterRoundOrder = devisStats.counters + 1 + i;
          }
        }

        await uploadFileWithOfflineSupport({
          storage,
          db,
          file,
          fileName: file.name,
          storagePath,
          firestoreDocPath: `dossiers/${dossierId}/documents`,
          firestoreMetadata: {
            nom: file.name,
            type,
            taille: file.size,
            uploadePar: userEmail,
            storagePath,
            _localCreatedAt: timestamp,
            ...devisMetadata,
          },
        });
        await logHistorique(db, dossierId, 'Upload document', userEmail, `Document "${file.name}" uploadé.`, 'document', profile?.nom);
        await logWorkflow(db, dossierId, 'Nouveau document ajouté', userEmail, userId, 'done', { details: `Document "${file.name}" ajouté (par gestionnaire)` }, profile?.nom);
      }
      toast({ title: files.length === 1 ? t('Document uploadé avec succès') : `${files.length} ${t('documents uploadés')}` });
      return true;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: t("Erreur lors de l'upload"),
        description: error.message || t('Une erreur inconnue est survenue.'),
      });
      return false;
    } finally {
      setUploadingType(null);
    }
  };

  /** Dialog confirm. */
  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !uploadType) return;
    // Guard: counter variant requires an original already in this dossier.
    if (uploadType === 'Devis' && devisVariant === 'counter' && !canSelectCounter) {
      toast({
        variant: 'destructive',
        title: t('Devis original manquant'),
        description: t("Uploadez d'abord un devis original avant d'ajouter un contre-devis."),
      });
      return;
    }
    setIsUploading(true);
    const ok = await uploadFiles(
      selectedFiles,
      uploadType,
      uploadType === 'Devis' ? { devisVariant, counterRoundLabel } : undefined,
    );
    setIsUploading(false);
    if (ok) {
      setUploadModalOpen(false);
      setSelectedFiles([]);
      setUploadType('');
    }
  };

  /** Socket click / socket drop → straight into that slot type. */
  const addFilesToType = (files: File[], type: string) => {
    if (files.length === 0) return;
    if (type === 'Devis') {
      // The legacy Devis type needs the original / contre-devis variant choice.
      setSelectedFiles(files);
      setUploadType('Devis');
      setUploadModalOpen(true);
      return;
    }
    void uploadFiles(files, type);
  };

  // ── Delete / preview ───────────────────────────────────────────────────────

  const handleDelete = async (document: any) => {
    const userEmail = auth?.currentUser?.email || 'Admin';
    if (!db || !storage) return;

    setIsDeleting(document.id);

    try {
      if (document.storagePath) {
        const storageRef = ref(storage, document.storagePath);
        await deleteObject(storageRef).catch((err) => {
          console.warn('Storage file already missing or blocked by rules:', err);
        });
      }
      await deleteDoc(doc(db, 'dossiers', dossierId, 'documents', document.id));
      await logHistorique(db, dossierId, 'Suppression document', userEmail, `Document "${document.nom || 'inconnu'}" supprimé.`, 'document', profile?.nom);
      toast({ title: t('Document supprimé avec succès') });
    } catch (error: any) {
      console.error('Document delete error:', error);
      toast({
        variant: 'destructive',
        title: t('Erreur lors de la suppression'),
        description: error?.message || t('Vérifiez les permissions de stockage.'),
      });
    } finally {
      setIsDeleting(null);
      setDeleteTarget(null);
    }
  };

  // Socket-to-socket drag: move (empty target) or swap (filled target) every
  // page of the dragged document; writes + historique + AI feedback in
  // `reclassifyDocuments`. Chiffrage outputs never appear here, so a drop can
  // only ever land on a step-1 type.
  const handleDocDrop = async (targetType: string, payload: DocDragPayload) => {
    if (!db) return;
    const sourceType = payload.type;
    if (!sourceType || sourceType === targetType || isChiffrageOutputType(targetType)) return;
    const sourceDocs = sortedDocs.filter((d) => docTypeOf(d) === sourceType);
    const targetDocs = (docsByType[targetType] || []).filter((d) => !!d.url);
    if (sourceDocs.length === 0) return;
    const userEmail = auth?.currentUser?.email || 'Admin';
    try {
      const res = await reclassifyDocuments({
        db, dossierId, sourceType, targetType, sourceDocs, targetDocs,
        userEmail, userName: profile?.nom,
        compagnie: ((dossier as any)?.compagnie as string | undefined) ?? null,
      });
      toast({
        title: res.mode === 'swap'
          ? `${t('Documents échangés :')} ${sourceType} ↔ ${targetType}`
          : `${t('Document déplacé vers')} « ${targetType} »`,
      });
    } catch (error: any) {
      console.error('Reclassify error:', error);
      toast({
        variant: 'destructive',
        title: t('Erreur lors du reclassement'),
        description: error?.message || t('Impossible de déplacer le document.'),
      });
    }
  };

  const openDoc = (d: TypedDoc, pages?: TypedDoc[]) => {
    if (d.pendingUpload || !d.url) return;
    const list = (pages && pages.length > 0 ? pages : [d])
      .filter((p) => !!p.url && !p.pendingUpload)
      .map(toLightboxDoc);
    setPreview({ doc: toLightboxDoc(d), pages: list });
  };

  // ── Selection / batch download ─────────────────────────────────────────────

  /** Tile-level selection: the checkbox toggles every file of that socket. */
  const isSocketSelected = (docs: TypedDoc[]) => {
    const selectable = docs.filter((d) => d.url && !d.pendingUpload);
    return selectable.length > 0 && selectable.every((d) => selectedIds.has(d.id));
  };
  const toggleSocketSelection = (docs: TypedDoc[]) => {
    const selectable = docs.filter((d) => d.url && !d.pendingUpload);
    const allIn = isSocketSelected(docs);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      selectable.forEach((d) => { if (allIn) next.delete(d.id); else next.add(d.id); });
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      selectableVisible.forEach((d) => { if (d.id) next.add(d.id); });
      return next;
    });
  };

  const deselectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleDocsFlat.forEach((d) => next.delete(d.id));
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Build the master-folder name from the parent dossier:
  //   `${referenceCompagnie} - ${assuré} - ${compagnie}`.
  // NFC-normalize so accented characters (é, è, à…) survive the round-trip
  // through JSZip → unzip on any OS (item [historique-pj] folder rename + fix).
  const buildMasterFolderName = (): string => {
    const d = dossier as any;
    const ref = (d?.referenceCompagnie || '').toString().trim();
    const assureNom =
      typeof d?.assure === 'string'
        ? d.assure
        : `${d?.assure?.nom || ''} ${d?.assure?.prenom || ''}`.trim();
    const compagnie = (d?.compagnie || '').toString().trim();
    const parts = [ref, assureNom, compagnie].filter(Boolean);
    const raw = parts.length ? parts.join(' - ') : `documents-${dossierId}`;
    // Strip filesystem-illegal chars but KEEP accents.
    return raw.normalize('NFC').replace(/[\\/:*?"<>|]/g, '_').trim() || `documents-${dossierId}`;
  };

  // Sanitize an arbitrary path segment for the zip while preserving accents.
  // Garbled output in older builds came from over-eager regexes that
  // mangled UTF-8; here we only strip true filesystem-illegal characters.
  const sanitizeSegment = (s: string, fallback = 'Autres'): string => {
    const cleaned = (s || '').normalize('NFC').replace(/[\\/:*?"<>|]/g, '_').trim();
    return cleaned || fallback;
  };

  // Map the photo category enum (`avant` / `en_cours` / `apres`) to the
  // French sub-folder names the user asked for.
  const PHOTO_CATEGORY_FOLDERS: Record<string, string> = {
    avant: 'photos avant',
    en_cours: 'photos en cours',
    apres: 'photos après',
  };

  const handleDownloadSelected = async (includePhotos: boolean) => {
    if (!allDocuments || selectedIds.size === 0) return;
    const chosen = allDocuments.filter((d: any) => selectedIds.has(d.id) && d.url);
    if (chosen.length === 0 && !includePhotos) return;
    setIsBatchDownloading(includePhotos ? 'docs+photos' : 'docs');
    try {
      const zip = new JSZip();
      const masterName = buildMasterFolderName();
      const master = zip.folder(masterName)!;

      // ── Documents: nested under master/<type> ─────────────────────────────
      const fetched = await Promise.all(
        chosen.map(async (d: any) => {
          const folderName = sanitizeSegment(d.type || d.typeDocument || 'Autres');
          const fileName = sanitizeSegment(d.nom || d.fileName || 'document', 'document');
          try {
            const response = await fetch(d.url);
            const blob = await response.blob();
            return { folderName, fileName, blob, ok: true as const };
          } catch (err) {
            console.warn('Skipping document, fetch failed:', d.nom || d.id, err);
            return { folderName, fileName, blob: null, ok: false as const };
          }
        })
      );

      const folderSet = new Set<string>();
      for (const item of fetched) {
        if (!item.ok || !item.blob) continue;
        folderSet.add(item.folderName);
        master.folder(item.folderName)!.file(item.fileName, item.blob);
      }

      // ── Photos: nested under master/photos {avant|en cours|après} ─────────
      let photoCount = 0;
      if (includePhotos && allPhotos && allPhotos.length > 0) {
        const photoResults = await Promise.all(
          allPhotos
            .filter((p: any) => p.url && !p.pendingUpload)
            .map(async (p: any) => {
              const cat = (p.category || '').toString();
              const folderName = PHOTO_CATEGORY_FOLDERS[cat] || 'photos';
              const fileName = sanitizeSegment(p.name || 'photo', 'photo');
              try {
                const response = await fetch(p.url);
                const blob = await response.blob();
                return { folderName, fileName, blob, ok: true as const };
              } catch (err) {
                // Don't let one CORS-failing image kill the whole zip.
                console.warn('Skipping photo, fetch failed:', p.name || p.id, err);
                return { folderName, fileName, blob: null, ok: false as const };
              }
            })
        );
        for (const item of photoResults) {
          if (!item.ok || !item.blob) continue;
          master.folder(item.folderName)!.file(item.fileName, item.blob);
          photoCount += 1;
        }
      }

      // platform: 'UNIX' + JSZip's default UTF-8 path encoding produces
      // archive entries that unzip with correct accents on Windows / macOS / Linux.
      const zipBlob = await zip.generateAsync({ type: 'blob', platform: 'UNIX' });
      const blobUrl = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      const dateSlug = new Date().toISOString().slice(0, 10);
      link.download = `${masterName} - ${dateSlug}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      const docCount = fetched.filter((f) => f.ok).length;
      toast({
        title: includePhotos
          ? `${t('Archive téléchargée')} (${docCount} document(s), ${photoCount} photo(s))`
          : `${t('Archive téléchargée')} (${docCount} document(s) ${t('dans')} ${folderSet.size} ${t('dossier(s)')})`,
      });
    } catch (e) {
      console.error('Batch download error:', e);
      toast({ variant: 'destructive', title: t('Erreur lors du téléchargement') });
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const allVisibleSelected =
    selectableVisible.length > 0 && selectableVisible.every((d) => selectedIds.has(d.id));
  const selectedCount = selectedIds.size;
  const missingCount = requiredStatus.missingLabels.length;
  const showSummary = showRequirements && !loading && !!allDocuments;

  // ── Socket focus (missing-summary links) ───────────────────────────────────

  const socketId = (t: string) => `docslot-${dossierId}-${t.replace(/[^a-zA-Z0-9]+/g, '-')}`;
  const focusSocket = (missingLabel: string) => {
    const target = missingLabel === GARAGE_PAIR_LABEL ? GARAGE_DOC_SLOTS[0] : missingLabel;
    if (search) setSearch('');
    // Let a cleared search re-render first.
    window.setTimeout(() => {
      const el = document.getElementById(socketId(target));
      if (!el) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      (el.querySelector<HTMLElement>('button') ?? el).focus({ preventScroll: true });
    }, 50);
  };

  // ── Rendering ──────────────────────────────────────────────────────────────

  /**
   * Section title + « 4/6 reçues » caption to its right (E6): on a phone the
   * section rarely fits on one screen, and counting filled tiles by eye means
   * scrolling back up.
   */
  const sectionTitle = (label: string, entries: { docs: TypedDoc[] }[]) => {
    const received = entries.filter((x) => x.docs.some((d) => !!d.url && !d.pendingUpload)).length;
    return (
      <div className="flex items-baseline justify-between gap-3">
        <h4 className={SECTION_LABEL_CLASS}>{t(label)}</h4>
        <span className="t-caption shrink-0 tabular-nums">
          {received}/{entries.length} {t('reçues')}
        </span>
      </div>
    );
  };

  const renderSocket = (spec: SocketSpec, docs: TypedDoc[]) => (
    <SlotCard
      key={spec.type}
      id={socketId(spec.type)}
      slot={spec.type}
      docs={docs}
      canEdit={canEdit}
      canDeleteDoc={() => canEdit}
      userRole={profile?.role}
      isUploading={uploadingType === spec.type}
      deletingId={isDeleting}
      canManageExtraSlots={false}
      onUpload={(files) => addFilesToType(files, spec.type)}
      onDelete={(d) => setDeleteTarget(d)}
      onCreateNextCardinal={noop}
      onCreateExtraSlot={noop}
      onRenameExtraSlot={noop}
      onPreview={openDoc}
      onDocDrop={(payload) => handleDocDrop(spec.type, payload)}
      hideCardinalPlus
      hideExtraSlotPlus
      hint={spec.hint}
      emptyCaption={spec.emptyCaption}
      accept={ACCEPT_ATTR}
      acceptFile={acceptBrowserFile}
      selectable={selectionMode}
      selected={isSocketSelected(docs)}
      onToggleSelect={() => toggleSocketSelection(docs)}
    />
  );

  const showOthersGroup = visOthers.length > 0 || (canEdit && !isSearching);

  return (
    <div className="space-y-4">
      {/* "Autre type…" socket → typed dialog */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        className="hidden"
        accept={ACCEPT_ATTR}
        onChange={handleFileSelect}
      />

      {/* Toolbar: title · count · search ─ Sélectionner · types · primary */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="t-heading">{t(title)}</h3>
          <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-surface-2 px-2 text-xs font-medium tabular-nums text-ink-2">
            {sortedDocs.length}
          </span>
        </div>
        <div className="relative min-w-[11rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Rechercher un fichier ou un type…')}
            aria-label={t('Rechercher un fichier ou un type de document')}
            className="h-9 border-hairline bg-card pl-8 md:text-[13px]"
          />
        </div>
        {!selectionMode && (
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setSelectionMode(true)}>
              <CheckSquare className="h-4 w-4" />
              {t('Sélectionner')}
            </Button>
            <OptionsManagerModal
              collectionName="options_types_documents"
              title={t('Types de documents')}
              defaultValues={[...defaultDocTypes]}
              trigger={(
                <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-ink-3 hover:text-ink" aria-label={t('Gérer les types de documents')} title={t('Types de documents')}>
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            />
            {primaryAction}
          </div>
        )}
      </div>

      {/* Batch-action well (replaces the toolbar actions while active) */}
      {selectionMode && (
        <Card variant="flat" className="flex flex-wrap items-center justify-between gap-2 px-4 py-2" role="region" aria-label={t('Sélection de documents')}>
          <span className="t-body font-medium tabular-nums">
            {selectedCount} {selectedCount > 1 ? t('documents sélectionnés') : t('document sélectionné')}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={allVisibleSelected ? deselectAllVisible : selectAllVisible}
              disabled={selectableVisible.length === 0}
            >
              {allVisibleSelected ? t('Tout désélectionner') : t('Sélectionner tout')}
            </Button>
            <Button
              size="sm"
              onClick={() => handleDownloadSelected(false)}
              disabled={selectedCount === 0 || !!isBatchDownloading}
            >
              {isBatchDownloading === 'docs' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t('Télécharger')} ({selectedCount})
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleDownloadSelected(true)}
              disabled={selectedCount === 0 || !!isBatchDownloading}
              title={t('Inclure les photos avant / en cours / après dans le zip')}
            >
              {isBatchDownloading === 'docs+photos' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {t('Inclure photos')} ({selectedCount})
            </Button>
            <Button variant="ghost" size="sm" onClick={exitSelectionMode} disabled={!!isBatchDownloading}>
              {t('Annuler')}
            </Button>
          </div>
        </Card>
      )}

      {/* Missing-required summary — links scroll to the socket. Shell shared
          with the Informations step's champs-requis line (owner ruling
          2026-09-02: both warnings byte-for-byte identical). */}
      {showSummary && (
        <RequiredSummaryLine state={missingCount > 0 ? 'missing' : 'ok'}>
          {missingCount > 0 ? (
            <>
              <span className="font-medium">
                {missingCount} {missingCount > 1 ? t('pièces requises manquantes') : t('pièce requise manquante')}
              </span>
              {' : '}
              {requiredStatus.missingLabels.map((label, i) => (
                <React.Fragment key={label}>
                  {i > 0 && ', '}
                  <button
                    type="button"
                    onClick={() => focusSocket(label)}
                    className="rounded-sm underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    {/* Translate on RENDER only: `label` is the raw slot type,
                        compared by identity in focusSocket / GARAGE_PAIR_LABEL. */}
                    {t(label)}
                  </button>
                </React.Fragment>
              ))}
            </>
          ) : (
            <>{t('Toutes les pièces requises sont déposées.')}</>
          )}
        </RequiredSummaryLine>
      )}

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pièces requises — always shown, sockets carry the state. */}
          <section className="space-y-3" aria-label={t('Pièces requises')}>
            {sectionTitle('Pièces requises', visRequired)}
            <div className={SOCKET_GRID_CLASS}>
              {visRequired.map((x) => renderSocket(x.spec, x.docs))}
            </div>
          </section>

          {/* Autres documents — types holding files + the "Autre type…" socket. */}
          {showOthersGroup && (
            <section className="space-y-3 border-t border-hairline pt-5" aria-label={t('Autres documents')}>
              {sectionTitle('Autres documents', visOthers)}
              <div className={SOCKET_GRID_CLASS}>
                {visOthers.map((x) => renderSocket(x.spec, x.docs))}
                {canEdit && !isSearching && (
                  <button
                    type="button"
                    onClick={() => openImport()}
                    className={cn(SOCKET_BASE_CLASS, SOCKET_OPEN_CLASS)}
                    aria-label={t("Ajouter un document d'un autre type")}
                  >
                    <Plus className="h-5 w-5 text-ink-3 transition-colors duration-150 group-hover/socket:text-ink" aria-hidden />
                    <span className="t-body-sm font-medium text-ink-2 transition-colors duration-150 group-hover/socket:text-ink">
                      {t('Autre type…')}
                    </span>
                    <span className="t-caption">{t('Choisir la catégorie')}</span>
                  </button>
                )}
              </div>
            </section>
          )}

          {isSearching && visOthers.length === 0 && (
            <p className="t-caption">
              {t('Aucun autre document ne correspond à')} «&nbsp;{search.trim()}&nbsp;».
            </p>
          )}
        </div>
      )}

      {/* Upload modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t('Catégorie du document')}</DialogTitle>
            <DialogDescription>
              {selectedFiles.length === 1 ? (
                <>{t('Fichier :')} <span className="font-semibold text-ink">{selectedFiles[0]?.name}</span></>
              ) : (
                <><span className="font-semibold text-ink">{selectedFiles.length} {t('fichiers')}</span> {t('seront uploadés avec ce type.')}</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t('Type de document')}</label>
                <OptionsManagerModal collectionName="options_types_documents" title={t('Types de documents')} defaultValues={[...defaultDocTypes]} />
              </div>
              <Select value={uploadType} onValueChange={setUploadType} disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder={t('Choisir une catégorie')} />
                </SelectTrigger>
                <SelectContent>
                  {uploadTypeOptions.map((label) => (
                    <SelectItem key={`type-${label}`} value={label}>{t(label)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {uploadType === 'Devis' && (
              <div className="space-y-2 border-t border-hairline pt-1">
                <Label className="text-xs font-semibold">{t('Variante du devis')}</Label>
                <RadioGroup
                  value={devisVariant}
                  onValueChange={(v) => setDevisVariant(v as 'original' | 'counter')}
                  className="gap-2"
                  disabled={isUploading}
                >
                  <label className="flex cursor-pointer items-start gap-2">
                    <RadioGroupItem value="original" id="dv-original" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{t('Devis original')}</div>
                      <div className="t-caption">
                        {t("Lignes et prix imprimés. Extraction complète par l'IA au moment du chiffrage.")}
                      </div>
                    </div>
                  </label>
                  <label className={cn('flex items-start gap-2', canSelectCounter ? 'cursor-pointer' : 'cursor-not-allowed')}>
                    <RadioGroupItem value="counter" id="dv-counter" className="mt-0.5" disabled={!canSelectCounter} />
                    <div className="flex-1">
                      <div className={cn('text-sm font-medium', !canSelectCounter && 'text-ink-3')}>
                        {t('Contre-devis / accord')}
                        {/* Red dot = the red "contre-proposition" column added in chiffrage. */}
                        <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-status-danger-fg align-middle" />
                      </div>
                      <div className="t-caption">
                        {canSelectCounter
                          ? t("Prix de contre-proposition (annotés à la main ou en surimpression). Ajoute une colonne rouge au devis lors du chiffrage.")
                          : t("Vous devez d'abord uploader un devis original pour ce dossier.")}
                      </div>
                    </div>
                  </label>
                </RadioGroup>

                {devisVariant === 'counter' && canSelectCounter && (
                  <div className="space-y-1 pt-2">
                    <Label className="text-xs font-semibold">{t('Label du round')}</Label>
                    <Input
                      value={counterRoundLabel}
                      onChange={(e) => setCounterRoundLabel(e.target.value)}
                      placeholder={t('1er accord')}
                      className="h-8 text-xs"
                      disabled={isUploading}
                    />
                    <div className="t-caption">
                      {t('Devient le nom de la colonne rouge (ex : « 1er accord », « Expert arbitre »).')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isUploading && (
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">{t('Envoi en cours...')}</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadModalOpen(false);
                setSelectedFiles([]);
              }}
              disabled={isUploading}
            >
              {t('Annuler')}
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                selectedFiles.length === 0
                || !uploadType
                || isUploading
                || (uploadType === 'Devis' && devisVariant === 'counter' && (!canSelectCounter || !counterRoundLabel.trim()))
              }
            >
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isUploading ? t('Transfert...') : t('Uploader')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox preview — shared component. `actions` is the PHONE-only
          « ⋯ » sheet of its header: a socket has no hover cluster on touch, so
          Supprimer lives there (E6 → E8). Ignored from md up. */}
      <DocumentPreviewLightbox
        doc={preview?.doc ?? null}
        pages={preview?.pages}
        onPageChange={(d) => setPreview((p) => (p ? { ...p, doc: d } : p))}
        onClose={() => setPreview(null)}
        onDownload={(d) => downloadFileFromUrl(d.url, d.nom)}
        actions={(() => {
          if (!canEdit || !preview) return undefined;
          const current = sortedDocs.find((d: TypedDoc) => d.url === preview.doc.url);
          if (!current) return undefined;
          return [
            {
              key: 'delete',
              label: t('Supprimer'),
              destructive: true,
              onSelect: () => {
                setPreview(null);
                setDeleteTarget(current);
              },
            },
          ];
        })()}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Supprimer ce document ?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.nom && <span className="font-semibold">{deleteTarget.nom}</span>} {t('sera supprimé définitivement du stockage et du dossier. Cette action est irréversible.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isDeleting}>{t('Annuler')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDelete(deleteTarget);
              }}
            >
              {t('Supprimer')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
