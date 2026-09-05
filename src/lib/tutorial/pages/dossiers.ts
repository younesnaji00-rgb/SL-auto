import type { PageTutorial } from '../types';
import { treatedDossierKey } from '../keys';

// Reset-watch for the reminder sub-flow: true once the selection toolbar was
// SEEN and is now gone (the user clicked « Annuler ») — the reminder steps
// depend on selection mode, so the tour jumps back to « Envoyer des
// rappels » to rebuild it. Seen-flag is consumed so re-entry re-arms.
const selectionGone = () => {
  const w = window as unknown as Record<string, boolean>;
  if (document.querySelector('[data-tour="dos-export-bar"]')) {
    w['sl.selBarSeen'] = true;
    return false;
  }
  if (w['sl.selBarSeen']) {
    w['sl.selBarSeen'] = false;
    return true;
  }
  return false;
};

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
        "Votre vue d'ensemble : chaque ligne du tableau est un dossier.\nD'un coup d'œil : où chacun est rendu (son statut), qui a fait la dernière action et quand, la compagnie, l'échéance… et des filtres dédiés pour retrouver n'importe quoi en une seconde.\nDe la création à la facture, tout part d'ici — et à la création, l'IA lit le document de mission et remplit le dossier pour vous.",
    },
    {
      anchor: 'dos-scope-tabs',
      title: 'À traiter, ou tout',
      body:
        "« À traiter » — la vue par défaut — ne montre que les dossiers qui attendent encore quelque chose de vous. « Tous » ouvre l'archive complète.\nLe compteur de chaque onglet dit combien il y en a.",
      side: 'bottom',
      cursorAt: 'left',
    },
    {
      anchor: 'dos-kpis',
      title: 'Les compteurs sont des filtres',
      body:
        "Ces quatre tuiles ne font pas qu'afficher : cliquez sur « En retard » et la liste se réduit aux dossiers en retard, triés du plus ancien au plus récent.\nLa tuile active reste soulignée pour que vous sachiez toujours ce que vous regardez.",
      side: 'bottom',
    },
    {
      // Presentational: interacting with the field must NOT advance the
      // tour — the user tries it, then clicks « Suivant » himself.
      anchor: 'dos-search',
      title: 'Recherche rapide',
      body: 'Cliquez dans le champ : vous y taperez un nom, une référence ou une immatriculation.',
      side: 'bottom',
    },
    {
      anchor: 'dos-views',
      title: 'Enregistrer une vue',
      body:
        "Une combinaison de filtres que vous refaites tous les matins ? Enregistrez-la ici et rappelez-la en un clic — recherche, période, colonnes et densité comprises.",
      side: 'bottom',
    },
    {
      anchor: 'dos-date-presets',
      title: 'Filtrer par date',
      body: 'Cliquez sur Jour, Semaine ou Mois.',
      side: 'bottom',
    },
    {
      anchor: 'dos-affichage',
      title: 'Colonnes et densité',
      body:
        "« Affichage » masque les colonnes dont vous n'avez pas besoin et resserre ou aère les lignes.\nC'est par écran et par personne : votre réglage ne change rien pour vos collègues.",
      side: 'bottom',
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
      // The PILL itself, not the whole cell — the user must see exactly
      // where to click.
      anchor: 'dos-statut-pill',
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
      // NO auto-advance here — ticking the first box used to yank the user
      // to the next step before they could select several files.
      anchor: 'dos-table',
      title: 'Cochez les dossiers',
      body:
        'Cochez autant de dossiers que vous voulez dans la liste, puis cliquez sur « Suivant ».',
      side: 'top',
      dynamic: true,
      // The whole table stays highlighted (the checkboxes must be inside
      // the cutout) but the hand points at the first row's checkbox.
      cursorSel: '[data-tour="dos-table"] tbody [role="checkbox"]',
      resetIf: selectionGone,
      resetTo: 'Envoyer des rappels',
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
      // The Cancel explainer is folded in here: a separate step for it sat
      // between the selection and the send, and after « Envoyer » the app
      // leaves selection mode by itself so that bar would be gone anyway.
      anchor: 'dos-send-to',
      title: 'Envoyez la demande',
      body:
        "« Annuler », à gauche, ressort du mode sélection sans rien envoyer.\nQuand votre sélection est prête, cliquez sur « Envoyer à ».",
      side: 'bottom',
      dynamic: true,
      interact: 'click',
      resetIf: selectionGone,
      resetTo: 'Envoyer des rappels',
    },
    {
      anchor: 'dos-sendto-dialog',
      title: 'Le rappel',
      body:
        'Choisissez le destinataire — pour la démo, choisissez-VOUS (« vous ») afin de jouer aussi le rôle du destinataire — puis « Envoyer ».\nChaque destinataire le reçoit dans « Mes Rappels » et vous êtes notifié — zéro e-mail perdu.',
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
      // Dialog dismissed WITHOUT sending (selection bar still there): step
      // back to « Envoyez la demande » so the user can reopen it. Consumes
      // the seen-flag so a later real send is detected cleanly.
      resetIf: () => {
        const w = window as unknown as Record<string, boolean>;
        if (
          w['sl.sendtoSeen'] &&
          !document.querySelector('[data-tour="dos-sendto-dialog"]') &&
          !!document.querySelector('[data-tour="dos-export-bar"]')
        ) {
          w['sl.sendtoSeen'] = false;
          return true;
        }
        return false;
      },
      resetTo: 'Envoyez la demande',
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
    // (The old "each row is a file" stop lived here — its content moved up
    // into the page intro, so the return from the reminder loop lands
    // straight on the horizontal-scroll step.)
    {
      anchor: 'dos-row',
      title: 'Un aperçu, sans quitter la liste',
      body:
        "Un simple clic sur une ligne ouvre un panneau d'aperçu à droite : l'essentiel du dossier, la liste toujours visible derrière.\nCliquez sur une ligne pour l'ouvrir.",
      side: 'top',
      interact: 'until',
      until: () => !!document.querySelector('[data-tour="dos-peek"]'),
    },
    {
      anchor: 'dos-peek',
      title: 'Le panneau d’aperçu',
      body:
        "Assuré, véhicule, statut, échéance — de quoi décider sans ouvrir le dossier.\nDe là : « Ouvrir » va au dossier complet, ou vous refermez et vous passez au suivant. Échap le referme.",
      side: 'left',
      dynamic: true,
    },
    {
      title: 'Au clavier, la liste se parcourt seule',
      body:
        "↑ ↓ (ou J et K) passent d'une ligne à l'autre, Entrée ouvre, Espace affiche l'aperçu, X coche la ligne, Échap referme tout.\nDe quoi trier une file entière sans lâcher le clavier.",
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
        "Votre dossier est en haut de la liste : cliquez sur sa ligne pour reprendre la visite.\nSon onglet, dans la barre d'onglets sous l'en-tête, y ramène aussi — et dans le dossier, la frise des étapes vous ramène à l'étape où vous étiez.",
      side: 'top',
      interact: 'click',
      chain: 'dossier-detail',
      // Written at highlight time: the dossier TAB is a valid route back
      // too, not just the table row.
      chainEager: true,
    },
    // Hidden re-entry — reached via `chainAt` from the end of the reminder
    // loop: back from Mes Rappels THROUGH File Management (the normal path),
    // the treated dossier's own row is highlighted to reopen it.
    {
      anchor: 'dos-row',
      title: 'Rouvrez le dossier traité',
      body:
        'Le dossier de votre rappel est ici, dans la liste — sa ligne est entourée.\nCliquez dessus pour le rouvrir et voir vos modifications sur le vrai dossier.',
      side: 'top',
      dynamic: true,
      interact: 'click',
      anchorPick: (els) => {
        try {
          const id = window.localStorage.getItem(treatedDossierKey());
          return id ? els.find((el) => el.dataset.dossierId === id) : undefined;
        } catch {
          return undefined;
        }
      },
      chain: 'dossier-detail',
      chainAt: 'Vos modifications sont publiées',
    },
  ],
  // Ends on the click that creates and opens the dossier — the guide (and
  // the closing pitch) continues on the dossier-detail walkthrough.
  noClosing: true,
};
