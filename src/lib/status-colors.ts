/**
 * Centralized dossier status color mapping for the canonical 15-label set.
 * Returns Tailwind classes for Badge styling with rounded-full pill shape.
 * Palette tuned to the warm cream + teal design system (2026-04-24).
 *
 * Family mapping (see task #2 for rationale):
 *   - Création dossier              → neutral/stone (gray-ish)
 *   - Planification programmée *   → sky/blue
 *   - Planification expertise *    → indigo
 *   - Chiffrage en cours           → amber
 *   - Accord / 2ème accord / 3ème accord        → green
 *   - Proposition d'accord / 2ème / 3ème        → teal
 *   - Accord envoyé                             → emerald (closed-ish)
 */

const ACCORD_GREEN_SET: ReadonlySet<string> = new Set([
  'Accord',
  '2ème accord',
  '3ème accord',
]);

const PROPOSITION_TEAL_SET: ReadonlySet<string> = new Set([
  'Proposition d\'accord',
  '2ème proposition d\'accord',
  '3ème proposition d\'accord',
]);

export function getStatusBadgeStyles(status: string): string {
  const s = (status || '').trim();

  if (s === 'Création dossier') {
    return 'bg-stone-100 text-stone-700 border-stone-200/70 dark:bg-stone-900/30 dark:text-stone-300 dark:border-stone-700/60';
  }

  if (s.startsWith('Planification programmée')) {
    return 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800/60';
  }

  if (s.startsWith('Planification expertise')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200/70 dark:bg-indigo-900/30 dark:text-indigo-200 dark:border-indigo-800/60';
  }

  if (s === 'Chiffrage en cours') {
    return 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60';
  }

  if (ACCORD_GREEN_SET.has(s)) {
    return 'bg-green-50 text-green-700 border-green-200/70 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800/60';
  }

  if (PROPOSITION_TEAL_SET.has(s)) {
    return 'bg-teal-50 text-teal-700 border-teal-200/70 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-800/60';
  }

  if (s === 'Accord envoyé') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60';
  }

  // --- DEFAULT: warm neutral fallback ---
  return 'bg-stone-50 text-stone-700 border-stone-200/70 dark:bg-stone-900/30 dark:text-stone-300 dark:border-stone-700/60';
}

/** Standard className for a colored status pill badge */
export const STATUS_BADGE_CLASS = 'text-[11px] py-0.5 px-2.5 rounded-full border font-semibold';

/**
 * Saturated, solid header bar (white text) variant. Same family classification
 * as getStatusBadgeStyles so colors stay coordinated across the UI.
 */
export function getStatusHeaderStyles(status: string): string {
  const s = (status || '').trim();

  if (s === 'Création dossier') return 'bg-stone-500 text-white';
  if (s.startsWith('Planification programmée')) return 'bg-sky-600 text-white';
  if (s.startsWith('Planification expertise')) return 'bg-indigo-600 text-white';
  if (s === 'Chiffrage en cours') return 'bg-amber-600 text-white';
  if (ACCORD_GREEN_SET.has(s)) return 'bg-green-600 text-white';
  if (PROPOSITION_TEAL_SET.has(s)) return 'bg-teal-600 text-white';
  if (s === 'Accord envoyé') return 'bg-emerald-600 text-white';

  return 'bg-stone-500 text-white';
}

/** Small dot indicator color — same family classification. */
export function getStatusDotColor(status: string): string {
  const s = (status || '').trim();

  if (s === 'Création dossier') return 'bg-stone-400';
  if (s.startsWith('Planification programmée')) return 'bg-sky-500';
  if (s.startsWith('Planification expertise')) return 'bg-indigo-500';
  if (s === 'Chiffrage en cours') return 'bg-amber-500';
  if (ACCORD_GREEN_SET.has(s)) return 'bg-green-500';
  if (PROPOSITION_TEAL_SET.has(s)) return 'bg-teal-500';
  if (s === 'Accord envoyé') return 'bg-emerald-500';

  return 'bg-stone-400';
}
