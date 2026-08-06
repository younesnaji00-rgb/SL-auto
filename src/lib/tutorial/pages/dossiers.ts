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
      // Next without clicking: open the sheet for them — the next step
      // describes the OPEN sheet and must never show over a closed one.
      doIt: () => {
        document.querySelector<HTMLElement>('[data-tour="dos-statut-cell"]')?.click();
      },
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
      // NO auto-advance here — ticking the first box used to yank the user
      // to the next step before they could select several files.
      anchor: 'dos-table',
      title: 'Cochez les dossiers',
      body:
        'Cochez autant de dossiers que vous voulez dans la liste, puis cliquez sur « Suivant ».',
      side: 'top',
      dynamic: true,
      // Next with nothing ticked: tick the first two rows for them — the
      // send steps need a real selection to work with.
      onNext: () => {
        const checked = document.querySelector(
          '[data-tour="dos-table"] tbody [role="checkbox"][data-state="checked"]',
        );
        if (checked) return;
        const rows = document.querySelectorAll<HTMLElement>('[data-tour="dos-table"] tbody tr');
        rows[0]?.click();
        rows[1]?.click();
      },
    },
    {
      // Shown BEFORE the send: after « Envoyer », the app quits the
      // selection mode by itself, so this bar no longer exists.
      anchor: 'dos-export-cancel',
      title: 'Sortir de la sélection',
      body:
        "À tout moment, « Annuler » ressort du mode sélection sans rien envoyer.\nPas maintenant : continuons l'envoi.",
      side: 'bottom',
      dynamic: true,
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
        'Écrivez votre demande, choisissez le destinataire — pour la démo, choisissez-VOUS (« vous ») afin de jouer aussi le rôle du destinataire — puis « Envoyer ».\nChaque destinataire le reçoit dans « Mes Rappels » et vous êtes notifié — zéro e-mail perdu.',
      side: 'left',
      dynamic: true,
      interact: 'until',
      // Advance ONLY on a real send: the dialog was open, is now closed,
      // AND selection mode exited (sending does that; Cancel/✕ keeps it —
      // and an accidental outside-click close must not advance either).
      until: () => {
        const w = window as unknown as Record<string, boolean>;
        if (document.querySelector('[data-tour="dos-sendto-dialog"]')) {
          w['sl.sendtoSeen'] = true;
          return false;
        }
        return (
          !!w['sl.sendtoSeen'] &&
          !document.querySelector('[data-tour="dos-export-bar"]')
        );
      },
      // Next = send it for them: the Mes Rappels detour right after needs a
      // real rappel to exist. Self-recipient if none picked; if the dialog
      // was closed in the meantime, reopen it first.
      doIt: () => {
        const dlg = document.querySelector<HTMLElement>('[data-tour="dos-sendto-dialog"]');
        if (!dlg) {
          document.querySelector<HTMLElement>('[data-tour="dos-send-to"]')?.click();
          return;
        }
        if (!dlg.querySelector('[role="checkbox"][data-state="checked"]')) {
          const labels = Array.from(dlg.querySelectorAll<HTMLElement>('label'));
          (labels.find((l) => /\((vous|you)\)/i.test(l.textContent || '')) ?? labels[0])?.click();
        }
        window.setTimeout(() => {
          Array.from(dlg.querySelectorAll<HTMLButtonElement>('button'))
            .find((b) => /(Envoyer|Send)\s*\(/.test(b.textContent || ''))
            ?.click();
        }, 400);
      },
    },
    {
      anchor: 'nav-/mes-rappels',
      title: 'Suivons le rappel',
      body:
        'Votre rappel est parti — et comme vous êtes aussi destinataire, vous allez le recevoir.\nCliquez sur « Mes Rappels » dans le menu.',
      side: 'right',
      interact: 'click',
      chain: 'mes-rappels',
      chainResume: true,
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
        "1er expert : l'expert principal du dossier.\n2ème expert : intervient si l'assuré ou l'assureur adverse conteste, ou en cas de suspicion.\nArbitre : tranche un désaccord entre les deux experts.\nPlus il y a d'experts en jeu, plus le formulaire affiche de champs pour saisir leurs noms.\nCes procédures peuvent varier d'un pays à l'autre — et l'application peut toujours être adaptée sur mesure à vos façons de faire.",
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
