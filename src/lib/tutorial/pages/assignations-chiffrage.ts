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
      body: 'Les dossiers à chiffrer : chaque chiffreur voit les siens.',
    },
    {
      anchor: 'ach-compagnie',
      title: 'Filtre compagnie',
      body: 'Cliquez pour filtrer par compagnie.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'ach-chiffreur',
      title: 'Filtre chiffreur',
      body: "Réservé aux responsables : la charge de chaque chiffreur.",
      side: 'bottom',
    },
    {
      anchor: 'ach-reforme',
      title: 'Filtre réforme',
      body: 'Limite la liste aux dossiers en réforme.',
      side: 'bottom',
    },
    {
      anchor: 'ach-dates',
      title: 'Filtre période',
      body: 'Affiche les assignations entre deux dates.',
      side: 'bottom',
    },
    {
      anchor: 'ach-delai',
      title: 'Le délai de 24 h',
      body: 'La barre se remplit avec le temps et passe en rouge en cas de retard.',
      side: 'bottom',
    },
    {
      anchor: 'ach-table',
      title: 'La liste',
      body: "Cliquez sur la référence d'un dossier pour ouvrir son chiffrage.",
      side: 'top',
    },
  ],
};
