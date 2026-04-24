import { toOrdinalFr, toOrdinalFeminineFr } from './devis-schema';

export const ACCORDE_MAP: Record<string, string> = {
  'Facture Garage': 'Facture accordé',
  'Devis Garage': 'Devis accordé',
};

/** The two canonical source families. */
export type AccordeSourceDocType = 'Devis Garage' | 'Facture Garage';
export type AccordeKind = 'accord' | 'proposition-accord';

/**
 * A parent garage label. This is the slot label the accord variants are
 * attached to:
 *   - base: `Devis Garage` or `Facture Garage`
 *   - extra (gestionnaire-created): `Devis Garage 2`, `Facture Garage 3`, …
 */
export type AccordeParent = string;

/** Parse a parent label into its base family + ordinal (1 = base). */
export function parseAccordeParent(
  parent: string,
): { sourceDocType: AccordeSourceDocType; ordinal: number } | null {
  if (!parent || typeof parent !== 'string') return null;
  const trimmed = parent.trim();
  if (trimmed === 'Devis Garage') return { sourceDocType: 'Devis Garage', ordinal: 1 };
  if (trimmed === 'Facture Garage') return { sourceDocType: 'Facture Garage', ordinal: 1 };
  const m = /^(Devis Garage|Facture Garage)\s+(\d+)$/.exec(trimmed);
  if (m) {
    const ord = parseInt(m[2], 10);
    if (Number.isFinite(ord) && ord >= 2) {
      return {
        sourceDocType: m[1] as AccordeSourceDocType,
        ordinal: ord,
      };
    }
  }
  return null;
}

/**
 * Legacy single-arg form: returns the primary "accordé" label for the given
 * source docType. Kept for backward compat with existing callers that pass a
 * raw docType string.
 */
export function mapToAccorde(docType: string): string;
/**
 * Extended form: build the label for a given parent label, kind
 * (`accord` or `proposition-accord`) and ordinal (1–3).
 *
 * Parent may be:
 *   - `'Devis Garage'` / `'Facture Garage'` (base) → legacy labels preserved.
 *   - `'Devis Garage N'` / `'Facture Garage N'` (N ≥ 2) → prefixed labels.
 *
 * For `accord`:
 *   - base + ordinal 1 → `Devis accordé` / `Facture accordé`
 *   - base + ordinal 2+ → `Devis 2ème accord` / `Facture 3ème accord`
 *   - extra + ordinal 1 → `Devis Garage 2 accordé`
 *   - extra + ordinal 2+ → `Devis Garage 2 2ème accord`
 * For `proposition-accord`:
 *   - base → `1ère proposition d'accord (devis)` (feminine ordinal, parenthesised family)
 *   - extra → `Devis Garage 2 1ère proposition d'accord`
 *
 * Ordinal is clamped to [1, 3] defensively.
 */
export function mapToAccorde(
  parent: AccordeParent,
  kind: AccordeKind,
  ordinal: number,
): string;
export function mapToAccorde(
  parent: string,
  kind?: AccordeKind,
  ordinal?: number,
): string {
  // Legacy single-arg form: delegate to the primary accord mapping.
  if (kind === undefined || ordinal === undefined) {
    return ACCORDE_MAP[parent] ?? parent;
  }

  const clamped = Math.max(1, Math.min(3, ordinal));
  const parsedParent = parseAccordeParent(parent);
  if (!parsedParent) {
    // Unknown parent: fall back to treating it as a base docType string if it
    // is one we recognise, otherwise return the parent itself.
    return ACCORDE_MAP[parent] ?? parent;
  }

  const base: 'Devis' | 'Facture' =
    parsedParent.sourceDocType === 'Facture Garage' ? 'Facture' : 'Devis';
  const baseLower = base.toLowerCase();
  const isExtra = parsedParent.ordinal >= 2;

  if (kind === 'accord') {
    if (isExtra) {
      // Extra parent → prefixed label.
      if (clamped === 1) return `${parent} accordé`;
      return `${parent} ${toOrdinalFr(clamped)} accord`;
    }
    // Base parent → legacy labels.
    if (clamped === 1) {
      return base === 'Devis' ? 'Devis accordé' : 'Facture accordé';
    }
    return `${base} ${toOrdinalFr(clamped)} accord`;
  }

  // proposition-accord
  if (isExtra) {
    return `${parent} ${toOrdinalFeminineFr(clamped)} proposition d'accord`;
  }
  // Base: feminine ordinal + suffix with lowercased base family.
  return `${toOrdinalFeminineFr(clamped)} proposition d'accord (${baseLower})`;
}

/**
 * Convenience alias: primary (ordinal 1) "accordé" label for a base source
 * docType. Equivalent to `mapToAccorde(sourceDocType, 'accord', 1)`.
 */
export function mapToAccordePrimary(
  sourceDocType: AccordeSourceDocType,
): string {
  return mapToAccorde(sourceDocType, 'accord', 1);
}

export interface ParsedAccordDocType {
  /** The canonical base family (always `'Devis Garage'` or `'Facture Garage'`). */
  sourceDocType: AccordeSourceDocType;
  /**
   * The parent label this accord variant is attached to. For base families
   * this equals `sourceDocType`; for extras it is e.g. `'Devis Garage 2'`.
   */
  parent: AccordeParent;
  /** Parent's ordinal within its family (1 for base, 2+ for extras). */
  parentOrdinal: number;
  kind: AccordeKind;
  /** Accord / proposition ordinal within this parent (1–3). */
  ordinal: number;
}

