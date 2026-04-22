import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore';

export type ExpertRole = '1er' | '2eme' | 'arbitre';

export interface CreateEmptyDossierInput {
  db: Firestore;
  user: { uid: string; displayName?: string | null; email?: string | null };
  seed?: Partial<{
    refExpert: string;
    compagnie: string;
    nature: string;
    assureNom: string;
    matricule: string;
    /** Role the creating user plays on this dossier. Defaults to 1er expert. */
    expertRole: ExpertRole;
    /** Display name of the creating user, stored in the corresponding expert slot. */
    expertName: string;
  }>;
}

/**
 * Creates a blank dossier document and returns its id.
 * All fields are empty strings / defaults. Statut = 'Création de dossier'.
 *
 * Optional `seed` lets the caller pre-fill a handful of top-level fields (and
 * the nested `assure.nom`). Empty strings / undefined seed values fall back to
 * the empty defaults.
 *
 * If `seed.expertRole` + `seed.expertName` are provided, the corresponding
 * `experts.designation*` slot is pre-filled with the name.
 *
 * Field names match the canonical `Dossier` shape in `src/lib/dossiers-data.ts`:
 * structured `assure`, `vehicule`, `partieAdverse` objects + flat top-level
 * fields (compagnie, nature, refExpert, matricule, etc.).
 */
export async function createEmptyDossier({ db, user, seed }: CreateEmptyDossierInput): Promise<string> {
  const s = seed ?? {};
  const role = s.expertRole ?? '1er';
  const expertName = s.expertName ?? user.displayName ?? user.email ?? '';

  const experts = {
    designation1er: role === '1er' ? expertName : '',
    designation2eme: role === '2eme' ? expertName : '',
    designationArbitrage: role === 'arbitre' ? expertName : '',
  };

  const ref = await addDoc(collection(db, 'dossiers'), {
    statut: 'Création de dossier',
    compagnie: s.compagnie ?? '',
    nature: s.nature ?? '',
    typeDossier: '',
    refExpert: s.refExpert ?? '',
    matricule: s.matricule ?? '',
    policeNumber: '',
    referenceCompagnie: '',
    repairerType: '',
    garageName: '',
    expertRank: role,
    secondExpertName: '',
    secondExpertCompany: '',
    assure: { nom: s.assureNom ?? '', prenom: '', telephone: '', whatsapp: '', telephone2: '', email: '', adresse: '', cin: '' },
    vehicule: { marque: '', modele: '', immatriculation: '', serie: '', energie: '', puissance: '', mec: '', km: '' },
    partieAdverse: { assure: '', matricule: '', marque: '', police: '', compagnie: '' },
    adverseNom: '',
    adverseMatricule: '',
    adverseCompagnie: '',
    intermediaireNom: '',
    intermediaireEmail: '',
    experts,
    dateSinistre: '',
    dateRequete: serverTimestamp(),
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    createdByName: user.displayName ?? user.email ?? 'Utilisateur',
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
