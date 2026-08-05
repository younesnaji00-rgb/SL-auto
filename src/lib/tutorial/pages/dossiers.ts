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
      anchor: 'dos-col-nature',
      title: 'Filtres de colonne',
      body: "Cliquez sur l'entonnoir, puis choisissez un type dans la liste.",
      side: 'bottom',
      interact: 'until',
      until: () => !!document.querySelector('[data-tour="dos-filter-chip-nature"]'),
    },
    {
      anchor: 'dos-reset',
      title: 'Tout réinitialiser',
      body: 'Cliquez ici pour effacer la recherche et les filtres.',
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
      anchor: 'dos-statut-cell',
      title: 'La séquence des étapes',
      body: "Cliquez sur la pastille de statut d'un dossier.",
      side: 'bottom',
      interact: 'until',
      until: () => !!document.querySelector('[data-tour="dos-status-sheet"]'),
    },
    {
      anchor: 'dos-status-sheet',
      title: 'Toute la vie du dossier',
      body:
        "Chaque changement de statut, dans l'ordre : qui, quand, quoi.\nRegardez, puis fermez (×) pour continuer.",
      side: 'left',
      dynamic: true,
      interact: 'until',
      // Advance once the sheet has been OPEN and is closed again (a plain
      // "sheet absent" predicate would be true at tour start and the step
      // would be skipped by the engine's already-satisfied filter).
      until: () => {
        const w = window as unknown as Record<string, boolean>;
        if (document.querySelector('[data-tour="dos-status-sheet"]')) {
          w['sl.statusSheetSeen'] = true;
          return false;
        }
        return !!w['sl.statusSheetSeen'];
      },
      // Advancing with Next must retract the sheet — the next steps anchor
      // to the toolbar it covers.
      onNext: () => {
        document
          .querySelector<HTMLElement>('[data-tour="dos-status-sheet"] button.absolute')
          ?.click();
      },
    },
    {
      anchor: 'dos-rappeler',
      title: 'Envoyer des rappels',
      body: 'Une demande à un collègue sur des dossiers précis ? Cliquez sur « Rappeler ».',
      side: 'bottom',
      interact: 'click',
    },
    {
      // Anchor the TABLE, not the selection toolbar: the driver overlay
      // only lets clicks through inside the highlight cutout, so the rows
      // must BE the highlighted region for the checkboxes to be tickable.
      anchor: 'dos-table',
      title: 'Cochez les dossiers',
      body: 'Cochez un ou plusieurs dossiers dans la liste.',
      side: 'top',
      dynamic: true,
      interact: 'until',
      // tbody scope: in selection mode the table HEADER also renders
      // per-column checkboxes that are all checked by default — matching
      // them would self-advance the step before any file is ticked.
      until: () =>
        !!document.querySelector(
          '[data-tour="dos-table"] tbody [role="checkbox"][data-state="checked"]',
        ),
    },
    {
      anchor: 'dos-send-to',
      title: 'Envoyez la demande',
      body: 'Cliquez sur « Envoyer à ».',
      side: 'bottom',
      dynamic: true,
      interact: 'click',
    },
    {
      anchor: 'dos-sendto-dialog',
      title: 'Le rappel',
      body:
        'Choisissez le ou les collègues, écrivez votre demande, puis « Envoyer ».\nChaque destinataire le reçoit dans « Mes Rappels », traite le dossier, et vous êtes notifié — zéro e-mail perdu.',
      side: 'left',
      dynamic: true,
      interact: 'until',
      until: () => {
        const w = window as unknown as Record<string, boolean>;
        if (document.querySelector('[data-tour="dos-sendto-dialog"]')) {
          w['sl.sendtoSeen'] = true;
          return false;
        }
        return !!w['sl.sendtoSeen'];
      },
      // Next while the dialog is still open: close it so the export bar
      // steps underneath are reachable.
      onNext: () => {
        document
          .querySelector<HTMLElement>('[data-tour="dos-sendto-dialog"] button.absolute')
          ?.click();
      },
    },
    {
      anchor: 'dos-export-cancel',
      title: 'Sortir de la sélection',
      body: "Pas envoyé ? « Annuler » ressort du mode sélection.",
      side: 'bottom',
      dynamic: true,
      interact: 'until',
      // Seen-flag pattern: "bar absent" alone is true BEFORE selection mode
      // ever starts, and the start filter would drop the step entirely —
      // leaving the tour stuck in selection mode with no create button.
      until: () => {
        const w = window as unknown as Record<string, boolean>;
        if (document.querySelector('[data-tour="dos-export-bar"]')) {
          w['sl.exportBarSeen'] = true;
          return false;
        }
        return !!w['sl.exportBarSeen'];
      },
      // Next = do it for me: leave selection mode so the rest of the tour
      // gets the normal toolbar back.
      onNext: () => {
        document.querySelector<HTMLElement>('[data-tour="dos-export-cancel"]')?.click();
      },
    },
    {
      anchor: 'dos-table',
      title: 'La liste',
      body: 'Chaque ligne est un dossier.',
      side: 'top',
    },
    {
      anchor: 'dos-hscroll',
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
        "Vous allez suivre un vrai dossier du début à la fin, avec des documents fictifs fournis à chaque étape (document de mission, photos, devis).\nCommençons par créer le dossier.",
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
      anchor: 'dos-create-role',
      title: "Votre rôle d'expert",
      body:
        "1er expert : l'expert principal du dossier.\n2ème expert : intervient si l'assuré ou l'assureur adverse conteste, ou en cas de suspicion.\nArbitre : tranche un désaccord entre les deux experts.\nCes procédures peuvent varier d'un pays à l'autre.",
      side: 'right',
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
    // Hidden re-entry step — only reachable via `chainAt` from the ATG /
    // editor hop-backs (the previous step always navigates away).
    {
      anchor: 'dos-table',
      title: 'Rouvrez votre dossier',
      body:
        "Votre dossier est en haut de la liste : cliquez sur sa ligne pour reprendre la visite.\nSon onglet en haut (comme un navigateur) y ramène aussi — et dans le dossier, la frise des étapes vous ramène à l'étape où vous étiez.",
      side: 'top',
      interact: 'click',
      chain: 'dossier-detail',
      // Written at highlight time: the dossier TAB is a valid route back
      // too, not just the table row.
      chainEager: true,
    },
  ],
  // Ends on the click that creates and opens the dossier — the guide (and
  // the closing pitch) continues on the dossier-detail walkthrough.
  noClosing: true,
};
