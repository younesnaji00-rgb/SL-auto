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
  // Structured objects
  assure: { nom: string; prenom: string; telephone: string; whatsapp: string; telephone2: string; email: string; adresse: string; cin: string } | string;
  vehicule: { marque: string; modele: string; immatriculation: string; serie: string; energie: string; puissance: string; mec: any; km: string };
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
};

export const statuses = [
    'Accord devis',
    'Accord devis rectifié 2',
    'Accord devis refusé',
    'Accord facture garage',
    'Att Signature 2ème expert',
    'Avis de réforme',
    'Avis dommage',
    'Demande 1er accord',
    'Demande 2ème accord',
    'Demande avis dommage (sup à 20000)',
    'Demande d\'arbitrage',
    'Doc illisible',
    'Dossier saisi sur système',
    'Dossier signé',
    'En cours de traitement facture garage',
    'En cours de réparation',
    'Expertise après réparation',
    'Expertise en cours de réparation',
    'Expertise avant',
    'Expertise non programmée en cours',
    'Expertise non programmée avant',
    'Expertise programmée après',
    'Expertise programmée en cours',
    'Facture controlée',
    'Facture controlée à problème (docs)',
    'Facture controlée à problème (pièces)',
    'Hors zone d\'intervention',
    'Manque devis',
    'Manque documents',
    'Manque facture d\'achat du véhicule',
    'Manque factures',
    'Manque photos après',
    'Manque photos au moment du sinistre',
    'Mission annulée',
    'Propositions avis de dommage',
    'Propositions avis de dommage signé',
    'PV Carence',
    'Validation forfait',
    'Validation rapport définitif',
    'Validation rapport estimatif',
    'Validation rapport réforme',
    'Création de mission',
    'Clôture',
    'Commentaire',
    'Demande expertise avant réparation',
];

export const marques = [
    'Renault', 'Peugeot', 'Citroën', 'Dacia', 'Volkswagen', 'Toyota', 'Hyundai', 'Kia', 'Ford', 'Fiat', 'BMW', 'Mercedes', 'Audi', 'Nissan', 'Opel', 'Suzuki', 'Honda', 'Mazda', 'Mitsubishi', 'Skoda', 'Seat', 'Chevrolet', 'MG', 'Chery', 'DFSK', 'Autre'
];

export const natures = [
    'Classique', 'Contradictoire 1er', 'Contradictoire 2ème', 'Arbitrage', 'Réforme', 'Collégiale', 'Forfait', 'Appréciation', 'EAD'
];

export const compagnies = [
    'Allianz', 'RMA', 'Sanlam', 'Wafa', 'ATLANTA', 'CP', 'Fès RMA', 'Fès ATLANTASANAD', 'Fès Sanlam', 'Wafa Assurance', 'RMA Assurance', 'Zurich Assurance', 'Saham Assurance', 'Atlanta Assurance', 'AXA Assurance'
];

export const roles = ['Admin', 'Responsable d\'équipe', 'Gestionnaire', 'Chiffreur', 'Agent de Terrain'] as const;
export type Role = typeof roles[number];

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
