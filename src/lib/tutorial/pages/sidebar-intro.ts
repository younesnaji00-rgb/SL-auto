import type { PageTutorial } from '../types';

/**
 * App-wide intro: walks the sidebar TOP TO BOTTOM, exactly in the order the
 * rows appear on screen — except Gestion des dossiers, kept for last because
 * the hand-off click into its walkthrough ends the intro. Rows absent for
 * the current role are auto-skipped (anchor presence filter). Started by the
 * welcome lightbox and the "?" button (not route-matched).
 */
export const sidebarIntroTutorial: PageTutorial = {
  key: 'sidebar-intro',
  match: () => false,
  // Ends on the hand-off click into File Management — the shared closing
  // step would linger over the next page's walkthrough.
  noClosing: true,
  steps: [
    {
      title: 'Bienvenue !',
      body:
        "Faisons le tour du menu, de haut en bas — en gardant le meilleur pour la fin. 1 minute, promis.",
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
      anchor: 'nav-/mes-rappels',
      title: 'Les rappels',
      body: "Les demandes échangées entre collègues sur un dossier.",
      side: 'right',
    },
    {
      anchor: 'nav-/consultation',
      title: 'La recherche',
      body: 'Retrouver un dossier en lecture seule, sans risque.',
      side: 'right',
    },
    {
      anchor: 'nav-/compagnies',
      title: 'Les compagnies',
      body: "Les compagnies d'assurance avec lesquelles vous travaillez, et leurs dossiers.",
      side: 'right',
    },
    {
      anchor: 'nav-/assignations-chiffrage',
      title: 'Les chiffrages',
      body: 'Les devis des garages, à vérifier par vos chiffreurs.',
      side: 'right',
    },
    {
      anchor: 'nav-/assignations-atg',
      title: 'Le terrain',
      body: 'Les missions photo des agents sur le terrain (avant, pendant, après réparations).',
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
      title: 'Gestion des dossiers — le cœur',
      body:
        "Tous les dossiers vivent ici, de la création à la facture — le meilleur pour la fin.\nCliquez sur « Gestion des dossiers » pour continuer la visite là-bas.",
      side: 'right',
      interact: 'click',
      // The launchers pre-write the pending flag too (for their same-page
      // fallbacks); declaring the chain here as well lets the engine's
      // hand-off machinery write the flags when the user clicks.
      chain: 'dossiers',
    },
  ],
};
