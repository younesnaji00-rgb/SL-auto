/**
 * Per-step read-only replay configuration.
 *
 * Drives the "Voir le détail du traitement" lightbox: for each workflow step we
 * declare (1) the dossier main-doc fields to render read-only (grouped, with FR
 * labels) and (2) which subcollections to surface for that step. Derived from
 * the live step/tab components — keep in sync if the forms change.
 */

export type FieldKind =
  | 'text'
  | 'number'
  | 'currency'
  | 'date'
  | 'boolean'
  | 'select'
  | 'object'
  | 'array'
  | 'impactZones';

export interface ReplayField {
  /** Dot-path on the dossier doc. */
  path: string;
  label: string;
  kind: FieldKind;
}

export interface ReplayFieldGroup {
  title: string;
  fields: ReplayField[];
}

/** A subcollection block to render under a step. */
export type ReplaySubSpec =
  | { kind: 'planifications'; typeMission: 'Avant' | 'En cours' | 'Après'; title: string }
  | { kind: 'photos'; category: 'avant' | 'en_cours' | 'apres'; title: string }
  | {
      kind: 'observations';
      phaseATG?: 'Avant' | 'En cours' | 'Après';
      accordSlot?: '1er accord' | '2ème accord ou +';
      title: string;
    }
  | { kind: 'documents'; slot: 'base' | 'accord1' | 'accord2plus' | 'note'; title: string }
  | { kind: 'rapport_pieces'; title: string };

export interface ReplayStepConfig {
  id: number;
  label: string;
  groups: ReplayFieldGroup[];
  subs: ReplaySubSpec[];
}

const expertGroup = (key: '1er' | '2eme' | 'arbitre', heading: string): ReplayFieldGroup => ({
  title: heading,
  fields: [
    { path: `experts.${key}.nom`, label: 'Nom complet', kind: 'text' },
    { path: `experts.${key}.telephone`, label: 'Téléphone', kind: 'text' },
    { path: `experts.${key}.email`, label: 'Email', kind: 'text' },
    { path: `experts.${key}.compagnie`, label: 'Compagnie', kind: 'text' },
  ],
});

