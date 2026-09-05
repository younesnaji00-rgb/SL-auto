import type { PageTutorial } from '../types';

/**
 * Mes rappels — reminders exchanged about files. In the guided journey the
 * user arrives here right after sending a rappel TO THEMSELVES (demo brand
 * allows self-addressed rappels): they see the sender side (Envoyés), then
 * play the recipient — the row click opens the dossier in a treatment
 * session (chains into dossier-detail's hidden rappel steps). On return
 * (`chainAt` 'Le travail effectué') the SENDER side takes over: Envoyés tab
 * → « Voir le détail » → the replay lightbox shows every change
 * color-highlighted — then the journey goes back to the treated dossier
 * through File Management (its row is picked out on the list).
 */
export const mesRappelsTutorial: PageTutorial = {
  key: 'mes-rappels',
  match: (p) => p === '/mes-rappels',
  steps: [
    {
      title: 'Mes rappels',
      body:
        'Les demandes de travail échangées avec vos collègues sur les dossiers.\nLe rappel envoyé il y a un instant est déjà arrivé — en direct.',
    },
    {
      anchor: 'rap-tabs',
      title: 'Reçus et Envoyés',
      body: '« Reçus » : pour vous. « Envoyés » : de vous.',
      side: 'bottom',
    },
    {
      anchor: 'rap-tab-envoyes',
      title: 'Vos envois',
      body: 'Cliquez sur « Envoyés » pour suivre vos rappels côté expéditeur.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'rap-envoyes-table',
      title: 'Le suivi par destinataire',
      body:
        "Chaque envoi est suivi : Nouveau, Lu, Traité — par destinataire et par dossier.\nUne fois le rappel traité, « Voir le détail » (dans la ligne dépliée) vous rejouera les modifications du destinataire, en couleurs.\nVous saurez toujours qui a fait quoi, et quand.",
      side: 'bottom',
      // dynamic: the Envoyés table is unmounted until its tab is clicked.
      // onlyIf: some roles never see the Envoyés tab at all.
      dynamic: true,
      onlyIf: () => !!document.querySelector('[data-tour="rap-tab-envoyes"]'),
    },
    {
      anchor: 'rap-tabs',
      title: 'Retour aux reçus',
      body: 'Cliquez sur « Reçus » : jouons maintenant le rôle du destinataire.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'rap-recus-table',
      title: 'La file et le détail',
      body:
        "Sur grand écran, la liste des rappels reçus tient à gauche et le détail du rappel sélectionné à droite : vous les traitez à la file sans perdre votre place.\nSur petit écran, le détail passe simplement sous la liste.",
      side: 'top',
      dynamic: true,
      cursorAt: 'left',
    },
    {
      anchor: 'rap-statut',
      title: 'Statuts',
      body: 'Nouveau, Lu ou Traité — la colonne dit où en est chaque demande.',
      side: 'left',
    },
    {
      // Anchor the REFERENCE cell, not the whole row: the middle cells
      // (Observations / Modifications) swallow clicks on purpose, and a
      // click there would advance the tour without opening the session.
      anchor: 'rap-row-ref',
      title: 'Traitez votre rappel',
      body:
        "Cliquez sur la référence de votre rappel : le dossier s'ouvre en « session de traitement ».\nTout ce que vous y modifierez sera tracé pour l'expéditeur.",
      side: 'bottom',
      interact: 'click',
      chain: 'dossier-detail',
      chainAt: 'Le traitement commence',
    },
    // ── Hidden re-entry (chainAt from the dossier treatment hop-back) ──
    // The review lives on the SENDER side: « Voir le détail » sits in the
    // Envoyés tab — the recipient list only opens the dossier itself.
    {
      click: 'rap-tab-envoyes',
      delay: 500,
      anchor: 'rap-envoyes-group',
      title: 'Le travail effectué',
      body:
        'Votre rappel est passé en « Traité » — et c’est l’EXPÉDITEUR qui vérifie le travail, depuis « Envoyés ».\nDépliez la ligne de votre envoi.',
      side: 'bottom',
      dynamic: true,
      onlyIf: () => !!document.querySelector('[data-tour="rap-recus-table"]'),
      interact: 'click',
    },
    {
      anchor: 'rap-detail-btn',
      title: 'Voir le détail',
      body:
        'Cliquez sur « Voir le détail » : vous voyez le dossier exactement comme le gestionnaire l’a laissé.',
      side: 'left',
      dynamic: true,
      onlyIf: () => !!document.querySelector('[data-tour="rap-recus-table"]'),
      interact: 'click',
    },
    {
      anchor: 'rap-replay-head',
      title: 'Qui et quand',
      body:
        'Tout est dans l’en-tête : le gestionnaire qui a traité, l’heure de début de sa session et l’heure de la sauvegarde.',
      side: 'bottom',
      dynamic: true,
      onlyIf: () => !!document.querySelector('[data-tour="rap-recus-table"]'),
    },
    {
      anchor: 'rap-replay-summary',
      title: 'Le résumé des changements',
      body:
        'Le compte exact de ce qui a changé : vert = ajouts, jaune = modifications, rouge = suppressions.',
      side: 'bottom',
      dynamic: true,
      onlyIf: () => !!document.querySelector('[data-tour="rap-recus-table"]'),
    },
    {
      anchor: 'rap-replay',
      title: 'Les modifications en couleurs',
      body:
        'Le dossier est reproduit tel que le gestionnaire l’a laissé : faites défiler — chaque champ touché est surligné de sa couleur, sur place.\nParcourez, puis « Suivant ».',
      side: 'left',
      dynamic: true,
      onlyIf: () => !!document.querySelector('[data-tour="rap-recus-table"]'),
      // Close the lightbox when advancing so the sidebar is reachable.
      onNext: () => {
        document
          .querySelector<HTMLElement>('[data-tour="rap-replay"] button.absolute')
          ?.click();
      },
    },
    {
      // Back to the treated dossier THROUGH File Management — the normal
      // path — where its own row is highlighted; the dossier-detail
      // epilogue then hands back to the main journey.
      anchor: 'nav-/dossiers',
      title: 'Retour par la Gestion des dossiers',
      body:
        'Zéro e-mail, zéro doute sur qui a changé quoi.\nRevenons au dossier par le chemin normal : cliquez sur « Gestion des dossiers » dans le menu — on vous montrera sa ligne.',
      side: 'right',
      dynamic: true,
      onlyIf: () => !!document.querySelector('[data-tour="rap-recus-table"]'),
      interact: 'click',
      chain: 'dossiers',
      chainAt: 'Rouvrez le dossier traité',
    },
  ],
  // Mid-journey side trip — the closing pitch lives at the end of the
  // dossier journey.
  noClosing: true,
};
