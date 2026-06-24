import type { LucideIcon } from 'lucide-react';

export type Dossier = {
  id: string;
  refExpert: string;
  expertRank: string;
  statut: string;
  createdAt: any;
  createdBy: string;
  // Dossier info
  compagnie: string;
  typeDossier: string;
  nature: string;
  matricule: string;
  policeNumber: string;
  referenceCompagnie: string;
  repairerType: string;
  garageName: string;
  dateSinistre: any;
  dateRequete: any;
  dateMissionAgentTerrain?: any;
  datePhotosAvant?: any;
  datePhotosEnCours?: any;
  datePhotosApres?: any;
  dateChiffrage?: any;
  dateFactureValide?: any;
  authorFactureValide?: string;
  dateRapportDepose?: any;
  authorRapportDepose?: string;
  // Structured objects
  assure: { nom: string; prenom: string; telephone: string; whatsapp: string; telephone2: string; email: string; adresse: string; cin: string } | string;
  vehicule: { marque: string; modele: string; immatriculation: string; immatriculationAnterieur?: string; serie: string; energie: string; puissance: string; mec: any; km: string };
  partieAdverse: { assure: string; matricule: string; marque: string; police: string; compagnie: string };
  // Adverse flat fields
  adverseNom: string;
  adverseMatricule: string;
  adverseCompagnie: string;
  // Intermédiaire flat fields
  intermediaireNom: string;
  intermediaireEmail: string;
  // Experts
  experts: { designation1er: string; designation2eme: string; designationArbitrage: string };
  secondExpertName: string;
  secondExpertCompany: string;
  // Denormalized summary of the last status change — written by logHistorique when type === 'statut'.
  lastStatusChange?: { status: string; at: any; by: string; details?: string };
  // Denormalized summary of the last observation — written by addObservation in log-observation.ts.
  lastObservation?: { text: string; type: string; author: string; authorRole: string; at: any };
  // Director validation for rapport gating (task #39). null = not yet validated.
  directorValidated?: { by: string; at: any; role?: string } | null;
};

/**
 * Canonical status labels — the ONE source of truth for dossier status values.
 * Order here is the canonical ordering used throughout the UI (selects, filters,
 * seeds). Status machine (src/lib/status-machine.ts) derives labels from this
 * list. The seed + reconciler ensure these always exist in `options_statuts`.
 *
 * Cardinal cap is 3ème (no 4ème or beyond).
 */
export const CANONICAL_STATUTS = [
    'Création dossier',
    'Planification programmée avant',
    'Planification expertise avant',
    'Planification programmée en cours',
    'Planification expertise en cours',
    'Planification programmée après',
    'Planification expertise après',
    'Chiffrage en cours',
    'Accord',
    'Proposition d\'accord',
    '2ème accord',
    '2ème proposition d\'accord',
    '3ème accord',
    '3ème proposition d\'accord',
    'Accord envoyé',
    'Réforme',
] as const;

export type CanonicalStatut = typeof CANONICAL_STATUTS[number];

/**
 * Statuses that collectively represent "an accord exists" for a dossier.
 * Shared by the dashboard (visual bucket) and the monitoring funnel
 * (step 5 — Accord — réalisé indicator).
 */
export const ACCORD_BUCKET_MEMBERS: ReadonlySet<string> = new Set([
    'Accord',
    "Proposition d'accord",
    '2ème accord',
    "2ème proposition d'accord",
    '3ème accord',
    "3ème proposition d'accord",
    'Accord envoyé',
    'Réforme',
]);

/**
 * Mutable-array aliases of the canonical status set.
 *
 * Single source of truth at runtime: the `options_statuts` Firestore
 * collection (seeded once from `CANONICAL_STATUTS` via
 * `src/lib/seed-options.ts`). Dropdown call sites read it via `useOptions`,
 * not from the constants below.
 *
 * These exports remain only for:
 *   - Seeding (consumed by `seed-options.ts`)
 *   - Read-only TypeScript narrowing (e.g., `Dossier.statut`)
 *   - The dashboard pie chart's fixed-enum baseline
 *     (`src/app/(app)/dashboard/page.tsx`) where the chart slices are
 *     intentionally bounded to the canonical set.
 *
 * Do NOT import these into new dropdowns or filters — they should always
 * come from `useOptions(<collection>)`.
 */
export const statuses: string[] = [...CANONICAL_STATUTS];

/** Alias kept for compatibility with existing callers. */
export const canonicalStatuts: string[] = [...CANONICAL_STATUTS];