export const REPLAY_STEPS: ReplayStepConfig[] = [
  {
    id: 1,
    label: 'Création de mission',
    groups: [
      {
        title: 'Informations dossier',
        fields: [
          { path: 'compagnie', label: 'Compagnie', kind: 'select' },
          { path: 'typeDossier', label: 'Type de dossier', kind: 'select' },
          { path: 'nature', label: 'Nature du dossier', kind: 'select' },
          { path: 'statut', label: 'Statut', kind: 'select' },
          { path: 'refExpert', label: 'Réf dossier', kind: 'text' },
          { path: 'referenceCompagnie', label: 'Référence compagnie', kind: 'text' },
          { path: 'matricule', label: 'Matricule', kind: 'text' },
          { path: 'policeNumber', label: 'N° de police', kind: 'text' },
          { path: 'dateSinistre', label: 'Date sinistre', kind: 'date' },
          { path: 'dateRequete', label: 'Date requête', kind: 'date' },
          { path: 'repairerType', label: 'Type de réparateur', kind: 'text' },
          { path: 'garageName', label: 'Nom du garage', kind: 'text' },
          { path: 'produit', label: 'Produit', kind: 'text' },
          { path: 'dateValiditeAssurance', label: 'Validité assurance', kind: 'date' },
          { path: 'expertRank', label: 'Rôle du dossier', kind: 'select' },
        ],
      },
      expertGroup('1er', '1er expert'),
      expertGroup('2eme', '2ème expert'),
      expertGroup('arbitre', 'Arbitre'),
      {
        title: 'Assuré',
        fields: [
          { path: 'assure.nom', label: 'Nom', kind: 'text' },
          { path: 'assure.prenom', label: 'Prénom', kind: 'text' },
          { path: 'assure.telephone', label: 'Téléphone', kind: 'text' },
          { path: 'assure.whatsapp', label: 'WhatsApp', kind: 'text' },
          { path: 'assure.telephone2', label: 'Téléphone 2', kind: 'text' },
          { path: 'assure.email', label: 'Email', kind: 'text' },
          { path: 'assure.adresse', label: 'Adresse', kind: 'text' },
          { path: 'assure.cin', label: 'CIN', kind: 'text' },
          { path: 'assure.souscripteur', label: 'Souscripteur', kind: 'text' },
          { path: 'assure.titulaireCarteGrise', label: 'Titulaire carte grise', kind: 'text' },
        ],
      },
      {
        title: 'Véhicule',
        fields: [
          { path: 'vehicule.marque', label: 'Marque', kind: 'text' },
          { path: 'vehicule.modele', label: 'Modèle', kind: 'text' },
          { path: 'vehicule.immatriculation', label: 'Immatriculation', kind: 'text' },
          { path: 'vehicule.immatriculationAnterieur', label: 'Immatriculation antérieure', kind: 'text' },
          { path: 'vehicule.serie', label: 'N° de série', kind: 'text' },
          { path: 'vehicule.energie', label: 'Énergie', kind: 'text' },
          { path: 'vehicule.puissance', label: 'Puissance fiscale', kind: 'text' },
          { path: 'vehicule.mec', label: 'Mise en circulation', kind: 'date' },
          { path: 'vehicule.km', label: 'Kilométrage', kind: 'number' },
          { path: 'vehicule.valeurNeuf', label: 'Valeur à neuf', kind: 'currency' },
          { path: 'vehicule.usage', label: 'Usage', kind: 'text' },
        ],
      },
      {
        title: 'Intermédiaire',
        fields: [
          { path: 'intermediaireNom', label: 'Nom / Raison sociale', kind: 'text' },
          { path: 'intermediairePrenom', label: 'Prénom', kind: 'text' },
          { path: 'intermediaireType', label: 'Type', kind: 'text' },
          { path: 'intermediaireCode', label: 'Code intermédiaire', kind: 'text' },
          { path: 'intermediaireCompagnie', label: 'Compagnie', kind: 'select' },
          { path: 'intermediaireTelephone', label: 'Téléphone', kind: 'text' },
          { path: 'intermediaireEmail', label: 'Email', kind: 'text' },
          { path: 'intermediaireAdresse', label: 'Adresse', kind: 'text' },
        ],
      },
      {
        title: 'Partie adverse',
        fields: [
          { path: 'partieAdverse.assure', label: 'Assuré', kind: 'text' },
          { path: 'partieAdverse.matricule', label: 'Matricule', kind: 'text' },
          { path: 'partieAdverse.marque', label: 'Marque', kind: 'text' },
          { path: 'partieAdverse.police', label: 'Police', kind: 'text' },
          { path: 'partieAdverse.compagnie', label: 'Compagnie', kind: 'text' },
          // Legacy flat fallbacks (rendered only when filled).
          { path: 'adverseNom', label: 'Nom (ancien)', kind: 'text' },
          { path: 'adversePrenom', label: 'Prénom (ancien)', kind: 'text' },
          { path: 'adverseTelephone', label: 'Téléphone (ancien)', kind: 'text' },
          { path: 'adverseEmail', label: 'Email (ancien)', kind: 'text' },
          { path: 'adverseAdresse', label: 'Adresse (ancien)', kind: 'text' },
          { path: 'adverseMatricule', label: 'Matricule (ancien)', kind: 'text' },
          { path: 'adverseCompagnie', label: 'Compagnie (ancien)', kind: 'text' },
          { path: 'adversePermis', label: 'N° permis (ancien)', kind: 'text' },
        ],
      },
    ],
    subs: [{ kind: 'documents', slot: 'base', title: 'Documents source / garage' }],
  },
  {
    id: 4,
    label: 'Planification avant',
    groups: [
      {
        title: 'Planification avant',
        fields: [
          { path: 'dateMissionAgentTerrain', label: 'Date mission agent terrain', kind: 'date' },
          { path: 'dateDemandeExpertiseAvant', label: 'Date demande expertise (avant)', kind: 'date' },
          { path: 'datePhotosAvant', label: 'Date dernières photos (avant)', kind: 'date' },
          { path: 'propositionReforme', label: 'Proposition réforme', kind: 'boolean' },
        ],
      },
    ],
    subs: [
      { kind: 'planifications', typeMission: 'Avant', title: 'Missions planifiées (avant)' },
      { kind: 'photos', category: 'avant', title: 'Photos (avant)' },
      { kind: 'observations', phaseATG: 'Avant', title: 'Observations (avant)' },
    ],
  },
  {
    id: 6,
    label: 'Accord',
    groups: [
      {
        title: 'Accord',
        fields: [
          { path: 'statut', label: 'Statut', kind: 'select' },
          { path: 'currentChiffrageId', label: 'Chiffrage en cours (ID)', kind: 'text' },
          { path: 'propositionReforme', label: 'Proposition réforme', kind: 'boolean' },
          { path: 'dateChiffrage', label: 'Date chiffrage', kind: 'date' },
        ],
      },
    ],
    subs: [{ kind: 'observations', accordSlot: '1er accord', title: 'Observations (1er accord)' }],
  },
  {
    id: 9,
    label: 'Planification en cours',
    groups: [
      {
        title: 'Planification en cours',
        fields: [
          { path: 'dateMissionAgentTerrain', label: 'Date mission agent terrain', kind: 'date' },
          { path: 'dateDemandeExpertiseEnCours', label: 'Date demande expertise (en cours)', kind: 'date' },
          { path: 'datePhotosEnCours', label: 'Date dernières photos (en cours)', kind: 'date' },
          { path: 'propositionReforme', label: 'Proposition réforme', kind: 'boolean' },
        ],
      },
    ],
    subs: [
      { kind: 'planifications', typeMission: 'En cours', title: 'Missions planifiées (en cours)' },
      { kind: 'photos', category: 'en_cours', title: 'Photos (en cours)' },
      { kind: 'observations', phaseATG: 'En cours', title: 'Observations (en cours)' },
    ],
  },
  {
    id: 11,
    label: '2ème accord et +',
    groups: [
      {
        title: '2ème accord et +',
        fields: [
          { path: 'statut', label: 'Statut', kind: 'select' },
          { path: 'currentChiffrageId', label: 'Chiffrage en cours (ID)', kind: 'text' },
          { path: 'propositionReforme', label: 'Proposition réforme', kind: 'boolean' },
          { path: 'dateChiffrage', label: 'Date chiffrage', kind: 'date' },
        ],
      },
    ],
    subs: [{ kind: 'observations', accordSlot: '2ème accord ou +', title: 'Observations (2ème accord ou +)' }],
  },
  {
    id: 10,
    label: 'Planification après',
    groups: [
      {
        title: 'Planification après',
        fields: [
          { path: 'dateMissionAgentTerrain', label: 'Date mission agent terrain', kind: 'date' },
          { path: 'dateDemandeExpertiseApres', label: 'Date demande expertise (après)', kind: 'date' },
          { path: 'datePhotosApres', label: 'Date dernières photos (après)', kind: 'date' },
          { path: 'propositionReforme', label: 'Proposition réforme', kind: 'boolean' },
        ],
      },
    ],
    subs: [
      { kind: 'planifications', typeMission: 'Après', title: 'Missions planifiées (après)' },
      { kind: 'photos', category: 'apres', title: 'Photos (après)' },
      { kind: 'observations', phaseATG: 'Après', title: 'Observations (après)' },
    ],
  },
  {
    id: 7,
    label: 'Rapport',
    groups: [
      {
        title: 'Rapport',
        fields: [
          { path: 'typeChiffrage', label: 'Type de chiffrage', kind: 'select' },
          { path: 'sousTypeChiffrage', label: 'Sous-type de chiffrage', kind: 'text' },
          { path: 'pointsChoc', label: 'Points de choc (dessus)', kind: 'impactZones' },
          { path: 'pointsChocDessous', label: 'Points de choc (dessous)', kind: 'impactZones' },
          { path: 'dateRapportDepose', label: 'Date dépôt du rapport', kind: 'date' },
          { path: 'authorRapportDepose', label: 'Auteur dépôt du rapport', kind: 'text' },
        ],
      },
      {
        title: 'Validation directeur',
        fields: [
          { path: 'directorValidated.by', label: 'Validé par', kind: 'text' },
          { path: 'directorValidated.at', label: 'Validé le', kind: 'date' },
          { path: 'directorValidated.role', label: 'Rôle du validateur', kind: 'text' },
        ],
      },
    ],
    subs: [{ kind: 'rapport_pieces', title: 'Pièces du rapport' }],
  },
  {
    id: 8,
    label: "Note d'honoraire",
    groups: [
      {
        title: "Note d'honoraire",
        fields: [
          { path: 'dateFactureValide', label: 'Date validation facture', kind: 'date' },
          { path: 'authorFactureValide', label: 'Auteur validation facture', kind: 'text' },
        ],
      },
    ],
    subs: [{ kind: 'documents', slot: 'note', title: "Note d'honoraire" }],
  },
];

