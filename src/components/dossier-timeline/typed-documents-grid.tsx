'use client';

import React, { useMemo, useState } from 'react';
import { Loader2, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth, useCollection, useFirestore, useStorage } from '@/firebase';
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { extractAndPersistChiffrageDevis, extractAndPersistDossierDoc } from '@/lib/devis-extract';
import { isEditableDocType } from '@/lib/devis-schema';
import { parseAccordDocType, mapToAccorde, parseAccordeParent } from '@/lib/docType-accorde';
import { buildDocFamilies, collectFamilySlotLabels } from '@/lib/doc-family';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { logHistorique, logWorkflow } from '@/app/(app)/dossiers/[id]/log-historique';
import { SlotCard, isImage, type ExtraSlotKind, type TypedDoc } from './slot-card';
import { FamilyRow } from './family-row';

// Slots shown in the typed-import grid. Photos (avant / en cours / après) are
// intentionally omitted — they have their own dedicated Photos step.
// Task #25 — the list is now dynamic: `BASE_DOC_SLOTS` is the canonical fixed
// skeleton (always rendered), and `computedSlots` (inside the component)
// appends cardinal-accord and proposition-accord variants found in the live
// Firestore docs, contiguously after the matching source-accordé slot.
const BASE_DOC_SLOTS = [
  'Devis Garage',
  'Devis accordé',
  'Facture Garage',
  'Facture accordé',
  'Rapport final',
  // Task #37 — réforme rapports live alongside the final rapport because
  // they are a parallel terminal output (réforme instead of réparation).
  'Réforme technique',
  'Réforme économique',
  'PV-Constat / Récépissé de police',
  'Carte grise',
  'Attestation d\'assurance',
  'Kilométrage',
  'Numéro de chassis',
];

