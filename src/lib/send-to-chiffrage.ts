import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  Timestamp,
  Firestore,
} from "firebase/firestore";
import {
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
  type FirebaseStorage,
} from "firebase/storage";
import { renderDevisPdf } from "./devis-pdf";
import type {
  DevisSnapshot,
  DevisVersion,
  EditableDocType,
  StructuredDevis,
} from "./devis-schema";
import { mapToAccorde } from "./docType-accorde";
import { logHistorique, logWorkflow } from "@/app/(app)/dossiers/[id]/log-historique";
import { deriveStatus, isAccordStatus } from "@/lib/status-machine";

/**
 * Task #11 — Advance the dossier status to `'Chiffrage en cours'` once the
 * chiffrage artefact (either an assignation or a gestionnaire-saved piece
 * jointe) is committed. Idempotent: if the dossier already sits on
 * `'Chiffrage en cours'` or any accord/terminal state, we never regress.
 *
 * Non-fatal: errors are swallowed so the upstream save still resolves.
 */
async function advanceStatutToChiffrageEnCours(
  db: Firestore,
  dossierId: string,
  userLabel: string,
): Promise<void> {
  try {
    const dossierRef = doc(db, "dossiers", dossierId);
    const snap = await getDoc(dossierRef);
    const currentStatut = snap.exists()
      ? ((snap.data() as Record<string, unknown>).statut as string | undefined)
      : undefined;
    const target = deriveStatus({ kind: 'sendToChiffrage' });
    if (currentStatut === target) return;
    if (currentStatut && isAccordStatus(currentStatut)) return;
    await updateDoc(dossierRef, { statut: target, updatedAt: serverTimestamp() });
    await logHistorique(
      db,
      dossierId,
      target,
      userLabel || 'Utilisateur',
      'Statut mis à jour automatiquement (envoi au chiffrage).',
      'statut',
      undefined,
    ).catch(() => {});
  } catch (err) {
    console.warn('[send-to-chiffrage] advance statut failed (non-fatal)', err);
  }
}

export interface ChiffrageFile {
  name: string;
  storagePath: string;
  type: "photo" | "rapport";
  /** Document type label (e.g. "Carte grise", "PV") for rapport files */
  docType?: string;
  /** Photo category (avant, en_cours, apres) for photo files */
  category?: string;
  /** For docType === 'Devis': 'original' (default) or 'counter'. */
  devisVariant?: 'original' | 'counter';
  /** For counter devis: label used as the red column name (e.g. "1er accord"). */
  counterRoundLabel?: string;
  /** For counter devis: monotonic order within this dossier (1, 2, 3, …). */
  counterRoundOrder?: number;
}

export interface SendToChiffrageParams {
  db: Firestore;
  dossierId: string;
  dossierNom: string;
  assignedChiffreurId: string;
  assignedChiffreurNom: string;
  files: ChiffrageFile[];
  sentByUid: string;
  sentByEmail: string;
  sentByNom: string;
  /** Pre-extracted structured data from dossier.structuredEditables, seeded into the new chiffrage so the chiffreur sees it instantly. */
  seedStructuredEditables?: Record<string, unknown>;
}

/**
 * Creates a chiffrage document in Firestore.
 */
