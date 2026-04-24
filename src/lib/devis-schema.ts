import type { Timestamp } from 'firebase/firestore';

/** Document types that can be edited via the structured web editor (devis-editor). */
export const EDITABLE_DOC_TYPES = ['Devis Garage', 'Facture Garage'] as const;
export type EditableDocType = typeof EDITABLE_DOC_TYPES[number];

export function isEditableDocType(t?: string): t is EditableDocType {
  return !!t && (EDITABLE_DOC_TYPES as readonly string[]).includes(t);
}

/** Allowed values for the `ref` column of a devis row. */
export const REF_OPTIONS = ['Remplacement', 'Réparation'] as const;
export type RefOption = typeof REF_OPTIONS[number];

/** Allowed values for the `type` column of a devis row. */
export const TYPE_OPTIONS = ['Occasion', 'Originale', 'Adaptable'] as const;
export type TypeOption = typeof TYPE_OPTIONS[number];

export interface DevisHeader {
  marque: string;
  matricule: string;
  modele: string;
  kilometrage: string;
  chassis: string;
  expert: string;
  client: string;
  adresse: string;
  ice: string;
  telephone: string;
  assurances: string;
  devisNumero: string;
  dateDevis: string;
}

export interface DevisRow {
  id: string;
  ref: string;
  designation: string;
  /** Vetuste percentage (0-100). Devis-only; ignored for Facture rows. null = blank (main d'oeuvre / labor rows). */
  vetuste?: number | null;
  type: string;
  /** null = blank (main d'oeuvre has no TVA when source cell is empty). */
  tva: number | null;
  /** null = blank (main d'oeuvre rows have no quantity). */
  qte: number | null;
  puHT: number;
}

export interface DevisExtraColumn {
  /** Stable id used as React key and as the in-memory handle. */
  id: string;
  label: string;
  values: Record<string, string>;
  /**
   * 'counter' = imported counter-proposal from an opposing chiffreur; rendered red.
   * 'accord' = finalized accord column.
   * 'proposition-accord' = proposition for an accord column.
   * 'default' / undefined = manually-added column.
   */
  kind?: 'counter' | 'default' | 'accord' | 'proposition-accord';
  /** When true, the column is locked against further edits. Defaults to false. */
  locked?: boolean;
  /** For counter columns: public URL of the annotated source PDF for audit. */
  sourcePdfUrl?: string;
  /** For counter columns: Storage path of the source file — used for dedup across re-extractions. */
  sourceStoragePath?: string;
  /** For counter columns: ISO string of when the import happened. */
  importedAt?: string;
  /** For counter columns: uid of the user who imported. */
  importedByUid?: string;
}

export interface DevisSnapshot {
  header: DevisHeader;
  rows: DevisRow[];
  /** Multiple extra columns appended after the standard 7. New columns are unlocked one per save. */
  extraColumns?: DevisExtraColumn[];
  /**
   * Legacy field preserved for backward compatibility with snapshots written
   * before multi-column support. Newer code reads `extraColumns`; this field
   * is migrated to `extraColumns: [extraColumn]` on load.
   * @deprecated use extraColumns
   */
  extraColumn?: { label: string; values: Record<string, string> };
}

export interface DevisVersion {
  id: string;
  createdAt: Timestamp | { seconds: number; nanoseconds: number } | Date;
  createdByUid: string;
  createdByNom: string;
  storagePath: string;
  pdfUrl: string;
  snapshot: DevisSnapshot;
}

export interface StructuredDevis extends DevisSnapshot {
  versions: DevisVersion[];
  updatedAt?: Timestamp | { seconds: number; nanoseconds: number } | Date;
  updatedBy?: string;
}

export function emptyHeader(): DevisHeader {
  return {
    marque: '',
    matricule: '',
    modele: '',
    kilometrage: '',
    chassis: '',
    expert: '',
    client: '',
    adresse: '',
    ice: '',
    telephone: '',
    assurances: '',
    devisNumero: '',
    dateDevis: '',
  };
}

