/**
 * Centralized dossier status color mapping.
 * Returns Tailwind classes for Badge styling with rounded-full pill shape.
 * Palette retuned to warm, muted shades (2026-04-21) to match the cream
 * + teal design system. 9 semantic families preserved.
 */
export function getStatusBadgeStyles(status: string): string {
  const s = (status || '').trim();

  // --- RED (rose): Negative / problematic ---
  if (
    s === 'Accord devis refusé' ||
    s === 'Doc illisible' ||
    s === 'Hors zone d\'intervention' ||
    s === 'Mission annulée' ||
    s.startsWith('Manque ') ||
    s.includes('à problème')
  ) {
    return 'bg-rose-50 text-rose-700 border-rose-200/70 dark:bg-rose-900/30 dark:text-rose-200 dark:border-rose-800/60';
  }

  // --- GREEN (emerald): Positive / validated / approved ---
  if (
    s === 'Accord devis' ||
    s === 'Accord devis rectifié 2' ||
    s === 'Accord facture garage' ||
    s === 'Facture controlée' ||
    s === 'Dossier signé' ||
    s === 'Rapport Validé' ||
    s === 'Propositions avis de dommage signé' ||
    s.startsWith('Validation ')
  ) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800/60';
  }

  // --- BLUE (sky, shifted off teal primary): Expertise / active work ---
  if (
    s.startsWith('Expertise ') ||
    s === 'En cours de réparation' ||
    s === 'En cours de traitement facture garage'
  ) {
    return 'bg-sky-50 text-sky-700 border-sky-200/70 dark:bg-sky-900/30 dark:text-sky-200 dark:border-sky-800/60';
  }

  // --- ORANGE (amber): Waiting / pending action ---
  if (
    s === 'Assigné au chiffrage' ||
    s.startsWith('Demande ') ||
    s === 'Att Signature 2ème expert'
  ) {
    return 'bg-amber-50 text-amber-700 border-amber-200/70 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800/60';
  }

  // --- VIOLET: New / creation ---
  if (
    s === 'Nouveau' ||
    s === 'Création de mission' ||
    s === 'Création de dossier'
  ) {
    return 'bg-violet-50 text-violet-700 border-violet-200/70 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800/60';
  }

  // --- TEAL: Agent de Terrain decision (avis de véhicule) ---
  if (s.startsWith('Avis de véhicule')) {
    return 'bg-teal-50 text-teal-700 border-teal-200/70 dark:bg-teal-900/30 dark:text-teal-200 dark:border-teal-800/60';
  }

  // --- SLATE (stone, warmer): Closed / archived ---
  if (
    s === 'Clôture' ||
    s === 'Cloture'
  ) {
    return 'bg-stone-100 text-stone-600 border-stone-200/70 dark:bg-stone-900/30 dark:text-stone-300 dark:border-stone-700/60';
  }

  // --- CYAN: Informational / advisory ---
  if (
    s === 'Avis de réforme' ||
    s === 'Avis dommage' ||
    s === 'Propositions avis de dommage' ||
    s === 'PV Carence' ||
    s === 'Commentaire' ||
    s === 'Dossier saisi sur système'
  ) {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200/70 dark:bg-cyan-900/30 dark:text-cyan-200 dark:border-cyan-800/60';
  }

  // --- DEFAULT: warm neutral fallback ---
  return 'bg-stone-50 text-stone-700 border-stone-200/70 dark:bg-stone-900/30 dark:text-stone-300 dark:border-stone-700/60';
}

/** Standard className for a colored status pill badge */
export const STATUS_BADGE_CLASS = 'text-[10px] py-0.5 px-2.5 rounded-full border font-semibold';

/**
 * Returns Tailwind classes for a saturated, solid status header bar (white text).
 * Used by the status-history timeline cards. Matches the family classification
 * of getStatusBadgeStyles / getStatusDotColor so colors stay coordinated.
 * Retuned 2026-04-21 for warm palette — muted saturation, no neon.
 */
export function getStatusHeaderStyles(status: string): string {
  const s = (status || '').trim();

  if (s === 'Accord devis refusé' || s === 'Doc illisible' || s === 'Hors zone d\'intervention' || s === 'Mission annulée' || s.startsWith('Manque ') || s.includes('à problème'))
    return 'bg-rose-600 text-white';
  if (s === 'Accord devis' || s === 'Accord devis rectifié 2' || s === 'Accord facture garage' || s === 'Facture controlée' || s === 'Dossier signé' || s === 'Rapport Validé' || s === 'Propositions avis de dommage signé' || s.startsWith('Validation '))
    return 'bg-emerald-600 text-white';
  if (s.startsWith('Expertise ') || s === 'En cours de réparation' || s === 'En cours de traitement facture garage')
    return 'bg-sky-600 text-white';
  if (s === 'Assigné au chiffrage' || s.startsWith('Demande ') || s === 'Att Signature 2ème expert')
    return 'bg-amber-600 text-white';
  if (s === 'Nouveau' || s === 'Création de mission' || s === 'Création de dossier')
    return 'bg-violet-600 text-white';
  if (s.startsWith('Avis de véhicule'))
    return 'bg-teal-600 text-white';
  if (s === 'Clôture' || s === 'Cloture')
    return 'bg-stone-500 text-white';
  if (s === 'Avis de réforme' || s === 'Avis dommage' || s === 'Propositions avis de dommage' || s === 'PV Carence' || s === 'Commentaire' || s === 'Dossier saisi sur système')
    return 'bg-cyan-600 text-white';
  return 'bg-stone-500 text-white';
}

/** Returns a Tailwind bg color class for a small status dot indicator */
export function getStatusDotColor(status: string): string {
  const s = (status || '').trim();

  if (s === 'Accord devis refusé' || s === 'Doc illisible' || s === 'Hors zone d\'intervention' || s === 'Mission annulée' || s.startsWith('Manque ') || s.includes('à problème'))
    return 'bg-rose-500';
  if (s === 'Accord devis' || s === 'Accord devis rectifié 2' || s === 'Accord facture garage' || s === 'Facture controlée' || s === 'Dossier signé' || s === 'Rapport Validé' || s === 'Propositions avis de dommage signé' || s.startsWith('Validation '))
    return 'bg-emerald-500';
  if (s.startsWith('Expertise ') || s === 'En cours de réparation' || s === 'En cours de traitement facture garage')
    return 'bg-sky-500';
  if (s === 'Assigné au chiffrage' || s.startsWith('Demande ') || s === 'Att Signature 2ème expert')
    return 'bg-amber-500';
  if (s === 'Nouveau' || s === 'Création de mission' || s === 'Création de dossier')
    return 'bg-violet-500';
  if (s.startsWith('Avis de véhicule'))
    return 'bg-teal-500';
  if (s === 'Clôture' || s === 'Cloture')
    return 'bg-stone-400';
  if (s === 'Avis de réforme' || s === 'Avis dommage' || s === 'Propositions avis de dommage' || s === 'PV Carence' || s === 'Commentaire' || s === 'Dossier saisi sur système')
    return 'bg-cyan-500';
  return 'bg-stone-400';
}
