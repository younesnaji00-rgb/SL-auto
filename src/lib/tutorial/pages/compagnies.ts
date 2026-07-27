import type { PageTutorial } from '../types';

// The page has two exclusive modes: the cards grid (no compagnie selected)
// and the per-compagnie dashboard (?selected=…). Steps auto-skip when their
// anchor is absent, so one step list covers both modes.
export const compagniesTutorial: PageTutorial = {
  key: 'compagnies',
  match: (p) => p.startsWith('/compagnies'),
  steps: [
    {
      title: 'Compagnies partenaires',
      body:
        "Cette page liste les compagnies d'assurance partenaires du cabinet. Chaque compagnie dispose de son propre tableau de bord avec ses indicateurs et ses dossiers.",
    },
    {
      anchor: 'cie-grid',
      title: 'Choisir une compagnie',
      body:
        "Cliquez sur une carte pour ouvrir le tableau de bord de la compagnie : statistiques, portefeuille de dossiers et création de dossier pré-remplie.",
      side: 'top',
    },
    {
      anchor: 'cie-logo',
      title: 'Logo de la compagnie',
      body:
        "Cliquez sur l'encadré du logo pour importer ou remplacer l'image de la compagnie. Ce logo apparaît ensuite sur ses cartes et documents.",
      side: 'bottom',
    },
    {
      anchor: 'cie-stats',
      title: 'Indicateurs clés',
      body:
        "Le volume de dossiers de la compagnie sur la période filtrée : total, nouveaux, en cours et terminés.",
      side: 'bottom',
    },
    {
      anchor: 'cie-table',
      title: 'Portefeuille de dossiers',
      body:
        "Tous les dossiers de la compagnie en temps réel. Filtrez par période avec les dates en haut à droite, puis ouvrez un dossier via l'icône de la colonne Gérer.",
      side: 'top',
    },
    {
      anchor: 'cie-new',
      title: 'Créer un dossier',
      body:
        "Ouvre le formulaire de création d'un dossier avec la compagnie déjà pré-remplie.",
      side: 'bottom',
    },
  ],
};
