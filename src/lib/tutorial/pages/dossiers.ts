import type { PageTutorial } from '../types';

/**
 * Gestion des dossiers — the gestionnaire's main worklist.
 * Anchors: `dos-*` in src/app/(app)/dossiers/client-page.tsx
 * (+ `dos-tabs` on the shared dossier tabs bar in the app layout).
 * Interactive steps stick to safe targets (search focus, date preset,
 * reset, column filter) — the reset step restores the full list right
 * after the date preset may have emptied it.
 */
export const dossiersTutorial: PageTutorial = {
  key: 'dossiers',
  match: (p) => p === '/dossiers',
  steps: [
    {
      title: 'Gestion des dossiers',
      body:
        "Tous vos dossiers, de la création à la facture.\nÀ la création, l'IA lit le document de mission et remplit le dossier pour vous.",
    },
    {
      anchor: 'dos-search',
      title: 'Recherche rapide',
      body: 'Cliquez dans le champ : vous y taperez un nom, une référence ou une immatriculation.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dos-date-presets',
      title: 'Filtrer par date',
      body: 'Cliquez sur Jour, Semaine ou Mois.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dos-reset',
      title: 'Tout réinitialiser',
      body: 'Cliquez ici pour effacer la recherche et les filtres.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dos-col-nature',
      title: 'Filtres de colonne',
      body: "Cliquez sur l'entonnoir : chaque colonne a son propre filtre.",
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dos-col-statut',
      title: 'Colonne Statut',
      body: 'Le badge coloré montre où en est chaque dossier.',
      side: 'bottom',
    },
    {
      anchor: 'dos-create',
      title: 'Créer un dossier',
      body: "Ce bouton crée un dossier ; l'IA le remplit en lisant le document de mission.",
      side: 'bottom',
    },
    {
      anchor: 'dos-rappeler',
      title: 'Envoyer des rappels',
      body: 'Cochez des dossiers et envoyez une demande à un collègue.',
      side: 'bottom',
    },
    {
      anchor: 'dos-table',
      title: 'La liste',
      body: "Chaque ligne est un dossier ; cliquez dessus pour l'ouvrir.",
      side: 'top',
    },
    {
      anchor: 'dos-pagination',
      title: 'Pagination',
      body: 'Choisissez le nombre de lignes par page.',
      side: 'top',
    },
    {
      anchor: 'dos-tabs',
      title: 'Onglets de dossiers',
      body: 'Chaque dossier ouvert reste ici, comme dans un navigateur.',
      side: 'bottom',
    },
  ],
};
