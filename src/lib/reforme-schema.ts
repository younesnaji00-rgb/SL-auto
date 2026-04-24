import type { Timestamp } from 'firebase/firestore';

/**
 * Réforme data captured by the chiffreur when a dossier is deemed beyond
 * economical repair. Persisted at `dossiers/{id}.reforme`.
 */
/** Canonical user-visible type labels for a réforme. */
export type ReformeType = 'Technique' | 'Économique';

export interface ReformeData {
  /**
   * Réforme flavour. Kept as `string` (not `ReformeType`) to stay backward-
   * compatible with legacy docs written as 'technique' (lowercase) or empty.
   * New writes should use `ReformeType` values ('Technique' | 'Économique').
   */
  typeReforme: string;
  valeurVenale: number;
  valeurEpave: number;
  valeurAchat: number;
  valeurCommerciale: number;
  /** Persisted snapshot of `valeurVenale − valeurEpave`. */
  difference: number;
  methodeCalcul: string;
  avecTva: boolean;
  vetuste: number;
  franchise: number;
  montantDeplacement: number;
  montantHonoraires: number;
  montantAccord: number;
  /** Persisted snapshot of the computed total. */
  totalIndemnisation: number;
  updatedAt?: Timestamp | Date | { seconds: number; nanoseconds: number };
  updatedBy?: string;
}

export function emptyReforme(): ReformeData {
  return {
    typeReforme: '',
    valeurVenale: 0,
    valeurEpave: 0,
    valeurAchat: 0,
    valeurCommerciale: 0,
    difference: 0,
    methodeCalcul: '',
    avecTva: false,
    vetuste: 0,
    franchise: 0,
    montantDeplacement: 0,
    montantHonoraires: 0,
    montantAccord: 0,
    totalIndemnisation: 0,
  };
}

function safeNum(n: unknown): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

export function computeDifference(r: Pick<ReformeData, 'valeurVenale' | 'valeurEpave'>): number {
  return safeNum(r.valeurVenale) - safeNum(r.valeurEpave);
}

export function computeTotalIndemnisation(
  r: Pick<ReformeData, 'montantAccord' | 'vetuste' | 'franchise' | 'montantDeplacement' | 'montantHonoraires'>
): number {
  return (
    safeNum(r.montantAccord)
    - safeNum(r.vetuste)
    - safeNum(r.franchise)
    + safeNum(r.montantDeplacement)
    + safeNum(r.montantHonoraires)
  );
}
