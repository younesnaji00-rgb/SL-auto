import type { SiteLocale } from './home-copy';

export interface FaqGroup {
  group: string;
  id: string;
  items: { q: string; a: string }[];
}

export interface FaqCopy {
  locale: SiteLocale;
  title: string;
  description: string;
  path: string;
  crumb: string;
  eyebrow: string;
  h1: string;
  accent: string;
  intro: string;
  sectionsAria: string;
  stillTitle: string;
  stillP: string;
  ask: string;
  open: string;
  contactPath: string;
  groups: FaqGroup[];
}

export const FAQ_EN: FaqCopy = {
  locale: 'en',
  title: 'FAQ — Auto damage appraisal software questions',
  description:
    'Does it replace CCC, Audatex or Mitchell? How are supplements and total loss handled? Data isolation, field appraiser app, bilingual appraisal reports, pricing and onboarding for independent auto damage appraisal firms.',
  path: '/site/faq',
  crumb: 'FAQ',
  eyebrow: 'Frequently asked questions',
  h1: 'Straight answers,',
  accent: 'no sales call.',
  intro: 'Everything appraisal firms ask before opening the demo. If your question is not here, the contact page reaches a real appraiser, not a bot.',
  sectionsAria: 'FAQ sections',
  stillTitle: 'Still have a question?',
  stillP: 'Or skip the reading and open a real claim file in the demo.',
  ask: 'Ask us',
  open: 'Open the demo',
  contactPath: '/site/contact',
  groups: [
    {
      group: 'The demo',
      id: 'the-demo',
      items: [
        {
          q: 'Do I need an account to try the demo?',
          a: 'No. Pick a role on the login screen (Admin, Manager, Estimator or Field agent) and you are in. There is no sign-up, no credit card, and the demo resets itself so you can explore freely.',
        },
        {
          q: 'Is the demo the real product or a mock-up?',
          a: 'It is the real product running on sample Canadian claim files. Every screenshot on this site is captured from the same demo you can open right now.',
        },
        {
          q: 'What can I try in ten minutes?',
          a: 'Drop the sample mission letter and watch the file fill itself, dispatch a field agent and see the mission land on the phone view, build an estimate, send the agreement, then publish the expert report and the fee note.',
        },
      ],
    },
    {
      group: 'How it works',
      id: 'how-it-works',
      items: [
        {
          q: 'Is this auto damage appraisal software or estimating software? Does it replace CCC ONE, Audatex or Mitchell?',
          a: 'It is appraisal management software, not an estimating system. CCC, Audatex and Mitchell write the line-level damage estimate; Lionheart manages everything around it for an independent appraisal firm: insurer assignments, field appraiser dispatch, photo documentation, supplements, agreements, the appraisal report and the fee note. Estimates and reports from your estimating system attach to the claim file as documents.',
        },
        {
          q: 'How are supplements, reinspections and total loss handled?',
          a: 'A supplement is a first-class step on the claim: new damage found mid-repair triggers a new agreement round (second, third, counter-proposal), each logged with who changed what. Reinspection visits are scheduled like any inspection and their photos land in the "during" or "after" phase. Total loss claims follow the same seven-step timeline with a reform status and the appraisal report generated from the file.',
        },
        {
          q: 'What does the AI pre-fill actually read?',
          a: 'Mission letters, accident reports, insurer documents and vehicle registrations. The extracted fields are mapped onto the claim file and shown side by side with the source document so you can verify every value before saving.',
        },
        {
          q: 'How do field agents capture photos?',
          a: 'From the phone camera, inside the app. Photos are sorted into before, during and after the repair and attached to the right step of the file, so nothing lives in a messaging thread.',
        },
        {
          q: 'Can we handle a second or third agreement on the same claim?',
          a: 'Yes. Agreement revisions and counter-proposals are first-class: each revision is logged on the file with who changed what, and the report is generated from the final agreed version.',
        },
        {
          q: 'Which languages are supported?',
          a: 'English and French, per user. Every screen and every generated report (expert report, fee note, estimate) is available in both.',
        },
      ],
    },
    {
      group: 'Security and data',
      id: 'security-and-data',
      items: [
        {
          q: 'Where is our data stored, and is it shared with other firms?',
          a: 'Each firm runs on its own dedicated cloud project. Your files never share a database, storage bucket or user directory with anyone else.',
        },
        {
          q: 'Who in my firm can see what?',
          a: 'Access is role-based. Admins manage users and settings, managers see the whole caseload, estimators work the files assigned to them, and field agents only see their missions.',
        },
        {
          q: 'Is there an audit trail?',
          a: 'Yes. Every status change, document, milestone and field edit is logged per file, and reminder rounds can be replayed field by field to see exactly what changed.',
        },
      ],
    },
    {
      group: 'Getting started',
      id: 'getting-started',
      items: [
        {
          q: 'Is it built for independent appraisal firms in Canada?',
          a: 'Yes. The demo runs on sample Canadian claims, amounts are in CAD, the interface and every appraisal report exist in English and French, and each firm is deployed in its own isolated cloud project in the Canadian region. It fits a firm of two appraisers as well as a multi-region network with desk and field roles.',
        },
        {
          q: 'How long does onboarding take?',
          a: 'A typical firm is live within two weeks: we provision the isolated deployment, load your insurers and rate tables, create your users, and walk each role through their first real claim.',
        },
        {
          q: 'How is it priced?',
          a: 'Per firm, per month, based on the number of active users. Ask us for a quote through the contact page and we will send a proposal with your team size.',
        },
      ],
    },
  ],
};

