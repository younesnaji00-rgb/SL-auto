import {
  collection,
  addDoc,
  serverTimestamp,
  Firestore
} from "firebase/firestore";

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
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const ref = await docRef; // We only await the final reference if we strictly need the ID back
  return ref.id;
}