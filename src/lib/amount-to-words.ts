/**
 * Locale + brand-aware "amount in words" for rapport PDFs.
 *
 * Picks the wording from the active UI locale and the brand currency:
 *   - locale 'en' + CAD → English words with dollars/cents
 *   - locale 'fr' + CAD → French words with "dollars"/"cents"
 *   - locale 'en' + MAD → English words with dirhams/centimes
 *   - locale 'fr' + MAD → existing dirhams behaviour (montantEnLettresDhs)
 *
 * `montantEnLettresDhs` stays exported from number-to-words-fr.ts untouched
 * for compatibility; new call sites should go through `amountToWords`.
 */
import { getLocale } from '@/i18n';
import { BRAND } from './brand';
import { integerToFrenchWords, montantEnLettresDhs } from './number-to-words-fr';
import { integerToEnglishWords, montantEnLettresDollars } from './number-to-words-en';

/** Split an amount into major/minor units (minor = rounded hundredths). */
function splitAmount(amount: number): { major: number; minor: number } {
  const safe = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const major = Math.floor(safe);
  const minor = Math.round((safe - major) * 100);
  return { major, minor };
}

/** French words with arbitrary currency units, e.g. "deux mille dollars et cinq cents". */
function frenchWordsWithUnits(
  amount: number,
  majorSingular: string,
  majorPlural: string,
  minorSingular: string,
  minorPlural: string,
): string {
  const { major, minor } = splitAmount(amount);
  const majorWords = `${integerToFrenchWords(major)} ${major > 1 ? majorPlural : majorSingular}`;
  if (minor <= 0) return majorWords;
  const minorWords = `${integerToFrenchWords(minor)} ${minor > 1 ? minorPlural : minorSingular}`;
  return `${majorWords} et ${minorWords}`;
}

/** English words with arbitrary currency units, e.g. "two thousand dirhams and five centimes". */
function englishWordsWithUnits(
  amount: number,
  majorSingular: string,
  majorPlural: string,
  minorSingular: string,
  minorPlural: string,
): string {
  const { major, minor } = splitAmount(amount);
  const majorWords = `${integerToEnglishWords(major)} ${major === 1 ? majorSingular : majorPlural}`;
  if (minor <= 0) return majorWords;
  const minorWords = `${integerToEnglishWords(minor)} ${minor === 1 ? minorSingular : minorPlural}`;
  return `${majorWords} and ${minorWords}`;
}

/**
 * Amount in words for the active locale and brand currency.
 * Returns lowercase; callers uppercase as the template requires.
 */
export function amountToWords(amount: number): string {
  const isEnglish = getLocale() === 'en';
  if (BRAND.currencyCode === 'CAD') {
    return isEnglish
      ? montantEnLettresDollars(amount)
      : frenchWordsWithUnits(amount, 'dollar', 'dollars', 'cent', 'cents');
  }
  // MAD (historical default) — keep the existing dirhams wording in French.
  return isEnglish
    ? englishWordsWithUnits(amount, 'dirham', 'dirhams', 'centime', 'centimes')
    : montantEnLettresDhs(amount);
}
