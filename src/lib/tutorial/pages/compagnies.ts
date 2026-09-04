import type { PageTutorial } from '../types';

// The page has two exclusive modes: the cards grid (no compagnie selected)
// and the per-compagnie dashboard (?selected=…). Steps auto-skip when their
// anchor is absent, so one step list covers both modes. Card clicks change
// the page mode, so nothing is hands-on here.
export const compagniesTutorial: PageTutorial = {
  key: 'compagnies',
  match: (p) => p.startsWith('/compagnies'),
  steps: [
    {
      title: 'Compagnies partenaires',
      body: "Chaque compagnie d'assurance a sa carte et son propre tableau de bord.",
    },
    {
      anchor: 'cie-grid',
      title: 'Choisir une compagnie',
      body: 'Cliquez sur une carte pour ouvrir son tableau de bord.',
      side: 'top',
    },
    {
      anchor: 'cie-logo',
      title: 'Le logo',
      body: "Cliquez sur l'encadré pour importer ou remplacer le logo.",
      side: 'bottom',
    },
    {
      anchor: 'cie-stats',
      title: 'Indicateurs',
      body: 'Total, nouveaux, en cours et terminés sur la période.',
      side: 'bottom',
    },
    {
      anchor: 'cie-table',
      title: 'Portefeuille',
      body: 'Tous les dossiers de la compagnie, en temps réel.',
      side: 'top',
    },
    {
      anchor: 'cie-new',
      title: 'Créer un dossier',
      body: 'La compagnie est déjà pré-remplie.',
      side: 'bottom',
    },
  ],
};
