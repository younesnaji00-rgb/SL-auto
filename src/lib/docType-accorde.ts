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

export interface ParsedAccordDocType {
  sourceDocType: AccordeSourceDocType;
  kind: AccordeKind;
  ordinal: number;
}

/**
 * Task #24 — inverse of {@link mapToAccorde}. Parses a Firestore `type` label
 * back into its (sourceDocType, kind, ordinal) tuple. Returns `null` for any
 * label that doesn't match one of the known accord variants so callers can
 * simply filter non-accord docs out.
 *
 * Patterns handled:
 *   - 'Devis accordé' / 'Facture accordé' → accord, ordinal 1
 *   - 'Devis 2ème accord' / 'Facture 3ème accord' → accord, ordinal 2/3
 *   - "1ère proposition d'accord (devis)" → proposition-accord, ordinal 1
 *   - "2ème proposition d'accord (facture)" → proposition-accord, ordinal 2
 */
export function parseAccordDocType(label: string): ParsedAccordDocType | null {
  if (!label || typeof label !== 'string') return null;
  const trimmed = label.trim();
  // Ordinal 1 accord — legacy labels.
  if (trimmed === 'Devis accordé') return { sourceDocType: 'Devis Garage', kind: 'accord', ordinal: 1 };
  if (trimmed === 'Facture accordé') return { sourceDocType: 'Facture Garage', kind: 'accord', ordinal: 1 };
  // Cardinal accord (ordinal ≥ 2): "<Base> <n>ème accord".
  const accordMatch = /^(Devis|Facture)\s+(\d+)ème\s+accord$/.exec(trimmed);
  if (accordMatch) {
    const base = accordMatch[1] as 'Devis' | 'Facture';
    const ordinal = parseInt(accordMatch[2], 10);
    if (Number.isFinite(ordinal) && ordinal >= 1) {
      return {
        sourceDocType: base === 'Facture' ? 'Facture Garage' : 'Devis Garage',
        kind: 'accord',
        ordinal,
      };
    }
  }
  // Proposition d'accord: "<n>ère|ème proposition d'accord (devis|facture)".
  const propMatch = /^(\d+)(?:ère|ème)\s+proposition\s+d'accord\s+\((devis|facture)\)$/.exec(trimmed);
  if (propMatch) {
    const ordinal = parseInt(propMatch[1], 10);
    const baseLower = propMatch[2];
    if (Number.isFinite(ordinal) && ordinal >= 1) {
      return {
        sourceDocType: baseLower === 'facture' ? 'Facture Garage' : 'Devis Garage',
        kind: 'proposition-accord',
        ordinal,
      };
    }
  }
  return null;
}
