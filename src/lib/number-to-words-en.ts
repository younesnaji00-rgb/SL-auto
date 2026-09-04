/**
 * English number-to-words conversion for the "amount in words" clause on
 * rapport PDFs (white-label English deployments).
 *
 * API mirrors `number-to-words-fr.ts`: `integerToEnglishWords` converts a
 * non-negative integer, `montantEnLettresDollars` produces the full amount in
 * words for a dollar amount, e.g.
 *   4300.50  → "four thousand three hundred dollars and fifty cents"
 *   31549.55 → "thirty-one thousand five hundred forty-nine dollars and
 *               fifty-five cents"
 *
 * Returns lowercase; callers uppercase as the template requires.
 */

const UNITS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];

const TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
];

/** Convert 0..99 to words ("forty-two"). */
function below100(n: number): string {
  if (n < 20) return UNITS[n];
  const tens = Math.floor(n / 10);
  const unit = n % 10;
  return unit === 0 ? TENS[tens] : `${TENS[tens]}-${UNITS[unit]}`;
}

/** Convert 0..999 to words ("three hundred forty-two"). */
function below1000(n: number): string {
  if (n < 100) return below100(n);
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const head = `${UNITS[hundreds]} hundred`;
  return rest === 0 ? head : `${head} ${below100(rest)}`;
}

const SCALES: Array<{ value: number; label: string }> = [
  { value: 1_000_000_000, label: 'billion' },
  { value: 1_000_000, label: 'million' },
  { value: 1_000, label: 'thousand' },
];

/** Convert a non-negative integer to English words. */
export function integerToEnglishWords(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return 'zero';
  let remaining = Math.floor(n);
  const parts: string[] = [];

  for (const scale of SCALES) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      remaining = remaining % scale.value;
      parts.push(`${below1000(count)} ${scale.label}`);
    }
  }

  if (remaining > 0) parts.push(below1000(remaining));
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Full "amount in words" for a dollar amount, e.g.
 *   4300      → "four thousand three hundred dollars"
 *   4300.50   → "four thousand three hundred dollars and fifty cents"
 *
 * Returns lowercase; callers uppercase as the template requires.
 */
export function montantEnLettresDollars(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const dollars = Math.floor(safe);
  const cents = Math.round((safe - dollars) * 100);

  const dollarWords = `${integerToEnglishWords(dollars)} ${dollars === 1 ? 'dollar' : 'dollars'}`;
  if (cents <= 0) return dollarWords;

  const centWords = `${integerToEnglishWords(cents)} ${cents === 1 ? 'cent' : 'cents'}`;
  return `${dollarWords} and ${centWords}`;
}