export const FAQ_FR: FaqCopy = {
  locale: 'fr',
  title: "FAQ — Logiciel d'expertise automobile pour estimateurs",
  description:
    "Remplace-t-il Audatex, CCC ou Mitchell? Comment gérer suppléments et perte totale? Isolement des données, application estimateur terrain, rapports d'expertise bilingues, tarification et intégration pour cabinets d'estimateurs en dommages automobiles indépendants.",
  path: '/site/fr/faq',
  crumb: 'FAQ',
  eyebrow: 'Foire aux questions',
  h1: 'Des réponses franches,',
  accent: 'sans appel de vente.',
  intro: "Tout ce que les cabinets d'évaluation demandent avant d'ouvrir la démo. Si votre question n'y est pas, la page contact rejoint un vrai évaluateur, pas un robot.",
  sectionsAria: 'Sections de la FAQ',
  stillTitle: 'Encore une question?',
  stillP: 'Ou sautez la lecture et ouvrez un vrai dossier de réclamation dans la démo.',
  ask: 'Écrivez-nous',
  open: 'Ouvrir la démo',
  contactPath: '/site/contact',
  groups: [
    {
      group: 'La démo',
      id: 'la-demo',
      items: [
        {
          q: 'Ai-je besoin d\'un compte pour essayer la démo?',
          a: "Non. Choisissez un rôle sur l'écran de connexion (Admin, Gestionnaire, Estimateur ou Agent terrain) et vous êtes dedans. Aucune inscription, aucune carte de crédit, et la démo se réinitialise d'elle-même pour que vous puissiez explorer librement.",
        },
        {
          q: 'La démo est-elle le vrai produit ou une maquette?',
          a: "C'est le vrai produit, avec des dossiers de réclamation canadiens d'exemple. Chaque capture d'écran de ce site provient de la même démo que vous pouvez ouvrir tout de suite.",
        },
        {
          q: 'Que puis-je essayer en dix minutes?',
          a: "Déposez la lettre de mission d'exemple et regardez le dossier se remplir, dépêchez un agent terrain et voyez la mission arriver sur la vue téléphone, bâtissez une estimation, envoyez l'entente, puis publiez le rapport d'expertise et la note d'honoraires.",
        },
      ],
    },
    {
      group: 'Comment ça marche',
      id: 'comment-ca-marche',
      items: [
        {
          q: "Est-ce un logiciel d'estimation? Remplace-t-il Audatex, CCC ONE ou Mitchell?",
          a: "Non : c'est un logiciel de gestion des dossiers d'expertise, pas un système d'estimation. Audatex, CCC et Mitchell produisent l'estimation des dommages ligne par ligne; Lionheart gère tout ce qui l'entoure pour un cabinet d'estimateurs indépendant : mandats d'assureurs, dépêche des estimateurs terrain, photos, suppléments, ententes, rapport d'expertise et note d'honoraires. Les estimations de votre logiciel se rattachent au dossier comme documents.",
        },
        {
          q: 'Comment sont gérés les suppléments, les réinspections et la perte totale?',
          a: "Le supplément est une étape à part entière du dossier : de nouveaux dommages découverts en cours de réparation déclenchent une nouvelle ronde d'entente (deuxième, troisième, contre-proposition), chacune consignée avec qui a changé quoi. Les réinspections se planifient comme toute inspection et leurs photos se classent en phase « pendant » ou « après ». La perte totale suit la même chronologie en sept étapes avec un statut de réforme et le rapport d'expertise généré à partir du dossier.",
        },
        {
          q: 'Est-ce adapté aux estimateurs qualifiés par le GAA au Québec?',
          a: "Oui. Le produit est conçu pour les cabinets d'estimateurs en dommages automobiles indépendants : mandats d'assureurs, inspections terrain, rapports d'expertise bilingues, montants en CAD, et un déploiement isolé par cabinet dans la région canadienne. La qualification GAA reste celle de vos estimateurs; Lionheart gère les dossiers.",
        },
        {
          q: "Que lit vraiment le préremplissage IA?",
          a: "Lettres de mission, constats d'accident, documents d'assureur et certificats d'immatriculation. Les champs extraits sont reportés dans le dossier et affichés côte à côte avec le document source pour que vous vérifiiez chaque valeur avant d'enregistrer.",
        },
        {
          q: 'Comment les agents terrain prennent-ils les photos?',
          a: "Depuis la caméra du téléphone, dans l'application. Les photos sont classées avant, pendant et après la réparation et rattachées à la bonne étape du dossier : rien ne reste dans un fil de messagerie.",
        },
        {
          q: 'Peut-on gérer une deuxième ou une troisième entente sur la même réclamation?',
          a: "Oui. Les révisions d'entente et les contre-propositions sont prises en charge nativement : chaque révision est consignée au dossier avec qui a changé quoi, et le rapport est généré à partir de la version finale convenue.",
        },
        {
          q: 'Quelles langues sont prises en charge?',
          a: "Le français et l'anglais, selon chaque utilisateur. Chaque écran et chaque rapport généré (rapport d'expertise, note d'honoraires, estimation) existe dans les deux langues.",
        },
      ],
    },
    {
      group: 'Sécurité et données',
      id: 'securite-et-donnees',
      items: [
        {
          q: "Où nos données sont-elles hébergées, et sont-elles partagées avec d'autres cabinets?",
          a: "Chaque cabinet tourne sur son propre projet infonuagique dédié. Vos dossiers ne partagent jamais une base de données, un espace de stockage ou un annuaire d'utilisateurs avec qui que ce soit.",
        },
        {
          q: 'Qui, dans mon cabinet, peut voir quoi?',
          a: "L'accès est fondé sur les rôles. Les admins gèrent les utilisateurs et les paramètres, les gestionnaires voient toute la charge de travail, les estimateurs travaillent les dossiers qui leur sont assignés et les agents terrain ne voient que leurs missions.",
        },
        {
          q: 'Y a-t-il une piste de vérification?',
          a: "Oui. Chaque changement de statut, document, jalon et modification de champ est consigné par dossier, et les tournées de rappels peuvent être rejouées champ par champ pour voir exactement ce qui a changé.",
        },
      ],
    },
    {
      group: 'Pour commencer',
      id: 'pour-commencer',
      items: [
        {
          q: "Combien de temps prend l'intégration?",
          a: "Un cabinet typique est en production en deux semaines : nous provisionnons le déploiement isolé, chargeons vos assureurs et vos grilles tarifaires, créons vos utilisateurs et accompagnons chaque rôle dans sa première vraie réclamation.",
        },
        {
          q: 'Comment est-ce tarifé?',
          a: "Par cabinet, par mois, selon le nombre d'utilisateurs actifs. Demandez-nous une soumission via la page contact et nous vous enverrons une proposition adaptée à la taille de votre équipe.",
        },
      ],
    },
  ],
};
