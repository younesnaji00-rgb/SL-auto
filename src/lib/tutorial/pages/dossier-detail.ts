import type { PageTutorial } from '../types';

// The photo grids group shots into COLLAPSED day rows, so counting <img>
// nodes misses fresh uploads — read the "N/30" counter badge instead.
const photosPresent = (cat: string) => () => {
  const el = document.querySelector(`[data-tour="dosd-photos-${cat}"]`);
  const m = el?.textContent?.match(/(\d+)\s*\/\s*\d+/);
  return !!m && Number(m[1]) > 0;
};

const slotFilled = (anchor: string) =>
  !!document.querySelector(`[data-tour="${anchor}"] ul li`);

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
        "Téléchargez le document de mission ci-dessous, puis déposez-le ici (ou « Choisir un fichier »).\nL'IA lit le document et remplit le dossier toute seule.",
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
      links: [
        { href: '/demo-kit/{lang}/mission-document.pdf', label: 'Document de mission (PDF)', download: true },
      ],
    },
    {
      title: 'Regardez !',
      body:
        "Assuré, immatriculation, compagnie, dates… tout est pré-rempli par l'IA.\nVérifiez, corrigez si besoin : rien n'est à ressaisir deux fois.",
    },
    {
      anchor: 'dosd-other-docs',
      title: 'Les pièces du dossier',
      body:
        "Déposez les 5 pièces ci-dessous dans leurs cartes : constat, carte grise, attestation, kilométrage, châssis.\nElles seront exigées avant le chiffrage — et l'IA lit aussi la carte grise.",
      side: 'top',
      // The slot cards live in the "Importer un document" TAB of the
      // Documents section — unmounted until the tab is selected. Click it
      // first or the anchor (and the 5 upload cards) simply don't exist.
      click: 'dosd-docs-import-tab',
      delay: 450,
      // dynamic: on a freshly created dossier this section mounts a beat
      // after the tour starts — without the flag the presence filter drops
      // the step, the 5 source docs are never requested, and the
      // "Assigner au chiffrage" gate stays locked for the whole journey.
      dynamic: true,
      interact: 'until',
      until: () =>
        ['dosd-slot-pv', 'dosd-slot-carte', 'dosd-slot-attestation', 'dosd-slot-km', 'dosd-slot-vin'].every(slotFilled),
      links: [
        { href: '/demo-kit/{lang}/accident-report.pdf', label: 'Constat (PDF)', download: true },
        { href: '/demo-kit/{lang}/vehicle-registration.pdf', label: 'Carte grise (PDF)', download: true },
        { href: '/demo-kit/{lang}/insurance-certificate.pdf', label: 'Attestation (PDF)', download: true },
        { href: '/demo-kit/photos/odometer.png', label: 'Photo kilométrage', download: true },
        { href: '/demo-kit/photos/vin-plate.png', label: 'Photo châssis', download: true },
      ],
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
      body: 'Téléchargez les 3 photos ci-dessous, puis cliquez sur « Ajouter » pour les déposer.',
      side: 'top',
      interact: 'until',
      until: photosPresent('avant'),
      links: [
        { href: '/demo-kit/photos/before-1.png', label: 'Photo 1', download: true },
        { href: '/demo-kit/photos/before-2.png', label: 'Photo 2', download: true },
        { href: '/demo-kit/photos/before-3.png', label: 'Photo 3', download: true },
      ],
    },
    {
      anchor: 'dosd-planif-new',
      click: 'dosd-step-4',
      delay: 600,
      title: 'Programmons la visite terrain',
      body:
        "En vrai, un agent prend ces photos sur place.\nCliquez sur « Nouvelle planification » pour créer sa mission.",
      side: 'left',
      interact: 'click',
    },
    {
      anchor: 'plan-agent',
      title: "L'agent",
      body: 'Choisissez « Field Agent Demo ».',
      side: 'right',
      dynamic: true,
    },
    {
      anchor: 'plan-date',
      title: 'La date',
      body:
        "Choisissez la date d'aujourd'hui.\nL'app peut même vérifier la faisabilité des tournées de l'agent via Google Maps.",
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
        "L'app affiche ici la position GPS en direct de l'agent (avec lien Google Maps) et s'en sert pour vérifier que sa tournée est faisable.\nDans cette démo, l'agent n'a pas de téléphone connecté : vous pouvez demander sa position ou la saisir à la main.",
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
      anchor: 'plan-save',
      title: 'Enregistrez la 2ème mission',
      body:
        "Même agent, date d'aujourd'hui — mais une AUTRE adresse (ex. « 1000 rue De La Gauchetière O, Montréal, QC »).\nCôté agent, « Start » enchaînera toutes les adresses du jour dans UN itinéraire Google Maps ordonné.",
      side: 'top',
      dynamic: true,
      interact: 'click',
    },
    {
      anchor: 'nav-/assignations-atg',
      title: 'Allons voir côté agent',
      body: 'Cliquez sur « Assignations Agent de Terrain » dans le menu.',
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
      body: 'Choisissez « Estimator Demo ».',
      side: 'right',
      dynamic: true,
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
  ],
};
