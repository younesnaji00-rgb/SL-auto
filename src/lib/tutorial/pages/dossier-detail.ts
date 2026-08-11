import type { PageTutorial } from '../types';
import { treatedDossierKey } from '../keys';

// The photo grids group shots into COLLAPSED day rows, so counting <img>
// nodes misses fresh uploads — read the "N/30" counter badge instead.
const photosPresent = (cat: string) => () => {
  const el = document.querySelector(`[data-tour="dosd-photos-${cat}"]`);
  const m = el?.textContent?.match(/(\d+)\s*\/\s*\d+/);
  return !!m && Number(m[1]) > 0;
};

const slotFilled = (anchor: string) =>
  !!document.querySelector(`[data-tour="${anchor}"] ul li`);

// True while THIS dossier is open as a rappel-treatment session (handshake
// key written by the Mes Rappels row click, cleared on save). While live,
// the dossier id is stashed under the tour's own key: the epilogue re-enters
// this dossier AFTER the save (through File Management), when the handshake
// key is already gone.
const rappelSessionActive = () => {
  try {
    const id = window.location.pathname.split('/').pop() || '';
    const on = !!id && !!window.localStorage.getItem(`rappel-active-session-${id}`);
    if (on) window.localStorage.setItem(treatedDossierKey(), id);
    return on;
  } catch {
    return false;
  }
};

// Epilogue gate: the dossier treated during the guided journey, whether the
// treatment session is still live or already saved.
const treatedEpilogue = () => {
  try {
    const id = window.location.pathname.split('/').pop() || '';
    if (!id) return false;
    if (rappelSessionActive()) return true;
    return window.localStorage.getItem(treatedDossierKey()) === id;
  } catch {
    return false;
  }
};

/**
 * Dossier detail — the guided end-to-end JOURNEY, driven by the demo kit
 * (public/demo-kit). The user imports the mission document (AI scan), the
 * five source documents, the photos and the garage quote; schedules a real
 * field mission (hop to Assignations AT and back); assigns the estimating
 * (hop to Assignations Chiffrage → the auto-calculating editor and back);
 * then reaches the report and fee-note steps.
 *
 * Mechanics: interact 'until' steps advance on REAL completion; steps whose
 * goal is already met are skipped on revisits; `chain`+`chainResume` hops
 * save a title-based resume marker so the journey continues where it left
 * off when the user returns via the chained tours.
 */
