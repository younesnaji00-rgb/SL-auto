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
import { scanAndPersistCarteGrise } from '@/lib/scan-carte-grise';
import { isEditableDocType } from '@/lib/devis-schema';
import { parseAccordDocType, mapToAccorde, parseAccordeParent } from '@/lib/docType-accorde';
import { buildDocFamilies, collectFamilySlotLabels } from '@/lib/doc-family';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/i18n';
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
  // Final-step invoice slot — the gestionnaire's fee note ("note d'honoraire").
  // Surfaced only in the Note d'honoraire timeline step (id 8) via
  // `showOnlyNoteHonoraire`; never appears in the other document sections.
  'Note d\'honoraire',
  // Optional catch-all for unrelated documents. Does NOT count toward the
  // assigner-au-chiffrage required-slot gate (see step-4-pieces.tsx).
  'Autre',
];

/**
 * Source documents the gestionnaire must import before the dossier can be
 * sent to chiffrage. The "Assigner au chiffrage" button on step 4 stays
 * disabled until ALL of these are populated. "Autre" is intentionally
 * NOT on this list — it's optional. Devis Garage and Facture Garage are
 * NOT here either — they're an either-or pair tracked by
 * {@link GARAGE_DOC_SLOTS} so the gestionnaire can send with just one of
 * the two filled. See item 023.
 */
export const REQUIRED_SOURCE_SLOTS = [
  'PV-Constat / Récépissé de police',
  'Carte grise',
  'Attestation d\'assurance',
  'Kilométrage',
  'Numéro de chassis',
] as const;

/**
 * Either-or garage doc slots. At least one of these must be filled before
 * the dossier can be sent to chiffrage.
 */
