/**
 * Required source documents — the single predicate behind
 *   • the "Envoyer / Assigner au chiffrage" gate on the Pièces step,
 *   • the Reçu / À déposer chips in the documents browser type list,
 *   • the "N pièces requises manquantes" summary line.
 *
 * Item 023: the five {@link REQUIRED_SOURCE_SLOTS} must each hold a
 * non-pending document, AND at least one of {@link GARAGE_DOC_SLOTS} must be
 * filled (either-or). "Autre" is optional and never counted.
 */

import { parseAccordDocType } from './docType-accorde';

/**
 * Chiffrage / expertise OUTPUT types — produced by the chiffreur (accords,
 * propositions, any cardinal), the report generator (Rapport *, Réforme *)
 * or the honoraires step. They live exclusively on the accord / rapport /
 * honoraires steps and must never surface in step 1 (Pièces).
 */
export function isChiffrageOutputType(type: string | null | undefined): boolean {
  const t = (type || '').trim();
  if (!t) return false;
  if (parseAccordDocType(t)) return true;
  if (t === 'Réforme technique' || t === 'Réforme économique') return true;
  if (t === 'Rapport final' || t.startsWith('Rapport ')) return true;
  if (t === "Note d'honoraire") return true;
  return false;
}

export const REQUIRED_SOURCE_SLOTS = [
  'PV-Constat / Récépissé de police',
  'Carte grise',
  'Attestation d\'assurance',
  'Kilométrage',
  'Numéro de chassis',
] as const;

/** Either-or pair: at least one must be filled before chiffrage. */
export const GARAGE_DOC_SLOTS = ['Devis Garage', 'Facture Garage'] as const;

/** Label used in summaries for the either-or garage pair. */
export const GARAGE_PAIR_LABEL = 'Devis Garage ou Facture Garage';

export type RequiredDocLike = {
  url?: string | null;
  pendingUpload?: boolean;
  type?: string | null;
  typeDocument?: string | null;
};

export type RequiredDocsStatus = {
  /** Types that have at least one non-pending, uploaded document. */
  filledTypes: Set<string>;
  /** Required single slots still empty (canonical order). */
  missingRequired: string[];
  /** True when Devis Garage or Facture Garage is filled. */
  garageFilled: boolean;
  /** missingRequired empty AND garageFilled. */
  allRequiredFilled: boolean;
  /**
   * Human list of everything still missing, garage pair collapsed into one
   * entry — what the summary line and the disabled-button tooltip print.
   */
  missingLabels: string[];
};

export function docTypeOf(d: RequiredDocLike | null | undefined): string {
  return ((d?.type || d?.typeDocument || '') as string).trim();
}

export function collectFilledTypes(docs: ReadonlyArray<RequiredDocLike> | null | undefined): Set<string> {
  const filled = new Set<string>();
  if (!docs) return filled;
  for (const d of docs) {
    if (!d?.url || d.pendingUpload) continue;
    const type = docTypeOf(d);
    if (type) filled.add(type);
  }
  return filled;
}

/**
 * `docs === null | undefined` means "not loaded yet": everything is reported
 * missing so gates stay closed until the subscription resolves.
 */
export function computeRequiredDocsStatus(docs: ReadonlyArray<RequiredDocLike> | null | undefined): RequiredDocsStatus {
  const filledTypes = collectFilledTypes(docs);
  const missingRequired = docs ? REQUIRED_SOURCE_SLOTS.filter((slot) => !filledTypes.has(slot)) : [...REQUIRED_SOURCE_SLOTS];
  const garageFilled = !!docs && GARAGE_DOC_SLOTS.some((slot) => filledTypes.has(slot));
  const missingLabels = garageFilled ? [...missingRequired] : [...missingRequired, GARAGE_PAIR_LABEL];
  return {
    filledTypes,
    missingRequired,
    garageFilled,
    allRequiredFilled: missingRequired.length === 0 && garageFilled,
    missingLabels,
  };
}

export function isRequiredSourceSlot(type: string): boolean {
  return (REQUIRED_SOURCE_SLOTS as ReadonlyArray<string>).includes(type);
}

export function isGarageSlot(type: string): boolean {
  return (GARAGE_DOC_SLOTS as ReadonlyArray<string>).includes(type);
}

export type RequiredDocChip = 'received' | 'missing' | null;

/**
 * Status chip for a type row in the documents browser.
 *  - required single slot → `received` when filled, else `missing`
 *  - garage slot → `received` when THIS one is filled; `missing` only while
 *    neither of the pair is filled (once one is in, the other is optional →
 *    no chip)
 *  - any other type → no chip
 */
export function requiredDocChip(type: string, status: RequiredDocsStatus): RequiredDocChip {
  if (isRequiredSourceSlot(type)) return status.filledTypes.has(type) ? 'received' : 'missing';
  if (isGarageSlot(type)) {
    if (status.filledTypes.has(type)) return 'received';
    return status.garageFilled ? null : 'missing';
  }
  return null;
}
