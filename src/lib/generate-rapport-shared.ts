import { format } from 'date-fns';
import { getDocs, collection, Firestore } from 'firebase/firestore';

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
};

// ── Constants ──────────────────────────────────────────────────────────
export const COMPANY_NAME = 'SL AUTO EXPERTISE';
export const COMPANY_ADDRESS =
  '219 BD MOHAMED ZERKTOUNI, Etage 6, Bureau 67, MAARIF - CASABLANCA 20060';
export const COMPANY_TEL = '05 22 64 60 01';
export const COMPANY_EMAIL = 'slautoexpertise@gmail.com';

export const NAVY = [17, 24, 57] as const;
export const BORDER = [180, 180, 180] as const;
export const HEADER_BG = [230, 235, 245] as const;

// ── Helpers ────────────────────────────────────────────────────────────
export const fC = (val: number) =>
  (val || 0).toLocaleString('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
export type RapportType = 'preliminaire' | 'reforme';
