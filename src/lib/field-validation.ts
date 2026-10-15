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
import { cityNamedIn } from './moroccan-address';
import { requiredFieldFilled, requiredFieldsFor } from './required-fields';

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
  /** Marque, énergie, type d'intermédiaire: words, never a number. */
  | 'words'
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
const WORDS = new RegExp(`^[${LETTERS}][${LETTERS}\\s'’.&()/\\-]*$`);
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
  // The city is mandatory (owner 2026-10-16).
  addressCity: 'Ajoutez la ville à la fin de l’adresse (ex. 12 rue Ibn Battouta, Maarif, Casablanca).',
  name: 'Nom invalide : lettres uniquement (espace, tiret et apostrophe admis).',
  org: 'Nom invalide : lettres et chiffres, ponctuation simple admise (pas de symboles seuls).',
  cin: 'CIN invalide (ex. AB123456).',
  numeric: 'Nombre entier attendu (chiffres uniquement).',
  cv: 'Puissance fiscale invalide : nombre entier de 1 à 99.',
  km: 'Kilométrage invalide : nombre entier de 0 à 2 000 000.',
  ref: 'Référence invalide : lettres et chiffres, séparés au besoin par - _ . / (2 à 40 caractères).',
  vin: 'Numéro de série invalide : 5 à 17 lettres ou chiffres (sans I, O, Q pour un VIN).',
  label: 'Valeur invalide : lettres, chiffres et ponctuation simple uniquement.',
  words: 'Valeur invalide : des lettres, sans chiffres (ex. Renault, Diesel).',
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
/** `areas`: the accepted areas (« Sites »), recognised as cities in addresses besides the cities of Morocco. */
export interface ValidationContext {
  areas?: readonly string[];
}

export function validateFieldValue(kind: ValidatedKind, raw: unknown, now: Date = new Date(), ctx: ValidationContext = {}): string | null {
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
      // Allowed glyphs only, then the normalised form (Arabic letters in
      // Latin, separators gone) must be a plate (QA bug 016 retest: « 233e »,
      // « 123 » and « 87763 » went through):
      // - Moroccan: 1 to 5 digits, the letter, the region (« 12345-A-6 »,
      //   « 12345 | أ | 6 », « 123-ش-45 »);
      // - an older all-digit plate, region included (« 123456-6 »);
      // - temporary or foreign: 5 to 12 characters, letters and at least two
      //   digits (« WW-123456 », « AB-123-CD »).
      if (!PLATE_GLYPHS.test(value) || SYMBOL_RUN.test(value)) return MSG.plate;
      const norm = normalizePlate(value);
      if (/^\d{1,5}[A-Z]{1,3}\d{1,2}$/.test(norm)) return null;
      if (/^\d{6,8}$/.test(norm)) return null;
      if (norm.length >= 5 && norm.length <= 12 && /[A-Z]/.test(norm) && digitCount(norm) >= 2) return null;
      return MSG.plate;
    }
    case 'address': {
      // « N° 12, Rue 5, Hay Salam, Casablanca » — letters, digits and the
      // punctuation addresses use; at least one real word; symbols never
      // outweigh the text.
      const compact = value.replace(/\s/g, '');
      // Two words at least, as the message asks (QA bug 016 retest:
      // « testtestt » and « Casablanca » alone went through).
      const words = value.split(/[\s,،;]+/).filter((w) => letterCount(w) + digitCount(w) > 0);
      const ok =
        value.length >= 5 &&
        words.length >= 2 &&
        ADDRESS_GLYPHS.test(value) &&
        letterCount(value) >= 3 &&
        WORD.test(value) &&
        !SYMBOL_RUN.test(value) &&
        (letterCount(compact) + digitCount(compact)) / compact.length >= 0.6;
      if (!ok) return MSG.address;
      // The city must be written: a city of Morocco or an accepted area.
      return cityNamedIn(value, ctx.areas ?? []) ? null : MSG.addressCity;
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
      // Digits always (QA bug 016 retest: « testtestt » went through).
      if (compact.length >= 5 && compact.length <= 17 && /^[A-Z0-9]+$/.test(compact) && digitCount(compact) >= 2 && !(compact.length === 17 && /[IOQ]/.test(compact))) return null;
      return MSG.vin;
    }
    case 'label': {
      // Modèle: words, digits and light punctuation — « 208 », « C4 (II) »,
      // and « 12 » is a Renault.
      if (value.length <= 60 && LABEL.test(value) && !SYMBOL_RUN.test(value)) return null;
      return MSG.label;
    }
    case 'words': {
      // Marque, énergie, type d'intermédiaire (QA bug 016 retest: Marque
      // « 12 » went through): « Mercedes-Benz », « Lynk & Co », « Diesel ».
      if (value.length <= 40 && WORDS.test(value) && letterCount(value) >= 2 && !SYMBOL_RUN.test(value)) return null;
      return MSG.words;
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
 * The form fields an Informations save may never leave blank — on every
 * save, the first one included (owner ruling 2026-10-14, which replaced the
 * 2026-10-05 « only what creation demands » rule of QA GE-004). The list is
 * `requiredFieldsFor` (lib/required-fields.ts), the same one the asterisks,
 * the step rail and the to-do read; each entry gives its first path, the
 * form field that carries the asterisk and the error.
 */
export function requiredOnSavePaths(expertRank?: string): string[] {
  return requiredFieldsFor(expertRank).map((f) => f.paths[0]);
}

/**
 * The `requiredOnSavePaths` that are blank in `form`, in that order. The
 * matricule counts as given when the véhicule's immatriculation is.
 */
export function blankRequiredPaths(form: any, expertRank?: string): string[] {
  return requiredFieldsFor(expertRank)
    .filter((f) => !requiredFieldFilled(form, f))
    .map((f) => f.paths[0]);
}

/**
 * Validates every listed field against `form`. Returns `{ path → message }`
 * for the malformed ones only; an empty object means the form may be saved.
 */
export function validateFields(form: any, fields: ReadonlyArray<ValidatedField>, now: Date = new Date(), ctx: ValidationContext = {}): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const msg = validateFieldValue(f.kind, readFieldPath(form, f.path), now, ctx);
    if (msg) errors[f.path] = msg;
  }
  return errors;
}