export const dossierDetailTutorial: PageTutorial = {
  key: 'dossier-detail',
  match: (p) => p.startsWith('/dossiers/') && p !== '/dossiers',
  steps: [
    {
      title: "Le dossier d'expertise",
      body:
        "Toute la vie du sinistre sur une seule page.\nSuivons-la de haut en bas avec les documents du kit.",
    },
    {
      anchor: 'dos-tabs',
      title: 'Vos dossiers ouverts',
      body:
        "Chaque dossier ouvert reste ici, comme les onglets d'un navigateur. L'onglet « Dossiers » ramène à la liste.",
      side: 'bottom',
      cursorAt: 'left',
    },
    {
      anchor: 'dosd-header',
      title: 'En-tête',
      body: "L'assuré, la compagnie et la référence restent toujours visibles ici.",
      side: 'bottom',
      cursorAt: 'left',
    },
    {
      anchor: 'dosd-statut',
      title: 'Statut',
      body: 'Ce badge avance tout seul avec le dossier.',
      side: 'bottom',
    },
    {
      anchor: 'dosd-import-drop',
      title: "L'import magique",
      body:
        "Téléchargez le document de mission ci-dessous, puis déposez-le ici (ou « Choisir un fichier »).\nLe document est lu et le dossier se remplit tout seul.",
      side: 'bottom',
      interact: 'until',
      // Advance when the import is accepted (dropzone disappears) — or when
      // an upload ran and settled even if the AI scan errored, so a scan
      // hiccup never strands the walkthrough.
      until: () => {
        const dz = document.querySelector('[data-tour="dosd-import-drop"]');
        if (!dz) return true;
        const flagKey = `sl.importBusy:${window.location.pathname}`;
        const w = window as unknown as Record<string, boolean>;
        if (dz.querySelector('.animate-spin, .animate-pulse')) {
          w[flagKey] = true;
          return false;
        }
        return !!w[flagKey];
      },
      // The kit's mission order is an ELECTRONIC (HTML) document: its field
      // table is extracted deterministically — no AI dependency in the demo.
      links: [
        { href: '/demo-kit/{lang}/mission-document.html', label: 'Document de mission', download: true },
      ],
      prefill: [
        {
          href: '/demo-kit/{lang}/mission-document.html',
          name: 'mission-document.html',
          input: '[data-tour="dosd-import-drop"] input[type=file]',
        },
      ],
    },
    {
      title: 'Regardez !',
      body:
        "Assuré, immatriculation, compagnie, dates… tout est pré-rempli depuis le document.\nVérifiez, corrigez si besoin : rien n'est à ressaisir deux fois.",
    },
    {
      anchor: 'dosd-import-eye',
      title: "L'œil : le document original",
      body:
        "Le document importé reste attaché au dossier.\nCliquez sur l'œil pour l'ouvrir tel quel.",
      side: 'bottom',
      dynamic: true,
      interact: 'until',
      until: () => !!document.querySelector('[data-tour="dosd-import-preview"]'),
    },
    {
      anchor: 'dosd-import-preview',
      title: "L'original, tel qu'il est arrivé",
      body:
        "C'est la pièce d'origine — celle qui a servi au pré-remplissage.\nRegardez, puis fermez (×) pour continuer.",
      side: 'left',
      dynamic: true,
      interact: 'until',
      // Advance once the preview has been OPEN and is closed again.
      until: () => {
        const w = window as unknown as Record<string, boolean>;
        if (document.querySelector('[data-tour="dosd-import-preview"]')) {
          w['sl.importPreviewSeen'] = true;
          return false;
        }
        return !!w['sl.importPreviewSeen'];
      },
    },
    {
      anchor: 'dosd-compare-btn',
      title: 'Le comparateur',
      body:
        'Pour vérifier les champs extraits sans aller-retour :\ncliquez sur « Comparer ».',
      side: 'left',
      dynamic: true,
      interact: 'click',
    },
    {
      anchor: 'dosd-compare-panel',
      title: 'Vérifiez sans quitter le formulaire',
      body:
        "Le document s'affiche À CÔTÉ du formulaire et vous suit pendant tout le défilement — chaque champ se vérifie en face de sa source.\nSur un document photographié ou scanné, la molette et le double-clic zooment pour lire les petits caractères. (Ici la pièce est électronique : elle est déjà nette.)\nExplorez, puis « Suivant » — la comparaison se refermera toute seule.",
      side: 'left',
      dynamic: true,
      // Advancing must close the comparer: the next steps work full-width.
      onNext: () => {
        if (document.querySelector('[data-tour="dosd-compare-panel"]')) {
          document
            .querySelector<HTMLElement>('[data-tour="dosd-compare-btn"]')
            ?.click();
        }
      },
    },
    {
      anchor: 'dosd-other-docs',
      title: 'Les pièces du dossier',
      body:
        "Cinq pièces seront exigées avant le chiffrage : constat, carte grise, attestation, kilométrage, châssis.\nEn pratique, c'est l'agent de terrain qui les importe depuis SA page, sur place — nous le ferons là-bas dans un instant.\nMais parfois les pièces arrivent autrement — par courriel, envoyées par la compagnie, ou dans des circonstances particulières : vous pouvez alors les déposer ici, dans l'onglet « Importer un document ».",
      side: 'top',
      // The slot cards live in the "Importer un document" TAB of the
      // Documents section — unmounted until the tab is selected. Click it
      // first or the anchor (and the 5 upload cards) simply don't exist.
      click: 'dosd-docs-import-tab',
      delay: 450,
      // dynamic: on a freshly created dossier this section mounts a beat
      // after the tour starts — without the flag the presence filter would
      // drop the step.
      dynamic: true,
    },
    {
      anchor: 'dosd-timeline',
      title: 'La frise des étapes',
      body: "Chaque bouton est une étape de la vie du dossier. Suivons-les dans l'ordre.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-step-4',
      title: 'Étape suivante : la visite terrain',
      body: 'Cliquez sur « Planification avant ».',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-planif-new',
      click: 'dosd-step-4',
      delay: 600,
      title: 'Programmons la visite terrain',
      body:
        "Un agent de terrain se déplace pour photographier le véhicule et récupérer les pièces.\nCliquez sur « Nouvelle planification » pour créer sa mission.",
      side: 'left',
      interact: 'click',
    },
    {
      anchor: 'plan-agent',
      title: "L'agent",
      body: 'Choisissez « Field Agent Demo » : la visite avance dès votre choix.',
      side: 'right',
      dynamic: true,
      interact: 'until',
      // Radix keeps `data-placeholder` on the trigger until a value is set.
      until: () => {
        const tr = document.querySelector('[data-tour="plan-agent"]');
        return !!tr && !tr.hasAttribute('data-placeholder');
      },
    },
    {
      anchor: 'plan-date',
      title: 'La date',
      body:
        "Choisissez la date d'aujourd'hui.\nL'app peut même vérifier la faisabilité des tournées de l'agent via Google Maps.",
      side: 'right',
      dynamic: true,
      interact: 'until',
      // The picker button drops its placeholder styling once a date is set.
      until: () => {
        const b = document.querySelector('[data-tour="plan-date"] button');
        return !!b && !b.className.includes('text-muted-foreground');
      },
    },
    {
      anchor: 'plan-time',
      title: "L'heure du rendez-vous",
      body:
        "L'heure est pré-remplie à 09:00 — ajustez-la si besoin.\nSi elle est déjà passée ou rend la tournée infaisable, l'app vous prévient avant d'enregistrer.",
      side: 'right',
      dynamic: true,
    },
    {
      anchor: 'plan-adresse',
      title: "L'adresse complète",
      body:
        "Tapez l'adresse du rendez-vous — par exemple « 455 boul. René-Lévesque O, Montréal, QC ».\nC'est elle qui alimente l'itinéraire Google Maps de l'agent.",
      side: 'right',
      dynamic: true,
      interact: 'until',
      until: () =>
        !!(
          document.querySelector('[data-tour="plan-adresse"] input') as HTMLInputElement | null
        )?.value?.trim(),
    },
    {
      anchor: 'plan-observation',
      title: "Les consignes pour l'agent",
      body:
        "Une observation type (menu) ou personnalisée (champ en dessous) : l'agent la voit sur sa mission.",
      side: 'right',
      dynamic: true,
    },
    {
      anchor: 'plan-agent-loc',
      title: "La position de l'agent",
      body:
        "L'app affiche ici la position GPS en direct de l'agent (avec lien Google Maps) et s'en sert pour vérifier que sa tournée est faisable.\nDémo oblige : cliquez sur « Demander la localisation de l'AT » — c'est la position de VOTRE navigateur qui jouera celle de l'agent.",
      side: 'right',
      dynamic: true,
    },
    {
      anchor: 'plan-save',
      title: 'Enregistrez',
      body: "La mission apparaît instantanément chez l'agent.",
      side: 'top',
      dynamic: true,
      interact: 'click',
    },
    {
      anchor: 'dosd-planif-new',
      click: 'dosd-step-4',
      delay: 500,
      title: 'Une 2ème destination',
      body:
        'Les agents enchaînent plusieurs visites par jour.\nCliquez encore sur « Nouvelle planification » pour créer une seconde mission.',
      side: 'left',
      interact: 'click',
    },
    {
      // The WHOLE dialog is highlighted this time: every field stays
      // clickable — agent, date, address — the user fills them himself.
      anchor: 'plan-dialog',
      title: 'La 2ème mission',
      body:
        "Même agent, date d'aujourd'hui — mais une AUTRE adresse : tapez par exemple « 1000 rue De La Gauchetière O, Montréal, QC ».",
      side: 'left',
      dynamic: true,
      interact: 'until',
      until: () =>
        !!(
          document.querySelector('[data-tour="plan-adresse"] input') as HTMLInputElement | null
        )?.value?.trim(),
    },
    {
      anchor: 'plan-save',
      title: 'Enregistrez la 2ème mission',
      body:
        "Cliquez sur « Enregistrer ».\nCôté agent, « Start » enchaînera toutes les adresses du jour dans UN itinéraire Google Maps ordonné.",
      side: 'top',
      dynamic: true,
      interact: 'click',
    },
    {
      anchor: 'dosd-photos-avant',
      click: 'dosd-step-4',
      delay: 600,
      title: 'Les photos avant réparation',
      body:
        "Sur place, l'agent photographie le véhicule depuis son téléphone — jouons-le ici côté bureau.\nTéléchargez les 3 photos ci-dessous, puis cliquez sur « Ajouter » pour les déposer.",
      side: 'top',
      interact: 'until',
      until: photosPresent('avant'),
      links: [
        { href: '/demo-kit/photos/before-1.png', label: 'Photo 1', download: true },
        { href: '/demo-kit/photos/before-2.png', label: 'Photo 2', download: true },
        { href: '/demo-kit/photos/before-3.png', label: 'Photo 3', download: true },
      ],
      prefill: [
        { href: '/demo-kit/photos/before-1.png', name: 'before-1.png', input: '[data-tour="dosd-photos-avant"] input[type=file]' },
        { href: '/demo-kit/photos/before-2.png', name: 'before-2.png', input: '[data-tour="dosd-photos-avant"] input[type=file]' },
        { href: '/demo-kit/photos/before-3.png', name: 'before-3.png', input: '[data-tour="dosd-photos-avant"] input[type=file]' },
      ],
    },
    {
      anchor: 'nav-/assignations-atg',
      title: 'Allons voir côté agent',
      body:
        "C'est aussi là-bas que l'agent importe les pièces du dossier, directement sur le terrain.\nCliquez sur « Assignations Agent de Terrain » dans le menu.",
      side: 'right',
      interact: 'click',
      chain: 'assignations-atg',
      chainResume: true,
    },
    {
      anchor: 'dosd-observations',
      click: 'dosd-step-4',
      delay: 600,
      title: 'Les remarques',
      body:
        "Sous chaque étape : des commentaires visibles par tous, ou par un rôle précis (menu avec l'œil).\nChacun voit qui a lu quoi.",
      side: 'top',
    },
    {
      anchor: 'dosd-step-6',
      title: "L'accord",
      body: 'Cliquez sur « Accord ».',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-devis-slot',
      click: 'dosd-step-6',
      delay: 600,
      title: 'Le devis du garage',
      body: 'Téléchargez le devis ci-dessous, puis ajoutez-le dans cette carte « Devis Garage ».',
      side: 'top',
      interact: 'until',
      until: () => slotFilled('dosd-devis-slot'),
      links: [
        { href: '/demo-kit/{lang}/garage-quote.pdf', label: 'Devis du garage (PDF)', download: true },
      ],
      prefill: [
        {
          href: '/demo-kit/{lang}/garage-quote.pdf',
          name: 'garage-quote.pdf',
          input: '[data-tour="dosd-devis-slot"] input[type=file]',
        },
      ],
    },
    {
      title: "L'IA lit aussi le devis",
      body:
        'Chaque ligne du devis devient un tableau modifiable pour vos chiffreurs.\nEnvoyons-le au chiffrage.',
    },
    {
      anchor: 'dosd-assign-chiffrage',
      click: 'dosd-step-6',
      delay: 600,
      title: 'Assignez le chiffrage',
      body:
        'Toutes les pièces sont là : le bouton est déverrouillé.\nCliquez sur « Assigner au chiffrage ».',
      side: 'left',
      interact: 'click',
    },
    {
      anchor: 'chif-choose',
      title: 'Le chiffreur',
      body: 'Choisissez « Estimator Demo » : la visite avance dès votre choix.',
      side: 'right',
      dynamic: true,
      interact: 'until',
      // The send button unlocks exactly when a chiffreur is selected.
      until: () => {
        const b = document.querySelector<HTMLButtonElement>('[data-tour="chif-send"]');
        return !!b && !b.disabled;
      },
    },
    {
      anchor: 'chif-send',
      title: 'Envoyez',
      body: 'Toutes les pièces et photos partent avec la mission.',
      side: 'top',
      dynamic: true,
      interact: 'click',
    },
    {
      anchor: 'nav-/assignations-chiffrage',
      title: 'Suivons le dossier chez le chiffreur',
      body: 'Cliquez sur « Assignations Chiffrage » dans le menu.',
      side: 'right',
      interact: 'click',
      chain: 'assignations-chiffrage',
      chainResume: true,
    },
    {
      anchor: 'dosd-step-9',
      title: 'Pendant les travaux',
      body: 'Cliquez sur « Planification en cours ».',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-photos-en_cours',
      click: 'dosd-step-9',
      delay: 600,
      title: 'Les photos pendant travaux',
      body: 'Téléchargez les 2 photos ci-dessous, puis cliquez sur « Ajouter ».',
      side: 'top',
      interact: 'until',
      until: photosPresent('en_cours'),
      links: [
        { href: '/demo-kit/photos/during-1.png', label: 'Photo 1', download: true },
        { href: '/demo-kit/photos/during-2.png', label: 'Photo 2', download: true },
      ],
      prefill: [
        { href: '/demo-kit/photos/during-1.png', name: 'during-1.png', input: '[data-tour="dosd-photos-en_cours"] input[type=file]' },
        { href: '/demo-kit/photos/during-2.png', name: 'during-2.png', input: '[data-tour="dosd-photos-en_cours"] input[type=file]' },
      ],
    },
    {
      anchor: 'dosd-step-11',
      title: 'Les accords suivants',
      body: 'Cliquez sur « 2ème accord et + ».',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-accord2',
      click: 'dosd-step-11',
      delay: 600,
      title: 'La sérialisation des accords',
      body:
        "Un désaccord après le 1er accord ? Le bouton « + » sur une carte crée le devis 2ème accord — puis 3ème, et ainsi de suite : chaque itération est numérotée et archivée.\nC'est une nouvelle itération de l'accord (ou de la proposition) du chiffreur : son tableau reste le MÊME d'une version à l'autre, il reprend exactement là où il s'était arrêté.\nRien à faire ici pour la démo — c'est le circuit des désaccords.",
      side: 'top',
      dynamic: true,
    },
    {
      anchor: 'dosd-step-10',
      title: 'Après réparation',
      body: 'Cliquez sur « Planification après ».',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-photos-apres',
      click: 'dosd-step-10',
      delay: 600,
      title: 'Le véhicule réparé',
      body: 'Téléchargez les 2 photos ci-dessous, puis cliquez sur « Ajouter ».',
      side: 'top',
      interact: 'until',
      until: photosPresent('apres'),
      links: [
        { href: '/demo-kit/photos/after-1.png', label: 'Photo 1', download: true },
        { href: '/demo-kit/photos/after-2.png', label: 'Photo 2', download: true },
      ],
      prefill: [
        { href: '/demo-kit/photos/after-1.png', name: 'after-1.png', input: '[data-tour="dosd-photos-apres"] input[type=file]' },
        { href: '/demo-kit/photos/after-2.png', name: 'after-2.png', input: '[data-tour="dosd-photos-apres"] input[type=file]' },
      ],
    },
    {
      anchor: 'dosd-step-7',
      title: 'Le rapport',
      body: "Cliquez sur l'étape « Rapport ».",
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-rapport-generer',
      click: 'dosd-step-7',
      delay: 600,
      title: 'Générer le rapport',
      body:
        "« Valider le dossier » (direction), puis « Générer le rapport » : le PDF se crée à partir de tout ce que vous venez d'importer — sans ressaisie.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-step-8',
      title: 'Dernière étape',
      body: "Cliquez sur « Note d'honoraire ».",
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-honoraire-slot',
      click: 'dosd-step-8',
      delay: 600,
      title: "La note d'honoraire",
      body: 'La facture du cabinet se dépose ici : elle clôt le dossier.',
      side: 'top',
    },
    {
      title: 'Et ensuite ?',
      body:
        "Vous venez de suivre UN dossier à travers toute l'équipe : terrain, chiffrage, direction — sans double saisie, sans e-mails.\n« Suivi d'équipe » veille sur tous les délais ; « Tampons » gère les cachets posés sur les devis.",
    },
    // ── Hidden rappel-treatment sub-flow ──────────────────────────────
    // Reachable ONLY via chainAt from Mes Rappels (row click on a received
    // rappel). onlyIf gates every step on the active-session handshake the
    // row click writes, so normal visits never see them.
    {
      title: 'Le traitement commence',
      body:
        "Le dossier s'est ouvert en session de traitement : tout ce que vous modifiez maintenant est enregistré pour l'expéditeur — qui, quoi, quand.",
      onlyIf: rappelSessionActive,
    },
    {
      anchor: 'dosd-rappel-banner',
      title: 'La bannière de traitement',
      body:
        "Vos modifications restent locales jusqu'au bouton vert « Sauvegarder » de cette bannière — rien ne part avant.",
      side: 'bottom',
      dynamic: true,
      onlyIf: rappelSessionActive,
    },
    {
      anchor: 'dosd-info-form',
      title: 'Modifiez le dossier',
      body:
        'Cliquez sur « Modifier », puis faites les trois gestes que le suivi sait distinguer :\n• modifiez un champ rempli (ex. le téléphone) ;\n• videz un champ rempli ;\n• remplissez un champ vide.\nTerminez par « Enregistrer » : le compteur « modifications en attente » apparaît dans la bannière.',
      side: 'top',
      dynamic: true,
      // The form stays highlighted (every field must be reachable) but the
      // hand aims at the « Modifier » button — once editing starts it
      // disappears and the hand falls back to the form.
      cursorSel: '[data-tour="dosd-info-edit"]',
      onlyIf: rappelSessionActive,
      interact: 'until',
      // The pending-count badge is the only child <span> of the banner text.
      until: () =>
        !!document.querySelector('[data-tour="dosd-rappel-banner"] p span'),
    },
    {
      anchor: 'dosd-rappel-save',
      title: 'Publiez vos modifications',
      body:
        'Cliquez sur le bouton vert « Sauvegarder » : vos modifications partent sur le dossier et le rappel passe en « Traité ».',
      side: 'bottom',
      dynamic: true,
      onlyIf: rappelSessionActive,
      interact: 'until',
      // Seen-flag: the banner disappears once the treatment is saved.
      until: () => {
        const w = window as unknown as Record<string, boolean>;
        if (document.querySelector('[data-tour="dosd-rappel-banner"]')) {
          w['sl.rappelBannerSeen'] = true;
          return false;
        }
        return !!w['sl.rappelBannerSeen'];
      },
    },
    {
      anchor: 'nav-/mes-rappels',
      title: 'Retour aux rappels',
      body:
        "Retournez dans « Mes Rappels » pour voir ce que l'expéditeur voit de votre travail.",
      side: 'right',
      onlyIf: rappelSessionActive,
      interact: 'click',
      chain: 'mes-rappels',
      chainAt: 'Le travail effectué',
    },
    // Epilogue — reached from the replay via 'Retour au dossier traité':
    // back on the treated dossier to see the published changes, then hand
    // the user back to the main journey on the dossiers list.
    {
      anchor: 'dosd-info-form',
      title: 'Vos modifications sont publiées',
      body:
        'Vous revoilà sur le dossier traité : vos changements sont maintenant sur le VRAI dossier — retrouvez le champ que vous avez modifié.',
      side: 'top',
      dynamic: true,
      onlyIf: treatedEpilogue,
    },
    {
      anchor: 'dosd-historique',
      title: "Ouvrez l'historique",
      body:
        "Le dossier tient aussi son propre journal.\nCliquez sur « Historique » : il s'ouvre sur la droite.",
      side: 'bottom',
      onlyIf: treatedEpilogue,
      interact: 'until',
      until: () => !!document.querySelector('[data-tour="dosd-historique-sheet"]'),
    },
    {
      anchor: 'dosd-historique-sheet',
      title: 'Le journal du dossier',
      body:
        "Ce journal retrace les JALONS du dossier : chaque changement de statut et chaque pièce entrée ou supprimée — avec qui l'a fait et quand.\nIl ne détaille pas champ par champ ce qui a été retouché : pour cela, c'est le suivi de rappel que vous venez de voir, avec ses couleurs.\nEn haut, « Dates clés » récapitule les dates du dossier. Parcourez, puis « Suivant ».",
      side: 'left',
      dynamic: true,
      onlyIf: treatedEpilogue,
      // Close the sheet on the way out: the next step needs the sidebar.
      onNext: () => {
        document
          .querySelector<HTMLElement>('[data-tour="dosd-historique-sheet"] button.absolute')
          ?.click();
      },
    },
    {
      anchor: 'nav-/dossiers',
      title: 'Reprenons la visite',
      body:
        "La boucle est bouclée : rappel envoyé, reçu, traité, vérifié.\nCliquez sur « Gestion des dossiers » : la visite guidée continue là où vous l'aviez laissée.",
      side: 'right',
      onlyIf: treatedEpilogue,
      interact: 'click',
      chain: 'dossiers',
      // Explicit re-entry: the return trip through File Management consumed
      // the title marker 'Suivons le rappel' left behind (chainAt overwrote
      // it), so name the continuation step directly.
      chainAt: 'Défilement horizontal',
    },
  ],
};
