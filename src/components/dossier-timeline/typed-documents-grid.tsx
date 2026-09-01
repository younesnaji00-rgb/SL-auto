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
import { buildDocFamilies } from '@/lib/doc-family';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { logHistorique, logWorkflow } from '@/app/(app)/dossiers/[id]/log-historique';
import { DocumentPreviewLightbox, type DocumentPreviewLightboxDoc } from '@/components/document-preview-lightbox';
import { downloadFileFromUrl, toLightboxDoc, type DocDragPayload } from '@/components/documents/typed-doc';
import { reclassifyDocuments } from '@/components/documents/reclassify';
import { docTypeOf } from '@/lib/required-docs';
import { SlotCard, type ExtraSlotKind, type TypedDoc } from './slot-card';
import { FamilyRow } from './family-row';

// Slots shown in the typed-import grid. Photos (avant / en cours / après) are
// intentionally omitted — they have their own dedicated Photos step.
// Task #25 — the list is now dynamic: `BASE_DOC_SLOTS` is the canonical fixed
// skeleton (always rendered), and `computedSlots` logic appends cardinal-accord
// and proposition-accord variants found in the live Firestore docs,
// contiguously after the matching source-accordé slot.
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

// Layout classes shared by the standalone sections (Devis et Facture, Rapport,
// Réforme, Autres documents) so they read like the family rows: hairline +
// 20 px padding when following another block, 12 px uppercase muted label,
// same responsive socket grid as `FamilyRow` (no horizontal scrolling).
const SECTION_CLASS = 'space-y-3 border-t border-hairline pt-5 first:border-t-0 first:pt-0';
const SECTION_HEADING_CLASS = 't-label';
const SECTION_GRID_CLASS = 'grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

interface TypedDocumentsGridProps {
  dossierId: string;
  hideAccordSlots?: boolean;
  showOnlyAccordSlots?: boolean;
  /**
   * When true, the cardinal `+` pimple button on devis/facture accord slots
   * is not rendered. Forwarded down to every `SlotCard`. Used by step 6 to
   * lock the cardinal chain to the current revision.
   */
  hideCardinalPlus?: boolean;
  /**
   * When true, the extra-slot `+` pimple (next to base `Devis Garage` /
   * `Facture Garage`, spawns numbered variants) is not rendered. Forwarded
   * down to every `SlotCard`. Used in views like assignations-atg where
   * spawning new garage chains doesn't belong.
   */
  hideExtraSlotPlus?: boolean;
  /**
   * Filter family rows by parsed cardinal ordinal. `'2-plus'` shows only
   * 2ème, 3ème, … cardinals (used in step 11) and hides the parent base +
   * 1er accord/proposition + the Réforme section (reforme has no cardinals).
   */
  cardinalFilter?: 'all' | '1-only' | '2-plus';
  /**
   * When true, render an additional section showing two standalone base
   * `Devis Garage` / `Facture Garage` SlotCards with no cardinal `+` and no
   * extra-slot `+`. Used so gestionnaires / agents can collect base garage
   * docs without spawning accord/proposition or extra ordinals from there.
   */
  showBaseGarageSlots?: boolean;
  /**
   * When true, the "Autres documents" section (PV-Constat / Carte grise /
   * Attestation / Kilométrage / Numéro de chassis) is not rendered.
   */
  hideOtherSlots?: boolean;
  /**
   * When true, surface every non-accord document type as its own slot card:
   * Rapport final, Réforme technique/économique, and the "Autres documents"
   * section (PV-Constat / Carte grise / Attestation / Kilométrage / Numéro de
   * chassis / Autre). Overrides `hideAccordSlots` / `hideOtherSlots` for those
   * sections only — the accord/proposition family rows remain governed by
   * `hideAccordSlots`.
   */
  showAllNonAccordSlots?: boolean;
  /**
   * When true, the standalone Réforme technique / Réforme économique slot
   * section is not rendered, regardless of viewer role. Used in
   * assignations-atg where reform reports don't belong on the AT view.
   */
  hideReformeSlots?: boolean;
  /**
   * When true, render the Réforme (technique + économique) slot section even in
   * `showOnlyAccordSlots` mode, where it would otherwise be suppressed. Used by
   * the Accord step (id 6) so the deposited réforme report surfaces as its own
   * row alongside the accord documents.
   */
  showReformeSlots?: boolean;
  /**
   * When true, render ONLY the "Note d'honoraire" invoice slot and nothing
   * else (no families, rapport, réforme or other-doc sections). Used by the
   * final Note d'honoraire timeline step (id 8) where the gestionnaire drops
   * the fee note / invoice.
   */
  showOnlyNoteHonoraire?: boolean;
}

