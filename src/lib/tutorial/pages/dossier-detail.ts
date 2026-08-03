import type { PageTutorial } from '../types';

// The photo grids group shots into COLLAPSED day rows, so counting <img>
// nodes misses fresh uploads — read the "N/30" counter badge instead.
const photosPresent = (cat: string) => () => {
  const el = document.querySelector(`[data-tour="dosd-photos-${cat}"]`);
  const m = el?.textContent?.match(/(\d+)\s*\/\s*\d+/);
  return !!m && Number(m[1]) > 0;
};

/**
 * Dossier detail — the guided end-to-end lifecycle, driven by the demo kit
 * (public/demo-kit): the user imports the mission document (AI scan), the
 * damage photos, the garage quote, then sees the report and fee-note steps.
 *
 * Mechanics:
 * - `dosd-import-drop` only exists while the dossier has no scanned source
 *   document, so the import step naturally disappears on already-fed files.
 * - Import/photo/quote steps use `interact: 'until'` with DOM predicates —
 *   they advance when the upload REALLY happened. Steps whose predicate is
 *   already true at start are skipped by the engine (revisits stay short).
 * - Timeline-bar steps (`dosd-step-<id>`, interact 'click') carry the user
 *   from section to section; the content step that follows keeps a `click`
 *   prep on the SAME bar button (idempotent — it only scrolls).
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
    },
    {
      anchor: 'dosd-header',
      title: 'En-tête',
      body: "L'assuré, la compagnie et la référence restent toujours visibles ici.",
      side: 'bottom',
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
        "Déposez « 1-mission-document.pdf » du kit ici (ou « Choisir un fichier »).\nL'IA lit le document et remplit le dossier toute seule.",
      side: 'bottom',
      interact: 'until',
      // Advance when the import is accepted (dropzone disappears) — or when
      // an upload ran and settled even if the AI scan errored, so a scan
      // hiccup never strands the walkthrough. Progress flag is per-dossier
      // (URL) and resets on reload.
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
      link: { href: '/demo-kit/demo-kit.zip', label: 'Télécharger le kit', download: true },
    },
    {
      title: 'Regardez !',
      body:
        "Assuré, immatriculation, compagnie, dates… tout est pré-rempli par l'IA.\nVérifiez, corrigez si besoin : rien n'est à ressaisir deux fois.",
    },
    {
      anchor: 'dosd-timeline',
      title: 'La frise des étapes',
      body: "Chaque bouton est une étape de la vie du dossier. Suivons-les dans l'ordre.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-step-4',
      title: 'Étape suivante : les photos',
      body: 'Cliquez sur « Planification avant ».',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-photos-avant',
      click: 'dosd-step-4',
      delay: 600,
      title: 'Les photos avant réparation',
      body: 'Cliquez sur « Ajouter » et choisissez les 3 photos « 2-photo-before » du kit.',
      side: 'top',
      interact: 'until',
      until: photosPresent('avant'),
    },
    {
      title: 'Sur le terrain',
      body:
        "En vrai, vos agents envoient ces photos depuis leur téléphone.\nLeurs missions se gèrent dans « Assignations Agent de Terrain », dans le menu.",
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
      body: 'Ajoutez « 3-garage-quote.pdf » du kit dans cette carte « Devis Garage ».',
      side: 'top',
      interact: 'until',
      until: () => !!document.querySelector('[data-tour="dosd-devis-slot"] ul li'),
    },
    {
      title: "L'IA lit aussi le devis",
      body:
        "Chaque ligne du devis devient modifiable pour vos chiffreurs.\nIls travaillent depuis « Assignations Chiffrage », dans le menu.",
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
      body: 'Ajoutez les photos « 4-photo-during » du kit.',
      side: 'top',
      interact: 'until',
      until: photosPresent('en_cours'),
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
      body: 'Ajoutez les photos « 5-photo-after » du kit.',
      side: 'top',
      interact: 'until',
      until: photosPresent('apres'),
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
        "Photos terrain : « Assignations Agent de Terrain ». Chiffrage : « Assignations Chiffrage ». Délais : « Suivi d'équipe ».\nTout le cabinet travaille sur le même dossier, sans double saisie.",
    },
  ],
};
