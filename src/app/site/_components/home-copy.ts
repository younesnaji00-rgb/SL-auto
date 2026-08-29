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
      'Appraisal management software for independent auto damage appraisers. Re-typed insurer assignments. Photos buried in a WhatsApp thread. A supplement nobody logged. An adjuster asking where the appraisal report is. Lionheart keeps every claim in one file, so nothing gets chased twice and cycle time stops slipping.',
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
    h2: 'Take the insurer assignment, send the field appraiser, deliver the appraisal report.',
    steps: [
      { t: 'Take the assignment', d: 'Drop the insurer assignment or mission letter. The AI reads it and opens the claim file for you.' },
      { t: 'Send a field appraiser', d: 'Schedule the inspection; the appraiser gets one-tap navigation and shoots the photo documentation on site.' },
      { t: 'Estimate, supplement, report', d: 'Build the damage estimate line by line, log supplements and agreements, publish the appraisal report and the fee note.' },
    ],
  },
  desk: {
    h2: 'Nothing re-typed, nothing lost, no reinspection for a missing photo.',
    carAlt: 'Side profile of the same silver sedan',
    items: [
      { t: 'AI pre-fill of insurer assignments', d: 'Assignments, accident reports and insurer documents are read and mapped onto the claim file. No re-typing. The demo ships with a sample assignment so you can watch it happen.' },
      { t: 'Reminders that close the loop', d: 'Send batched reminders on open claims, then replay exactly what the recipient changed, field by field.' },
      { t: 'A complete audit trail', d: 'Every status, document, supplement and milestone is logged on the claim. Open the history and read the story of the appraisal.' },
    ],
  },
  screens: {
    h2: 'This is the real product, not a mock-up.',
    p: 'Nothing staged: every screenshot is captured from the demo you can open right now.',
    altSuffix: 'screen of Lionheart Appraisal',
    openAriaTpl: 'Open the {tag} screen in the demo',
    items: [
      { img: '/site/shots/dashboard.webp', tag: 'Dashboard', t: 'Claims by status, recent changes, split by insurer.' },
      { img: '/site/shots/dossiers.webp', tag: 'Claims management', t: 'The whole caseload with live statuses and batch actions.' },
      { img: '/site/shots/dossier-detail.webp', tag: 'The claim file', t: 'A seven-step timeline from assignment to appraisal report.' },
      { img: '/site/shots/monitoring.webp', tag: 'Cycle time', t: 'Ten checkpoints, on time versus overdue, by appraiser.' },
    ],
    timelineH3: 'One claim file, one timeline.',
    timeline: [
      'Seven steps from insurer assignment to final appraisal report, always visible.',
      'Documents, photos, estimates, supplements and agreements sit in the step they belong to.',
      'Compare an imported document side by side with the filled form.',
    ],
    detailAlt: 'Claim file detail with its seven-step timeline',
  },
  vehicle: {
    h2: 'Every angle of the vehicle damage, on the record.',
    p: 'The diagram below is the one your appraisers use in the product to mark the points of impact. It sits next to your estimating system (CCC, Audatex, Mitchell), it does not replace it.',
    left: [
      { t: 'Points of impact', d: 'Mark the damaged zones on this same diagram.' },
      { t: 'Photo documentation by phase', d: 'Before, during and after the repair.' },
      { t: 'VIN and odometer', d: 'Captured on site, stored on the claim.' },
    ],
    right: [
      { t: 'Line-by-line damage estimate', d: 'Parts, labour, paint, tax rules.' },
      { t: 'Supplements and agreement revisions', d: 'First, second, third, counter-proposals.' },
      { t: 'Appraisal report', d: 'Generated from the claim file, with the fee note.' },
    ],
  },
  field: {
    h2: 'A field appraiser app. Photos come from the phone, not from WhatsApp.',
    p: "Field appraisers open the day's inspections, tap once to navigate to the body shop, and shoot the photo documentation straight from the camera, sorted into before, during and after the repair.",
    chips: ['One-tap navigation', 'Camera-first capture', 'Before, during, after', 'Documents collected on site', 'Overdue, today, upcoming'],
    alt: "Field appraiser mobile app listing the day's inspections",
  },
  workflow: {
    h2: 'Seven steps, the same on every claim.',
    p: 'The same seven steps as the claim timeline, so nothing gets skipped, turnaround stays predictable and everyone knows what comes next.',
    steps: [
      { t: 'Assignment', d: 'Import the insurer document, AI pre-fill.' },
      { t: 'Inspection before', d: 'Dispatch a field appraiser.' },
      { t: 'Agreement', d: 'Estimate, send to the body shop.' },
      { t: 'Inspection during', d: 'Mid-repair photo documentation.' },
      { t: 'Supplements', d: 'New damage, new agreement.' },
      { t: 'Inspection after', d: 'Confirm the repair matches.' },
      { t: 'Report', d: 'Appraisal report and fee note.' },
    ],
  },
  banner: {
    h2a: 'Walk a real claim in',
    accent: 'ten minutes,',
    h2b: 'without an account.',
    eyebrowLeft: 'Live demo',
    titleLeft: 'Pick a role, open a file',
    pLeft: 'Sample Canadian claims, a guided walkthrough, nothing to install. If it does not feel like your appraisal desk, close the tab.',
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
    h2: 'Your claims stay yours.',
    more1: 'More on isolation, roles and audit history in the',
    secFaq: 'security FAQ',
    more2: ', and on who builds this on the',
    about: 'about page',
    more3: '.',
    items: [
      { t: 'Isolated deployment', d: 'Each appraisal firm runs on its own dedicated cloud project. Your claims and insurer data never share a database with anyone.' },
      { t: 'Role-based access', d: 'Admins, managers, desk appraisers and field appraisers each see exactly what their job needs.' },
      { t: 'Complete audit history', d: 'Statuses, documents, supplements and edits are logged per claim, with session-level replay of changes.' },
      { t: 'Bilingual by design', d: 'English and French side by side: every screen, every appraisal report, per-user preference.' },
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
      "Logiciel de gestion des dossiers de sinistres pour estimateurs en dommages automobiles indépendants. Des mandats d'assureurs ressaisis. Des photos perdues dans un fil WhatsApp. Un supplément que personne n'a consigné. Un expert en sinistre qui demande où est le rapport d'expertise. Lionheart garde chaque réclamation dans un seul dossier, pour que rien ne soit réclamé deux fois et que les délais tiennent.",
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
    h2: "Recevez le mandat de l'assureur, envoyez l'estimateur terrain, livrez le rapport d'expertise.",
    steps: [
      { t: 'Recevoir le mandat', d: "Déposez le mandat de l'assureur ou la lettre de mission. L'IA le lit et ouvre le dossier de sinistre pour vous." },
      { t: 'Envoyer un estimateur terrain', d: "Planifiez l'inspection; l'estimateur obtient la navigation en un geste et prend les photos sur place." },
      { t: 'Estimer, suppléer, rapporter', d: "Bâtissez l'estimation des dommages ligne par ligne, consignez suppléments et ententes, publiez le rapport d'expertise et la note d'honoraires." },
    ],
  },
  desk: {
    h2: "Rien de ressaisi, rien de perdu, aucune réinspection pour une photo manquante.",
    carAlt: 'Profil de la même berline argentée',
    items: [
      { t: "Préremplissage IA des mandats d'assureurs", d: "Mandats, constats et documents d'assureur sont lus et reportés dans le dossier de sinistre. Aucune ressaisie. La démo inclut un mandat d'exemple pour le voir en action." },
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
      { img: '/site/shots/dashboard.webp', tag: 'Tableau de bord', t: 'Dossiers de sinistres par statut, changements récents, répartition par assureur.' },
      { img: '/site/shots/dossiers.webp', tag: 'Gestion des dossiers', t: 'Toute la charge de travail, statuts en direct et actions groupées.' },
      { img: '/site/shots/dossier-detail.webp', tag: 'Le dossier', t: "Une chronologie en sept étapes, du mandat au rapport d'expertise." },
      { img: '/site/shots/monitoring.webp', tag: 'Délais', t: 'Dix points de contrôle, à temps ou en retard, par estimateur.' },
    ],
    timelineH3: 'Un dossier de sinistre, une chronologie.',
    timeline: [
      "Sept étapes du mandat de l'assureur au rapport d'expertise final, toujours visibles.",
      "Documents, photos, estimations, suppléments et ententes rangés dans l'étape qui leur revient.",
      'Comparez un document importé côte à côte avec le formulaire rempli.',
    ],
    detailAlt: 'Détail d\'un dossier de réclamation avec sa chronologie en sept étapes',
  },
  vehicle: {
    h2: 'Chaque angle des dommages au véhicule, consigné.',
    p: "Le schéma ci-dessous est celui que vos estimateurs utilisent dans le produit pour marquer les points d'impact. Il travaille à côté de votre logiciel d'estimation (Audatex, CCC, Mitchell), il ne le remplace pas.",
    left: [
      { t: "Points d'impact", d: 'Marquez les zones endommagées sur ce même schéma.' },
      { t: 'Photos par phase', d: 'Avant, pendant et après la réparation.' },
      { t: 'NIV et odomètre', d: 'Relevés sur place, conservés au dossier.' },
    ],
    right: [
      { t: 'Estimation des dommages ligne par ligne', d: "Pièces, main-d'œuvre, peinture, règles de taxes." },
      { t: "Suppléments et révisions d'entente", d: 'Premier, deuxième, troisième, contre-propositions.' },
      { t: "Rapport d'expertise", d: "Généré à partir du dossier, avec la note d'honoraires." },
    ],
  },
  field: {
    h2: 'Une application pour estimateurs terrain. Les photos viennent du téléphone, pas de WhatsApp.',
    p: "Les estimateurs terrain ouvrent les inspections du jour, touchent une fois pour naviguer jusqu'à l'atelier de carrosserie et prennent les photos directement depuis la caméra, classées avant, pendant et après la réparation.",
    chips: ['Navigation en un geste', 'Capture caméra d\'abord', 'Avant, pendant, après', 'Documents recueillis sur place', 'En retard, aujourd\'hui, à venir'],
    alt: "Application mobile de l'estimateur terrain listant les inspections du jour",
  },
  workflow: {
    h2: 'Sept étapes, les mêmes pour chaque dossier de sinistre.',
    p: "Les mêmes sept étapes que la chronologie du dossier : rien n'est sauté, les délais de traitement restent prévisibles et chacun sait ce qui vient ensuite.",
    steps: [
      { t: 'Mandat', d: "Importez le document de l'assureur, préremplissage IA." },
      { t: 'Inspection avant', d: 'Dépêchez un estimateur terrain.' },
      { t: 'Entente', d: "Estimation, envoi à l'atelier." },
      { t: 'Inspection pendant', d: 'Photos en cours de réparation.' },
      { t: 'Suppléments', d: 'Nouveaux dommages, nouvelle entente.' },
      { t: 'Inspection après', d: 'Confirmez que la réparation correspond.' },
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
      { t: 'Déploiement isolé', d: "Chaque cabinet d'estimation tourne sur son propre projet infonuagique. Vos dossiers de sinistres et vos données d'assureurs ne partagent jamais une base avec qui que ce soit." },
      { t: 'Accès par rôle', d: 'Admins, gestionnaires, estimateurs au bureau et estimateurs terrain voient exactement ce dont leur travail a besoin.' },
      { t: 'Historique complet', d: 'Statuts, documents, suppléments et modifications consignés par dossier, avec relecture des changements par session.' },
      { t: 'Bilingue par conception', d: 'Français et anglais côte à côte : chaque écran, chaque rapport, selon la préférence de chaque utilisateur.' },
    ],
  },
  paths: { faq: '/site/fr/faq', about: '/site/about', contact: '/site/contact', secFaq: '/site/fr/faq#securite-et-donnees' },
};
