import { format } from 'date-fns';
import { getDocs, collection, Firestore } from 'firebase/firestore';
import type { DevisRow } from './devis-schema';

export type Piece = {
  id: string;
  designation: string;
  operation: string;
  typePiece: string;
  vetuste: number;
  quantite: number;
  puHT: number;
  remise: number;
  typeChoc: string;
  tva: boolean;
  createdAt: unknown;
  /**
   * Accord round marker — propagated from the counter-devis upload metadata
   * (`send-to-chiffrage.ts` / `modal-chiffrage.tsx`). Used by `selectLatestAccord`
   * to scope the rapport PDF to the last accord only (task #10).
   */
  counterRoundOrder?: number | null;
};

// ── Constants ──────────────────────────────────────────────────────────
export const COMPANY_NAME = 'SL AUTO EXPERTISE';
export const COMPANY_ADDRESS =
  '219 BD MOHAMED ZERKTOUNI, Etage 6, Bureau 67, MAARIF - CASABLANCA 20060';
export const COMPANY_TEL = '05 22 64 60 01';
export const COMPANY_EMAIL = 'slautoexpertise@gmail.com';

// Template-accurate footer/identity strings (match the supplied PDF templates
// to the letter — the Bd Al Massire address is the one printed on the reports).
export const COMPANY_ADDRESS_FOOTER =
  '182,Bd Al Massire,Résidence Farah IV,5éme Etage,Bureau N°10,Maarif Casablanca-Maroc';
export const COMPANY_CONTACT_FOOTER =
  'Tel : 05 22 47 46 76  / 05 22 47 20 10  Fax : 05 22 25 76 97  Email : slautoexpertise@gmail.com';
/** SL Auto's signing expert, as printed in the report headers/footers. */
export const EXPERT_NAME = 'AISSAOUI SLAOUI OUADIE';
export const CABINET_NAME = 'SL AUTO EXPERTISE';
export const COMPANY_CITY = 'CASABLANCA';

export const NAVY = [17, 24, 57] as const;
export const BORDER = [180, 180, 180] as const;
export const HEADER_BG = [230, 235, 245] as const;

// ── Helpers ────────────────────────────────────────────────────────────
export const fC = (val: number) =>
  (val || 0).toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Minimal jsPDF surface used by the shared drawing helpers. */
type PdfLike = {
  addImage: (
    data: string,
    fmt: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => void;
  setDrawColor: (r: number, g: number, b: number) => void;
  setLineWidth: (w: number) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
};

/** addImage that never throws (corrupt/missing payloads are skipped). */
export function addImageSafe(
  pdf: PdfLike,
  img: LoadedImage | null | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (!img) return;
  try {
    pdf.addImage(img.data, img.format, x, y, w, h);
  } catch {
    /* skip unrenderable image */
  }
}

/** Small ☐ / ☑ checkbox used by the réforme block. */
export function drawCheckbox(
  pdf: PdfLike,
  x: number,
  y: number,
  checked: boolean,
  size = 3.2,
): void {
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.3);
  pdf.rect(x, y, size, size);
  if (checked) {
    pdf.setLineWidth(0.6);
    pdf.line(x + 0.5, y + size / 2, x + size / 2, y + size - 0.5);
    pdf.line(x + size / 2, y + size - 0.5, x + size - 0.3, y + 0.4);
    pdf.setLineWidth(0.3);
  }
}

export const tsToStr = (ts: unknown): string => {
  if (!ts) return '';
  try {
    const anyTs = ts as { toDate?: () => Date };
    const d = anyTs.toDate ? anyTs.toDate() : new Date(ts as string | number | Date);
    return format(d, 'dd/MM/yyyy');
  } catch {
    return String(ts);
  }
};

/** A base64 image payload ready for jsPDF.addImage. */
export type LoadedImage = { data: string; format: string };

export async function fetchImageAsBase64(
  url: string
): Promise<{ data: string; format: string } | null> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const fmt = blob.type.includes('png') ? 'PNG' : 'JPEG';
    return { data: dataUrl, format: fmt };
  } catch {
    return null;
  }
}

