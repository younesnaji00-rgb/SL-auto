'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  FileIcon,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth, useCollection, useFirestore, useStorage } from '@/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { extractAndPersistDossierDoc } from '@/lib/devis-extract';
import { isEditableDocType } from '@/lib/devis-schema';
import { parseAccordDocType, mapToAccorde } from '@/lib/docType-accorde';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { logHistorique, logWorkflow } from '@/app/(app)/dossiers/[id]/log-historique';
import { cn } from '@/lib/utils';

// Slots shown in the typed-import grid. Photos (avant / en cours / après) are
// intentionally omitted — they have their own dedicated Photos step.
// Task #25 — the list is now dynamic: `BASE_DOC_SLOTS` is the canonical fixed
// skeleton (always rendered), and `computedSlots` (inside the component)
// appends cardinal-accord and proposition-accord variants found in the live
// Firestore docs, contiguously after the matching source-accordé slot.
const BASE_DOC_SLOTS = [
  'Rapport final',
  // Task #37 — réforme rapports live alongside the final rapport because
  // they are a parallel terminal output (réforme instead of réparation).
  'Réforme technique',
  'Réforme économique',
  'Devis Garage',
  'Devis accordé',
  'Facture Garage',
  'Facture accordé',
  'PV-Constat / Récépissé de police',
  'Carte grise',
  'Attestation d\'assurance',
  'Kilométrage',
  'Numéro de chassis',
];

type ExtraSlotKind = 'devis' | 'facture';

type TypedDoc = {
  id: string;
  nom?: string;
  fileName?: string;
  url?: string | null;
  type?: string;
  typeDocument?: string;
  uploadePar?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  storagePath?: string;
  pendingUpload?: boolean;
  taille?: number;
  // Marks a document as belonging to a gestionnaire-created extra slot
  // (rendered after "Devis Garage" / "Facture Garage"). The slot grouping
  // key is still the `type` string; this field is used only to detect
  // which slots are user-managed (pimple + rename affordances).
  extraSlot?: ExtraSlotKind;
};

interface TypedDocumentsGridProps {
  dossierId: string;
}

