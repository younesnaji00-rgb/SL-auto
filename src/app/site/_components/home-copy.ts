/**
 * All home-page copy, per locale. The markup lives in home.tsx; this file is
 * the only thing that differs between /site (EN) and /site/fr (FR).
 */

export type SiteLocale = 'en' | 'fr';

export interface HomeCopy {
  locale: SiteLocale;
  hero: {
    h1a: string;
    accent: string;
    h1b: string;
    lead: string;
    tryAs: string;
    roles: string[];
    cta: string;
    note: string;
    carAlt: string;
    file: { id: string; step: string; desc: string; stats: [string, string][]; open: string };
  };
  how: { h2: string; steps: { t: string; d: string }[] };
  desk: { h2: string; carAlt: string; items: { t: string; d: string }[] };
  screens: {
    h2: string;
    p: string;
    altSuffix: string;
    /** aria-label template; {tag} is replaced with the screen name. */
    openAriaTpl: string;
    items: { img: string; tag: string; t: string }[];
    timelineH3: string;
    timeline: string[];
    detailAlt: string;
  };
  vehicle: { h2: string; p: string; left: { t: string; d: string }[]; right: { t: string; d: string }[] };
  field: { h2: string; p: string; chips: string[]; alt: string };
  workflow: { h2: string; p: string; steps: { t: string; d: string }[] };
  banner: {
    h2a: string;
    accent: string;
    h2b: string;
    eyebrowLeft: string;
    titleLeft: string;
    pLeft: string;
    cta: string;
    prefer: string;
    book: string;
    or: string;
    faq: string;
    eyebrowRight: string;
    list: string[];
  };
  trust: { h2: string; more1: string; secFaq: string; more2: string; about: string; more3: string; items: { t: string; d: string }[] };
  paths: { faq: string; about: string; contact: string; secFaq: string };
}

