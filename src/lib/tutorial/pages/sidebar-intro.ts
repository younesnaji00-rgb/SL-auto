import type { PageTutorial } from '../types';

/**
 * App-wide intro: the shell first (what surrounds every page), then the menu
 * TOP TO BOTTOM in the order the rows appear on screen — except Gestion des
 * dossiers, kept for last because the hand-off click into its walkthrough
 * ends the intro. Rows absent for the current role are auto-skipped by the
 * anchor-presence filter. Started by the welcome lightbox and the "?" button
 * (not route-matched).
 *
 * On phones and tablets the sidebar lives in an off-canvas sheet, so every
 * `nav-*` anchor is missing and the presence filter drops those steps: the
 * `shell-mobile-nav` step is the mobile counterpart, and conversely it is
 * absent on desktop. One step list, two layouts.
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
        "Faisons le tour de l'application : le cadre qui entoure chaque page, puis le menu de haut en bas — en gardant le meilleur pour la fin.",
    },

    // ── The shell: what surrounds every page ────────────────────────────
    {
      anchor: 'shell-breadcrumb',
      title: 'Où vous êtes',
      body:
        "Le fil d'Ariane en haut indique toujours votre position, et chaque niveau est cliquable pour remonter.\nSur téléphone, il devient une simple flèche « ‹ » vers le niveau du dessus.",
      side: 'bottom',
      cursorAt: 'left',
    },
    {
      anchor: 'shell-create',
      title: 'Créer, depuis n’importe où',
      body:
        "« Nouveau » crée un dossier sans quitter la page où vous êtes.\nAu clavier : la touche C.",
      side: 'bottom',
    },
    {
      anchor: 'shell-notifications',
      title: 'La cloche',
      body:
        "Vos rappels non lus, avec le compteur. Ouvrez-la pour les voir sans changer de page.",
      side: 'bottom',
    },
    {
      anchor: 'shell-user-menu',
      title: 'Votre compte',
      body:
        "Votre avatar ouvre le thème clair/sombre, le signalement de bug et la déconnexion.",
      side: 'bottom',
    },
    {
      title: 'Le clavier, si vous aimez ça',
      body:
        "Ctrl+K (⌘K sur Mac) ou la touche « / » ouvrent la recherche universelle : une référence, une plaque, un assuré, une page, une action.\nCtrl+B replie le menu, Maj+D bascule le thème, C crée un dossier.\nTout reste faisable à la souris — ces raccourcis ne font que gagner du temps.",
    },

    // ── The menu, top to bottom ─────────────────────────────────────────
    {
      anchor: 'nav-toggle',
      title: 'Replier le menu',
      body:
        "Ce bouton réduit le menu à ses icônes pour donner toute la largeur au tableau. Les libellés reviennent au survol.",
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
      anchor: 'nav-/mes-rappels',
      title: 'Les rappels',
      body:
        "Les demandes échangées entre collègues sur un dossier. La pastille indique combien attendent votre réponse.",
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
      body:
        "Les comptes et leurs droits. Juste en dessous : les tampons apposés sur les PDF et le calendrier des jours fériés — c'est lui qui rend le calcul des délais en heures ouvrées exact.",
      side: 'right',
    },
    {
      anchor: 'nav-recents',
      title: 'Vos derniers dossiers',
      body:
        "Les enregistrements que vous venez d'ouvrir restent à portée de clic, sans repasser par la liste.",
      side: 'right',
    },
    {
      anchor: 'nav-profil',
      title: 'Votre profil',
      body: 'Vos informations et vos préférences.',
      side: 'right',
    },
    {
      anchor: 'nav-aide-trigger',
      title: 'Le menu « Aide »',
      body:
        "Signaler un bug, et — si vous désactivez un jour le tutoriel — le réactiver depuis ici.",
      side: 'right',
    },

    // ── Mobile counterpart of the whole menu section ─────────────────────
    {
      anchor: 'shell-mobile-nav',
      title: 'La barre du bas',
      body:
        "Sur téléphone, les pages principales sont ici, et « Menu » ouvre le reste.\nLes mêmes écrans que sur ordinateur, à portée de pouce.",
      side: 'top',
    },

    // ── The tutorial button itself ───────────────────────────────────────
    {
      anchor: 'tutorial-launcher',
      title: 'Ce bouton « ? »',
      body:
        "Il relance la visite à tout moment et reprend là où vous vous étiez arrêté.\nGlissez-le pour le déplacer : il gêne un bouton ? Posez-le ailleurs, il retrouvera sa place au prochain écran.\nPour ne plus le voir du tout, choisissez « Ne plus afficher le tutoriel » dans la fenêtre d'accueil — le menu « Aide » vous le rendra.",
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
