/**
 * Document classes the AI drop box can assign. Labels are the same strings the
 * typed-document slots use (`type` on `dossiers/{id}/documents`), so a file
 * classified here lands directly in the right slot.
 */

export interface DocClass {
  label: string;
  /** What the model should look for (French, used in the prompt). */
  description: string;
  /** Files of this class feed the AI pre-fill of the Information step. */
  prefill?: boolean;
}

export const DOC_CLASSES: DocClass[] = [
  { label: 'Lettre de mission', description: "Ordre de mission / lettre de mission d'une compagnie d'assurance ou capture d'écran d'un portail assureur (Sanlam, RMA, Wafa, AXA…) décrivant le sinistre, l'assuré et le véhicule.", prefill: true },
  { label: 'PV-Constat / Récépissé de police', description: 'Constat amiable, procès-verbal de police ou de gendarmerie, récépissé de dépôt de plainte.', prefill: true },
  { label: 'Carte grise', description: "Certificat d'immatriculation (carte grise marocaine, recto/verso) avec immatriculation, châssis, propriétaire.", prefill: true },
  { label: "Attestation d'assurance", description: "Attestation ou carte verte d'assurance : compagnie, numéro de police, période de validité.", prefill: true },
  { label: 'Devis Garage', description: 'Devis de réparation émis par un garage / carrossier : lignes de pièces et main-d’œuvre avec prix, total HT/TTC, sans mention « facture ».' },
  { label: 'Facture Garage', description: 'Facture de réparation émise par un garage (mention « Facture », numéro de facture, TVA, montant payé).' },
  { label: 'Kilométrage', description: 'Photo du compteur kilométrique / tableau de bord montrant le kilométrage.' },
  { label: 'Numéro de chassis', description: 'Photo de la plaque constructeur ou du numéro de châssis (VIN) gravé.' },
  { label: 'Photo du véhicule', description: 'Photo du véhicule, des dégâts ou de la scène (pas un document).' },
  { label: "Rapport d'expertise", description: "Rapport d'expertise (préliminaire, final, réforme) rédigé par un autre expert ou cabinet." },
  { label: 'Autre', description: 'Tout autre document : courrier, pièce d’identité, permis, relevé, etc.' },
];

export const DOC_CLASS_LABELS = DOC_CLASSES.map((c) => c.label);
export const PREFILL_DOC_CLASSES = DOC_CLASSES.filter((c) => c.prefill).map((c) => c.label);

/** Label used while a file is uploaded but not yet classified. */
export const UNCLASSIFIED_LABEL = 'À classer';

export function isDocClass(label: string | null | undefined): label is string {
  return !!label && DOC_CLASS_LABELS.includes(label);
}

export type ConfidenceBand = 'high' | 'medium' | 'low';

export function confidenceBand(c: number | null | undefined): ConfidenceBand {
  if (typeof c !== 'number' || Number.isNaN(c)) return 'low';
  if (c >= 0.85) return 'high';
  if (c >= 0.6) return 'medium';
  return 'low';
}
