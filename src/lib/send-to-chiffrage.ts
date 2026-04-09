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
      status: "pending",
      recognizedText: null,
      pdfUrl: null,
    })),
    status: "pending",
    sentByUid,
    sentByEmail,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const ref = await docRef; // We only await the final reference if we strictly need the ID back
  return ref.id;
}