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
  lab: [
    {
      anchor: 'consult-search',
      title: 'La recherche',
      body:
        "Cliquez dans le champ de recherche : c'est ici que vous taperiez une référence, un nom d'assuré ou une immatriculation.",
      action: 'click',
    },
    {
      anchor: 'consult-nature',
      title: 'Filtrer par nature',
      body: 'Cliquez sur le filtre de nature pour ouvrir sa liste (RC, Dommages, Vol…).',
      action: 'click',
    },
    {
      anchor: 'consult-statut',
      title: 'Filtrer par statut',
      body:
        'La liste se fermera à votre prochain clic. Ce filtre-ci affiche les dossiers à une étape précise du flux : création → planification → chiffrage → accord → rapport.',
      action: 'observe',
    },
    {
      anchor: 'consult-statut',
      title: 'Ouvrez le filtre statut',
      body: 'Cliquez sur le filtre de statut pour voir les étapes disponibles.',
      action: 'click',
    },
    {
      anchor: 'consult-compagnie',
      title: 'Filtrer par compagnie',
      body:
        'La liste se fermera à votre prochain clic. Ce dernier filtre limite les résultats à une seule compagnie d\'assurance.',
      action: 'observe',
    },
    {
      anchor: 'consult-table',
      title: 'Résultats',
      body:
        "Les dossiers filtrés s'affichent ici avec leur statut en couleur ; un clic sur une ligne ouvrirait le dossier, en lecture seule.",
      action: 'observe',
    },
  ],
};
