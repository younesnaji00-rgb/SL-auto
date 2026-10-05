/**
 * Format validation for the dossier information form (QA bug 016; owner
 * request 2026-10-05: format coherence is forced on EVERY field).
 *
 * Only the FORMAT of a filled value is checked — an empty field is never an
 * error here (required-ness is a separate gate, `requiredOnSavePaths`). Rules
 * are Moroccan: +212 phones, Moroccan CIN, Moroccan plates (Latin or Arabic
 * letters, WW temporaries). They stay lenient where real data varies (a
 * partie adverse may carry a foreign plate, the AI scan copies documents
 * character by character), but no field accepts an entry made only of
 * symbols (« @@@@ », « ---- ») or a run of symbols (« -- », « ,.; »).
 */
import { normalizePlate } from './plate-match';

export type ValidatedKind =
  | 'tel'
  | 'email'
  | 'address'
  | 'plate'
  | 'name'
  | 'org'
  | 'cin'
  | 'numeric'
  | 'cv'
  | 'km'
  | 'ref'
  | 'vin'
  | 'label'
  /** Date sinistre, date requête: a real day, not in the future, from 2000 on. */
  | 'pastDate'
  /** Mise en circulation: a real day, not in the future, from 1900 on. */
  | 'mecDate';

export interface ValidatedField {
  /** Dossier dot-path (« assure.telephone »). */
  path: string;
  kind: ValidatedKind;
  /** Translated label, used in the summary toast. */
  label: string;
}

const LETTERS = 'A-Za-zÀ-ÖØ-öø-ÿ؀-ۿ';
const LETTER = new RegExp(`[${LETTERS}]`, 'g');
/** One character that is neither a letter, a digit nor a space. */
const SYMBOL = `[^${LETTERS}0-9\\s]`;
/** The same symbol twice in a row (« -- », « && ») or any three (« ,.- »). */
const SYMBOL_RUN = new RegExp(`(${SYMBOL})\\1|${SYMBOL}{3,}`);

const NAME = new RegExp(`^[${LETTERS}][${LETTERS}\\s'’.\\-]*$`);
const NAME_END = new RegExp(`[${LETTERS}.]$`);
const ORG = new RegExp(`^[${LETTERS}0-9][${LETTERS}0-9\\s'’.,&()/\\-]*$`);
const LABEL = new RegExp(`^[${LETTERS}0-9][${LETTERS}0-9\\s'’.&()/\\-]*$`);
const ADDRESS_GLYPHS = new RegExp(`^[${LETTERS}0-9\\s,.;:'’"«»()\\-–/°º#&]+$`);
const WORD = new RegExp(`[${LETTERS}]{2,}`);
const PLATE_GLYPHS = new RegExp(`^[0-9${LETTERS}\\s|\\-/.]+$`);

const letterCount = (s: string) => (s.match(LETTER) || []).length;
const digitCount = (s: string) => (s.match(/[0-9]/g) || []).length;

const MSG = {
  tel: 'Numéro marocain attendu : 06 12 34 56 78 ou +212 6 12 34 56 78.',
  email: 'Adresse e-mail invalide (ex. nom@domaine.ma).',
  plate: 'Immatriculation invalide (ex. 12345-A-6 ou WW-123456).',
  address: 'Adresse invalide : indiquez au moins la rue et la ville, en lettres et chiffres (pas de symboles seuls).',
  name: 'Nom invalide : lettres uniquement (espace, tiret et apostrophe admis).',
  org: 'Nom invalide : lettres et chiffres, ponctuation simple admise (pas de symboles seuls).',
  cin: 'CIN invalide (ex. AB123456).',
  numeric: 'Nombre entier attendu (chiffres uniquement).',
  cv: 'Puissance fiscale invalide : nombre entier de 1 à 99.',
  km: 'Kilométrage invalide : nombre entier de 0 à 2 000 000.',
  ref: 'Référence invalide : lettres et chiffres, séparés au besoin par - _ . / (2 à 40 caractères).',
  vin: 'Numéro de série invalide : 5 à 17 lettres ou chiffres (sans I, O, Q pour un VIN).',
  label: 'Valeur invalide : lettres, chiffres et ponctuation simple uniquement.',
  date: 'Date invalide (format JJ/MM/AAAA).',
  future: 'Date invalide : elle ne peut pas être dans le futur.',
} as const;

