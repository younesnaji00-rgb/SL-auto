/**
 * Compagnie names — one comparison rule for the whole app.
 *
 * A dossier's compagnie is the name of an entry of the `compagnies`
 * collection, and an account's scope is a list of those names. Free text
 * crept in: the AI pre-fill copied the document's spelling (« ALLIANZ »,
 * « ALLIANZ ASSURANCES MAROC ») over the list's « Allianz », and the
 * « risko car » dossier left the Gestion des dossiers list of the account
 * that had it (tester report 2026-10-14).
 *
 * `compagnieKey` ignores case, accents, punctuation and spacing.
 * `canonicalCompagnie` snaps a read name onto the list, or says it is not in it.
 */

/** Case, accents, punctuation and spacing ignored. */
export function compagnieKey(name: unknown): string {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Words a compagnie's legal name adds to its usual name. */
const NOISE = new Set(['assurance', 'assurances', 'maroc', 'morocco', 'sa', 'compagnie', 'cie', 'd', 'de', 'des', 'du', 'la', 'le', 'l', 'et', 'groupe', 'group', 'mutuelle']);

function coreWords(key: string): string[] {
  return key.split(' ').filter((w) => w && !NOISE.has(w));
}

/**
 * The list entry `raw` names, or `null` when none does.
 *
 * 1. Same key (« ALLIANZ » → « Allianz »).
 * 2. Same words once the legal noise is dropped (« Wafa Assurance » →
 *    « Wafa » when only « Wafa » is listed; « ALLIANZ ASSURANCES MAROC » →
 *    « Allianz »).
 * 3. One entry whose words all appear in `raw` (« RMA WATANYA » → « RMA »).
 *    The longest such entry wins; a tie between two is no answer.
 */
export function canonicalCompagnie(raw: unknown, list: ReadonlyArray<string>): string | null {
  const key = compagnieKey(raw);
  if (!key) return null;
  const exact = list.find((n) => compagnieKey(n) === key);
  if (exact) return exact;

  const core = coreWords(key).join(' ');
  if (core) {
    const sameCore = list.filter((n) => coreWords(compagnieKey(n)).join(' ') === core);
    if (sameCore.length === 1) return sameCore[0];
  }

  const rawWords = new Set(coreWords(key));
  let best: string | null = null;
  let bestLen = 0;
  let tie = false;
  for (const n of list) {
    const words = coreWords(compagnieKey(n));
    if (words.length === 0 || !words.every((w) => rawWords.has(w))) continue;
    const len = words.join(' ').length;
    if (len > bestLen) {
      best = n;
      bestLen = len;
      tie = false;
    } else if (len === bestLen) {
      tie = true;
    }
  }
  return tie ? null : best;
}

/**
 * Whether an account limited to `allowed` (names from its profile) sees a
 * dossier of compagnie `compagnie`. An empty `allowed` = no limit. A dossier
 * whose compagnie is blank or not in the compagnies list (`known`) belongs to
 * no scope in particular and stays visible to everyone: hiding it would make
 * it vanish for every limited account at once.
 */
export function compagnieInScope(
  compagnie: unknown,
  allowed: ReadonlyArray<string> | null | undefined,
  known?: ReadonlyArray<string> | null,
): boolean {
  if (!allowed || allowed.length === 0) return true;
  const key = compagnieKey(compagnie);
  if (!key) return true;
  if (allowed.some((a) => compagnieKey(a) === key)) return true;
  if (known && known.length > 0 && !known.some((k) => compagnieKey(k) === key)) return true;
  return false;
}
