import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore';

export interface CreateEmptyDossierInput {
  db: Firestore;
  user: { uid: string; displayName?: string | null; email?: string | null };
}

/**
 * Creates a blank dossier document and returns its id.
 * All fields are empty strings / defaults. Statut = 'Création de dossier'.
 *
 * Field names match the canonical `Dossier` shape in `src/lib/dossiers-data.ts`:
 * structured `assure`, `vehicule`, `partieAdverse` objects + flat top-level
 * fields (compagnie, nature, refExpert, matricule, etc.).
 */
export async function createEmptyDossier({ db, user }: CreateEmptyDossierInput): Promise<string> {
  const ref = await addDoc(collection(db, 'dossiers'), {
    statut: 'Création de dossier',
    compagnie: '',
    nature: '',
    typeDossier: '',
    refExpert: '',
    matricule: '',
    policeNumber: '',
    referenceCompagnie: '',
    repairerType: '',
    garageName: '',
    expertRank: '',
    secondExpertName: '',
    secondExpertCompany: '',
    assure: { nom: '', prenom: '', telephone: '', whatsapp: '', telephone2: '', email: '', adresse: '', cin: '' },
    vehicule: { marque: '', modele: '', immatriculation: '', serie: '', energie: '', puissance: '', mec: '', km: '' },
    partieAdverse: { assure: '', matricule: '', marque: '', police: '', compagnie: '' },
    adverseNom: '',
    adverseMatricule: '',
    adverseCompagnie: '',
    intermediaireNom: '',
    intermediaireEmail: '',
    experts: { designation1er: '', designation2eme: '', designationArbitrage: '' },
    dateSinistre: '',
    dateRequete: serverTimestamp(),
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    createdByName: user.displayName ?? user.email ?? 'Utilisateur',
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