export default function TypedDocumentsGrid({ dossierId, hideAccordSlots, showOnlyAccordSlots, hideCardinalPlus, hideExtraSlotPlus, cardinalFilter = 'all', showBaseGarageSlots, hideOtherSlots, showAllNonAccordSlots, hideReformeSlots, showReformeSlots, showOnlyNoteHonoraire }: TypedDocumentsGridProps) {
  const db = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const { toast } = useToast();
  const { canWrite, canDelete, profile } = useCurrentUser();
  // Gestionnaires / Admins edit via 'dossiers' section; ATG edits this same grid
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
  // Lightbox: the page being shown + every page of that slot (enables ‹ › paging).
  const [preview, setPreview] = useState<{ doc: DocumentPreviewLightboxDoc; pages: DocumentPreviewLightboxDoc[] } | null>(null);

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

  const handlePreview = (d: TypedDoc, pages?: TypedDoc[]) => {
    if (!d.url || d.pendingUpload) return;
    const list = (pages && pages.length > 0 ? pages : [d])
      .filter((p) => !!p.url && !p.pendingUpload)
      .map(toLightboxDoc);
    setPreview({ doc: toLightboxDoc(d), pages: list });
  };

  // Socket-to-socket drag: move (empty target) or swap (filled target) every
  // page of the dragged document. Writes + historique + AI feedback live in
  // `reclassifyDocuments`; the board only resolves the two doc sets.
  const handleDocDrop = async (targetSlot: string, payload: DocDragPayload) => {
    if (!db) return;
    const sourceType = payload.type;
    if (!sourceType || sourceType === targetSlot) return;
    const all = ((allDocs as TypedDoc[] | undefined) ?? []);
    const sourceDocs = all.filter((d) => docTypeOf(d) === sourceType);
    const targetDocs = all.filter((d) => docTypeOf(d) === targetSlot && !!d.url);
    if (sourceDocs.length === 0) return;
    const userEmail = auth?.currentUser?.email || profile?.email || 'Admin';
    try {
      let compagnie: string | null = null;
      try {
        const snap = await getDoc(doc(db, 'dossiers', dossierId));
        compagnie = ((snap.data() as any)?.compagnie as string | undefined) ?? null;
      } catch { /* non-fatal — feedback just lacks the compagnie hint */ }
      const res = await reclassifyDocuments({
        db, dossierId, sourceType, targetType: targetSlot, sourceDocs, targetDocs,
        userEmail, userName: profile?.nom, compagnie,
      });
      toast({
        title: res.mode === 'swap'
          ? `Documents échangés : ${sourceType} ↔ ${targetSlot}`
          : `Document déplacé vers « ${targetSlot} »`,
      });
    } catch (err: any) {
      console.error('[typed-docs-grid] reclassify failed', err);
      toast({
        variant: 'destructive',
        title: 'Erreur lors du reclassement',
        description: err?.message || 'Impossible de déplacer le document.',
      });
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
      onDocDrop={(payload) => handleDocDrop(slot, payload)}
      hideCardinalPlus={hideCardinalPlus}
      hideExtraSlotPlus={hideExtraSlotPlus}
    />
  );

  // When rendering step 11 (cardinalFilter='2-plus'), synthesise 2ème slots on
  // a per-kind, per-family basis: only add 2ème accord if the family's 1er
  // accord is filled (real url, non-pending), and likewise for 2ème
  // proposition. If neither 1er is filled the family contributes no 2ème
  // slots, FamilyRow's 2-plus filter strips the 1ers, and the row drops out.
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

  const devisFamilies = familiesForRender.filter((f) => f.sourceDocType === 'Devis Garage');
  const factureFamilies = familiesForRender.filter((f) => f.sourceDocType === 'Facture Garage');

  return (
    <div>
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-5 w-5 animate-spin text-ink-3" />
        </div>
      ) : showOnlyNoteHonoraire ? (
        <div className="space-y-6">
          {/* Note d'honoraire — final-step invoice slot, listed like accord docs. */}
          <section className="space-y-3">
            <div className={SECTION_GRID_CLASS}>
              {noteHonoraireSlots.map((slot) => renderSlotCard(slot))}
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Base Devis Garage / Facture Garage — display-only, no pimples.
              Pinned at the top (above family rows / autres) so step 1's primary
              upload affordance is the first thing the gestionnaire sees. */}
          {showBaseGarageSlots && (
            <section className={SECTION_CLASS}>
              <h4 className={SECTION_HEADING_CLASS}>Devis et Facture</h4>
              <div className={SECTION_GRID_CLASS}>
                {(['Devis Garage', 'Facture Garage'] as const).map((slot) => (
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
                    onDocDrop={(payload) => handleDocDrop(slot, payload)}
                    hideCardinalPlus
                    hideExtraSlotPlus
                  />
                ))}
              </div>
            </section>
          )}

          {/* Devis families: one horizontal row per parent */}
          {!hideAccordSlots && devisFamilies.map((group) => (
            <FamilyRow
              key={group.parent}
              dossierId={dossierId}
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
              onDocDrop={handleDocDrop}
              hideCardinalPlus={hideCardinalPlus}
              hideExtraSlotPlus={hideExtraSlotPlus}
              cardinalFilter={cardinalFilter}
            />
          ))}

          {/* Facture families: same pattern */}
          {!hideAccordSlots && factureFamilies.map((group) => (
            <FamilyRow
              key={group.parent}
              dossierId={dossierId}
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
              onDocDrop={handleDocDrop}
              hideCardinalPlus={hideCardinalPlus}
              hideExtraSlotPlus={hideExtraSlotPlus}
              cardinalFilter={cardinalFilter}
            />
          ))}

          {/* Rapport final — own section. Surfaced when explicitly requested
              (step 1 Création de mission). Hidden under the default flow to
              preserve the legacy render order on other timeline steps. */}
          {showAllNonAccordSlots && cardinalFilter !== '2-plus' && !showOnlyAccordSlots && rapportSlots.length > 0 && (
            <section className={SECTION_CLASS}>
              <h4 className={SECTION_HEADING_CLASS}>Rapport</h4>
              <div className={SECTION_GRID_CLASS}>
                {rapportSlots.map((slot) => renderSlotCard(slot))}
              </div>
            </section>
          )}

          {/* Réforme — technique + économique together. Normally hidden in
              showOnlyAccordSlots mode; `showReformeSlots` opts it back in so the
              Accord step can surface the deposited réforme as its own row. */}
          {!hideReformeSlots && cardinalFilter !== '2-plus' && reformeSlots.length > 0 &&
            (showReformeSlots || ((showAllNonAccordSlots || !hideAccordSlots) && !showOnlyAccordSlots)) && (
            <section className={SECTION_CLASS}>
              <h4 className={SECTION_HEADING_CLASS}>Réforme</h4>
              <div className={SECTION_GRID_CLASS}>
                {reformeSlots.map((slot) => renderSlotCard(slot))}
              </div>
            </section>
          )}

          {/* Autres documents — PV, Carte grise, Attestation, etc. */}
          {(showAllNonAccordSlots || !hideOtherSlots) && !showOnlyAccordSlots && otherSlots.length > 0 && (
            <section className={SECTION_CLASS}>
              <h4 className={SECTION_HEADING_CLASS}>Autres documents</h4>
              <div className={SECTION_GRID_CLASS}>
                {otherSlots.map((slot) => renderSlotCard(slot))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Lightbox preview — shared component */}
      <DocumentPreviewLightbox
        doc={preview?.doc ?? null}
        pages={preview?.pages}
        onPageChange={(d) => setPreview((p) => (p ? { ...p, doc: d } : p))}
        onClose={() => setPreview(null)}
        onDownload={(d) => downloadFileFromUrl(d.url, d.nom)}
      />
    </div>
  );
}
