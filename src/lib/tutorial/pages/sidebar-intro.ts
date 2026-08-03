import type { PageTutorial } from '../types';

/**
 * App-wide intro: explains the sidebar rows in the order a FILE actually
 * travels, then hands off to the File Management walkthrough. Started by
 * the welcome lightbox and the sidebar "?" button (not route-matched).
 */
export const sidebarIntroTutorial: PageTutorial = {
  key: 'sidebar-intro',
  match: () => false,
  steps: [
    {
      title: 'Bienvenue !',
      body: "Faisons le tour du menu, dans l'ordre de vie d'un dossier. 1 minute, promis.",
    },
    {
      anchor: 'nav-/dossiers',
      title: 'Gestion des dossiers — le cœur',
      body: "Tous les dossiers vivent ici, de la création à la facture. Tout le reste s'y rattache.",
      side: 'right',
    },
    {
      anchor: 'nav-/assignations-atg',
      title: 'Ensuite : les photos',
      body: 'Les missions photo des agents sur le terrain (avant, pendant, après réparations).',
      side: 'right',
    },
    {
      anchor: 'nav-/assignations-chiffrage',
      title: 'Puis : le chiffrage',
      body: 'Les devis des garages, à vérifier par vos chiffreurs.',
      side: 'right',
    },
    {
      anchor: 'nav-/mes-rappels',
      title: 'Les rappels',
      body: "Les demandes échangées entre collègues sur un dossier.",
      side: 'right',
    },
    {
      anchor: 'nav-/dashboard',
      title: 'La vue d’ensemble',
      body: "L'activité en direct : volumes, statuts, derniers changements.",
      side: 'right',
    },
    {
      anchor: 'nav-/monitoring',
      title: 'Les délais',
      body: "Chaque étape : à l'heure, en retard, ou à faire.",
      side: 'right',
    },
    {
      anchor: 'nav-/consultation',
      title: 'La recherche',
      body: 'Retrouver un dossier en lecture seule, sans risque.',
      side: 'right',
    },
    {
      anchor: 'nav-/utilisateurs',
      title: 'L’administration',
      body: 'Comptes, compagnies, tampons, jours fériés : la configuration du cabinet.',
      side: 'right',
    },
    {
      anchor: 'nav-/dossiers',
      title: 'À vous de jouer',
      body: 'Cliquez sur « Gestion des dossiers » pour continuer la visite là-bas.',
      side: 'right',
      interact: 'click',
    },
  ],
};