export async function sendToChiffrage(params: SendToChiffrageParams): Promise<string> {
  const {
    db,
    dossierId,
    dossierNom,
    assignedChiffreurId,
    assignedChiffreurNom,
    files,
    sentByUid,
    sentByEmail,
    sentByNom,
    seedStructuredEditables,
  } = params;

  if (!assignedChiffreurId) throw new Error("Aucun chiffreur sélectionné.");
  if (files.length === 0) throw new Error("Aucun fichier à envoyer (photos requises).");

  // Guidelines: avoid using 'await' directly before calling mutation functions to leverage optimistic UI
  const docRef = addDoc(collection(db, "chiffrages"), {
    dossierId,
    dossierNom,
    assignedChiffreurId,
    assignedChiffreurNom,
    files: files.map((f) => ({
      name: f.name,
      storagePath: f.storagePath,
      type: f.type,
      ...(f.docType ? { docType: f.docType } : {}),
      ...(f.category ? { category: f.category } : {}),
      ...(f.devisVariant ? { devisVariant: f.devisVariant } : {}),
      ...(f.counterRoundLabel ? { counterRoundLabel: f.counterRoundLabel } : {}),
      ...(typeof f.counterRoundOrder === 'number' ? { counterRoundOrder: f.counterRoundOrder } : {}),
      status: "pending",
      recognizedText: null,
      pdfUrl: null,
    })),
    status: "pending",
    sentByUid,
    sentByEmail,
    sentByNom,
    ...(seedStructuredEditables && Object.keys(seedStructuredEditables).length > 0
      ? { structuredEditables: seedStructuredEditables }
      : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const ref = await docRef; // We only await the final reference if we strictly need the ID back

  // Task #11: after the chiffrage is persisted, move the dossier to
  // `Chiffrage en cours`. Idempotent + non-fatal.
  await advanceStatutToChiffrageEnCours(db, dossierId, sentByEmail || sentByNom || sentByUid);

  return ref.id;
}

export interface SaveGestionnaireDevisParams {
  db: Firestore;
  storage: FirebaseStorage;
  dossierId: string;
  docType: EditableDocType;
  snapshot: DevisSnapshot;
  /** User identity for audit + author columns on the generated PDF version. */
  author: { uid: string; nom: string; email: string };
  /**
   * Optional existing chiffrage on the dossier. When present, the structured
   * editable mirror is also written there so the chiffreur sees the ready-made
   * table without an AI re-scan. If absent, the piece-jointe still lands on the
   * dossier and the chiffreur will pick it up through the usual
   * `seedStructuredEditables` flow the next time a chiffrage is opened.
   */
  chiffrageId?: string | null;
  /**
   * Task #23: pre-rendered PDF blob from the preview dialog. When provided, the
   * function skips the internal `renderDevisPdf` call so the uploaded bytes
   * match exactly what the user confirmed in the preview (WYSIWYG).
   */
  pdfBlob?: Blob;
  /**
   * Task #23: optional stamp identifier captured from the preview dialog. Stored
   * alongside the piece-jointe payload (additive field, not part of the schema
   * types yet) so future reads can rehydrate the preview selection.
   */
  stampId?: string | null;
  /**
   * Task #24: explicit target doc type label to land the piece-jointe under.
   * When supplied, the helper writes `type: targetDocType` on the Firestore doc
   * and (when `ordinal >= 2`) forces a new `addDoc` call instead of upserting
   * the existing accord slot. Defaults to the legacy ordinal-1
   * `mapToAccorde(docType)` behaviour when omitted.
   */
  targetDocType?: string;
  /**
   * Task #24: cardinal ordinal derived by the caller from existing dossier
   * docs. When `>= 2`, the helper creates a brand-new piece-jointe
   * (`addDoc`) instead of upserting the ordinal-1 slot, so each cardinal
   * accord lives on its own row.
   */
  ordinal?: number;
}

export interface SaveGestionnaireDevisResult {
  storagePath: string;
  pdfUrl: string;
  dossierDocId: string;
  version: DevisVersion;
}

/**
 * Gestionnaire-side save pipeline for the Devis/Facture editor dialog opened
 * from `chiffrage-tab.tsx` / `step-5-chiffrage.tsx`.
 *
 * Unlike the chiffreur's editor (which writes into `chiffrages/{id}`), the
 * gestionnaire flow produces a piece-jointe that the chiffreur receives as
 * though the garage had uploaded it directly. Two writes:
 *   1. PDF uploaded to the standard `dossiers/{id}/documents/{ts}_<name>.pdf`
 *      storage path and a matching Firestore doc in the dossier's `documents`
 *      subcollection, with `skipAIScan: true` so the extractor short-circuits.
 *   2. Structured editable data mirrored to `dossiers.structuredEditables` (and
 *      to `chiffrages.structuredEditables` when a chiffrage exists) so the
 *      chiffreur opens directly on the table — no AI extraction round-trip.
 */
export async function saveGestionnaireDevisAsPieceJointe(
  params: SaveGestionnaireDevisParams
): Promise<SaveGestionnaireDevisResult> {
  const {
    db,
    storage,
    dossierId,
    docType,
    snapshot,
    author,
    chiffrageId,
    pdfBlob: providedBlob,
    stampId,
    targetDocType: targetDocTypeOverride,
    ordinal,
  } = params;

  if (!dossierId) throw new Error("dossierId requis.");

  // Task #3: Facture Garage / Devis Garage saves target the "accordé" slot
  // (one per dossier, upserted — never duplicated). `docType` remains the
  // source name (what the caller passed); `targetDocType` is where the save
  // lands. Task #24: when the caller derives a cardinal target (e.g.
  // "Devis 2ème accord"), it passes `targetDocType` explicitly and we honour
  // it; otherwise we fall back to the ordinal-1 `mapToAccorde(docType)`.
  const targetDocType = targetDocTypeOverride || mapToAccorde(docType);
  const cardinalOrdinal = typeof ordinal === 'number' && Number.isFinite(ordinal)
    ? ordinal
    : 1;

  // 1. Use the blob from the preview dialog when provided (task #23 WYSIWYG),
  //    otherwise render from the current table state (legacy path).
  const now = new Date();
  const pdfBlob = providedBlob ?? renderDevisPdf(snapshot, {
    author: author.nom || author.email,
    versionTimestamp: now,
    docType,
  });
  const versionId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  // Match the typed-documents-grid convention so the upload lands in the same
  // bucket path and the grid picks it up without special-casing.
  const timestamp = Date.now();
  const safeDocType = targetDocType.replace(/\s+/g, "-").toLowerCase();
  const fileName = `${safeDocType}-${versionId}.pdf`;
  const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${fileName}`;

  // 2. Upload. Keep this simple and online-only; the gestionnaire dialog is a
  //    human-in-the-loop flow that already gates the Save action — if offline
  //    the thrown error bubbles up so the editor can toast.
  const sref = storageRef(storage, storagePath);
  await uploadBytes(sref, pdfBlob, { contentType: "application/pdf" });
  const pdfUrl = await getDownloadURL(sref);

  // 3. Upsert the piece-jointe Firestore record — same schema as the typed
  //    grid's uploads, plus the skipAIScan flag so the extractor short-circuits
  //    if any listener ever picks this file up. Task #3: there is at most one
  //    accordé row per dossier; find an existing doc with `type === targetDocType`
  //    and overwrite its storage fields rather than creating a duplicate.
  const documentPayload = {
    nom: fileName,
    type: targetDocType,
    taille: pdfBlob.size,
    uploadePar: author.email || "Gestionnaire",
    uploadedBy: author.uid || "",
    uploadedByName: author.nom || author.email || "Gestionnaire",
    storagePath,
    url: pdfUrl,
    skipAIScan: true,
    sourceKind: "gestionnaire-devis-editor" as const,
    // Task #23: stamp selected in the preview dialog — additive field; not yet
    // typed on StructuredDevis, only persisted on the piece-jointe payload.
    ...(stampId !== undefined ? { stampId } : {}),
    dateUpload: serverTimestamp(),
  };
  const documentsCol = collection(db, "dossiers", dossierId, "documents");
  let dossierDocId: string;
  // Task #24: for ordinal ≥ 2 we always create a brand-new doc so each
  // cardinal slot lives on its own row. Ordinal 1 keeps the legacy upsert
  // behaviour (one accordé slot per dossier).
  if (cardinalOrdinal >= 2) {
    const createdDocRef = await addDoc(documentsCol, documentPayload);
    dossierDocId = createdDocRef.id;
  } else {
    const existingSnap = await getDocs(
      query(documentsCol, where("type", "==", targetDocType))
    );
    if (existingSnap.empty) {
      const createdDocRef = await addDoc(documentsCol, documentPayload);
      dossierDocId = createdDocRef.id;
    } else {
      const existing = existingSnap.docs[0];
      await updateDoc(existing.ref, {
        ...documentPayload,
        dateUpload: serverTimestamp(),
      });
      dossierDocId = existing.id;
    }
  }

  // 4. Build the structured mirror so the chiffreur opens directly on the
  //    table. This is the same shape stored under `structuredEditables[docType]`
  //    on both `dossiers` and `chiffrages`.
  const version: DevisVersion = {
    id: versionId,
    createdAt: Timestamp.fromDate(now),
    createdByUid: author.uid || "",
    createdByNom: author.nom || author.email || "Gestionnaire",
    storagePath,
    pdfUrl,
    snapshot,
  };

  const dossierRef = doc(db, "dossiers", dossierId);
  const dossierSnap = await getDoc(dossierRef);
  const dossierExistingEditables = (dossierSnap.exists()
    ? ((dossierSnap.data() as Record<string, unknown>).structuredEditables as
        | Record<string, StructuredDevis>
        | undefined)
    : undefined) ?? {};
  const dossierExistingEntry = dossierExistingEditables[targetDocType];

  const structured: StructuredDevis = {
    header: snapshot.header,
    rows: snapshot.rows,
    ...(snapshot.extraColumns ? { extraColumns: snapshot.extraColumns } : {}),
    versions: [version, ...(dossierExistingEntry?.versions ?? [])],
    updatedAt: Timestamp.fromDate(now),
    updatedBy: author.uid || "",
  };

  await updateDoc(dossierRef, {
    [`structuredEditables.${targetDocType}`]: structured,
    updatedAt: serverTimestamp(),
  });

  await logHistorique(
    db, dossierId,
    `Enregistré ${targetDocType}`,
    author.email || author.nom || 'Utilisateur',
    `${snapshot.rows.length} ligne(s) enregistrée(s)`,
    'document',
    author.nom,
  ).catch(() => {});
  await logWorkflow(
    db, dossierId,
    `${targetDocType} mis à jour`,
    author.email || author.nom || 'Utilisateur',
    author.uid || '',
    'done',
    { details: `${snapshot.rows.length} ligne(s)` },
    author.nom,
  ).catch(() => {});

  // Task #11: advance dossier statut. When the saved snapshot carries a locked
  // accord/proposition column (the gestionnaire saved a cardinal slot), bump
  // statut to the cardinal label so the gestion des dossiers list reflects the
  // most recent cardinal action. Otherwise fall back to `Chiffrage en cours`.
  const accordColumn = (snapshot.extraColumns ?? []).find(
    (c) => c.kind === 'accord' || c.kind === 'proposition-accord',
  );
  if (accordColumn) {
    const accordKind: 'accord' | 'proposition' =
      accordColumn.kind === 'accord' ? 'accord' : 'proposition';
    const target = deriveStatus({
      kind: 'chiffreurSave',
      accordKind,
      ordinal: cardinalOrdinal,
    });
    try {
      const freshSnap = await getDoc(dossierRef);
      const currentStatut = freshSnap.exists()
        ? ((freshSnap.data() as Record<string, unknown>).statut as string | undefined)
        : undefined;
      if (currentStatut !== target) {
        await updateDoc(dossierRef, { statut: target, updatedAt: serverTimestamp() });
        await logHistorique(
          db, dossierId, target,
          author.email || author.nom || 'Utilisateur',
          `Statut mis à jour automatiquement (enregistrement ${accordKind === 'accord' ? 'accord' : "proposition d'accord"}).`,
          'statut',
          author.nom,
        ).catch(() => {});
      }
      if (cardinalOrdinal === 1) {
        const firstAccordExists = freshSnap.exists()
          ? Boolean((freshSnap.data() as Record<string, unknown>).firstAccordReachedAt)
          : false;
        if (!firstAccordExists) {
          await updateDoc(dossierRef, { firstAccordReachedAt: serverTimestamp() });
        }
      }
    } catch (err) {
      console.warn('[send-to-chiffrage] cardinal statut bump failed (non-fatal)', err);
    }
  } else {
    await advanceStatutToChiffrageEnCours(db, dossierId, author.email || author.nom || author.uid);
  }

  // 5. Mirror into the existing chiffrage when one is attached so the chiffreur
  //    sees the table the moment they open their editor. Matches the contract
  //    the modal-chiffrage seed path already relies on.
  if (chiffrageId) {
    try {
      const chiffrageRef = doc(db, "chiffrages", chiffrageId);
      const chiffrageSnap = await getDoc(chiffrageRef);
      if (chiffrageSnap.exists()) {
        const cData = chiffrageSnap.data() as Record<string, unknown>;
        const freshEditables = (cData.structuredEditables as
          | Record<string, StructuredDevis>
          | undefined) ?? {};
        const freshAttempts = (cData.editableExtractionAttempted as
          | Record<string, boolean>
          | undefined) ?? {};
        const chiffrageExistingEntry = freshEditables[targetDocType];
        const mirrored: StructuredDevis = {
          ...structured,
          versions: [version, ...(chiffrageExistingEntry?.versions ?? [])],
        };
        await updateDoc(chiffrageRef, {
          [`structuredEditables.${targetDocType}`]: mirrored,
          // Flag extraction as already done so the chiffreur editor won't
          // kick off an AI scan on open.
          editableExtractionAttempted: { ...freshAttempts, [targetDocType]: true },
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error(
        "[send-to-chiffrage] mirror to chiffrage failed (non-fatal)",
        err
      );
    }
  }

  return {
    storagePath,
    pdfUrl,
    dossierDocId,
    version,
  };
}