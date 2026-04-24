import { toOrdinalFr, toOrdinalFeminineFr } from './devis-schema';

export const ACCORDE_MAP: Record<string, string> = {
  'Facture Garage': 'Facture accordé',
  'Devis Garage': 'Devis accordé',
};

export type AccordeSourceDocType = 'Devis Garage' | 'Facture Garage';
export type AccordeKind = 'accord' | 'proposition-accord';

/**
 * Legacy single-arg form: returns the primary "accordé" label for the given
 * source docType. Kept for backward compat with existing callers that pass a
 * raw docType string.
 */
export function mapToAccorde(docType: string): string;
/**
 * Extended form: build the label for a given source doc type, kind
 * (`accord` or `proposition-accord`) and ordinal (1–3).
 *
 * For `accord`:
 *   - ordinal 1 → legacy labels (`Devis accordé` / `Facture accordé`)
 *   - ordinal 2+ → cardinal form (`Devis 2ème accord`)
 * For `proposition-accord`:
 *   - feminine ordinal + `proposition d'accord (devis|facture)` suffix
 *
 * Ordinal is clamped to [1, 3] defensively.
 */
export function mapToAccorde(
  sourceDocType: AccordeSourceDocType,
  kind: AccordeKind,
  ordinal: number,
): string;
export function mapToAccorde(
  sourceDocType: string,
  kind?: AccordeKind,
  ordinal?: number,
): string {
  // Legacy single-arg form: delegate to the primary accord mapping.
  if (kind === undefined || ordinal === undefined) {
    if (sourceDocType === 'Devis Garage' || sourceDocType === 'Facture Garage') {
      return ACCORDE_MAP[sourceDocType] ?? sourceDocType;
    }
    return ACCORDE_MAP[sourceDocType] ?? sourceDocType;
  }

  const clamped = Math.max(1, Math.min(3, ordinal));
  const base: 'Devis' | 'Facture' =
    sourceDocType === 'Facture Garage' ? 'Facture' : 'Devis';
  const baseLower = base.toLowerCase();

  if (kind === 'accord') {
    if (clamped === 1) {
      return base === 'Devis' ? 'Devis accordé' : 'Facture accordé';
    }
    return `${base} ${toOrdinalFr(clamped)} accord`;
  }

  // proposition-accord: feminine ordinal + suffix with lowercased base.
  return `${toOrdinalFeminineFr(clamped)} proposition d'accord (${baseLower})`;
}

/**
 * Convenience alias: primary (ordinal 1) "accordé" label for a source docType.
 * Equivalent to `mapToAccorde(sourceDocType, 'accord', 1)`.
 */
export function mapToAccordePrimary(
  sourceDocType: AccordeSourceDocType,
): string {
  return mapToAccorde(sourceDocType, 'accord', 1);
}
