/**
 * Shared document shape + tiny formatting helpers for the document lists
 * (dossier step 1 browser, accord board, chiffrage family rows).
 *
 * `TypedDoc` mirrors a `dossiers/{id}/documents/{docId}` entry. The Firestore
 * `type` string is the slot / grouping key everywhere.
 */

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toOrdinalFr, toOrdinalFeminineFr } from '@/lib/devis-schema';
import type { ParsedAccordDocType } from '@/lib/docType-accorde';

export type ExtraSlotKind = 'devis' | 'facture';

export type TypedDoc = {
  id: string;
  nom?: string;
  fileName?: string;
  url?: string | null;
  type?: string;
  typeDocument?: string;
  uploadePar?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  storagePath?: string;
  pendingUpload?: boolean;
  taille?: number;
  fileSize?: number;
  dateUpload?: unknown;
  uploadedAt?: unknown;
  /** Client-side creation instant (ms) — set by the offline-capable upload path. */
  _localCreatedAt?: number;
  // Marks a document as belonging to a gestionnaire-created extra slot
  // (rendered after "Devis Garage" / "Facture Garage"). The slot grouping
  // key is still the `type` string; this field is used only to detect
  // which slots are user-managed (rename affordance).
  extraSlot?: ExtraSlotKind;
};

export const isImage = (name: string) =>
  /\.(jpe?g|png|gif|webp|bmp)$/i.test(name || '');

export const isPdf = (name: string) => /\.pdf$/i.test(name || '');

export const docDisplayName = (d: Pick<TypedDoc, 'nom' | 'fileName'>) =>
  d.nom || d.fileName || 'document';

export const docTypeLabel = (d: Pick<TypedDoc, 'type' | 'typeDocument'>) =>
  (d.type || d.typeDocument || '').toString().trim();

/** `137 Ko`, `2,4 Mo` — French units. */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  const units = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  const rounded = i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded.toString().replace('.', ',')} ${units[i]}`;
}

/** `dd/MM/yyyy` from a Firestore Timestamp, Date, ISO string or epoch. */
export function formatDocDate(ts: unknown): string {
  if (!ts) return '';
  const anyTs = ts as { toDate?: () => Date };
  const date = typeof anyTs?.toDate === 'function' ? anyTs.toDate() : new Date(ts as string | number | Date);
  if (Number.isNaN(date.getTime())) return '';
  return format(date, 'dd/MM/yyyy', { locale: fr });
}

/** Short uploader name: display name, else the e-mail local part. */
export function docUploaderLabel(d: Pick<TypedDoc, 'uploadedByName' | 'uploadePar'>): string {
  const name = (d.uploadedByName || '').trim();
  if (name) return name;
  const email = (d.uploadePar || '').trim();
  if (!email) return '';
  return email.includes('@') ? email.split('@')[0] : email;
}

/** Upload instant in ms — Firestore Timestamp / Date / ISO / epoch, else the local creation stamp. */
export function docTimestampMs(d: TypedDoc): number {
  const raw = d.dateUpload ?? d.uploadedAt;
  const anyTs = raw as { toDate?: () => Date; seconds?: number } | null | undefined;
  if (anyTs && typeof anyTs.toDate === 'function') return anyTs.toDate().getTime();
  if (anyTs && typeof anyTs.seconds === 'number') return anyTs.seconds * 1000;
  if (raw) {
    const t = new Date(raw as string | number | Date).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return typeof d._localCreatedAt === 'number' ? d._localCreatedAt : 0;
}

/**
 * The files of one slot are the PAGES of one document (carte grise recto then
 * verso…): upload order, oldest first — the order the user shot them.
 */
export function sortPagesAsc<T extends TypedDoc>(docs: ReadonlyArray<T>): T[] {
  return [...docs].sort(
    (a, b) => docTimestampMs(a) - docTimestampMs(b) || docDisplayName(a).localeCompare(docDisplayName(b)),
  );
}

/** `137 Ko · 10/06/2026 · younes` — empty parts are dropped. */
export function docMetaLine(d: TypedDoc): string {
  return [
    formatFileSize(d.taille ?? d.fileSize),
    formatDocDate(docTimestampMs(d) || null),
    docUploaderLabel(d),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** `2 pages · 137 Ko · 10/06/2026 · younes` — total size, latest upload. */
export function docPagesMetaLine(pages: ReadonlyArray<TypedDoc>): string {
  if (pages.length === 0) return '';
  const total = pages.reduce((acc, p) => acc + (p.taille ?? p.fileSize ?? 0), 0);
  const latest = pages.reduce((best, p) => (docTimestampMs(p) >= docTimestampMs(best) ? p : best), pages[0]);
  return [
    pages.length > 1 ? `${pages.length} pages` : '',
    formatFileSize(total),
    formatDocDate(docTimestampMs(latest) || null),
    docUploaderLabel(latest),
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Lightbox page descriptor for a doc (`{ url, nom }`). */
export const toLightboxDoc = (d: Pick<TypedDoc, 'url' | 'nom' | 'fileName'>) => ({
  url: d.url || '',
  nom: docDisplayName(d),
});

/**
 * "1er accord" / "2ème proposition d'accord" — compact display label for an
 * accord/proposition slot when the parent garage context is already implicit
 * (family group header, hint carries the raw Firestore type).
 */
export function accordRowLabel(parsed: ParsedAccordDocType): string {
  if (parsed.kind === 'accord') return `${toOrdinalFr(parsed.ordinal)} accord`;
  return `${toOrdinalFeminineFr(parsed.ordinal)} proposition d'accord`;
}

/**
 * Download a remote file under its original name (fetch → blob → anchor).
 * Falls back to opening the URL in a new tab when the fetch is blocked (CORS).
 */
export async function downloadFileFromUrl(url: string, fileName: string): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (e) {
    console.warn('[documents] direct download failed, opening in a new tab', e);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
