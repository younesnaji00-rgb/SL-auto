import type { PageTutorial } from '../types';

/**
 * Assignations au chiffrage — the Chiffreur's worklist. A chiffreur only sees
 * his own assignments; admins/gestionnaires see them all (plus the chiffreur
 * filter, which is auto-skipped for other roles by DOM presence).
 *
 * The queue is sorted by deadline and grouped into urgency BANDS, so the
 * walkthrough explains the shape of the list before its filters: what the
 * chiffreur needs first is "what do I do next", not "how do I search".
 */
export const assignationsChiffrageTutorial: PageTutorial = {
  key: 'assignations-chiffrage',
  match: (p) => p === '/assignations-chiffrage',
  steps: [
    {
      title: 'Assignations au chiffrage',
      body:
        "Les dossiers à chiffrer : chaque chiffreur voit les siens.\nLa file est triée par échéance — le haut de l'écran est toujours ce qui presse le plus.",
    },
    {
      anchor: 'ach-band',
      title: 'Des bandes, pas des couleurs partout',
      body:
        "La file se découpe en bandes : « En retard », « Moins de 6 h », « Aujourd'hui », « À venir », « Terminés ».\nUne bande vide disparaît — pas de bande « En retard » à l'écran veut dire qu'il n'y a rien en retard.",
      side: 'bottom',
      cursorAt: 'left',
    },
    {
      anchor: 'ach-delai',
      title: 'Le délai de 24 h',
      body:
        "Chaque ligne montre le temps qu'il reste, calculé en heures ouvrées : les jours fériés et les week-ends ne comptent pas contre vous.",
      side: 'bottom',
    },
    {
      anchor: 'ach-scope',
      title: 'À traiter, ou tout',
      body:
        "« À traiter » masque les chiffrages déjà rendus. « Tous » les remontre, pour retrouver un dossier terminé.",
      side: 'bottom',
    },
    {
      anchor: 'ach-search',
      title: 'Retrouver une ligne',
      body: 'Une référence, un assuré, une plaque — la file se réduit à mesure que vous tapez.',
      side: 'bottom',
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
      body: 'Réservé aux responsables : la charge de chaque chiffreur.',
      side: 'bottom',
    },
    {
      anchor: 'ach-reforme',
      title: 'Filtre réforme',
      body:
        "Isoler les dossiers en réforme technique ou économique — ils ne se chiffrent pas comme les autres.",
      side: 'bottom',
    },
    {
      anchor: 'ach-dates',
      title: 'Filtre période',
      body: 'Affiche les assignations entre deux dates.',
      side: 'bottom',
    },
    {
      title: 'Traiter la file au clavier',
      body:
        "↑ ↓ (ou J et K) descendent la file, Espace ouvre l'aperçu de la ligne, Entrée ouvre le chiffrage, Échap referme.\nL'aperçu suit la ligne sélectionnée : vous pouvez juger dix dossiers d'affilée sans jamais changer de page.",
    },
    {
      anchor: 'ach-row',
      title: 'Votre dossier est arrivé',
      body:
        "L'assignation envoyée il y a un instant est déjà là, avec son délai de 24 h.\nCliquez sur la ligne pour ouvrir le chiffrage.",
      side: 'top',
      interact: 'click',
      chain: 'chiffrage-detail',
    },
  ],
  // Chains into the chiffrage detail — the closing pitch lives at the end
  // of the journey, back on the dossier.
  noClosing: true,
};
