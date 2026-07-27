import type { PageTutorial } from '../types';

/**
 * Assignations au chiffrage — the Chiffreur's worklist. A chiffreur only sees
 * his own assignments; admins/gestionnaires see them all (plus the chiffreur
 * filter, which is auto-skipped for other roles by DOM presence).
 */
export const assignationsChiffrageTutorial: PageTutorial = {
  key: 'assignations-chiffrage',
  match: (p) => p === '/assignations-chiffrage',
  steps: [
    {
      title: 'Assignations au chiffrage',
      body:
        "Cette page liste les dossiers envoyés au chiffrage. Le chiffreur y retrouve les dossiers qui lui sont assignés ; les gestionnaires et administrateurs voient l'ensemble des assignations.",
    },
    {
      anchor: 'ach-compagnie',
      title: 'Filtrer par compagnie',
      body:
        "Affichez uniquement les chiffrages d'une compagnie d'assurance. Le nombre de dossiers par compagnie est indiqué entre parenthèses.",
      side: 'bottom',
    },
    {
      anchor: 'ach-chiffreur',
      title: 'Filtrer par chiffreur',
      body:
        "Visible pour les administrateurs et gestionnaires : affichez les assignations d'un chiffreur précis. Le compteur correspond à ses chiffrages ouverts.",
      side: 'bottom',
    },
    {
      anchor: 'ach-reforme',
      title: 'Filtrer par type de réforme',
      body: 'Limitez la liste aux dossiers en réforme Technique ou Économique.',
      side: 'bottom',
    },
    {
      anchor: 'ach-dates',
      title: 'Filtrer par période',
      body: 'Affichez uniquement les assignations créées entre deux dates.',
      side: 'bottom',
    },
    {
      anchor: 'ach-delai',
      title: 'Le délai de 24 h',
      body:
        "Chaque chiffrage doit être traité sous 24 heures ouvrées (week-ends et jours fériés exclus). La barre se remplit avec le temps et passe en rouge quand le délai est dépassé. Cliquez sur l'en-tête pour trier par urgence.",
      side: 'bottom',
    },
    {
      anchor: 'ach-table',
      title: 'La liste des assignations',
      body:
        "Chaque ligne montre le dossier, l'assuré, le statut en couleur et la dernière observation (cliquez dessus pour l'historique complet). Cliquez sur la référence du dossier pour ouvrir l'assignation ; les dossiers du jour sont surlignés.",
      side: 'top',
    },
  ],
};