export const HOME_EN: HomeCopy = {
  locale: 'en',
  hero: {
    h1a: 'Every claim closed',
    accent: 'on time,',
    h1b: 'without the chasing.',
    lead:
      'Re-typed mission letters. Photos buried in a WhatsApp thread. A second estimate nobody logged. An insurer asking where the report is. Lionheart keeps every claim in one file, so nothing gets chased twice.',
    tryAs: 'Try it as',
    roles: ['Admin', 'Manager', 'Estimator', 'Field agent'],
    cta: 'Open the live demo',
    note: 'No account, no credit card. Pick a role and walk through a real claim.',
    carAlt: 'Silver sedan in a studio, the kind of vehicle an appraisal file is opened for',
    file: {
      id: 'File APR-2026-0102',
      step: 'Step 3 of 7',
      desc: 'Silver sedan, front-right collision',
      stats: [
        ['$4,250', 'Estimate'],
        ['24', 'Photos'],
        ['2', 'Visits'],
      ],
      open: 'Open this file in the demo',
    },
  },
  how: {
    h2: 'Open the file, send the agent, publish the report.',
    steps: [
      { t: 'Open the file', d: 'Drop the mission letter or insurer document. The AI reads it and fills the claim for you.' },
      { t: 'Send a field agent', d: 'Schedule the visit; the agent gets one-tap navigation and shoots the photo evidence on site.' },
      { t: 'Estimate, agree, report', d: 'Build the estimate line by line, send the agreement, publish the expert report and the fee note.' },
    ],
  },
  desk: {
    h2: 'Nothing re-typed, nothing lost, nothing forgotten.',
    carAlt: 'Side profile of the same silver sedan',
    items: [
      { t: 'AI document pre-fill', d: 'Mission letters, accident reports and insurer documents are read and mapped onto the file. No re-typing. The demo ships with a sample mission letter so you can watch it happen.' },
      { t: 'Reminders that close the loop', d: 'Send batched reminders on selected files, then replay exactly what the recipient changed, field by field.' },
      { t: 'A complete audit trail', d: 'Every status, document and milestone is logged on the file. Open the history and read the story of the claim.' },
    ],
  },
  screens: {
    h2: 'This is the real product, not a mock-up.',
    p: 'Nothing staged: every screenshot is captured from the demo you can open right now.',
    altSuffix: 'screen of Lionheart Appraisal',
    openAriaTpl: 'Open the {tag} screen in the demo',
    items: [
      { img: '/site/shots/dashboard.webp', tag: 'Dashboard', t: 'Files by status, recent changes, insurer split.' },
      { img: '/site/shots/dossiers.webp', tag: 'File management', t: 'The whole caseload with live statuses and batch actions.' },
      { img: '/site/shots/dossier-detail.webp', tag: 'The file', t: 'A seven-step timeline from mission to report.' },
      { img: '/site/shots/monitoring.webp', tag: 'Monitoring', t: 'Ten checkpoints, on time versus overdue, by teammate.' },
    ],
    timelineH3: 'One file, one timeline.',
    timeline: [
      'Seven steps from mission creation to final report, always visible.',
      'Documents, photos, estimates and agreements sit in the step they belong to.',
      'Compare an imported document side by side with the filled form.',
    ],
    detailAlt: 'Claim file detail with its seven-step timeline',
  },
  vehicle: {
    h2: 'Every angle of the vehicle, on the record.',
    p: 'The diagram below is the one your estimators use in the product to mark the points of impact.',
    left: [
      { t: 'Points of impact', d: 'Mark the struck zones on this same diagram.' },
      { t: 'Photos by phase', d: 'Before, during and after the repair.' },
      { t: 'VIN and odometer', d: 'Captured on site, stored on the file.' },
    ],
    right: [
      { t: 'Line-by-line estimate', d: 'Parts, labour, paint, tax rules.' },
      { t: 'Agreement revisions', d: 'First, second, third, counter-proposals.' },
      { t: 'Expert report', d: 'Generated from the file, with the fee note.' },
    ],
  },
  field: {
    h2: 'Photos come from the phone, not from WhatsApp.',
    p: "Field agents open the day's missions, tap once to navigate to the garage, and shoot the photo evidence straight from the camera, sorted into before, during and after the repair.",
    chips: ['One-tap navigation', 'Camera-first capture', 'Before, during, after', 'Documents collected on site', 'Overdue, today, upcoming'],
    alt: "Field agent mobile view listing the day's missions",
  },
  workflow: {
    h2: 'Seven steps, the same on every file.',
    p: 'The same seven steps as the file timeline, so nothing gets skipped and everyone knows what comes next.',
    steps: [
      { t: 'Mission', d: 'Import the document, AI pre-fill.' },
      { t: 'Visit before', d: 'Dispatch a field agent.' },
      { t: 'Agreement', d: 'Estimate, send to the garage.' },
      { t: 'Visit during', d: 'Mid-repair photo evidence.' },
      { t: 'Revisions', d: 'New damage, new agreement.' },
      { t: 'Visit after', d: 'Confirm the repair matches.' },
      { t: 'Report', d: 'Expert report and fee note.' },
    ],
  },
  banner: {
    h2a: 'Walk a real claim in',
    accent: 'ten minutes,',
    h2b: 'without an account.',
    eyebrowLeft: 'Live demo',
    titleLeft: 'Pick a role, open a file',
    pLeft: 'Sample Canadian files, a guided walkthrough, nothing to install. If it does not feel like your desk, close the tab.',
    cta: 'Pick a role and start',
    prefer: 'Prefer a guided tour with your own mission letter?',
    book: 'Book a walkthrough',
    or: 'or read the',
    faq: 'FAQ',
    eyebrowRight: 'In those ten minutes',
    list: [
      'Drop the sample mission letter and watch the file fill itself.',
      'Dispatch a field agent and see the mission land on the phone view.',
      'Build the estimate, send the agreement, log the revision.',
      'Publish the expert report and the fee note. File closed.',
    ],
  },
  trust: {
    h2: 'Your files stay yours.',
    more1: 'More on isolation, roles and audit history in the',
    secFaq: 'security FAQ',
    more2: ', and on who builds this on the',
    about: 'about page',
    more3: '.',
    items: [
      { t: 'Isolated deployment', d: 'Each firm runs on its own dedicated cloud project. Your data never shares a database with anyone.' },
      { t: 'Role-based access', d: 'Admins, managers, estimators and field agents each see exactly what their job needs.' },
      { t: 'Complete audit history', d: 'Statuses, documents and edits are logged per file, with session-level replay of changes.' },
      { t: 'Bilingual by design', d: 'English and French side by side: every screen, every report, per-user preference.' },
    ],
  },
  paths: { faq: '/site/faq', about: '/site/about', contact: '/site/contact', secFaq: '/site/faq#security-and-data' },
};