const DATE_MIN_YEAR = { pastDate: 2000, mecDate: 1900 } as const;

/**
 * A Date, a Firestore Timestamp (live or serialised `{ seconds }`), an ISO
 * string or epoch ms → Date; blank → null; any other shape → an invalid Date.
 */
export function toFieldDate(raw: unknown): Date | null {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) return raw;
  const o = raw as { toDate?: unknown; seconds?: unknown };
  if (typeof o.toDate === 'function') return (o.toDate as () => Date)();
  if (typeof o.seconds === 'number') return new Date(o.seconds * 1000);
  if (typeof raw === 'string' || typeof raw === 'number') return new Date(raw);
  return new Date(NaN);
}

/** Calendar day in local time as a sortable number: 5 Oct 2026 → 20261005. */
const dayKey = (d: Date) => d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
const isRealDate = (d: Date | null): d is Date => !!d && !isNaN(d.getTime());

function validateDate(kind: keyof typeof DATE_MIN_YEAR, raw: unknown, now: Date): string | null {
  if (isBlankFieldValue(raw)) return null;
  const d = toFieldDate(raw);
  if (!isRealDate(d)) return MSG.date;
  const min = DATE_MIN_YEAR[kind];
  if (d.getFullYear() < min) return `Date invalide : année antérieure à ${min}.`;
  if (dayKey(d) > dayKey(now)) return MSG.future;
  return null;
}

/**
 * Returns a French message when `value` is filled but malformed, else null.
 * `now` only matters for the date kinds (no date in the future).
 */