function newId(): string {
  return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

/** Normalize a snapshot loaded from Firestore: migrate legacy `extraColumn` → `extraColumns`. */
export function normalizeExtraColumns(s: { extraColumns?: DevisExtraColumn[]; extraColumn?: { label: string; values: Record<string, string> } } | undefined | null): DevisExtraColumn[] {
  if (!s) return [];
  if (Array.isArray(s.extraColumns) && s.extraColumns.length > 0) {
    return s.extraColumns.map((c) => {
      const kind: DevisExtraColumn['kind'] =
        c.kind === 'counter' || c.kind === 'accord' || c.kind === 'proposition-accord'
          ? c.kind
          : 'default';
      const normalized: DevisExtraColumn = {
        id: c.id || newId(),
        label: c.label || '',
        values: c.values || {},
        kind,
        locked: c.locked === true,
      };
      if (c.sourcePdfUrl) normalized.sourcePdfUrl = c.sourcePdfUrl;
      if (c.sourceStoragePath) normalized.sourceStoragePath = c.sourceStoragePath;
      if (c.importedAt) normalized.importedAt = c.importedAt;
      if (c.importedByUid) normalized.importedByUid = c.importedByUid;
      return normalized;
    });
  }
  if (s.extraColumn && s.extraColumn.label) {
    return [{ id: newId(), label: s.extraColumn.label, values: s.extraColumn.values || {}, kind: 'default', locked: false }];
  }
  return [];
}

export function emptyRow(): DevisRow {
  return {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2),
    ref: 'CHANGE',
    designation: '',
    type: '',
    tva: 0,
    qte: 1,
    puHT: 0,
  };
}

export function rowTotalHT(r: { qte: number | null; puHT: number; vetuste?: number | null }): number {
  // Blank qte (null) means the line explicitly doesn't count (source qty was 0).
  // Legitimate blank-but-neutral rows (main d'oeuvre / labor rows) are stored
  // with qte=1 by the extractor, so they multiply cleanly.
  const q = typeof r.qte === 'number' && Number.isFinite(r.qte) ? r.qte : 0;
  const p = Number.isFinite(r.puHT) ? r.puHT : 0;
  const vRaw = typeof r.vetuste === 'number' && Number.isFinite(r.vetuste) ? r.vetuste : 0;
  // Clamp vétusté to [0, 100] so an out-of-range value never flips the sign.
  const v = Math.min(100, Math.max(0, vRaw));
  return q * p * (1 - v / 100);
}

export function sumHT(rows: DevisRow[]): number {
  return rows.reduce((acc, r) => acc + rowTotalHT(r), 0);
}

export function sumTVA(rows: DevisRow[]): number {
  return rows.reduce((acc, r) => {
    const tvaPct = typeof r.tva === 'number' && Number.isFinite(r.tva) ? r.tva : 0;
    return acc + (rowTotalHT(r) * tvaPct) / 100;
  }, 0);
}

export function sumTTC(rows: DevisRow[]): number {
  return sumHT(rows) + sumTVA(rows);
}

/** French number formatter: 1234.5 → "1 234,50" */
export function formatFr(n: number, fractionDigits = 2): string {
  if (!Number.isFinite(n)) n = 0;
  const fixed = n.toFixed(fractionDigits);
  const [intPart, decPart] = fixed.split('.');
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decPart ? `${withSpaces},${decPart}` : withSpaces;
}

/** 1 → "1er", 2 → "2ème", 3 → "3ème", ... French ordinals (masculine). */
export function toOrdinalFr(n: number): string {
  if (n === 1) return '1er';
  return `${n}ème`;
}

/** 1 → "1ère", 2 → "2ème", 3 → "3ème", ... French ordinals (feminine). */
export function toOrdinalFeminineFr(n: number): string {
  if (n === 1) return '1ère';
  return `${n}ème`;
}

/**
 * Parse a value that MAY be blank. Returns null for null/undefined/empty string
 * or anything that doesn't produce a finite number. Used by AI-extraction paths
 * so main d'oeuvre rows (blank qte/tva in the source PDF) stay blank in the
 * editor instead of being coerced to 0.
 */
export function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Quantity extractor for AI-scanned devis rows. Rule:
 *   - Source is blank / missing / unreadable → return 1 (neutral multiplier; the
 *     line's Total H.T equals its puHT). This covers main d'oeuvre / labor rows
 *     where the source PDF leaves the "Qté" column empty.
 *   - Source is an explicit 0 → return null (the line explicitly does not
 *     count; null is shown as blank in the UI and contributes 0 to totals).
 *   - Otherwise → return the parsed number.
 */
export function qteFromScan(v: unknown): number | null {
  const n = numOrNull(v);
  if (n === null) return 1;
  if (n === 0) return null;
  return n;
}

/** Parse "1 234,50" or "1234.50" or "1,234.50" → number */
export function parseFr(s: string): number {
  if (typeof s !== 'string') return Number(s) || 0;
  const cleaned = s.replace(/\s/g, '').replace(/\u00a0/g, '');
  // If both "," and "." present, assume "." is thousands and "," is decimal
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalized = cleaned;
  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.');
  }
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}
