import type { PageTutorial } from '../types';

/**
 * Gestion des dossiers — the gestionnaire's main worklist.
 * Anchors: `dos-*` in src/app/(app)/dossiers/client-page.tsx.
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
      anchor: 'dos-rappeler',
      title: 'Envoyer des rappels',
      body: 'Cochez des dossiers et envoyez une demande à un collègue.',
      side: 'bottom',
    },
    {
      anchor: 'dos-table',
      title: 'La liste',
      body: 'Chaque ligne est un dossier.',
      side: 'top',
    },
    {
      anchor: 'dos-table',
      title: 'Défilement horizontal',
      body: 'Glissez la barre en bas du tableau pour voir toutes les colonnes.',
      side: 'top',
    },
    {
      anchor: 'dos-pagination',
      title: 'Pagination',
      body: 'Choisissez le nombre de lignes par page.',
      side: 'top',
    },
    {
      title: 'À vous de créer un dossier !',
      body:
        'Téléchargez le kit de démonstration : un document de mission, des photos du véhicule et un devis de garage (tous fictifs).\nVous allez suivre un vrai dossier du début à la fin.',
      link: { href: '/demo-kit/demo-kit.zip', label: 'Télécharger le kit', download: true },
    },
    {
      anchor: 'dos-create',
      title: 'Créer le dossier',
      body: 'Cliquez sur « Création de mission ».',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dos-create-compagnie',
      title: 'La compagnie',
      body: 'Choisissez « Laurentide Assurance » — la compagnie du document du kit.',
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'dos-create-submit',
      title: 'Créer',
      body: "Cliquez sur « Créer » : le dossier s'ouvre aussitôt.",
      side: 'top',
      dynamic: true,
      interact: 'click',
      chain: 'dossier-detail',
    },
  ],
  // Ends on the click that creates and opens the dossier — the guide (and
  // the closing pitch) continues on the dossier-detail walkthrough.
  noClosing: true,
};
