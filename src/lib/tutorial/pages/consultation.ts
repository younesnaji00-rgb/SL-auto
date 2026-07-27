import type { PageTutorial } from '../types';

/**
 * EXEMPLAR tutorial — the conventions every page tutorial follows
 * (see docs/TUTORIALS.md):
 *  1. First step has no anchor = centered intro explaining WHAT the page is
 *     for and WHO uses it.
 *  2. Then one step per functional zone, in the order a user works.
 *  3. Titles short; bodies 1–3 sentences, concrete, plain language.
 *  4. Texts are FRENCH (i18n keys); EN lives in src/i18n/en/tutorial-*.ts.
 */
export const consultationTutorial: PageTutorial = {
  key: 'consultation',
  match: (p) => p === '/consultation',
  steps: [
    {
      title: 'Consultation des dossiers',
      body:
        "Cette page est une vue de recherche en lecture seule sur tous les dossiers du cabinet. Elle sert aux directeurs et responsables pour retrouver un dossier rapidement, sans risque de modification.",
    },
    {
      anchor: 'consult-search',
      title: 'Recherche rapide',
      body:
        "Tapez une référence, un nom d'assuré ou une immatriculation : la liste se filtre au fur et à mesure de la saisie.",
      side: 'bottom',
    },
    {
      anchor: 'consult-nature',
      title: 'Filtrer par nature',
      body: 'Limitez la liste à un type de sinistre (RC, Dommages, Vol…).',
      side: 'bottom',
    },
    {
      anchor: 'consult-statut',
      title: 'Filtrer par statut',
      body:
        "Chaque dossier avance dans un flux de statuts (création → planification → chiffrage → accord → rapport). Ce filtre affiche les dossiers à une étape précise.",
      side: 'bottom',
    },
    {
      anchor: 'consult-compagnie',
      title: 'Filtrer par compagnie',
      body: "Affichez uniquement les dossiers d'une compagnie d'assurance.",
      side: 'bottom',
    },
    {
      anchor: 'consult-table',
      title: 'Résultats',
      body:
        "Les dossiers correspondants s'affichent ici avec leur statut en couleur. Cliquez sur une ligne pour ouvrir le dossier complet.",
      side: 'top',
    },
  ],
};
