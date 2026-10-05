import { addDoc, collection, serverTimestamp, type Firestore } from 'firebase/firestore';
import { deriveStatus } from '@/lib/status-machine';
import { refExpertFields } from '@/lib/ref-expert-unique';

export type ExpertRole = '1er' | '2eme' | 'arbitre';

/** Visible slots ordered by role hierarchy. 1er = 1 slot, 2eme = 2 slots, arbitre = 3 slots. */
export const EXPERT_ROLES_ORDER: ExpertRole[] = ['1er', '2eme', 'arbitre'];

export const EXPERT_ROLE_LABELS: Record<ExpertRole, string> = {
  '1er': '1er expert',
  '2eme': '2ème expert',
  arbitre: 'Arbitre',
};

export interface ExpertInfo {
  nom: string;
  telephone: string;
  email: string;
  compagnie: string;
}

export function emptyExpertInfo(): ExpertInfo {
  return { nom: '', telephone: '', email: '', compagnie: '' };
}

/** Given the role the dossier is being opened under, returns the list of experts to collect info for. */
export function visibleExpertRoles(role: ExpertRole): ExpertRole[] {
  if (role === '1er') return ['1er'];
  if (role === '2eme') return ['1er', '2eme'];
  return ['1er', '2eme', 'arbitre'];
}

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
    /** Full expert info per role. Only the roles actually filled need to be set. */
    experts: Partial<Record<ExpertRole, Partial<ExpertInfo>>>;
  }>;
}

/** Thrown — and shown — when a dossier would be created without its reference. */
export const MISSING_REF_MESSAGE = 'La référence du dossier est obligatoire.';

/**
 * Creates a blank dossier document and returns its id.
 * All fields are empty strings / defaults. Statut = 'Création dossier' (canonical).
 *
 * A dossier never exists without its reference (owner ruling 2026-10-05: a
 * dossier without one threw off the counts of Gestion des dossiers and
 * Consultation): `seed.refExpert` is required, and stored trimmed with its
 * uniqueness key (lib/ref-expert-unique.ts). The caller checks it is free.
 *
 * `seed.experts` is a partial map keyed by role → expert info. Missing roles or
 * fields fall back to the empty shape (`{ nom: '', telephone: '', email: '', compagnie: '' }`).
 */
export async function createEmptyDossier({ db, user, seed }: CreateEmptyDossierInput): Promise<string> {
  const s = seed ?? {};
  const role = s.expertRole ?? '1er';
  const reference = refExpertFields(s.refExpert);
  if (!reference.refExpert) throw new Error(MISSING_REF_MESSAGE);

  const mergeExpert = (r: ExpertRole): ExpertInfo => ({
    ...emptyExpertInfo(),
    ...(s.experts?.[r] ?? {}),
  });

  const experts: Record<ExpertRole, ExpertInfo> = {
    '1er': mergeExpert('1er'),
    '2eme': mergeExpert('2eme'),
    arbitre: mergeExpert('arbitre'),
  };

  const ref = await addDoc(collection(db, 'dossiers'), {
    statut: deriveStatus({ kind: 'create' }),
    directorValidated: null,
    compagnie: s.compagnie ?? '',
    nature: s.nature ?? '',
    typeDossier: '',
    ...reference,
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
    dateRequete: null,
    createdAt: serverTimestamp(),
    createdBy: user.uid,
    createdByName: user.displayName ?? user.email ?? 'Utilisateur',
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
