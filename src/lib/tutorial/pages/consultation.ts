import type { PageTutorial } from '../types';

/**
 * EXEMPLAR tutorial — the conventions every page tutorial follows
 * (see docs/TUTORIALS.md):
 *  1. First step has no anchor = centered intro (one sentence + one
 *     differentiator max).
 *  2. Then one step per functional zone, in the order a user works.
 *  3. Titles ≤4 words; bodies ONE short sentence (two max), plain language.
 *  4. Safe targets (search field, filter triggers) are hands-on via
 *     `interact: 'click'`; texts are FRENCH (i18n keys), EN in
 *     src/i18n/en/labs.ts.
 */
export const consultationTutorial: PageTutorial = {
  key: 'consultation',
  match: (p) => p === '/consultation',
  steps: [
    {
      title: 'Consultation des dossiers',
      body:
        "Retrouvez n'importe quel dossier, en lecture seule : aucun risque de modification.\nC'est la page à ouvrir pour répondre à une question au téléphone — jamais celle où l'on travaille.",
    },
    {
      anchor: 'consult-filters',
      title: 'Une seule barre de recherche',
      body:
        "Recherche à gauche, puis les filtres du plus général au plus précis, et les outils discrets à droite.\nLes filtres actifs s'affichent en pastilles sous la barre — un clic sur la croix en retire un.",
      side: 'bottom',
      cursorAt: 'left',
    },
    {
      anchor: 'consult-search',
      title: 'Recherche rapide',
      body: 'Cliquez dans le champ : vous y taperez un nom, une référence ou une immatriculation.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'consult-nature',
      title: 'Filtre nature',
      body: 'Cliquez pour ouvrir la liste des types de sinistre.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'consult-statut',
      title: 'Filtre statut',
      body: 'Affiche les dossiers à une étape précise.',
      side: 'bottom',
    },
    {
      anchor: 'consult-compagnie',
      title: 'Filtre compagnie',
      body: 'Limite la liste à une seule compagnie.',
      side: 'bottom',
    },
    {
      anchor: 'consult-colonnes',
      title: 'Choisir les colonnes',
      body:
        "Masquez ce qui ne vous sert pas : le réglage vaut pour vous seul, et l'export reprend exactement les colonnes affichées.",
      side: 'bottom',
    },
    {
      anchor: 'consult-export',
      title: 'Exporter la liste',
      body:
        "Un clic exporte la liste FILTRÉE vers Excel — pas toute la base.\nLe bouton se change en « Exporté » le temps d'un instant pour confirmer.",
      side: 'bottom',
    },
    {
      anchor: 'consult-table',
      title: 'Résultats',
      body:
        "Une ligne par dossier. La consultation reste en lecture seule : pour modifier, passez par la Gestion des dossiers.",
      side: 'top',
    },
  ],
};
