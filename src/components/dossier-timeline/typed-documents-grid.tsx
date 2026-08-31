'use client';

import React, { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth, useCollection, useFirestore, useStorage } from '@/firebase';
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { extractAndPersistChiffrageDevis, extractAndPersistDossierDoc } from '@/lib/devis-extract';
import { scanAndPersistCarteGrise } from '@/lib/scan-carte-grise';
import { isEditableDocType } from '@/lib/devis-schema';
import { parseAccordDocType, mapToAccorde } from '@/lib/docType-accorde';
import { buildDocFamilies, type DocFamily } from '@/lib/doc-family';
import { isRequiredSourceSlot, computeRequiredDocsStatus, requiredDocChip } from '@/lib/required-docs';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { logHistorique, logWorkflow } from '@/app/(app)/dossiers/[id]/log-historique';
import { DocumentPreviewLightbox } from '@/components/document-preview-lightbox';
import { DocumentGroup, DocumentList, type SlotStatus } from '@/components/documents/document-list';
import { TypedSlotRow } from '@/components/documents/typed-slot-row';
import { downloadFileFromUrl, type ExtraSlotKind, type TypedDoc } from '@/components/documents/typed-doc';
import {
  AccordMatrixGroup,
  SlotMatrixGroup,
  type GarageUnit,
  type MatrixSlotHandlers,
} from '@/components/documents/accord-matrix';

// Slots shown in the typed-import board. Photos (avant / en cours / après) are
// intentionally omitted — they have their own dedicated Photos step.
// Task #25 — the list is dynamic: `BASE_DOC_SLOTS` is the canonical fixed
// skeleton (always rendered), and the live Firestore docs contribute
// cardinal-accord / proposition variants through `buildDocFamilies`.
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
  // Final-step invoice slot — the gestionnaire's fee note ("note d'honoraire").
  // Surfaced only in the Note d'honoraire timeline step (id 8) via
  // `showOnlyNoteHonoraire`; never appears in the other document sections.
  'Note d\'honoraire',
  // Optional catch-all for unrelated documents. Does NOT count toward the
  // assigner-au-chiffrage required-slot gate (see step-4-pieces.tsx).
  'Autre',
];

// Required-slot gate (item 023) now lives in `@/lib/required-docs` so the
// documents browser and the step gate share one predicate. Re-exported here
// for backward compatibility with existing importers.
export { REQUIRED_SOURCE_SLOTS, GARAGE_DOC_SLOTS } from '@/lib/required-docs';

interface TypedDocumentsGridProps {
  dossierId: string;
  hideAccordSlots?: boolean;
  showOnlyAccordSlots?: boolean;
  /**
   * When true, the "Ajouter un accord" header action on family groups is not
   * rendered. Used by step 6 to lock the cardinal chain to the current
   * revision.
   */
  hideCardinalPlus?: boolean;
  /**
   * When true, the "Nouveau devis / Nouvelle facture" header action (spawns
   * numbered Devis/Facture Garage variants) is not rendered. Used in views
   * like assignations-atg where spawning new garage chains doesn't belong.
   */
  hideExtraSlotPlus?: boolean;
  /**
   * Filter family rows by parsed cardinal ordinal. `'2-plus'` shows only
   * 2ème, 3ème, … cardinals (used in step 11) and hides the parent base +
   * 1er accord/proposition + the Réforme section (reforme has no cardinals).
   */
  cardinalFilter?: 'all' | '1-only' | '2-plus';
  /**
   * When true, render an additional group with the two standalone base
   * `Devis Garage` / `Facture Garage` rows, without cardinal / extra-slot
   * header actions. Used by assignations-atg so agents can collect base
   * garage docs without spawning accord chains from there.
   */
  showBaseGarageSlots?: boolean;
  /**
   * When true, the "Autres documents" group (PV-Constat / Carte grise /
   * Attestation / Kilométrage / Numéro de chassis) is not rendered.
   */
  hideOtherSlots?: boolean;
  /**
   * When true, surface every non-accord document type as its own row:
   * Rapport final, Réforme technique/économique, and the "Autres documents"
   * group. Overrides `hideAccordSlots` / `hideOtherSlots` for those groups
   * only — the accord/proposition family groups remain governed by
   * `hideAccordSlots`.
   */
  showAllNonAccordSlots?: boolean;
  /**
   * When true, the standalone Réforme technique / Réforme économique group
   * is not rendered, regardless of viewer role. Used in assignations-atg
   * where reform reports don't belong on the AT view.
   */
  hideReformeSlots?: boolean;
  /**
   * When true, render the Réforme group even in `showOnlyAccordSlots` mode,
   * where it would otherwise be suppressed. Used by the Accord step (id 6) so
   * the deposited réforme report surfaces alongside the accord documents.
   */
  showReformeSlots?: boolean;
  /**
   * When true, render ONLY the "Note d'honoraire" invoice row and nothing
   * else (no families, rapport, réforme or other-doc groups). Used by the
   * final Note d'honoraire timeline step (id 8).
   */
  showOnlyNoteHonoraire?: boolean;
}