export function validateFieldValue(kind: ValidatedKind, raw: unknown, now: Date = new Date()): string | null {
  if (kind === 'pastDate' || kind === 'mecDate') return validateDate(kind, raw, now);

  const value = typeof raw === 'string' ? raw.trim() : raw == null ? '' : String(raw).trim();
  if (!value) return null;

  switch (kind) {
    case 'tel': {
      const digits = value.replace(/[\s.\-()]/g, '');
      // 06 12 34 56 78 · 0612345678 · +212612345678 · 00212 6 12 34 56 78
      if (/^(\+212|00212|0)[5-7]\d{8}$/.test(digits)) return null;
      return MSG.tel;
    }
    case 'email': {
      // Letters, digits and . _ % + ' - before the @ (never dots alone or
      // doubled), a real domain after it: « !!@##.$$ » is not an address.
      const at = value.lastIndexOf('@');
      const local = value.slice(0, at);
      const domain = value.slice(at + 1);
      const ok =
        at > 0 &&
        /^[A-Za-z0-9._%+'-]+$/.test(local) &&
        /[A-Za-z0-9]/.test(local) &&
        !/^\.|\.$|\.\./.test(local) &&
        /^(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(domain);
      return ok ? null : MSG.email;
    }
    case 'plate': {
      // Allowed glyphs only, then the normalised form must carry digits and a
      // plausible length (« 12345-A-6 », « 12345 | أ | 6 », « WW-123456 »).
      if (!PLATE_GLYPHS.test(value) || SYMBOL_RUN.test(value)) return MSG.plate;
      const norm = normalizePlate(value);
      if (norm.length >= 3 && norm.length <= 12 && /\d/.test(norm)) return null;
      return MSG.plate;
    }
    case 'address': {
      // « N° 12, Rue 5, Hay Salam, Casablanca » — letters, digits and the
      // punctuation addresses use; at least one real word; symbols never
      // outweigh the text.
      const compact = value.replace(/\s/g, '');
      const ok =
        value.length >= 5 &&
        ADDRESS_GLYPHS.test(value) &&
        letterCount(value) >= 3 &&
        WORD.test(value) &&
        !SYMBOL_RUN.test(value) &&
        (letterCount(compact) + digitCount(compact)) / compact.length >= 0.6;
      return ok ? null : MSG.address;
    }
    case 'name': {
      // « El-Alaoui », « O’Neil », « M. Karim » — never « A.-B » or « Karim- ».
      const ok =
        NAME.test(value) &&
        letterCount(value) >= 2 &&
        !/['’.-]{2,}/.test(value) &&
        NAME_END.test(value);
      return ok ? null : MSG.name;
    }
    case 'org': {
      // Raison sociale / compagnie typed by hand: « Cabinet 2M & Associés ».
      const ok = value.length <= 80 && ORG.test(value) && letterCount(value) >= 2 && !SYMBOL_RUN.test(value);
      return ok ? null : MSG.org;
    }
    case 'cin': {
      const compact = value.replace(/\s/g, '').toUpperCase();
      if (/^[A-Z]{1,2}\d{4,7}$/.test(compact)) return null;
      return MSG.cin;
    }
    case 'numeric': {
      if (/^\d+$/.test(value.replace(/\s/g, ''))) return null;
      return MSG.numeric;
    }
    case 'cv': {
      const digits = value.replace(/\s/g, '');
      if (/^\d{1,2}$/.test(digits) && Number(digits) >= 1) return null;
      return MSG.cv;
    }
    case 'km': {
      const digits = value.replace(/\s/g, '');
      if (/^\d{1,7}$/.test(digits) && Number(digits) <= 2000000) return null;
      return MSG.km;
    }
    case 'ref': {
      // References and identifiers: réf dossier, n° de police, code, permis…
      // Starts and ends with a letter or digit, one separator at a time.
      const ok =
        value.length >= 2 &&
        value.length <= 40 &&
        /^[A-Za-z0-9][A-Za-z0-9\s\-_./]*[A-Za-z0-9]$/.test(value) &&
        !/[-_./]{2,}/.test(value);
      return ok ? null : MSG.ref;
    }
    case 'vin': {
      const compact = value.replace(/[\s-]/g, '').toUpperCase();
      if (compact.length >= 5 && compact.length <= 17 && /^[A-Z0-9]+$/.test(compact) && !(compact.length === 17 && /[IOQ]/.test(compact))) return null;
      return MSG.vin;
    }
    case 'label': {
      // Marque, modèle, énergie, type : words, digits and light punctuation.
      if (value.length <= 60 && LABEL.test(value) && !SYMBOL_RUN.test(value)) return null;
      return MSG.label;
    }
    default:
      return null;
  }
}

/**
 * Coherence BETWEEN the dossier's dates (owner request 2026-10-05): the
 * requête comes after the sinistre, and the véhicule was on the road before
 * it. Returns `{ path → message }` on the information form's paths; a blank
 * or malformed date is left to `validateFieldValue`.
 */
export function dateCoherenceErrors(form: any): Record<string, string> {
  const sinistre = toFieldDate(form?.dateSinistre);
  const requete = toFieldDate(form?.dateRequete);
  const mec = toFieldDate(form?.vehicule?.mec);
  const out: Record<string, string> = {};
  if (isRealDate(sinistre) && isRealDate(requete) && dayKey(requete) < dayKey(sinistre)) {
    out.dateRequete = 'La date de requête ne peut pas précéder la date du sinistre.';
  }
  if (isRealDate(sinistre) && isRealDate(mec) && dayKey(mec) > dayKey(sinistre)) {
    out['vehicule.mec'] = 'La mise en circulation ne peut pas être postérieure à la date du sinistre.';
  }
  return out;
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
 * The only fields an Informations save may not leave blank: exactly what the
 * creation dialog demands (QA bugs 007 / 040) — the reference, the compagnie
 * and the name of the expert of the dossier's role. A field that was optional
 * at creation stays optional on every later save: it can be filled, changed
 * and emptied again (QA GE-004, 2026-10-05 — this replaced the 2026-09-24
 * « once saved, never emptied » rule).
 */
export function requiredOnSavePaths(expertRank?: string): string[] {
  return ['refExpert', 'compagnie', `experts.${expertRank || '1er'}.nom`];
}

/** The `requiredOnSavePaths` that are blank in `form`, in that order. */
export function blankRequiredPaths(form: any, expertRank?: string): string[] {
  return requiredOnSavePaths(expertRank).filter((p) => isBlankFieldValue(readFieldPath(form, p)));
}

/**
 * Validates every listed field against `form`. Returns `{ path → message }`
 * for the malformed ones only; an empty object means the form may be saved.
 */
export function validateFields(form: any, fields: ReadonlyArray<ValidatedField>, now: Date = new Date()): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const msg = validateFieldValue(f.kind, readFieldPath(form, f.path), now);
    if (msg) errors[f.path] = msg;
  }
  return errors;
}