export const GARAGE_DOC_SLOTS = ['Devis Garage', 'Facture Garage'] as const;

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
   * extra-slot `+`. Used in step 1 (Création de mission) so gestionnaires
   * can collect base garage docs without spawning accord/proposition or
   * extra ordinals from there.
   */
  showBaseGarageSlots?: boolean;
  /**
   * When true, the "Autres documents" section (PV-Constat / Carte grise /
   * Attestation / Kilométrage / Numéro de chassis) is not rendered. Used in
   * step 1 (Création de mission) where only base Devis/Facture Garage slots
   * should appear.
   */
  hideOtherSlots?: boolean;
  /**
   * When true, surface every non-accord document type as its own slot card:
   * Rapport final, Réforme technique/économique, and the "Autres documents"
   * section (PV-Constat / Carte grise / Attestation / Kilométrage / Numéro de
   * chassis / Autre). Overrides `hideAccordSlots` / `hideOtherSlots` for those
   * sections only — the accord/proposition family rows remain governed by
   * `hideAccordSlots`. Used in step 1 (Création de mission) so the
   * gestionnaire can collect every supporting document before chiffrage.
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
  const t = useT();
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
  //   - rapportSlots:  every "Rapport *" type — base "Rapport final" plus any
  //                    additional rapport variant observed on live docs
  //                    (e.g. "Rapport préliminaire", "Rapport réforme") so the
  //                    grid grows automatically as new rapport types are
  //                    produced by the "Générer le rapport" flow.
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

  // Ordered slot list for the flat grid render: families first, then the
  // standalone Rapport / Réforme / other-docs sections.
  const computedSlots = useMemo<string[]>(() => {
    const slots: string[] = [];
    for (const fam of families) for (const s of fam.slots) slots.push(s);
    for (const s of rapportSlots) slots.push(s);
    for (const s of reformeSlots) slots.push(s);
    for (const s of noteHonoraireSlots) slots.push(s);
    for (const s of otherSlots) slots.push(s);
    return slots;
  }, [rapportSlots, reformeSlots, noteHonoraireSlots, otherSlots, families]);

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
          title: successCount === 1 ? t('Document uploadé') : `${successCount} ${t('documents uploadés')}`,
          description: `${t('Ajouté(s) dans')} "${t(slot)}".`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: `${failCount} ${t('échec(s)')}`,
          description: `${successCount}/${results.length} ${t('documents uploadés dans')} "${t(slot)}".`,
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
    const raw = window.prompt(`${t('Renommer')} « ${oldLabel} » :`, oldLabel);
    if (raw == null) return;
    const newLabel = raw.trim();
    if (!newLabel || newLabel === oldLabel) return;
    if (allSlotLabels.has(newLabel)) {
      toast({
        variant: 'destructive',
        title: t('Nom déjà utilisé'),
        description: t('Un autre slot porte déjà ce nom.'),
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
      toast({ title: `${t('Slot renommé :')} ${newLabel}` });
    } catch (err: any) {
      console.error('[typed-docs-grid] rename extra slot failed', err);
      toast({
        variant: 'destructive',
        title: t('Erreur lors du renommage'),
        description: err?.message || t('Impossible de renommer le slot.'),
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
      toast({ title: `${t('Les slots de cardinal')} ${nextOrdinal} ${t('existent déjà.')}` });
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
        toast({ title: `${t('Nouveaux slots créés :')} ${accordLabel} + ${propLabel}` });
      } else {
        toast({ title: `${t('Nouveau slot créé :')} ${toCreate[0].label}` });
      }
    } catch (err: any) {
      console.error('[typed-docs-grid] create next cardinal failed', err);
      toast({
        variant: 'destructive',
        title: t('Erreur lors de la création des slots'),
        description: err?.message || t('Impossible de créer le cardinal suivant.'),
      });
    }
  };

  const handleDelete = async (item: TypedDoc) => {
    if (!db || !storage) return;
    if (!canDeleteDoc(item)) {
      toast({ variant: 'destructive', title: t('Suppression refusée'), description: t('Vous ne pouvez supprimer que les documents que vous avez vous-même téléversés.') });
      return;
    }
    if (!window.confirm(t('Supprimer ce document ?'))) return;

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
      toast({ title: t('Document supprimé') });
    } catch (err: any) {
      console.error('Typed delete error:', err);
      toast({
        variant: 'destructive',
        title: t('Erreur lors de la suppression'),
        description: err?.message || t('Vérifiez les permissions de stockage.'),
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
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : showOnlyNoteHonoraire ? (
        <div className="space-y-6">
          {/* Note d'honoraire — final-step invoice slot, listed like accord docs. */}
          <section className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">{t('Devis et Facture')}</h4>
              <div className="grid grid-cols-2 gap-3">
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
              hideCardinalPlus={hideCardinalPlus}
              hideExtraSlotPlus={hideExtraSlotPlus}
              cardinalFilter={cardinalFilter}
            />
          ))}

          {/* Facture families: same pattern */}
          {!hideAccordSlots && factureFamilies.map((group) => (
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
              hideCardinalPlus={hideCardinalPlus}
              hideExtraSlotPlus={hideExtraSlotPlus}
              cardinalFilter={cardinalFilter}
            />
          ))}

          {/* Rapport final — own section. Surfaced when explicitly requested
              (step 1 Création de mission). Hidden under the default flow to
              preserve the legacy render order on other timeline steps. */}
          {showAllNonAccordSlots && cardinalFilter !== '2-plus' && !showOnlyAccordSlots && rapportSlots.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">{t('Rapport')}</h4>
              <div className="grid grid-cols-2 gap-3">
                {rapportSlots.map((slot) => renderSlotCard(slot))}
              </div>
            </section>
          )}

          {/* Réforme — technique + économique together. Normally hidden in
              showOnlyAccordSlots mode; `showReformeSlots` opts it back in so the
              Accord step can surface the deposited réforme as its own row. */}
          {!hideReformeSlots && cardinalFilter !== '2-plus' && reformeSlots.length > 0 &&
            (showReformeSlots || ((showAllNonAccordSlots || !hideAccordSlots) && !showOnlyAccordSlots)) && (
            <section className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">{t('Réforme')}</h4>
              <div className="grid grid-cols-2 gap-3">
                {reformeSlots.map((slot) => renderSlotCard(slot))}
              </div>
            </section>
          )}

          {/* Autres documents — PV, Carte grise, Attestation, etc. */}
          {(showAllNonAccordSlots || !hideOtherSlots) && !showOnlyAccordSlots && otherSlots.length > 0 && (
            <section className="space-y-2" data-tour="dosd-other-docs">
              <h4 className="text-sm font-semibold text-muted-foreground">{t('Autres documents')}</h4>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
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
                title={t('Ouvrir / télécharger')}
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
                title={t('Fermer')}
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

