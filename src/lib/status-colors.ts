/**
 * Centralized dossier status color mapping.
 * Returns Tailwind classes for Badge styling with rounded-full pill shape.
 */
export function getStatusBadgeStyles(status: string): string {
  const s = (status || '').trim();

  // --- RED: Negative / problematic ---
  if (
    s === 'Accord devis refusé' ||
    s === 'Doc illisible' ||
    s === 'Hors zone d\'intervention' ||
    s === 'Mission annulée' ||
    s.startsWith('Manque ') ||
    s.includes('à problème')
  ) {
    return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
  }

  // --- GREEN: Positive / validated / approved ---
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
    return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
  }

  // --- BLUE: Expertise / active work ---
  if (
    s.startsWith('Expertise ') ||
    s === 'En cours de réparation' ||
    s === 'En cours de traitement facture garage'
  ) {
    return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
  }

  // --- ORANGE: Waiting / pending action ---
  if (
    s === 'Assigné au chiffrage' ||
    s.startsWith('Demande ') ||
    s === 'Att Signature 2ème expert'
  ) {
    return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800';
  }

  // --- VIOLET: New / creation ---
  if (
    s === 'Nouveau' ||
    s === 'Création de mission' ||
    s === 'Création de dossier'
  ) {
    return 'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800';
  }

  // --- TEAL: Agent de Terrain decision (avis de véhicule) ---
  if (s.startsWith('Avis de véhicule')) {
    return 'bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800';
  }

  // --- SLATE: Closed / archived ---
  if (
    s === 'Clôture' ||
    s === 'Cloture'
  ) {
    return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/30 dark:text-slate-400 dark:border-slate-700';
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
    return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800';
  }

  // --- DEFAULT: Gray fallback ---
  return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700';
}

/** Standard className for a colored status pill badge */
export const STATUS_BADGE_CLASS = 'text-[10px] py-0.5 px-2.5 rounded-full border font-semibold';

/**
 * Returns Tailwind classes for a saturated, solid status header bar (white text).
 * Used by the status-history timeline cards. Matches the family classification
 * of getStatusBadgeStyles / getStatusDotColor so colors stay coordinated.
 */
export function getStatusHeaderStyles(status: string): string {
  const s = (status || '').trim();

  if (s === 'Accord devis refusé' || s === 'Doc illisible' || s === 'Hors zone d\'intervention' || s === 'Mission annulée' || s.startsWith('Manque ') || s.includes('à problème'))
    return 'bg-red-500 text-white';
  if (s === 'Accord devis' || s === 'Accord devis rectifié 2' || s === 'Accord facture garage' || s === 'Facture controlée' || s === 'Dossier signé' || s === 'Rapport Validé' || s === 'Propositions avis de dommage signé' || s.startsWith('Validation '))
    return 'bg-emerald-500 text-white';
  if (s.startsWith('Expertise ') || s === 'En cours de réparation' || s === 'En cours de traitement facture garage')
    return 'bg-indigo-500 text-white';
  if (s === 'Assigné au chiffrage' || s.startsWith('Demande ') || s === 'Att Signature 2ème expert')
    return 'bg-orange-500 text-white';
  if (s === 'Nouveau' || s === 'Création de mission' || s === 'Création de dossier')
    return 'bg-violet-500 text-white';
  if (s.startsWith('Avis de véhicule'))
    return 'bg-teal-500 text-white';
  if (s === 'Clôture' || s === 'Cloture')
    return 'bg-slate-500 text-white';
  if (s === 'Avis de réforme' || s === 'Avis dommage' || s === 'Propositions avis de dommage' || s === 'PV Carence' || s === 'Commentaire' || s === 'Dossier saisi sur système')
    return 'bg-cyan-600 text-white';
  return 'bg-indigo-500 text-white';
}

/** Returns a Tailwind bg color class for a small status dot indicator */
export function getStatusDotColor(status: string): string {
  const s = (status || '').trim();

  if (s === 'Accord devis refusé' || s === 'Doc illisible' || s === 'Hors zone d\'intervention' || s === 'Mission annulée' || s.startsWith('Manque ') || s.includes('à problème'))
    return 'bg-red-500';
  if (s === 'Accord devis' || s === 'Accord devis rectifié 2' || s === 'Accord facture garage' || s === 'Facture controlée' || s === 'Dossier signé' || s === 'Rapport Validé' || s === 'Propositions avis de dommage signé' || s.startsWith('Validation '))
    return 'bg-emerald-500';
  if (s.startsWith('Expertise ') || s === 'En cours de réparation' || s === 'En cours de traitement facture garage')
    return 'bg-blue-500';
  if (s === 'Assigné au chiffrage' || s.startsWith('Demande ') || s === 'Att Signature 2ème expert')
    return 'bg-orange-500';
  if (s === 'Nouveau' || s === 'Création de mission' || s === 'Création de dossier')
    return 'bg-violet-500';
  if (s.startsWith('Avis de véhicule'))
    return 'bg-teal-500';
  if (s === 'Clôture' || s === 'Cloture')
    return 'bg-slate-400';
  if (s === 'Avis de réforme' || s === 'Avis dommage' || s === 'Propositions avis de dommage' || s === 'PV Carence' || s === 'Commentaire' || s === 'Dossier saisi sur système')
    return 'bg-cyan-500';
  return 'bg-gray-400';
}
