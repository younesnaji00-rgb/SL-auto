import {
  collection,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
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
  } = params;

  if (!dossierId) throw new Error("dossierId requis.");

  // 1. Generate the PDF from the current table state.
  const now = new Date();
  const pdfBlob = renderDevisPdf(snapshot, {
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
  const safeDocType = docType.replace(/\s+/g, "-").toLowerCase();
  const fileName = `${safeDocType}-${versionId}.pdf`;
  const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${fileName}`;

  // 2. Upload. Keep this simple and online-only; the gestionnaire dialog is a
  //    human-in-the-loop flow that already gates the Save action — if offline
  //    the thrown error bubbles up so the editor can toast.
  const sref = storageRef(storage, storagePath);
  await uploadBytes(sref, pdfBlob, { contentType: "application/pdf" });
  const pdfUrl = await getDownloadURL(sref);

  // 3. Create the piece-jointe Firestore record — same schema as the typed
  //    grid's uploads, plus the skipAIScan flag so the extractor short-circuits
  //    if any listener ever picks this file up.
  const documentPayload = {
    nom: fileName,
    type: docType,
    taille: pdfBlob.size,
    uploadePar: author.email || "Gestionnaire",
    uploadedBy: author.uid || "",
    uploadedByName: author.nom || author.email || "Gestionnaire",
    storagePath,
    url: pdfUrl,
    skipAIScan: true,
    sourceKind: "gestionnaire-devis-editor" as const,
    dateUpload: serverTimestamp(),
  };
  const createdDocRef = await addDoc(
    collection(db, "dossiers", dossierId, "documents"),
    documentPayload
  );

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
  const dossierExistingEntry = dossierExistingEditables[docType];

  const structured: StructuredDevis = {
    header: snapshot.header,
    rows: snapshot.rows,
    ...(snapshot.extraColumns ? { extraColumns: snapshot.extraColumns } : {}),
    versions: [version, ...(dossierExistingEntry?.versions ?? [])],
    updatedAt: Timestamp.fromDate(now),
    updatedBy: author.uid || "",
  };

  await updateDoc(dossierRef, {
    [`structuredEditables.${docType}`]: structured,
    updatedAt: serverTimestamp(),
  });

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
        const chiffrageExistingEntry = freshEditables[docType];
        const mirrored: StructuredDevis = {
          ...structured,
          versions: [version, ...(chiffrageExistingEntry?.versions ?? [])],
        };
        await updateDoc(chiffrageRef, {
          [`structuredEditables.${docType}`]: mirrored,
          // Flag extraction as already done so the chiffreur editor won't
          // kick off an AI scan on open.
          editableExtractionAttempted: { ...freshAttempts, [docType]: true },
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
    dossierDocId: createdDocRef.id,
    version,
  };
}