const isImage = (name: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(name || '');

export default function TypedDocumentsGrid({ dossierId }: TypedDocumentsGridProps) {
  const db = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const { toast } = useToast();
  const { canWrite, profile } = useCurrentUser();
  // Gestionnaires / Admins edit via 'dossiers' section; ATG edits this same grid
  // through their own assignation section. Upload is allowed for either.
  const canEdit = canWrite('dossiers') || canWrite('assignations-atg');
  const isATG = profile?.role === 'Agent de Terrain';
  const currentEmail = auth?.currentUser?.email || profile?.email || '';
  const currentUid = auth?.currentUser?.uid || '';
  // ATG may delete only documents they uploaded themselves. Everyone else with
  // canEdit may delete anything.
  const canDeleteDoc = (d: TypedDoc): boolean => {
    if (!canEdit) return false;
    if (!isATG) return true;
    return (
      (!!currentUid && d.uploadedBy === currentUid) ||
      (!!currentEmail && d.uploadePar === currentEmail)
    );
  };

  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; nom: string } | null>(null);

  const collQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'dossiers', dossierId, 'documents');
  }, [db, dossierId]);

  const { data: allDocs, loading } = useCollection<any>(collQuery);

  // Task #25 — Build the final slot list dynamically. The base skeleton is
  // always present; cardinal accord (ordinal ≥ 2) and proposition-accord
  // variants are inserted contiguously after the matching source-accordé slot.
  // Gestionnaire-created extras (flagged `extraSlot: 'devis' | 'facture'`) are
  // inserted contiguously after the matching base Garage slot.
  const { computedSlots, extraDevisLabels, extraFactureLabels } = useMemo(() => {
    const dynamic = new Set<string>();
    const extraDevis: string[] = [];
    const extraFacture: string[] = [];
    const seenExtraDevis = new Set<string>();
    const seenExtraFacture = new Set<string>();

    if (allDocs) {
      for (const d of allDocs as TypedDoc[]) {
        const label = d.type || d.typeDocument || '';
        if (!label) continue;
        const parsed = parseAccordDocType(label);
        if (parsed) {
          if (parsed.kind === 'accord' && parsed.ordinal >= 2) dynamic.add(label);
          else if (parsed.kind === 'proposition-accord') dynamic.add(label);
          continue;
        }
        if (d.extraSlot === 'devis' && !seenExtraDevis.has(label)) {
          seenExtraDevis.add(label);
          extraDevis.push(label);
        } else if (d.extraSlot === 'facture' && !seenExtraFacture.has(label)) {
          seenExtraFacture.add(label);
          extraFacture.push(label);
        }
      }
    }

    // Stable ordering: numeric-aware sort so `Devis Garage 2, 3, 10` beats
    // lexicographic `10, 2, 3`. Falls back to localeCompare for renamed labels.
    const numericAware = (a: string, b: string) => {
      const ra = /(\d+)\s*$/.exec(a);
      const rb = /(\d+)\s*$/.exec(b);
      if (ra && rb) return parseInt(ra[1], 10) - parseInt(rb[1], 10);
      return a.localeCompare(b, 'fr');
    };
    extraDevis.sort(numericAware);
    extraFacture.sort(numericAware);

    const slots: string[] = [];
    for (const base of BASE_DOC_SLOTS) {
      slots.push(base);
      if (base === 'Devis Garage') {
        for (const label of extraDevis) {
          if (!slots.includes(label)) slots.push(label);
        }
      }
      if (base === 'Facture Garage') {
        for (const label of extraFacture) {
          if (!slots.includes(label)) slots.push(label);
        }
      }
      if (base === 'Devis accordé') {
        for (const ord of [2, 3]) {
          const label = mapToAccorde('Devis Garage', 'accord', ord);
          if (dynamic.has(label) && !slots.includes(label)) slots.push(label);
        }
        for (const ord of [1, 2, 3]) {
          const label = mapToAccorde('Devis Garage', 'proposition-accord', ord);
          if (dynamic.has(label) && !slots.includes(label)) slots.push(label);
        }
      }
      if (base === 'Facture accordé') {
        for (const ord of [2, 3]) {
          const label = mapToAccorde('Facture Garage', 'accord', ord);
          if (dynamic.has(label) && !slots.includes(label)) slots.push(label);
        }
        for (const ord of [1, 2, 3]) {
          const label = mapToAccorde('Facture Garage', 'proposition-accord', ord);
          if (dynamic.has(label) && !slots.includes(label)) slots.push(label);
        }
      }
    }
    return {
      computedSlots: slots,
      extraDevisLabels: extraDevis,
      extraFactureLabels: extraFacture,
    };
  }, [allDocs]);

  // Quick lookup: is this slot label a gestionnaire-managed extra?
  const extraSlotKindByLabel = useMemo(() => {
    const map: Record<string, ExtraSlotKind> = {};
    for (const l of extraDevisLabels) map[l] = 'devis';
    for (const l of extraFactureLabels) map[l] = 'facture';
    return map;
  }, [extraDevisLabels, extraFactureLabels]);

  const docsByType = useMemo(() => {
    const map: Record<string, TypedDoc[]> = {};
    for (const slot of computedSlots) map[slot] = [];
    if (allDocs) {
      for (const d of allDocs as TypedDoc[]) {
        const t = d.type || d.typeDocument || '';
        if (map[t]) {
          map[t].push(d);
        }
      }
    }
    // Stable-ish sort: pending first (so user sees their fresh upload), then by name.
    for (const slot of computedSlots) {
      map[slot].sort((a, b) => {
        if (a.pendingUpload && !b.pendingUpload) return -1;
        if (!a.pendingUpload && b.pendingUpload) return 1;
        return (a.nom || a.fileName || '').localeCompare(b.nom || b.fileName || '');
      });
    }
    return map;
  }, [allDocs, computedSlots]);

  const handleUpload = async (slot: string, files: File[]) => {
    if (!db || !storage || !auth) return;
    if (files.length === 0) return;
    const userEmail = auth.currentUser?.email || profile?.email || 'Admin';
    const userId = auth.currentUser?.uid || 'unknown';
    const userName =
      profile ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() || userEmail : userEmail;

    setUploadingSlot(slot);
    try {
      // Pre-compute storage paths so we can reuse the same path for upload
      // and for the follow-up fire-and-forget AI extraction.
      const uploadJobs = files.map((file, idx) => {
        // Jitter the timestamp so parallel uploads don't collide on the same ms.
        const timestamp = Date.now() + idx;
        const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${file.name}`;
        return { file, timestamp, storagePath };
      });

      // Tag uploads with `extraSlot` when targeting a gestionnaire-managed
      // slot, so the slot stays detectable after the placeholder is gone.
      const extraKind = extraSlotKindByLabel[slot];

      // Fire all uploads in parallel so a batch of N files completes in ~1 file's time
      // instead of N × single-file time.
      const results = await Promise.allSettled(
        uploadJobs.map(({ file, timestamp, storagePath }) =>
          uploadFileWithOfflineSupport({
            storage,
            db,
            file,
            fileName: file.name,
            storagePath,
            firestoreDocPath: `dossiers/${dossierId}/documents`,
            firestoreMetadata: {
              nom: file.name,
              type: slot,
              taille: file.size,
              uploadePar: userEmail,
              uploadedBy: userId,
              uploadedByName: userName,
              storagePath,
              _localCreatedAt: timestamp,
              ...(extraKind ? { extraSlot: extraKind } : {}),
            },
          }),
        ),
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      // Fire-and-forget AI extraction when the slot is editable (Devis Garage /
      // Facture Garage). Each successful upload kicks off its own scan that
      // writes into `dossiers/{id}.structuredEditables[slot]` so the chiffreur
      // sees pre-extracted data the moment they open the chiffrage.
      if (isEditableDocType(slot)) {
        uploadJobs.forEach(({ file, storagePath }, idx) => {
          const r = results[idx];
          if (r.status !== 'fulfilled') return;
          extractAndPersistDossierDoc({
            db, storage, dossierId, docType: slot, storagePath, name: file.name,
          }).catch((e) => console.error(`[typed-docs-grid] pre-extraction failed for ${file.name}`, e));
        });
      }

      // Log one batch entry rather than N per-file entries.
      if (successCount > 0) {
        await logHistorique(
          db,
          dossierId,
          'Upload documents',
          userEmail,
          `${successCount} document(s) uploadé(s) dans "${slot}".`,
          'document',
        );
        await logWorkflow(db, dossierId, 'Nouveau document ajouté', userEmail, userId, 'done', {
          details: `${successCount} document(s) ajouté(s) dans "${slot}".`,
        });
      }

      if (failCount === 0) {
        toast({
          title: successCount === 1 ? 'Document uploadé' : `${successCount} documents uploadés`,
          description: `Ajouté(s) dans "${slot}".`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: `${failCount} échec(s)`,
          description: `${successCount}/${results.length} documents uploadés dans "${slot}".`,
        });
        results.forEach((r, i) => {
          if (r.status === 'rejected') console.error(`Upload failed for ${files[i].name}:`, r.reason);
        });
      }
    } finally {
      setUploadingSlot(null);
    }
  };

  // Create a fresh gestionnaire-managed slot (Devis Garage / Facture Garage
  // extras). Default label is `<Base> <N>` with N = existingExtrasMax+1
  // starting at 2 so the first extra is labelled "… 2". The gestionnaire can
  // then rename it via the pencil affordance.
  const handleCreateExtraSlot = async (kind: ExtraSlotKind) => {
    if (!db || !auth) return;
    const existing = kind === 'devis' ? extraDevisLabels : extraFactureLabels;
    const base = kind === 'devis' ? 'Devis Garage' : 'Facture Garage';
    const pattern = kind === 'devis'
      ? /^Devis Garage\s+(\d+)$/
      : /^Facture Garage\s+(\d+)$/;
    let maxN = 1;
    for (const l of existing) {
      const m = pattern.exec(l);
      if (m) {
        const n = parseInt(m[1], 10);
        if (Number.isFinite(n) && n > maxN) maxN = n;
      }
    }
    const nextN = maxN + 1;
    const label = `${base} ${nextN}`;
    const userId = auth.currentUser?.uid || 'unknown';
    try {
      await addDoc(collection(db, 'dossiers', dossierId, 'documents'), {
        type: label,
        extraSlot: kind,
        pendingUpload: true,
        storagePath: null,
        url: null,
        createdAt: serverTimestamp(),
        createdBy: userId,
      });
      toast({ title: `Nouveau slot créé : ${label}` });
    } catch (err: any) {
      console.error('[typed-docs-grid] create extra slot failed', err);
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la création du slot',
        description: err?.message || 'Impossible de créer le slot.',
      });
    }
  };

  // Rename a gestionnaire-managed extra slot. The `type` string is the
  // grouping key, so we batch-update every doc currently in the slot.
  const handleRenameExtraSlot = async (oldLabel: string) => {
    if (!db) return;
    const kind = extraSlotKindByLabel[oldLabel];
    if (!kind) return;
    const raw = window.prompt(`Renommer « ${oldLabel} » :`, oldLabel);
    if (raw == null) return;
    const newLabel = raw.trim();
    if (!newLabel || newLabel === oldLabel) return;
    if (computedSlots.includes(newLabel)) {
      toast({
        variant: 'destructive',
        title: 'Nom déjà utilisé',
        description: 'Un autre slot porte déjà ce nom.',
      });
      return;
    }
    try {
      const targets = (allDocs as TypedDoc[] || []).filter(
        (d) => (d.type || d.typeDocument || '') === oldLabel,
      );
      await Promise.all(
        targets.map((d) =>
          updateDoc(doc(db, 'dossiers', dossierId, 'documents', d.id), {
            type: newLabel,
            extraSlot: kind,
          }),
        ),
      );
      toast({ title: `Slot renommé : ${newLabel}` });
    } catch (err: any) {
      console.error('[typed-docs-grid] rename extra slot failed', err);
      toast({
        variant: 'destructive',
        title: 'Erreur lors du renommage',
        description: err?.message || 'Impossible de renommer le slot.',
      });
    }
  };

  // Task #26 — create the next cardinal accord slot by inserting a placeholder
  // doc into Firestore. The dynamic slot logic (task #25) picks it up and
  // renders the fresh slot in the grid contiguously.
  const handleCreateNextCardinal = async (slot: string) => {
    if (!db || !auth) return;
    const parsed = parseAccordDocType(slot);
    if (!parsed || parsed.kind !== 'accord') return;
    const nextOrdinal = parsed.ordinal + 1;
    if (nextOrdinal > 3) return;
    const nextLabel = mapToAccorde(parsed.sourceDocType, 'accord', nextOrdinal);
    const userId = auth.currentUser?.uid || 'unknown';
    try {
      await addDoc(collection(db, 'dossiers', dossierId, 'documents'), {
        type: nextLabel,
        pendingUpload: true,
        storagePath: null,
        url: null,
        createdAt: serverTimestamp(),
        createdBy: userId,
      });
      toast({ title: `Nouveau slot créé : ${nextLabel}` });
    } catch (err: any) {
      console.error('[typed-docs-grid] create next cardinal failed', err);
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la création du slot',
        description: err?.message || 'Impossible de créer le cardinal suivant.',
      });
    }
  };

  const handleDelete = async (item: TypedDoc) => {
    if (!db || !storage) return;
    if (!canDeleteDoc(item)) {
      toast({ variant: 'destructive', title: 'Suppression refusée', description: 'Vous ne pouvez supprimer que les documents que vous avez vous-même téléversés.' });
      return;
    }
    if (!window.confirm('Supprimer ce document ?')) return;

    const userEmail = auth?.currentUser?.email || profile?.email || 'Admin';
    setDeletingId(item.id);
    try {
      if (item.storagePath) {
        const storageRef = ref(storage, item.storagePath);
        await deleteObject(storageRef).catch((err) => {
          console.warn('Storage file already missing or blocked by rules:', err);
        });
      }
      await deleteDoc(doc(db, 'dossiers', dossierId, 'documents', item.id));
      await logHistorique(
        db,
        dossierId,
        'Suppression document',
        userEmail,
        `Document "${item.nom || item.fileName || 'inconnu'}" supprimé.`,
        'document',
      );
      toast({ title: 'Document supprimé' });
    } catch (err: any) {
      console.error('Typed delete error:', err);
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la suppression',
        description: err?.message || 'Vérifiez les permissions de stockage.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {computedSlots.map((slot) => (
            <SlotCard
              key={slot}
              slot={slot}
              docs={docsByType[slot] || []}
              canEdit={canEdit}
              canDeleteDoc={canDeleteDoc}
              userRole={profile?.role}
              isUploading={uploadingSlot === slot}
              deletingId={deletingId}
              extraSlotKind={extraSlotKindByLabel[slot]}
              canManageExtraSlots={canWrite('dossiers')}
              onUpload={(files) => handleUpload(slot, files)}
              onDelete={handleDelete}
              onCreateNextCardinal={() => handleCreateNextCardinal(slot)}
              onCreateExtraSlot={handleCreateExtraSlot}
              onRenameExtraSlot={() => handleRenameExtraSlot(slot)}
              onPreview={(d) => {
                if (d.url && !d.pendingUpload) {
                  setPreviewDoc({ url: d.url, nom: d.nom || d.fileName || 'document' });
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Lightbox preview */}
      {previewDoc && (
        <Dialog open onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-4 py-3 border-b shrink-0 flex flex-row items-center justify-between gap-2">
              <DialogTitle className="text-sm truncate flex-1">{previewDoc.nom}</DialogTitle>
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex"
                title="Ouvrir / télécharger"
              >
                <Button variant="ghost" size="icon" className="h-7 w-7" type="button">
                  <Download className="h-4 w-4" />
                </Button>
              </a>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPreviewDoc(null)}
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              {isImage(previewDoc.nom) ? (
                <img
                  src={previewDoc.url}
                  className="max-w-full max-h-full object-contain"
                  alt={previewDoc.nom}
                />
              ) : (
                <iframe
                  src={previewDoc.url}
                  className="w-full h-full border-none"
                  title={previewDoc.nom}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

interface SlotCardProps {
  slot: string;
  docs: TypedDoc[];
  canEdit: boolean;
  canDeleteDoc: (d: TypedDoc) => boolean;
  userRole?: string;
  isUploading: boolean;
  deletingId: string | null;
  extraSlotKind?: ExtraSlotKind;
  canManageExtraSlots: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (d: TypedDoc) => void;
  onCreateNextCardinal: () => void;
  onCreateExtraSlot: (kind: ExtraSlotKind) => void;
  onRenameExtraSlot: () => void;
  onPreview: (d: TypedDoc) => void;
}

function SlotCard({
  slot,
  docs,
  canEdit,
  canDeleteDoc,
  userRole,
  isUploading,
  deletingId,
  extraSlotKind,
  canManageExtraSlots,
  onUpload,
  onDelete,
  onCreateNextCardinal,
  onCreateExtraSlot,
  onRenameExtraSlot,
  onPreview,
}: SlotCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) onUpload(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  // Task #26 — accord/proposition slot detection.
  const parsedAccord = parseAccordDocType(slot);
  // Gestionnaires must not upload into accord/proposition slots — workflow
  // drives the cardinal creation instead.
  const hideUploadForRole =
    !!parsedAccord && userRole === 'Gestionnaire';
  // Pimple "+" button appears only on `accord` slots (not proposition) with a
  // next-cardinal within cap (max 3ème).
  const showCardinalPimple =
    !!parsedAccord &&
    parsedAccord.kind === 'accord' &&
    parsedAccord.ordinal + 1 <= 3;
  // Gestionnaires may advance the accord chain only when the current slot has
  // evidence. Non-gestionnaires (Admin / Responsable / Chiffreur) are free to
  // create the next cardinal regardless.
  const cardinalPimpleDisabled =
    userRole === 'Gestionnaire' && docs.length === 0;
  // Base-slot pimple: next to `Devis Garage` / `Facture Garage`, lets the
  // gestionnaire spawn a new numbered slot (first = "… 2", then 3, etc.).
  const baseExtraKind: ExtraSlotKind | null =
    slot === 'Devis Garage' ? 'devis'
    : slot === 'Facture Garage' ? 'facture'
    : null;
  const showExtraSlotPimple = !!baseExtraKind && canManageExtraSlots;
  // Rename pencil: only on gestionnaire-managed extras (not on the base
  // `Devis Garage` / `Facture Garage` and not on cardinal accord variants).
  const showRenameButton = !!extraSlotKind && canManageExtraSlots;

  return (
    <Card className="relative shadow-sm border rounded-lg overflow-visible flex flex-col">
      <CardHeader className="py-2.5 px-3 border-b">
        <CardTitle className="font-semibold text-sm flex items-center justify-between gap-2">
          <span className="truncate" title={slot}>{slot}</span>
          <span className="flex items-center gap-1 shrink-0">
            {showRenameButton && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onRenameExtraSlot}
                title="Renommer"
                aria-label="Renommer le slot"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <span className="text-[10px] font-normal text-muted-foreground">
              {docs.length}
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-1.5 flex-1">
        {docs.length === 0 ? (
          <p className="text-xs italic text-muted-foreground text-center py-3">
            Aucun document
          </p>
        ) : (
          <ul className="space-y-1">
            {docs.map((d) => {
              const name = d.nom || d.fileName || 'document';
              const img = d.url && isImage(name);
              const clickable = !!d.url && !d.pendingUpload;
              return (
                <li
                  key={d.id}
                  className={cn(
                    'flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 hover:bg-accent/40 transition-colors',
                    clickable && 'cursor-pointer',
                  )}
                  onClick={() => clickable && onPreview(d)}
                >
                  <div className="h-8 w-8 shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {img ? (
                      <img
                        src={d.url!}
                        alt={name}
                        className="object-cover w-full h-full"
                        loading="lazy"
                      />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" title={name}>
                      {name}
                    </p>
                    {d.pendingUpload && (
                      <p className="text-[10px] text-amber-700">En attente…</p>
                    )}
                  </div>
                  {canDeleteDoc(d) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(d);
                      }}
                      disabled={deletingId === d.id || !!d.pendingUpload}
                      title="Supprimer"
                    >
                      {deletingId === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canEdit && !hideUploadForRole && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={handlePick}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Ajouter
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>

      {showCardinalPimple && canEdit && (
        <button
          type="button"
          onClick={onCreateNextCardinal}
          disabled={cardinalPimpleDisabled}
          className={cn(
            "absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm shadow transition z-10",
            cardinalPimpleDisabled
              ? "opacity-40 cursor-not-allowed"
              : "hover:scale-110",
          )}
          title={
            cardinalPimpleDisabled
              ? "Téléversez un document dans ce slot avant de créer le prochain accord."
              : "Créer le cardinal suivant"
          }
          aria-label="Créer le cardinal suivant"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}

      {showExtraSlotPimple && baseExtraKind && (
        <button
          type="button"
          onClick={() => onCreateExtraSlot(baseExtraKind)}
          className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm shadow hover:scale-110 transition z-10"
          title={baseExtraKind === 'devis' ? 'Ajouter un devis' : 'Ajouter une facture'}
          aria-label={baseExtraKind === 'devis' ? 'Ajouter un devis' : 'Ajouter une facture'}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </Card>
  );
}