/** Impact-zone FR labels for pointsChoc / pointsChocDessous boolean maps. */
export const IMPACT_ZONE_LABELS: Record<string, string> = {
  AR: 'Arrière',
  ARG: 'Arrière gauche',
  ARD: 'Arrière droit',
  LATG: 'Latéral gauche',
  LATD: 'Latéral droit',
  AVG: 'Avant gauche',
  AVD: 'Avant droit',
  AV: 'Avant',
  Toit: 'Toit',
  suspensionAV: 'Suspension AV',
  soubassementAV: 'Soubassement AV',
  plancher: 'Plancher',
  transmission: 'Transmission',
  differentiel: 'Différentiel',
  suspensionAR: 'Suspension AR',
  echappement: 'Échappement',
  reservoir: 'Réservoir',
};

/**
 * Coarsen an observation's `accordSlot` (which can hold specific docType labels
 * like "Devis 2ème accord") into the two coarse buckets used by the step
 * filters. Mirrors `accordSlotFromValue` in the dossier timeline.
 */
export function accordSlotCoarse(value: any): '1er accord' | '2ème accord ou +' | null {
  if (!value) return null;
  const v = String(value).toLowerCase();
  if (v.includes('1er') || v.includes('1ère') || v.includes('première') || v.includes('premiere')) {
    return '1er accord';
  }
  if (
    v.includes('2ème') ||
    v.includes('2eme') ||
    v.includes('2nd') ||
    v.includes('deuxième') ||
    v.includes('deuxieme') ||
    v.includes('+') ||
    v.includes('ou +')
  ) {
    return '2ème accord ou +';
  }
  // Bare "1er accord" / "2ème accord ou +" exact values handled above; default
  // any other accord-tagged value to the first accord bucket.
  return '1er accord';
}