/**
 * Inverse of {@link mapToAccorde}. Parses a Firestore `type` label back into
 * its (parent, kind, ordinal) tuple. Returns `null` for any label that doesn't
 * match one of the known accord variants so callers can filter non-accord
 * docs out.
 *
 * Patterns handled:
 *   - Base legacy:
 *     - 'Devis accordé' / 'Facture accordé' → parent = base, kind = accord, ordinal 1
 *     - 'Devis 2ème accord' / 'Facture 3ème accord' → parent = base, kind = accord, ordinal 2/3
 *     - "1ère proposition d'accord (devis)" → parent = base, kind = proposition-accord, ordinal 1
 *     - "2ème proposition d'accord (facture)" → parent = base, kind = proposition-accord, ordinal 2
 *   - Extra (prefixed with parent label):
 *     - 'Devis Garage 2 accordé' → parent = 'Devis Garage 2', kind = accord, ordinal 1
 *     - 'Devis Garage 2 3ème accord' → parent = 'Devis Garage 2', kind = accord, ordinal 3
 *     - "Facture Garage 3 1ère proposition d'accord" → parent = 'Facture Garage 3', kind = proposition-accord, ordinal 1
 */
export function parseAccordDocType(label: string): ParsedAccordDocType | null {
  if (!label || typeof label !== 'string') return null;
  const trimmed = label.trim();

  // --- Extra-parent patterns (prefixed) — try first because they are more
  //     specific than the base patterns they shadow. ---

  // 'Devis Garage N accordé' / 'Facture Garage N accordé'
  const extraOrd1 = /^(Devis Garage|Facture Garage)\s+(\d+)\s+accordé$/.exec(trimmed);
  if (extraOrd1) {
    const src = extraOrd1[1] as AccordeSourceDocType;
    const pOrd = parseInt(extraOrd1[2], 10);
    if (Number.isFinite(pOrd) && pOrd >= 2) {
      return {
        sourceDocType: src,
        parent: `${src} ${pOrd}`,
        parentOrdinal: pOrd,
        kind: 'accord',
        ordinal: 1,
      };
    }
  }

  // 'Devis Garage N Mème accord' / 'Facture Garage N Mème accord'
  const extraOrdN = /^(Devis Garage|Facture Garage)\s+(\d+)\s+(\d+)ème\s+accord$/.exec(trimmed);
  if (extraOrdN) {
    const src = extraOrdN[1] as AccordeSourceDocType;
    const pOrd = parseInt(extraOrdN[2], 10);
    const ord = parseInt(extraOrdN[3], 10);
    if (Number.isFinite(pOrd) && pOrd >= 2 && Number.isFinite(ord) && ord >= 2) {
      return {
        sourceDocType: src,
        parent: `${src} ${pOrd}`,
        parentOrdinal: pOrd,
        kind: 'accord',
        ordinal: ord,
      };
    }
  }

  // "Devis Garage N Mère|ème proposition d'accord"
  const extraProp = /^(Devis Garage|Facture Garage)\s+(\d+)\s+(\d+)(?:ère|ème)\s+proposition\s+d'accord$/.exec(
    trimmed,
  );
  if (extraProp) {
    const src = extraProp[1] as AccordeSourceDocType;
    const pOrd = parseInt(extraProp[2], 10);
    const ord = parseInt(extraProp[3], 10);
    if (Number.isFinite(pOrd) && pOrd >= 2 && Number.isFinite(ord) && ord >= 1) {
      return {
        sourceDocType: src,
        parent: `${src} ${pOrd}`,
        parentOrdinal: pOrd,
        kind: 'proposition-accord',
        ordinal: ord,
      };
    }
  }

  // --- Base (legacy) patterns ---

  // Ordinal 1 accord — legacy labels.
  if (trimmed === 'Devis accordé')
    return {
      sourceDocType: 'Devis Garage',
      parent: 'Devis Garage',
      parentOrdinal: 1,
      kind: 'accord',
      ordinal: 1,
    };
  if (trimmed === 'Facture accordé')
    return {
      sourceDocType: 'Facture Garage',
      parent: 'Facture Garage',
      parentOrdinal: 1,
      kind: 'accord',
      ordinal: 1,
    };

  // Cardinal accord (ordinal ≥ 2): "<Base> <n>ème accord".
  const accordMatch = /^(Devis|Facture)\s+(\d+)ème\s+accord$/.exec(trimmed);
  if (accordMatch) {
    const base = accordMatch[1] as 'Devis' | 'Facture';
    const ordinal = parseInt(accordMatch[2], 10);
    if (Number.isFinite(ordinal) && ordinal >= 1) {
      const src: AccordeSourceDocType =
        base === 'Facture' ? 'Facture Garage' : 'Devis Garage';
      return {
        sourceDocType: src,
        parent: src,
        parentOrdinal: 1,
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
      const src: AccordeSourceDocType =
        baseLower === 'facture' ? 'Facture Garage' : 'Devis Garage';
      return {
        sourceDocType: src,
        parent: src,
        parentOrdinal: 1,
        kind: 'proposition-accord',
        ordinal,
      };
    }
  }

  return null;
}

/**
 * Detect whether a label represents a "garage" slot (base or extra). Useful
 * for building family groupings without having to accept-or-reject accord
 * variants separately.
 *
 * Examples → result:
 *   'Devis Garage' → { sourceDocType: 'Devis Garage', ordinal: 1 }
 *   'Facture Garage 3' → { sourceDocType: 'Facture Garage', ordinal: 3 }
 *   'Devis accordé' → null (accord, not garage)
 *   'Rapport final' → null
 */
export function parseGarageSlot(
  label: string,
): { sourceDocType: AccordeSourceDocType; ordinal: number } | null {
  return parseAccordeParent(label);
}
