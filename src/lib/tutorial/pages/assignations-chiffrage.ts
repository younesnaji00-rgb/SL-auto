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
      // Presentational: opening the dropdown must NOT advance the tour —
      // the user explores the options, then clicks « Suivant » himself.
      anchor: 'ach-compagnie',
      title: 'Filtre compagnie',
      body: 'Cliquez pour filtrer par compagnie.',
      side: 'bottom',
    },
    {
      anchor: 'ach-chiffreur',
      title: 'Filtre chiffreur',
      body: "Réservé aux responsables : la charge de chaque chiffreur.",
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
      anchor: 'ach-row',
      title: 'Votre dossier est arrivé',
      body:
        "L'assignation envoyée il y a un instant est déjà là, avec son délai de 24 h.\nCliquez sur la référence pour ouvrir le chiffrage.",
      side: 'top',
      interact: 'click',
      chain: 'chiffrage-detail',
    },
  ],
  // Chains into the chiffrage detail — the closing pitch lives at the end
  // of the journey, back on the dossier.
  noClosing: true,
};