interface TypedDocumentsGridProps {
  dossierId: string;
}

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

  // Group live docs into Devis / Facture families (one row each). Non-family
  // slots are rendered in a separate grid above/below the family rows.
  const families = useMemo(
    () => buildDocFamilies((allDocs as TypedDoc[]) || []),
    [allDocs],
  );

  // Split non-family slots into three labelled sections:
  //   - rapportSlots:  'Rapport final' alone (own section).
  //   - reformeSlots:  'Réforme technique' + 'Réforme économique' together.
  //   - otherSlots:    PV / Carte grise / Attestation / etc.
  const FAMILY_BASE_SLOTS = new Set(['Devis Garage', 'Facture Garage']);
  const RAPPORT_LABELS = new Set(['Rapport final']);
  const REFORME_LABELS = new Set(['Réforme technique', 'Réforme économique']);
  const { rapportSlots, reformeSlots, otherSlots } = useMemo(() => {
    const rapport: string[] = [];
    const reforme: string[] = [];
    const other: string[] = [];
    for (const slot of BASE_DOC_SLOTS) {
      if (FAMILY_BASE_SLOTS.has(slot) || slot === 'Devis accordé' || slot === 'Facture accordé') continue;
      if (RAPPORT_LABELS.has(slot)) rapport.push(slot);
      else if (REFORME_LABELS.has(slot)) reforme.push(slot);
      else other.push(slot);
    }
    return { rapportSlots: rapport, reformeSlots: reforme, otherSlots: other };
  }, []);

  // The full set of slot labels we need to populate `docsByType` for — all
  // family slots + non-family slots.
  const allSlotLabels = useMemo(() => {
    const set = new Set<string>([...rapportSlots, ...reformeSlots, ...otherSlots]);
    for (const fam of families) for (const s of fam.slots) set.add(s);
    return set;
  }, [families, rapportSlots, reformeSlots, otherSlots]);

  // Quick lookup: is this slot label a gestionnaire-managed extra? Detected
  // by its parent ordinal (extras are always ordinal ≥ 2 on Devis/Facture
  // Garage), so no reliance on the `extraSlot` flag on individual docs.
  const extraSlotKindByLabel = useMemo(() => {
    const map: Record<string, ExtraSlotKind> = {};
    for (const fam of families) {
      if (fam.parentOrdinal < 2) continue;
      const kind: ExtraSlotKind =
        fam.sourceDocType === 'Devis Garage' ? 'devis' : 'facture';
      map[fam.parent] = kind;
    }
    return map;
  }, [families]);

  // Collect extra labels per kind for handleCreateExtraSlot's next-N
  // computation. Derived from families so it's always in sync.
  const { extraDevisLabels, extraFactureLabels } = useMemo(() => {
    const devis: string[] = [];
    const facture: string[] = [];
    for (const fam of families) {
      if (fam.parentOrdinal < 2) continue;
      if (fam.sourceDocType === 'Devis Garage') devis.push(fam.parent);
      else facture.push(fam.parent);
    }
    return { extraDevisLabels: devis, extraFactureLabels: facture };
  }, [families]);

  // Ordered slot list for the flat grid render: families first, then the
  // standalone Rapport / Réforme / other-docs sections.
  const computedSlots = useMemo<string[]>(() => {
    const slots: string[] = [];
    for (const fam of families) for (const s of fam.slots) slots.push(s);
    for (const s of rapportSlots) slots.push(s);
    for (const s of reformeSlots) slots.push(s);
    for (const s of otherSlots) slots.push(s);
    return slots;
  }, [rapportSlots, reformeSlots, otherSlots, families]);

  const docsByType = useMemo(() => {
    const map: Record<string, TypedDoc[]> = {};
    for (const slot of allSlotLabels) map[slot] = [];
    if (allDocs) {
      for (const d of allDocs as TypedDoc[]) {
        const t = d.type || d.typeDocument || '';
        if (map[t]) {
          map[t].push(d);
        }
      }
    }
    // Stable-ish sort: pending first (so user sees their fresh upload), then by name.
    for (const slot of allSlotLabels) {
      map[slot].sort((a, b) => {
        if (a.pendingUpload && !b.pendingUpload) return -1;
        if (!a.pendingUpload && b.pendingUpload) return 1;
        return (a.nom || a.fileName || '').localeCompare(b.nom || b.fileName || '');
      });
    }
    return map;
  }, [allDocs, allSlotLabels]);

  const handleUpload = async (slot: string, files: File[], kindOverride?: ExtraSlotKind) => {
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
      // `kindOverride` lets the +pimple flow tag uploads when the family doesn't
      // exist yet (so `extraSlotKindByLabel[slot]` is undefined).
      const extraKind = kindOverride ?? extraSlotKindByLabel[slot];

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
      // Facture Garage / numbered extras). Each successful upload kicks off its
      // own scan that writes into `dossiers/{id}.structuredEditables[slot]` so
      // the chiffreur sees pre-extracted data the moment they open the chiffrage.
      if (isEditableDocType(slot)) {
        uploadJobs.forEach(({ file, storagePath }, idx) => {
          const r = results[idx];
          if (r.status !== 'fulfilled') return;
          extractAndPersistDossierDoc({
            db, storage, dossierId, docType: slot, storagePath, name: file.name,
          }).catch((e) => console.error(`[typed-docs-grid] pre-extraction failed for ${file.name}`, e));
        });
      }

      // Sync the new file(s) into the dossier's currently-active chiffrage if
      // one exists. Without this, files uploaded AFTER `Envoyer vers chiffrage`
      // (e.g. a freshly-created `Devis Garage 2` slot) would never appear in
      // the chiffreur's editor — the chiffrage's `files` array is frozen at
      // send-time. Best-effort: failures here don't block the upload.
      if (successCount > 0) {
        try {
          const dossierSnap = await getDoc(doc(db, 'dossiers', dossierId));
          const currentChiffrageId = (dossierSnap.data() as any)?.currentChiffrageId;
          if (currentChiffrageId) {
            const chiffrageRef = doc(db, 'chiffrages', currentChiffrageId);
            const chiffrageSnap = await getDoc(chiffrageRef);
            if (chiffrageSnap.exists()) {
              const newChiffrageFiles = uploadJobs
                .filter((_, idx) => results[idx].status === 'fulfilled')
                .map(({ file, storagePath }) => ({
                  name: file.name,
                  storagePath,
                  type: 'rapport',
                  docType: slot,
                  status: 'pending',
                  recognizedText: null,
                  pdfUrl: null,
                }));
              if (newChiffrageFiles.length > 0) {
                await updateDoc(chiffrageRef, {
                  files: arrayUnion(...newChiffrageFiles),
                  updatedAt: serverTimestamp(),
                });
                if (isEditableDocType(slot)) {
                  extractAndPersistChiffrageDevis({
                    db, storage, chiffrageId: currentChiffrageId, docType: slot,
                  }).catch((e) =>
                    console.error(`[typed-docs-grid] chiffrage extraction failed for ${slot}`, e),
                  );
                }
              }
            }
          }
        } catch (err) {
          console.warn('[typed-docs-grid] chiffrage sync failed (non-fatal)', err);
        }
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
  // extras) atomically with the user's first file upload. Label is
  // `<Base> <N>` with N = existingExtrasMax+1 starting at 2 so the first
  // extra is "… 2". The gestionnaire can then rename it via the pencil
  // affordance. No empty placeholder is written if the user picks no files
  // (the OS picker was cancelled) — the slot only materialises when the
  // upload succeeds and Firestore has the tagged document(s).
  const handleCreateExtraSlot = async (kind: ExtraSlotKind, files: File[]) => {
    if (files.length === 0) return;
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
    await handleUpload(label, files, kind);
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
    if (allSlotLabels.has(newLabel)) {
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

  // Create the next cardinal accord slot by inserting a placeholder doc into
  // Firestore. The dynamic slot logic picks it up and renders the fresh slot
  // contiguously. Uses `parsed.parent` so each parent family (base or extra)
  // produces its own accord chain. Dedup-guarded — clicking "+" multiple times
  // never piles up duplicate placeholders in the same cardinal slot
  // (cardinal slots are strictly 1-doc-per-slot).
  const handleCreateNextCardinal = async (slot: string) => {
    if (!db || !auth) return;
    const parsed = parseAccordDocType(slot);
    if (!parsed || (parsed.kind !== 'accord' && parsed.kind !== 'proposition-accord')) return;
    const nextOrdinal = parsed.ordinal + 1;
    const nextLabel = mapToAccorde(parsed.parent, parsed.kind, nextOrdinal);
    const existingForLabel = ((allDocs as TypedDoc[] | undefined) || []).some(
      (d) => (d.type || d.typeDocument) === nextLabel,
    );
    if (existingForLabel) {
      toast({ title: `Le slot "${nextLabel}" existe déjà.` });
      return;
    }
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
      // A new empty cardinal slot is awaiting the chiffreur — roll the dossier
      // statut back to `Chiffrage en cours` so the gestion des dossiers list
      // reflects the queue state. Force-update (not gated on current statut).
      try {
        const dossierRef = doc(db, 'dossiers', dossierId);
        await updateDoc(dossierRef, {
          statut: 'Chiffrage en cours',
          updatedAt: serverTimestamp(),
        });
        await logHistorique(
          db, dossierId,
          'Chiffrage en cours',
          currentEmail || profile?.nom || 'Utilisateur',
          `Statut mis à jour automatiquement (création du slot ${nextLabel}).`,
          'statut',
        ).catch(() => {});
      } catch (statutErr) {
        console.warn('[typed-docs-grid] reset statut on cardinal create failed (non-fatal)', statutErr);
      }
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

  const handlePreview = (d: TypedDoc) => {
    if (d.url && !d.pendingUpload) {
      setPreviewDoc({ url: d.url, nom: d.nom || d.fileName || 'document' });
    }
  };

  const renderSlotCard = (slot: string) => (
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
      onPreview={handlePreview}
    />
  );

  const devisFamilies = families.filter((f) => f.sourceDocType === 'Devis Garage');
  const factureFamilies = families.filter((f) => f.sourceDocType === 'Facture Garage');

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Devis families: one horizontal row per parent */}
          {devisFamilies.map((group) => (
            <FamilyRow
              key={group.parent}
              group={group}
              docsByType={docsByType}
              canEdit={canEdit}
              canDeleteDoc={canDeleteDoc}
              userRole={profile?.role}
              canManageExtraSlots={canWrite('dossiers')}
              isUploading={(slot) => uploadingSlot === slot}
              deletingId={deletingId}
              extraSlotKindForSlot={(slot) => extraSlotKindByLabel[slot]}
              onUpload={handleUpload}
              onDelete={handleDelete}
              onCreateNextCardinal={handleCreateNextCardinal}
              onCreateExtraSlot={handleCreateExtraSlot}
              onRenameExtraSlot={handleRenameExtraSlot}
              onPreview={handlePreview}
            />
          ))}

          {/* Facture families: same pattern */}
          {factureFamilies.map((group) => (
            <FamilyRow
              key={group.parent}
              group={group}
              docsByType={docsByType}
              canEdit={canEdit}
              canDeleteDoc={canDeleteDoc}
              userRole={profile?.role}
              canManageExtraSlots={canWrite('dossiers')}
              isUploading={(slot) => uploadingSlot === slot}
              deletingId={deletingId}
              extraSlotKindForSlot={(slot) => extraSlotKindByLabel[slot]}
              onUpload={handleUpload}
              onDelete={handleDelete}
              onCreateNextCardinal={handleCreateNextCardinal}
              onCreateExtraSlot={handleCreateExtraSlot}
              onRenameExtraSlot={handleRenameExtraSlot}
              onPreview={handlePreview}
            />
          ))}

          {/* Rapport final — own section, single card */}
          {rapportSlots.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Rapport final</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {rapportSlots.map((slot) => renderSlotCard(slot))}
              </div>
            </section>
          )}

          {/* Réforme — technique + économique together */}
          {reformeSlots.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Réforme</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {reformeSlots.map((slot) => renderSlotCard(slot))}
              </div>
            </section>
          )}

          {/* Autres documents — PV, Carte grise, Attestation, etc. */}
          {otherSlots.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Autres documents</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {otherSlots.map((slot) => renderSlotCard(slot))}
              </div>
            </section>
          )}
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