export default function TypedDocumentsGrid({ dossierId, hideAccordSlots, showOnlyAccordSlots, hideCardinalPlus, hideExtraSlotPlus, cardinalFilter = 'all', showBaseGarageSlots, hideOtherSlots, showAllNonAccordSlots, hideReformeSlots, showReformeSlots, showOnlyNoteHonoraire }: TypedDocumentsGridProps) {
  const db = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const { toast } = useToast();
  const { canWrite, canDelete, profile } = useCurrentUser();
  // Gestionnaires / Admins edit via 'dossiers' section; ATG edits this same board
  // through their own assignation section. Upload is allowed for either.
  const canEdit = canWrite('dossiers') || canWrite('assignations-atg');
  const isATG = profile?.role === 'Agent de Terrain';
  const currentEmail = auth?.currentUser?.email || profile?.email || '';
  const currentUid = auth?.currentUser?.uid || '';
  // Admins and directeur-family roles (canDelete) may delete any document.
  // ATG may delete only their own uploads. All other roles see no delete
  // affordance.
  const canDeleteDoc = (d: TypedDoc): boolean => {
    if (canDelete) return true;
    if (isATG && canEdit) {
      return (
        (!!currentUid && d.uploadedBy === currentUid) ||
        (!!currentEmail && d.uploadePar === currentEmail)
      );
    }
    return false;
  };

  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; nom: string } | null>(null);

  const collQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'dossiers', dossierId, 'documents');
  }, [db, dossierId]);

  const { data: allDocs, loading } = useCollection<any>(collQuery);

  // Group live docs into Devis / Facture families (one group each). Non-family
  // slots are rendered in labelled groups below the families.
  const families = useMemo(
    () => buildDocFamilies((allDocs as TypedDoc[]) || []),
    [allDocs],
  );

  // Split non-family slots into labelled groups:
  //   - rapportSlots:  every "Rapport *" type — base "Rapport final" plus any
  //                    additional rapport variant observed on live docs.
  //   - reformeSlots:  'Réforme technique' + 'Réforme économique' together.
  //   - otherSlots:    PV / Carte grise / Attestation / etc.
  const FAMILY_BASE_SLOTS = new Set(['Devis Garage', 'Facture Garage']);
  const isRapportLabel = (s: string) => s === 'Rapport final' || s.startsWith('Rapport ');
  const REFORME_LABELS = new Set(['Réforme technique', 'Réforme économique']);
  const NOTE_HONORAIRE_LABEL = "Note d'honoraire";
  const { rapportSlots, reformeSlots, noteHonoraireSlots, otherSlots } = useMemo(() => {
    const rapport: string[] = [];
    const reforme: string[] = [];
    const noteHonoraire: string[] = [];
    const other: string[] = [];
    for (const slot of BASE_DOC_SLOTS) {
      if (FAMILY_BASE_SLOTS.has(slot) || slot === 'Devis accordé' || slot === 'Facture accordé') continue;
      if (isRapportLabel(slot)) rapport.push(slot);
      else if (REFORME_LABELS.has(slot)) reforme.push(slot);
      else if (slot === NOTE_HONORAIRE_LABEL) noteHonoraire.push(slot);
      else other.push(slot);
    }
    // Union in any extra rapport-prefixed types observed on live docs (future
    // "Rapport X" variants added via the report generator). Excludes anything
    // already present in `rapport` so the canonical "Rapport final" stays first.
    if (allDocs) {
      const seen = new Set(rapport);
      for (const d of allDocs as TypedDoc[]) {
        const t = (d.type || d.typeDocument || '').toString();
        if (!t || seen.has(t)) continue;
        if (isRapportLabel(t)) {
          rapport.push(t);
          seen.add(t);
        }
      }
    }
    return { rapportSlots: rapport, reformeSlots: reforme, noteHonoraireSlots: noteHonoraire, otherSlots: other };
  }, [allDocs]);

  // The full set of slot labels we need to populate `docsByType` for — all
  // family slots + non-family slots.
  const allSlotLabels = useMemo(() => {
    const set = new Set<string>([...rapportSlots, ...reformeSlots, ...noteHonoraireSlots, ...otherSlots]);
    for (const fam of families) for (const s of fam.slots) set.add(s);
    return set;
  }, [families, rapportSlots, reformeSlots, noteHonoraireSlots, otherSlots]);

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

  // Required-slot awareness for the Reçu / À déposer / Optionnel chips —
  // shared predicate with the step gate + step-1 browser.
  const requiredStatus = useMemo(() => computeRequiredDocsStatus((allDocs as TypedDoc[]) ?? null), [allDocs]);

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
      // `kindOverride` lets the extra-slot flow tag uploads when the family
      // doesn't exist yet (so `extraSlotKindByLabel[slot]` is undefined).
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

      // Carte Grise narrow scan: extract matricule + matricule antérieur and
      // write them to the dossier so they show up in the dossiers table.
      if (slot === 'Carte grise') {
        uploadJobs.forEach(({ file, storagePath }, idx) => {
          const r = results[idx];
          if (r.status !== 'fulfilled') return;
          scanAndPersistCarteGrise({
            db, storage, dossierId, storagePath, contentType: file.type,
          }).catch((e) => console.error(`[typed-docs-grid] carte-grise scan failed for ${file.name}`, e));
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
          profile?.nom,
        );
        await logWorkflow(db, dossierId, 'Nouveau document ajouté', userEmail, userId, 'done', {
          details: `${successCount} document(s) ajouté(s) dans "${slot}".`,
        }, profile?.nom);
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
  // extra is "… 2". The gestionnaire can then rename it via the ⋯ menu.
  // No empty placeholder is written if the user picks no files (the OS picker
  // was cancelled) — the slot only materialises when the upload succeeds and
  // Firestore has the tagged document(s).
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
  // Firestore. The dynamic slot logic picks it up and renders the fresh row
  // contiguously. Uses `parsed.parent` so each parent family (base or extra)
  // produces its own accord chain. Dedup-guarded — clicking "+" multiple times
  // never piles up duplicate placeholders in the same cardinal slot
  // (cardinal slots are strictly 1-doc-per-slot).
  const handleCreateNextCardinal = async (slot: string) => {
    if (!db || !auth) return;
    const parsed = parseAccordDocType(slot);
    if (!parsed || (parsed.kind !== 'accord' && parsed.kind !== 'proposition-accord')) return;
    const nextOrdinal = parsed.ordinal + 1;
    const accordLabel = mapToAccorde(parsed.parent, 'accord', nextOrdinal);
    const propLabel = mapToAccorde(parsed.parent, 'proposition-accord', nextOrdinal);
    const existingTypes = new Set(
      ((allDocs as TypedDoc[] | undefined) || []).map((d) => d.type || d.typeDocument).filter(Boolean) as string[],
    );
    const accordExists = existingTypes.has(accordLabel);
    const propExists = existingTypes.has(propLabel);
    if (accordExists && propExists) {
      toast({ title: `Les slots de cardinal ${nextOrdinal} existent déjà.` });
      return;
    }
    const userId = auth.currentUser?.uid || 'unknown';
    const toCreate: { label: string }[] = [];
    if (!accordExists) toCreate.push({ label: accordLabel });
    if (!propExists) toCreate.push({ label: propLabel });
    try {
      await Promise.all(
        toCreate.map(({ label }) =>
          addDoc(collection(db, 'dossiers', dossierId, 'documents'), {
            type: label,
            pendingUpload: true,
            storagePath: null,
            url: null,
            createdAt: serverTimestamp(),
            createdBy: userId,
          }),
        ),
      );
      // Status-bump: a fresh cardinal round is awaiting the chiffreur.
      try {
        const dossierRef = doc(db, 'dossiers', dossierId);
        await updateDoc(dossierRef, {
          statut: 'Chiffrage en cours',
          updatedAt: serverTimestamp(),
        });
        const createdLabels = toCreate.map((c) => c.label).join(' + ');
        await logHistorique(
          db, dossierId,
          'Chiffrage en cours',
          currentEmail || profile?.nom || 'Utilisateur',
          `Statut mis à jour automatiquement (création des slots ${createdLabels}).`,
          'statut',
          profile?.nom,
        ).catch(() => {});
      } catch (statutErr) {
        console.warn('[typed-docs-grid] reset statut on cardinal create failed (non-fatal)', statutErr);
      }
      if (toCreate.length === 2) {
        toast({ title: `Nouveaux slots créés : ${accordLabel} + ${propLabel}` });
      } else {
        toast({ title: `Nouveau slot créé : ${toCreate[0].label}` });
      }
    } catch (err: any) {
      console.error('[typed-docs-grid] create next cardinal failed', err);
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la création des slots',
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
        profile?.nom,
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

  /** One slot as a structured-list row (non-family groups). */
  const renderSlotRow = (
    slot: string,
    opts?: { hint?: string; required?: boolean; emptyStatus?: SlotStatus },
  ) => (
    <TypedSlotRow
      key={slot}
      slot={slot}
      hint={opts?.hint}
      required={opts?.required}
      emptyStatus={opts?.emptyStatus}
      docs={docsByType[slot] || []}
      canEdit={canEdit}
      canDeleteDoc={canDeleteDoc}
      isUploading={uploadingSlot === slot}
      deletingId={deletingId}
      extraSlotKind={extraSlotKindByLabel[slot]}
      canManageExtraSlots={canWrite('dossiers')}
      onUpload={(files) => handleUpload(slot, files)}
      onDelete={handleDelete}
      onRenameExtraSlot={() => handleRenameExtraSlot(slot)}
      onPreview={handlePreview}
    />
  );

  /** Chip semantics for a required / garage / optional slot row. */
  const slotRowOpts = (slot: string): { hint?: string; required?: boolean; emptyStatus?: SlotStatus } => {
    if (isRequiredSourceSlot(slot)) return { hint: 'obligatoire', required: true, emptyStatus: 'missing' };
    if (slot === 'Devis Garage' || slot === 'Facture Garage') {
      const chip = requiredDocChip(slot, requiredStatus);
      return {
        hint: 'au moins un des deux',
        required: chip === 'missing',
        emptyStatus: chip === null ? 'optional' : 'missing',
      };
    }
    if (slot === 'Autre') return { emptyStatus: 'optional' };
    return {};
  };

  /** Filled-row count for a group's "n/m reçus" pill. */
  const receivedIn = (slots: string[]) =>
    slots.filter((s) => (docsByType[s] || []).some((d) => !!d.url && !d.pendingUpload)).length;

  // When rendering step 11 (cardinalFilter='2-plus'), synthesise 2ème slots on
  // a per-kind, per-family basis: only add 2ème accord if the family's 1er
  // accord is filled (real url, non-pending), and likewise for 2ème
  // proposition. If neither 1er is filled the family contributes no 2ème
  // slots, the matrix's 2-plus filter strips the 1ers, and the unit drops out.
  const familiesForRender = useMemo(() => {
    if (cardinalFilter !== '2-plus') return families;
    const docsArr = (allDocs as TypedDoc[] | undefined) ?? [];
    const isFilled = (label: string) =>
      docsArr.some(
        (d) => (d.type || d.typeDocument || '') === label && !!d.url && !d.pendingUpload,
      );
    return families.map((f) => {
      const accord1 = mapToAccorde(f.parent, 'accord', 1);
      const prop1 = mapToAccorde(f.parent, 'proposition-accord', 1);
      const accord2 = mapToAccorde(f.parent, 'accord', 2);
      const prop2 = mapToAccorde(f.parent, 'proposition-accord', 2);
      const slots = [...f.slots];
      if (isFilled(accord1) && !slots.includes(accord2)) slots.push(accord2);
      if (isFilled(prop1) && !slots.includes(prop2)) slots.push(prop2);
      return { ...f, slots };
    });
  }, [families, cardinalFilter, allDocs]);

  // Mirror of the accord matrix's slot filter, so empty families never leave
  // a blank group (or an empty outer list) behind.
  const familyVisibleSlotCount = (f: DocFamily) => {
    if (cardinalFilter === 'all') return f.slots.length;
    return f.slots.filter((s) => {
      const parsed = parseAccordDocType(s);
      if (cardinalFilter === '1-only') return parsed == null || parsed.ordinal === 1;
      return parsed != null && parsed.ordinal >= 2;
    }).length;
  };

  const devisFamilies = familiesForRender.filter((f) => f.sourceDocType === 'Devis Garage' && familyVisibleSlotCount(f) > 0);
  const factureFamilies = familiesForRender.filter((f) => f.sourceDocType === 'Facture Garage' && familyVisibleSlotCount(f) > 0);

  // Pair each Devis family with its Facture counterpart (same parent ordinal)
  // into one "garage unit" — the negotiation rounds are the same rounds, so
  // they render as ONE matrix (Étape | Devis | Facture) instead of two stacks.
  const unitMap = new Map<number, GarageUnit>();
  for (const f of devisFamilies) unitMap.set(f.parentOrdinal, { key: `garage-${f.parentOrdinal}`, devis: f });
  for (const f of factureFamilies) {
    const existing = unitMap.get(f.parentOrdinal);
    if (existing) existing.facture = f;
    else unitMap.set(f.parentOrdinal, { key: `garage-${f.parentOrdinal}`, facture: f });
  }
  const garageUnits = [...unitMap.entries()].sort((a, b) => a[0] - b[0]).map(([, u]) => u);

  const matrixHandlers: MatrixSlotHandlers = {
    docsByType,
    canEdit,
    canDeleteDoc,
    isUploading: (slot) => uploadingSlot === slot,
    deletingId,
    extraSlotKindForSlot: (slot) => extraSlotKindByLabel[slot],
    canManageExtraSlots: canWrite('dossiers'),
    onUpload: handleUpload,
    onDelete: handleDelete,
    onRenameExtraSlot: handleRenameExtraSlot,
    onPreview: handlePreview,
  };

  // ── Group visibility (same conditions as the former sections) ─────────────
  const showGarageGroup = !!showBaseGarageSlots;
  const showFamilies = !hideAccordSlots;
  const showRapportGroup =
    !!showAllNonAccordSlots && cardinalFilter !== '2-plus' && !showOnlyAccordSlots && rapportSlots.length > 0;
  const showReformeGroup =
    !hideReformeSlots && cardinalFilter !== '2-plus' && reformeSlots.length > 0 &&
    (showReformeSlots || ((showAllNonAccordSlots || !hideAccordSlots) && !showOnlyAccordSlots));
  const showOthersGroup =
    (showAllNonAccordSlots || !hideOtherSlots) && !showOnlyAccordSlots && otherSlots.length > 0;

  const hasAnyGroup =
    showGarageGroup ||
    (showFamilies && (devisFamilies.length > 0 || factureFamilies.length > 0)) ||
    showRapportGroup || showReformeGroup || showOthersGroup;

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
        </div>
      ) : showOnlyNoteHonoraire ? (
        // Note d'honoraire — final-step invoice slot, one row.
        <DocumentList>
          <DocumentGroup
            title="Note d'honoraire"
            received={receivedIn(noteHonoraireSlots)}
            total={noteHonoraireSlots.length}
          >
            {noteHonoraireSlots.map((slot) => renderSlotRow(slot, { required: true }))}
          </DocumentGroup>
        </DocumentList>
      ) : !hasAnyGroup ? (
        <p className="t-caption py-4">
          {cardinalFilter === '2-plus'
            ? "Aucun 2ème accord pour l'instant — le 1er accord doit d'abord être chiffré."
            : 'Aucun document à afficher.'}
        </p>
      ) : (
        <DocumentList>
          {/* Base Devis Garage / Facture Garage — display-only rows, no
              cardinal / extra-slot header actions (assignations-atg). */}
          {showGarageGroup && (
            <DocumentGroup
              title="Devis et Facture garage"
              subtitle="au moins un des deux est requis"
              received={receivedIn(['Devis Garage', 'Facture Garage'])}
              total={2}
            >
              {(['Devis Garage', 'Facture Garage'] as const).map((slot) =>
                renderSlotRow(slot, slotRowOpts(slot)),
              )}
            </DocumentGroup>
          )}

          {/* Garage units — Devis & Facture negotiation rounds as one matrix
              (SlotRow list fallback below md lives inside the component). */}
          {showFamilies && garageUnits.map((unit) => (
            <AccordMatrixGroup
              key={unit.key}
              unit={unit}
              handlers={matrixHandlers}
              hideCardinalPlus={hideCardinalPlus}
              hideExtraSlotPlus={hideExtraSlotPlus}
              cardinalFilter={cardinalFilter}
              onCreateNextCardinal={handleCreateNextCardinal}
              onCreateExtraSlot={handleCreateExtraSlot}
            />
          ))}

          {/* Rapport — produced by the "Générer le rapport" flow. */}
          {showRapportGroup && (
            <DocumentGroup title="Rapport" received={receivedIn(rapportSlots)} total={rapportSlots.length}>
              {rapportSlots.map((slot) => renderSlotRow(slot))}
            </DocumentGroup>
          )}

          {/* Réforme — technique + économique as a single-column matrix
              (no chips: the visible file, or the quiet waiting text, IS the
              status; the group pill is the summary). */}
          {showReformeGroup && (
            <SlotMatrixGroup title="Réforme" slots={reformeSlots} handlers={matrixHandlers} />
          )}

          {/* Autres documents — PV, Carte grise, Attestation, etc. */}
          {showOthersGroup && (
            <DocumentGroup title="Autres documents" received={receivedIn(otherSlots)} total={otherSlots.length}>
              {otherSlots.map((slot) => renderSlotRow(slot, slotRowOpts(slot)))}
            </DocumentGroup>
          )}
        </DocumentList>
      )}

      {/* Lightbox preview — shared component */}
      <DocumentPreviewLightbox
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={(d) => downloadFileFromUrl(d.url, d.nom)}
      />
    </div>
  );
}
