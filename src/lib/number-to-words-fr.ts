/**
 * French number-to-words conversion for "montant en lettres" on rapport PDFs.
 *
 * The cabinet's reports close with "Arrêté le présent rapport à la somme de :
 * <amount in words>". No utility existed before this; the `montantEnLettres`
 * dossier field was read but never populated. This module derives the words
 * directly from the computed indemnisation amount.
 *
 * French spelling rules implemented:
 *   - 70/90 → soixante-dix / quatre-vingt-dix (Moroccan/French standard).
 *   - "et un" for 21,31,41,51,61,71 (but quatre-vingt-un, quatre-vingt-onze).
 *   - "quatre-vingts" / "cents" take a final -s when multiplied AND not
 *     followed by another number; "mille" is invariable.
 */

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize',
  'dix-sept', 'dix-huit', 'dix-neuf',
];

const TENS: Record<number, string> = {
  2: 'vingt',
  3: 'trente',
  4: 'quarante',
  5: 'cinquante',
  6: 'soixante',
  7: 'soixante', // 70 = soixante-dix (handled specially)
  8: 'quatre-vingt',
  9: 'quatre-vingt', // 90 = quatre-vingt-dix (handled specially)
};

/**
 * Convert 0..99 to words.
 * `noPluralS` suppresses the -s on "quatre-vingts" (80) when the number is
 * immediately followed by a multiplier word like "mille" → "quatre-vingt mille".
 */
function below100(n: number, noPluralS = false): string {
  if (n < 20) return UNITS[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;

  // 70-79 and 90-99 build on soixante / quatre-vingt + (10..19).
  if (tens === 7 || tens === 9) {
    const base = TENS[tens];
    const rest = below100(10 + unit); // dix..dix-neuf
    if (tens === 7) {
      // 71 = soixante et onze
      return unit === 1 ? `${base} et onze` : `${base}-${rest}`;
    }
    // 90s: quatre-vingt-dix, quatre-vingt-onze, ... (no "et")
    return `${base}-${rest}`;
  }

  const base = TENS[tens];
  if (unit === 0) {
    // 80 alone → quatre-vingts (plural s) unless a multiplier follows; others plain.
    return tens === 8 ? (noPluralS ? 'quatre-vingt' : 'quatre-vingts') : base;
  }
  // 21,31,41,51,61 → "X et un"; 81 → quatre-vingt-un (no "et").
  if (unit === 1 && tens !== 8) return `${base} et un`;
  return `${base}-${UNITS[unit]}`;
}

/**
 * Convert 0..999 to words.
 * `noPluralS` suppresses the -s on "cents" / "quatre-vingts" when followed by a
 * multiplier word like "mille" → "deux cent mille", "quatre-vingt mille".
 */
function below1000(n: number, noPluralS = false): string {
  if (n < 100) return below100(n, noPluralS);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  let head: string;
  if (hundreds === 1) {
    head = 'cent';
  } else {
    // "deux cents" (plural) only when nothing follows; "deux cent un" / "deux cent mille" otherwise.
    head = rest === 0 && !noPluralS ? `${UNITS[hundreds]} cents` : `${UNITS[hundreds]} cent`;
  }
  return rest === 0 ? head : `${head} ${below100(rest, noPluralS)}`;
}

const SCALES: Array<{ value: number; singular: string; plural: string }> = [
  { value: 1_000_000_000, singular: 'milliard', plural: 'milliards' },
  { value: 1_000_000, singular: 'million', plural: 'millions' },
  { value: 1_000, singular: 'mille', plural: 'mille' }, // mille is invariable
];

/** Convert a non-negative integer to French words. */
export function integerToFrenchWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return 'zéro';
  let remaining = Math.floor(n);
  const parts: string[] = [];

  for (const scale of SCALES) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      remaining = remaining % scale.value;
      if (scale.value === 1000 && count === 1) {
        // "mille" not "un mille"
        parts.push('mille');
      } else {
        const label = count > 1 ? scale.plural : scale.singular;
        // Before the invariable "mille", drop the plural -s on cent/quatre-vingt.
        parts.push(`${below1000(count, scale.value === 1000)} ${label}`);
      }
    }
  }

  if (remaining > 0) parts.push(below1000(remaining));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Full "montant en lettres" for a dirham amount, e.g.
 *   4300      → "quatre mille trois cents dirhams"
 *   31549.55  → "trente et un mille cinq cent quarante neuf dirhams et cinquante cinq centimes"
 *
 * Returns lowercase; callers uppercase as the template requires.
 */
export function montantEnLettresDhs(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const dirhams = Math.floor(safe);
  const centimes = Math.round((safe - dirhams) * 100);

  const dirhamWords = `${integerToFrenchWords(dirhams)} ${dirhams > 1 ? 'dirhams' : 'dirham'}`;
  if (centimes <= 0) return dirhamWords;

  const centWords = `${integerToFrenchWords(centimes)} ${centimes > 1 ? 'centimes' : 'centime'}`;
  return `${dirhamWords} et ${centWords}`;
}
