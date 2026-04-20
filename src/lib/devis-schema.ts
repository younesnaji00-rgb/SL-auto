import type { Timestamp } from 'firebase/firestore';

/** Document types that can be edited via the structured web editor (devis-editor). */
export const EDITABLE_DOC_TYPES = ['Devis', 'Facture'] as const;
export type EditableDocType = typeof EDITABLE_DOC_TYPES[number];

export function isEditableDocType(t?: string): t is EditableDocType {
  return !!t && (EDITABLE_DOC_TYPES as readonly string[]).includes(t);
}

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
  /** Vetuste percentage (0-100). Devis-only; ignored for Facture rows. */
  vetuste?: number;
  type: string;
  tva: number;
  qte: number;
  puHT: number;
}

export interface DevisExtraColumn {
  /** Stable id used as React key and as the in-memory handle. */
  id: string;
  label: string;
  values: Record<string, string>;
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
    return s.extraColumns.map((c) => ({ id: c.id || newId(), label: c.label || '', values: c.values || {} }));
  }
  if (s.extraColumn && s.extraColumn.label) {
    return [{ id: newId(), label: s.extraColumn.label, values: s.extraColumn.values || {} }];
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

export function rowTotalHT(r: { qte: number; puHT: number }): number {
  const q = Number.isFinite(r.qte) ? r.qte : 0;
  const p = Number.isFinite(r.puHT) ? r.puHT : 0;
  return q * p;
}

export function sumHT(rows: DevisRow[]): number {
  return rows.reduce((acc, r) => acc + rowTotalHT(r), 0);
}

export function sumTVA(rows: DevisRow[]): number {
  return rows.reduce((acc, r) => {
    const tvaPct = Number.isFinite(r.tva) ? r.tva : 0;
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
