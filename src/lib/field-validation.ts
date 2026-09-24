/**
 * Format validation for the dossier information form (QA bug 016).
 *
 * Only the FORMAT of a filled value is checked — an empty field is never an
 * error here (required-ness is a separate, deliberately non-blocking concern
 * during the testing phase). Rules are Moroccan: +212 phones, Moroccan CIN,
 * Moroccan plates (Latin or Arabic letters, WW temporaries). They are kept
 * lenient on purpose: a partie adverse may carry a foreign plate, and the AI
 * scan copies documents character by character.
 */
import { normalizePlate } from './plate-match';

export type ValidatedKind = 'tel' | 'email' | 'address' | 'plate' | 'name' | 'cin' | 'numeric' | 'ref' | 'vin' | 'label';

export interface ValidatedField {
  /** Dossier dot-path (« assure.telephone »). */
  path: string;
  kind: ValidatedKind;
  /** Translated label, used in the summary toast. */
  label: string;
}

const LETTERS = 'A-Za-zÀ-ÖØ-öø-ÿ؀-ۿ';

/** Returns a French message when `value` is filled but malformed, else null. */
export function validateFieldValue(kind: ValidatedKind, raw: unknown): string | null {
  const value = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw).trim();
  if (!value) return null;

  switch (kind) {
    case 'tel': {
      const digits = value.replace(/[\s.\-()]/g, '');
      // 06 12 34 56 78 · 0612345678 · +212612345678 · 00212 6 12 34 56 78
      if (/^(\+212|00212|0)[5-7]\d{8}$/.test(digits)) return null;
      return 'Numéro marocain attendu : 06 12 34 56 78 ou +212 6 12 34 56 78.';
    }
    case 'email': {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return null;
      return 'Adresse e-mail invalide (ex. nom@domaine.ma).';
    }
    case 'plate': {
      // Allowed glyphs only, then the normalised form must carry digits and a
      // plausible length (« 12345-A-6 », « 12345 | أ | 6 », « WW-123456 »).
      if (!new RegExp(`^[0-9${LETTERS}\\s|\\-/.]+$`).test(value)) {
        return 'Immatriculation invalide (ex. 12345-A-6 ou WW-123456).';
      }
      const norm = normalizePlate(value);
      if (norm.length >= 3 && norm.length <= 12 && /\d/.test(norm)) return null;
      return 'Immatriculation invalide (ex. 12345-A-6 ou WW-123456).';
    }
    case 'address': {
      if (value.length >= 5 && new RegExp(`[${LETTERS}]`).test(value)) return null;
      return 'Adresse trop courte — indiquez au moins la rue et la ville.';
    }
    case 'name': {
      if (value.length >= 2 && new RegExp(`^[${LETTERS}][${LETTERS}\\s'’.\\-]*$`).test(value)) return null;
      return 'Le nom ne doit contenir que des lettres.';
    }
    case 'cin': {
      const compact = value.replace(/\s/g, '').toUpperCase();
      if (/^[A-Z]{1,2}\d{4,7}$/.test(compact)) return null;
      return 'CIN invalide (ex. AB123456).';
    }
    case 'numeric': {
      if (/^\d+$/.test(value.replace(/\s/g, ''))) return null;
      return 'Nombre entier attendu (chiffres uniquement).';
    }
    case 'ref': {
      // References and identifiers: réf dossier, n° de police, code, permis…
      if (value.length >= 2 && value.length <= 40 && /^[A-Za-z0-9][A-Za-z0-9\s\-_./]*$/.test(value)) return null;
      return 'Référence invalide : lettres, chiffres, espaces, - _ . / uniquement (2 à 40 caractères).';
    }
    case 'vin': {
      const compact = value.replace(/[\s-]/g, '').toUpperCase();
      if (compact.length >= 5 && compact.length <= 17 && /^[A-Z0-9]+$/.test(compact) && !(compact.length === 17 && /[IOQ]/.test(compact))) return null;
      return 'Numéro de série invalide : 5 à 17 lettres ou chiffres (sans I, O, Q pour un VIN).';
    }
    case 'label': {
      // Marque, modèle, énergie, type : words, digits and light punctuation.
      if (value.length >= 1 && value.length <= 60 && new RegExp(`^[${LETTERS}0-9][${LETTERS}0-9\\s'’.&()/\\-]*$`).test(value)) return null;
      return 'Valeur invalide : lettres, chiffres et ponctuation simple uniquement.';
    }
    default:
      return null;
  }
}

/** Reads a dot-path (« vehicule.km ») from a plain object. */
export function readFieldPath(obj: any, path: string): unknown {
  return path.split('.').reduce((acc: any, key) => (acc == null ? undefined : acc[key]), obj);
}

/** Empty for the required-field gates: missing, null, or blank text. 0 and dates count as values. */
export function isBlankFieldValue(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && !v.trim());
}

/**
 * Protected fields (owner rulings 2026-09-24, QA bugs 015 / 040): once saved
 * with a value, a field can be CHANGED but never emptied. Returns the paths
 * that hold a value in `saved` and are blank in `form` — the save must be
 * refused for each. A field that was never filled stays optional.
 */
export function clearedProtectedPaths(saved: any, form: any, paths: Iterable<string>): string[] {
  const out: string[] = [];
  for (const p of paths) {
    if (!isBlankFieldValue(readFieldPath(saved, p)) && isBlankFieldValue(readFieldPath(form, p))) out.push(p);
  }
  return out;
}

/**
 * Validates every listed field against `form`. Returns `{ path → message }`
 * for the malformed ones only; an empty object means the form may be saved.
 */
export function validateFields(form: any, fields: ReadonlyArray<ValidatedField>): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const msg = validateFieldValue(f.kind, readFieldPath(form, f.path));
    if (msg) errors[f.path] = msg;
  }
  return errors;
}
