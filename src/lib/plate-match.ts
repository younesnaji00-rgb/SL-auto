import { transliterateArabic } from './transliterate-arabic';

/**
 * Plate matching for the AT self-service flows.
 *
 * Plates are stored without any canonical format ("12345-A-6", "12345 | A | 6",
 * "12345|أ|6", old numeric…) because the scanners copy documents char-by-char.
 * Matching therefore normalizes both sides: Arabic → Latin, uppercase, strip
 * everything non-alphanumeric. "12345 | أ | 6" and "12345-a-6" both become
 * "12345A6".
 */
export function normalizePlate(raw: string | null | undefined): string {
  if (!raw) return '';
  const latin = transliterateArabic(String(raw)) || '';
  return latin.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** All plate fields carried by a dossier, normalized, empty ones dropped. */
export function dossierPlates(d: any): string[] {
  return [
    d?.matricule,
    d?.vehicule?.immatriculation,
    d?.vehicule?.immatriculationAnterieur,
    d?.vehicule?.registrationW,
  ]
    .map(normalizePlate)
    .filter((p) => p.length > 0);
}

export interface PlateMatchResult {
  /** Dossiers where a plate field equals the scanned plate exactly (normalized). */
  exact: any[];
  /**
   * Fallback candidates when no exact match: dossiers whose plate digits
   * contain / are contained in the scanned digits (≥4 digits both sides).
   * Catches stored-format oddities and partial OCR reads.
   */
  fuzzy: any[];
}

export function matchDossiersByPlate(dossiers: any[], plate: string): PlateMatchResult {
  const target = normalizePlate(plate);
  if (!target) return { exact: [], fuzzy: [] };

  const exact = dossiers.filter((d) => dossierPlates(d).includes(target));
  if (exact.length > 0) return { exact, fuzzy: [] };

  const digits = target.replace(/[^0-9]/g, '');
  if (digits.length < 4) return { exact: [], fuzzy: [] };

  const fuzzy = dossiers.filter((d) =>
    dossierPlates(d).some((p) => {
      const pd = p.replace(/[^0-9]/g, '');
      return pd.length >= 4 && (pd.includes(digits) || digits.includes(pd));
    }),
  );
  return { exact: [], fuzzy };
}