/** Alias kept for compatibility with existing callers that imported `statuses as defaultStatuses`. */
export const defaultStatuses: string[] = [...CANONICAL_STATUTS];

/**
 * The statuses an Agent de Terrain is allowed to set/observe from the decision
 * modal — the six planification states. Agent users don't set Accord / closed
 * statuses.
 */
export const agentTerrainStatuses = [
    'Planification programmée avant',
    'Planification expertise avant',
    'Planification programmée en cours',
    'Planification expertise en cours',
    'Planification programmée après',
    'Planification expertise après',
] as const;

export const marques = [
    'Renault', 'Peugeot', 'Citroën', 'Dacia', 'Volkswagen', 'Toyota', 'Hyundai', 'Kia', 'Ford', 'Fiat', 'BMW', 'Mercedes', 'Audi', 'Nissan', 'Opel', 'Suzuki', 'Honda', 'Mazda', 'Mitsubishi', 'Skoda', 'Seat', 'Chevrolet', 'MG', 'Chery', 'DFSK', 'Autre'
];

export const natures = [
    'Classique', 'Contradictoire 1er', 'Contradictoire 2ème', 'Arbitrage', 'Réforme', 'Collégiale', 'Forfait', 'Appréciation', 'EAD'
];

export const compagnies = [
    'Allianz', 'RMA', 'Sanlam', 'Wafa', 'ATLANTA', 'CP', 'Fès RMA', 'Fès ATLANTASANAD', 'Fès Sanlam', 'Wafa Assurance', 'RMA Assurance', 'Zurich Assurance', 'Saham Assurance', 'Atlanta Assurance', 'AXA Assurance'
];

export const roles = [
  'Admin',
  'Directeur',
  'Directeur des opérations',
  'Directeur technique',
  'Responsable technique',
  'Responsable d\'équipe',
  'Gestionnaire',
  'Chiffreur',
  'Agent de Terrain',
] as const;
export type Role = typeof roles[number];

/**
 * Roles whose users can delete records (dossiers, comments, documents,
 * photos, planifications, etc.) anywhere in the app. All other roles see
 * UI without delete buttons.
 *
 * NOTE: the role enum above is also the seed list for the `options_roles`
 * Firestore collection (see `seed-options.ts`). Adding a NEW role via the
 * gear icon in Utilisateurs does NOT grant it delete permission — that
 * permission is intentionally name-driven below. To grant delete to a new
 * role, add its label here.
 */
export const ROLES_THAT_CAN_DELETE: ReadonlySet<string> = new Set<string>([
  'Admin',
  'Directeur',
  'Directeur des opérations',
  'Directeur technique',
]);

/**
 * Roles restricted to a single active device at a time. When one of these
 * users is already logged in on a device, a login attempt from a SECOND device
 * is BLOCKED — they must explicitly sign out of the first device (or an admin
 * must force-disconnect it) before the second device can connect. Every other
 * role may be logged in on multiple devices simultaneously.
 *
 * Single source of truth — keep the enforcement in `src/app/login/page.tsx`,
 * `src/hooks/use-current-user.tsx`, and the admin force-disconnect UI in
 * `src/app/(app)/utilisateurs/[uid]/page.tsx` importing from here.
 */
export const SINGLE_SESSION_ROLES: ReadonlySet<string> = new Set<string>([
  'Gestionnaire',
  'Chiffreur',
  'Agent de Terrain',
]);

/** True iff the given role is restricted to one active device at a time. */
export function isSingleSessionRole(role: string | undefined | null): boolean {
  return !!role && SINGLE_SESSION_ROLES.has(role);
}

export type User = {
    id: string;
    nom: string;
    email: string;
    role: Role;
    compagnies: string[];
};

export const users: User[] = [
    { id: 'USR-001', nom: 'Admin User', email: 'admin@dashflow.com', role: 'Admin', compagnies: ['Allianz', 'RMA', 'Sanlam'] },
    { id: 'USR-002', nom: 'GOTTA El Mehdi', email: 'mehdi@dashflow.com', role: 'Gestionnaire', compagnies: ['Wafa', 'ATLANTA'] },
    { id: 'USR-003', nom: 'Agent Smith', email: 'smith@dashflow.com', role: 'Agent de Terrain', compagnies: ['CP'] },
    { id: 'USR-004', nom: 'John Chiffreur', email: 'john@dashflow.com', role: 'Chiffreur', compagnies: ['Fès RMA', 'Fès Sanlam'] },
];