export const HOME_FR: HomeCopy = {
  locale: 'fr',
  hero: {
    h1a: 'Chaque dossier fermé',
    accent: 'à temps,',
    h1b: 'sans courir après personne.',
    lead:
      "Des lettres de mission ressaisies. Des photos perdues dans un fil WhatsApp. Une deuxième estimation que personne n'a consignée. Un assureur qui demande où est le rapport. Lionheart garde chaque réclamation dans un seul dossier, pour que rien ne soit réclamé deux fois.",
    tryAs: 'Essayez-le comme',
    roles: ['Admin', 'Gestionnaire', 'Estimateur', 'Agent terrain'],
    cta: 'Ouvrir la démo en direct',
    note: 'Aucun compte, aucune carte de crédit. Choisissez un rôle et parcourez une vraie réclamation.',
    carAlt: "Berline argentée en studio, le type de véhicule pour lequel on ouvre un dossier d'évaluation",
    file: {
      id: 'Dossier APR-2026-0102',
      step: 'Étape 3 de 7',
      desc: 'Berline argentée, collision avant droite',
      stats: [
        ['4 250 $', 'Estimation'],
        ['24', 'Photos'],
        ['2', 'Visites'],
      ],
      open: 'Ouvrir ce dossier dans la démo',
    },
  },
  how: {
    h2: "Ouvrez le dossier, envoyez l'agent, publiez le rapport.",
    steps: [
      { t: 'Ouvrir le dossier', d: "Déposez la lettre de mission ou le document de l'assureur. L'IA le lit et remplit la réclamation pour vous." },
      { t: 'Envoyer un agent terrain', d: 'Planifiez la visite; l\'agent obtient la navigation en un geste et prend les photos sur place.' },
      { t: 'Estimer, convenir, rapporter', d: "Bâtissez l'estimation ligne par ligne, envoyez l'entente, publiez le rapport d'expertise et la note d'honoraires." },
    ],
  },
  desk: {
    h2: 'Rien de ressaisi, rien de perdu, rien d\'oublié.',
    carAlt: 'Profil de la même berline argentée',
    items: [
      { t: 'Préremplissage IA des documents', d: "Lettres de mission, constats et documents d'assureur sont lus et reportés dans le dossier. Aucune ressaisie. La démo inclut une lettre de mission d'exemple pour le voir en action." },
      { t: 'Des rappels qui bouclent la boucle', d: 'Envoyez des rappels groupés sur les dossiers choisis, puis rejouez exactement ce que le destinataire a modifié, champ par champ.' },
      { t: 'Une piste de vérification complète', d: "Chaque statut, document et jalon est consigné au dossier. Ouvrez l'historique et lisez l'histoire de la réclamation." },
    ],
  },
  screens: {
    h2: "C'est le vrai produit, pas une maquette.",
    p: "Rien de mis en scène : chaque capture provient de la démo que vous pouvez ouvrir tout de suite.",
    altSuffix: 'écran de Lionheart Appraisal',
    openAriaTpl: "Ouvrir l'écran {tag} dans la démo",
    items: [
      { img: '/site/shots/dashboard.webp', tag: 'Tableau de bord', t: 'Dossiers par statut, changements récents, répartition par assureur.' },
      { img: '/site/shots/dossiers.webp', tag: 'Gestion des dossiers', t: 'Toute la charge de travail, statuts en direct et actions groupées.' },
      { img: '/site/shots/dossier-detail.webp', tag: 'Le dossier', t: 'Une chronologie en sept étapes, de la mission au rapport.' },
      { img: '/site/shots/monitoring.webp', tag: 'Suivi', t: 'Dix points de contrôle, à temps ou en retard, par équipier.' },
    ],
    timelineH3: 'Un dossier, une chronologie.',
    timeline: [
      'Sept étapes de la création de la mission au rapport final, toujours visibles.',
      "Documents, photos, estimations et ententes rangés dans l'étape qui leur revient.",
      'Comparez un document importé côte à côte avec le formulaire rempli.',
    ],
    detailAlt: 'Détail d\'un dossier de réclamation avec sa chronologie en sept étapes',
  },
  vehicle: {
    h2: 'Chaque angle du véhicule, consigné.',
    p: "Le schéma ci-dessous est celui que vos estimateurs utilisent dans le produit pour marquer les points d'impact.",
    left: [
      { t: "Points d'impact", d: 'Marquez les zones touchées sur ce même schéma.' },
      { t: 'Photos par phase', d: 'Avant, pendant et après la réparation.' },
      { t: 'NIV et odomètre', d: 'Relevés sur place, conservés au dossier.' },
    ],
    right: [
      { t: 'Estimation ligne par ligne', d: "Pièces, main-d'œuvre, peinture, règles de taxes." },
      { t: "Révisions d'entente", d: 'Première, deuxième, troisième, contre-propositions.' },
      { t: "Rapport d'expertise", d: "Généré à partir du dossier, avec la note d'honoraires." },
    ],
  },
  field: {
    h2: 'Les photos viennent du téléphone, pas de WhatsApp.',
    p: "Les agents terrain ouvrent les missions du jour, touchent une fois pour naviguer jusqu'au garage et prennent les photos directement depuis la caméra, classées avant, pendant et après la réparation.",
    chips: ['Navigation en un geste', 'Capture caméra d\'abord', 'Avant, pendant, après', 'Documents recueillis sur place', 'En retard, aujourd\'hui, à venir'],
    alt: 'Vue mobile de l\'agent terrain listant les missions du jour',
  },
  workflow: {
    h2: 'Sept étapes, les mêmes pour chaque dossier.',
    p: 'Les mêmes sept étapes que la chronologie du dossier : rien n\'est sauté et chacun sait ce qui vient ensuite.',
    steps: [
      { t: 'Mission', d: 'Importez le document, préremplissage IA.' },
      { t: 'Visite avant', d: 'Dépêchez un agent terrain.' },
      { t: 'Entente', d: 'Estimation, envoi au garage.' },
      { t: 'Visite pendant', d: 'Photos en cours de réparation.' },
      { t: 'Révisions', d: 'Nouveaux dommages, nouvelle entente.' },
      { t: 'Visite après', d: 'Confirmez que la réparation correspond.' },
      { t: 'Rapport', d: "Rapport d'expertise et note d'honoraires." },
    ],
  },
  banner: {
    h2a: 'Parcourez une vraie réclamation en',
    accent: 'dix minutes,',
    h2b: 'sans compte.',
    eyebrowLeft: 'Démo en direct',
    titleLeft: 'Choisissez un rôle, ouvrez un dossier',
    pLeft: "Des dossiers canadiens d'exemple, une visite guidée, rien à installer. Si ça ne ressemble pas à votre bureau, fermez l'onglet.",
    cta: 'Choisir un rôle et commencer',
    prefer: 'Vous préférez une visite guidée avec votre propre lettre de mission?',
    book: 'Réserver une démonstration',
    or: 'ou lisez la',
    faq: 'FAQ',
    eyebrowRight: 'Dans ces dix minutes',
    list: [
      "Déposez la lettre de mission d'exemple et regardez le dossier se remplir.",
      'Dépêchez un agent terrain et voyez la mission arriver sur la vue téléphone.',
      "Bâtissez l'estimation, envoyez l'entente, consignez la révision.",
      "Publiez le rapport d'expertise et la note d'honoraires. Dossier fermé.",
    ],
  },
  trust: {
    h2: 'Vos dossiers restent les vôtres.',
    more1: "Plus de détails sur l'isolement, les rôles et l'historique dans la",
    secFaq: 'FAQ sécurité',
    more2: ', et sur qui construit ce produit sur la',
    about: 'page À propos',
    more3: ' (en anglais).',
    items: [
      { t: 'Déploiement isolé', d: 'Chaque cabinet tourne sur son propre projet infonuagique. Vos données ne partagent jamais une base avec qui que ce soit.' },
      { t: 'Accès par rôle', d: 'Admins, gestionnaires, estimateurs et agents terrain voient exactement ce dont leur travail a besoin.' },
      { t: 'Historique complet', d: 'Statuts, documents et modifications consignés par dossier, avec relecture des changements par session.' },
      { t: 'Bilingue par conception', d: 'Français et anglais côte à côte : chaque écran, chaque rapport, selon la préférence de chaque utilisateur.' },
    ],
  },
  paths: { faq: '/site/fr/faq', about: '/site/about', contact: '/site/contact', secFaq: '/site/fr/faq#securite-et-donnees' },
};