export async function loadLocalImage(
  path: string
): Promise<{ data: string; format: string } | null> {
  try {
    const resp = await fetch(path);
    const blob = await resp.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const fmt = blob.type.includes('png') ? 'PNG' : 'JPEG';
    return { data: dataUrl, format: fmt };
  } catch {
    return null;
  }
}

export async function fetchCompagnieLogo(
  db: Firestore,
  compagnieName: string
): Promise<{ data: string; format: string } | null> {
  if (!compagnieName) return null;
  try {
    const snap = await getDocs(collection(db, 'compagnies'));
    for (const d of snap.docs) {
      const data = d.data() as { nom?: string; logoUrl?: string };
      if (
        data.nom &&
        data.nom.toLowerCase().trim() === compagnieName.toLowerCase().trim() &&
        data.logoUrl
      ) {
        return fetchImageAsBase64(data.logoUrl);
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Type of rapport the user selects in the picker dialog. */
export type RapportType = 'final' | 'reforme' | 'estimatif' | 'preliminaire';

/**
 * Accord-marker fields that may ride along on a piece doc (mirrored from the
 * file metadata in `send-to-chiffrage`). Pieces without a marker are treated
 * as belonging to the original accord (round 0).
 */
export interface AccordMarked {
  counterRoundOrder?: number | null;
}

/**
 * Task #10 — when exporting a rapport PDF we only want the last accord round
 * (the latest agreed set of pieces/values). Earlier rounds should be filtered
 * out so aggregated totals don't double-count superseded versions.
 *
 * Accord model (piece-level versioning):
 *   - Each piece may carry `counterRoundOrder`, a monotonic integer propagated
 *     from the counter-devis upload metadata (see `send-to-chiffrage.ts` /
 *     `modal-chiffrage.tsx`). Originals have it unset (treated as 0).
 *   - The "last accord" is the max value observed across the input set.
 *   - Pieces matching that max are kept; earlier rounds are dropped.
 *
 * Safe when no round markers exist (common today): returns the input unchanged.
 */
export function selectLatestAccord<T extends AccordMarked>(items: T[]): T[] {
  if (!Array.isArray(items) || items.length === 0) return items;
  const rounds = new Set<number>();
  let max = 0;
  for (const it of items) {
    const r = Number(it?.counterRoundOrder) || 0;
    rounds.add(r);
    if (r > max) max = r;
  }
  if (rounds.size <= 1) return items;
  if (process.env.NODE_ENV !== 'production') {
    // One-line dev-mode warning so future debugging is easier.
    console.warn(
      `[rapport-pdf] selectLatestAccord: ${rounds.size} accord rounds detected (${Array.from(rounds).sort((a, b) => a - b).join(', ')}); keeping round ${max} only.`
    );
  }
  return items.filter((it) => (Number(it?.counterRoundOrder) || 0) === max);
}

/** Piece-shaped record produced from a DevisRow. Matches the Piece type
 * in the generators closely enough to flow through `selectLatestAccord`
 * and the downstream rapport tables. */
type PieceLite = {
  id: string;
  designation: string;
  operation: string;
  typePiece: string;
  vetuste: number;
  quantite: number;
  puHT: number;
  remise: number;
  typeChoc: string;
  tva: boolean;
  createdAt: null;
  counterRoundOrder: number;
};

/**
 * Convert a DevisRow (from structuredEditables accordé) into a Piece-shaped record
 * so it flows through selectLatestAccord / rapport tables alongside subcollection pieces.
 * Uses counterRoundOrder: 99 so accordé rows win over any legacy subcollection pieces.
 */
export function devisRowToPiece(row: DevisRow, typeChocFallback = ''): PieceLite {
  return {
    id: row.id,
    designation: row.designation || '',
    operation: '',
    typePiece: row.type || '',
    vetuste: Number(row.vetuste) || 0,
    quantite: Number(row.qte) || 0,
    puHT: Number(row.puHT) || 0,
    remise: 0,
    typeChoc: typeChocFallback,
    tva: (Number(row.tva) || 0) > 0,
    createdAt: null,
    counterRoundOrder: 99,
  };
}
