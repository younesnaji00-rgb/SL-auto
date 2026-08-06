// French source string -> English translation (guided tutorials: launcher + consultation exemplar).
export const TUTORIAL_CORE_EN: Record<string, string> = {
  'Tutoriel de la page': 'Page tutorial',

  // ── Shared closing step (strong points + customization) ──
  'Prêt à passer à la pratique ?': 'Ready to try it yourself?',
  "Ce que vous venez de voir élimine les tâches répétitives : plus de ressaisie des documents de mission, des devis garage ni des plaques — l'IA les lit pour vous ; les délais, relances et statuts se suivent tout seuls ; et les responsables voient chaque étape de chaque dossier en temps réel.\nEn tant que client, chaque étape peut être personnalisée et adaptée à vos processus.\nChaque page a son propre tutoriel — bouton « ? » en bas à droite.":
    'What you just saw eliminates redundant work: no more re-typing mission documents, garage estimates, or license plates — AI reads them for you; deadlines, reminders, and statuses track themselves; and managers see every step of every file in real time.\nAs a client, every step can be customized and tailored to your processes.\nEvery page has its own tutorial — the “?” button at the bottom right.',
  'Démarrer la démo interactive': 'Start the demo',

  // ── Hands-on lab ──
  'Quitter la démo': 'Exit the demo',
  'Continuer': 'Continue',
  "Cliquez sur l'élément encadré pour continuer.": 'Click the highlighted element to continue.',

  // ── Welcome lightbox + pointer ──
  'Envie d’un tutoriel guidé ?': 'Want a guided tutorial?',
  'Un laboratoire guidé vous fait vivre un dossier de A à Z : création, terrain, chiffrage, rapport — avec des documents fournis à chaque étape.':
    'A guided hands-on lab walks you through a file from A to Z: creation, field work, estimating, report — with documents provided at every step.',
  'Commencer la visite guidée': 'Start the guided tour',
  'Plus tard': 'Later',
  'Le tutoriel de chaque page est ici, à tout moment.': 'Each page’s tutorial lives here, anytime.',
  'Cliquez sur le bouton « ? » en bas à droite pour le lancer.':
    'Click the “?” button at the bottom right to start it.',

  // ── Login roles explainer ──
  'Découvrir les rôles ici': 'Learn about each role here',
  'Les rôles dans l’application': 'The roles in the app',
  'Sa mission': 'Their mission',
  'Au quotidien': 'Day to day',
  'Pages clés': 'Key pages',

  // Admin
  'Supervision complète et configuration de la plateforme.':
    'Full oversight and platform configuration.',
  "L'Admin voit tout et configure tout. Il pilote la plateforme au niveau global : comptes, droits d'accès, référentiels (compagnies, statuts, jours fériés) et supervision de l'activité de toute l'équipe en temps réel.":
    'The Admin sees everything and configures everything. They run the platform globally: accounts, access rights, reference data (insurers, statuses, holidays), and real-time oversight of the whole team’s activity.',
  "Crée les comptes (connexion par nom, sans email) et attribue les rôles ; peut accorder ou retirer des permissions page par page pour un utilisateur précis.":
    'Creates accounts (name-based login, no email needed) and assigns roles; can grant or revoke page-by-page permissions for a specific user.',
  "Force la déconnexion d'un appareil : les rôles opérationnels sont limités à une session active à la fois, et l'Admin peut libérer une session bloquée.":
    'Force-disconnects a device: operational roles are limited to one active session at a time, and the Admin can free a stuck session.',
  "Gère les compagnies d'assurance (logos, couleurs, statistiques par compagnie) et les tampons apposés sur les PDF.":
    'Manages insurers (logos, colors, per-insurer statistics) and the stamps applied to PDFs.',
  "Maintient le calendrier des jours fériés — c'est lui qui rend le calcul des délais en heures ouvrées exact.":
    'Maintains the holiday calendar — the thing that keeps business-hours deadline math accurate.',
  "Suit le tableau de bord et le monitoring d'équipe : volumes par étape, dossiers en délai ou en retard, activité par utilisateur.":
    'Follows the dashboard and team monitoring: volume per step, on-time vs late files, per-user activity.',
  'Reçoit et traite les signalements de bugs des utilisateurs (messagerie intégrée).':
    'Receives and handles user bug reports (built-in messaging).',
  'Tableau de bord · Monitoring · Dossiers · Utilisateurs · Compagnies · Tampons · Jours fériés':
    'Dashboard · Team monitoring · Files · Users · Insurers · Stamps · Holidays',

  // Manager
  'Le chef d’orchestre du dossier, de la création à la facture.':
    'The conductor of the file, from creation to invoice.',
  "Le Manager (gestionnaire) porte le dossier de bout en bout. Chaque dossier est une frise chronologique : création de mission, planifications terrain, chiffrage, accords, rapport, note d'honoraire — le Manager fait avancer chaque étape et rien ne se perd entre deux.":
    'The Manager owns the file end to end. Every file is a timeline: mission creation, field scheduling, estimating, agreements, report, fee note — the Manager moves each stage forward and nothing falls through the cracks.',
  "Crée le dossier en scannant le document de mission de la compagnie : l'IA lit et pré-remplit assuré, véhicule, police, dates — zéro ressaisie.":
    'Creates the file by scanning the insurer’s mission document: AI reads and pre-fills insured, vehicle, policy, dates — zero re-typing.',
  "Planifie les missions photo (avant / en cours / après réparations) et les assigne aux agents de terrain, avec position des agents en direct pour choisir le bon.":
    'Schedules photo missions (before / during / after repairs) and assigns them to field agents, with live agent locations to pick the right one.',
  "Envoie le devis garage au chiffrage et suit les allers-retours d'accord (proposition, 2ème et 3ème accords si nécessaire).":
    'Sends the garage estimate to estimating and tracks the agreement rounds (proposal, 2nd and 3rd agreements when needed).',
  "Envoie l'accord final à la compagnie par email directement depuis le dossier.":
    'Emails the final agreement to the insurer directly from the file.',
  "Génère les rapports d'expertise en PDF (préliminaire, final, réforme, estimatif) puis la note d'honoraire.":
    'Generates the expert reports as PDFs (preliminary, final, write-off, estimate) and then the fee note.',
  'Reçoit et envoie des rappels avec suivi de traitement par destinataire ; ses modifications sont protégées par un brouillon local anti-crash.':
    'Receives and sends reminders with per-recipient tracking; edits are protected by a crash-proof local draft.',
  'Dossiers · Mes Rappels · Tableau de bord · Consultation':
    'Files · My Reminders · Dashboard · Lookup',

  // Estimator
  'Vérifie les devis extraits par l’IA et négocie les accords.':
    'Verifies AI-extracted estimates and negotiates agreements.',
  "L'Estimator (chiffreur) reçoit les dossiers à chiffrer avec un délai de 24 heures ouvrées affiché en permanence. Le devis du garage est déjà lu par l'IA ligne par ligne — son travail n'est pas de ressaisir, mais de vérifier et de décider.":
    'The Estimator receives files to estimate with a 24-business-hour deadline always on screen. The garage’s estimate is already read line by line by AI — their job isn’t re-typing, it’s verifying and deciding.',
  "Ouvre l'éditeur de devis structuré : chaque ligne (référence, désignation, quantité, prix, vétusté, TVA) est pré-extraite du PDF du garage.":
    'Opens the structured estimate editor: every line (reference, description, quantity, price, depreciation, tax) is pre-extracted from the garage’s PDF.',
  "Vérifie les montants, applique des corrections en masse par colonne, puis confirme avec « J'ai vérifié » ; peut relancer l'extraction à tout moment.":
    'Checks the amounts, applies bulk column corrections, then confirms with “I have verified”; can re-run the extraction anytime.',
  "Remplit les colonnes d'accord : prix accordé par ligne, plafonné au prix unitaire demandé, avec totaux recalculés en direct.":
    'Fills the agreement columns: agreed price per line, capped at the requested unit price, with totals recomputed live.',
  'Compare le devis structuré et le PDF original côte à côte dans le même écran.':
    'Compares the structured estimate and the original PDF side by side on one screen.',
  "Dépose la proposition d'accord ou l'accord (2ème / 3ème rounds sur le même devis, ou nouveau devis d'un autre garage), exporte le PDF avec tampon positionné au clic.":
    'Files the agreement proposal or agreement (2nd / 3rd rounds on the same estimate, or a new estimate from another shop), exports the PDF with a click-placed stamp.',
  'Prononce les verdicts de réforme (technique ou économique) avec PDF récapitulatif.':
    'Issues write-off verdicts (technical or economic) with a summary PDF.',
  'Assignations Chiffrage · Éditeur de devis · Éditeur PDF':
    'Estimating Assignments · Estimate editor · PDF editor',

  // Field Agent
  'Les missions photo sur le terrain, 100 % mobile.':
    'Photo missions in the field, 100% mobile.',
  "L'Agent de Terrain travaille depuis son téléphone. Sa journée est une liste de missions photo — avant, pendant et après réparations — chacune avec son échéance. Le flux est pensé caméra d'abord : le moins de saisie possible.":
    'The Field Agent works from their phone. Their day is a list of photo missions — before, during, and after repairs — each with its deadline. The flow is camera-first: as little typing as possible.',
  "Scanne la plaque d'immatriculation du véhicule : l'IA la lit et retrouve le bon dossier automatiquement — aucune recherche manuelle.":
    'Scans the vehicle’s license plate: AI reads it and finds the right file automatically — no manual searching.',
  "Prend les photos par catégorie directement depuis l'app ; elles sont horodatées, filigranées à son nom et versées au dossier.":
    'Takes photos by category right in the app; they are timestamped, watermarked with their name, and filed to the dossier.',
  "L'avancement des photos fait progresser le statut du dossier automatiquement — le Manager voit la mission se terminer en direct.":
    'Photo progress advances the file’s status automatically — the Manager watches the mission complete in real time.',
  'Ajoute les documents constatés sur place et ses observations (texte ou vocal).':
    'Adds documents found on site and their observations (text or voice).',
  "Partage sa position pendant les tournées pour faciliter la planification (service dédié sur Android, même écran verrouillé).":
    'Shares their location during rounds to help scheduling (dedicated Android service, even with the screen locked).',
  'Assignations Terrain · Détail de mission (mobile)':
    'Field Assignments · Mission detail (mobile)',
  'supervise tout : utilisateurs, permissions, compagnies, jours fériés et configuration.':
    'oversees everything: users, permissions, insurers, holidays, and configuration.',
  'pilote les dossiers de bout en bout : création, planification, accords, rapports et suivi des délais.':
    'drives files end to end: creation, scheduling, agreements, reports, and deadline tracking.',
  'vérifie les devis extraits par l’IA ligne par ligne, négocie les accords et dépose les verdicts de réforme.':
    'verifies AI-extracted estimates line by line, negotiates agreements, and files write-off verdicts.',
  'réalise les missions photo sur le terrain depuis son mobile : scan de plaque, photos avant/pendant/après.':
    'runs photo missions in the field from a phone: plate scan, before/during/after photos.',

  // ── Consultation (exemplar) ──
  'Consultation des dossiers': 'File lookup',
  "Cette page est une vue de recherche en lecture seule sur tous les dossiers du cabinet. Elle sert aux directeurs et responsables pour retrouver un dossier rapidement, sans risque de modification.":
    'This page is a read-only search view over all the firm’s files. Directors and team leads use it to find a file quickly, with no risk of changing anything.',
  'Recherche rapide': 'Quick search',
  "Tapez une référence, un nom d'assuré ou une immatriculation : la liste se filtre au fur et à mesure de la saisie.":
    'Type a reference, an insured’s name or a license plate: the list filters as you type.',
  'Filtrer par nature': 'Filter by claim type',
  'Limitez la liste à un type de sinistre (RC, Dommages, Vol…).':
    'Narrow the list to one type of claim (liability, damage, theft…).',
  'Filtrer par statut': 'Filter by status',
  "Chaque dossier avance dans un flux de statuts (création → planification → chiffrage → accord → rapport). Ce filtre affiche les dossiers à une étape précise.":
    'Every file moves through a status workflow (creation → scheduling → estimating → agreement → report). This filter shows the files at one specific stage.',
  'Filtrer par compagnie': 'Filter by insurer',
  "Affichez uniquement les dossiers d'une compagnie d'assurance.":
    'Show only the files of one insurance company.',
  'Résultats': 'Results',
  "Les dossiers correspondants s'affichent ici avec leur statut en couleur. Cliquez sur une ligne pour ouvrir le dossier complet.":
    'Matching files appear here with their color-coded status. Click a row to open the full file.',
  // ── Round 3: merged walkthrough / sidebar intro / role login ──
  'C’est tout pour cette page !': 'That’s it for this page!',
  "L'IA lit les documents pour vous, les délais se suivent tout seuls — et tout peut être adapté à votre cabinet.\nLe bouton « ? » en bas à droite relance la visite guidée à tout moment.":
    'AI reads documents for you, deadlines track themselves — and everything can be tailored to your firm.\nThe “?” button at the bottom right restarts the guided tour anytime.',
  'La visite guidée est ici.': 'The guided tour lives here.',
  'Ce bouton lance le laboratoire guidé complet : le menu, puis un dossier suivi de A à Z.\nSi vous quittez en cours de route, il reprend exactement où vous en étiez.':
    'This button launches the full hands-on lab: the menu, then one file followed from A to Z.\nIf you leave mid-way, it picks up exactly where you were.',
  'Visite guidée': 'Guided tour',
  'Bienvenue !': 'Welcome!',
  "Faisons le tour du menu, dans l'ordre de vie d'un dossier. 1 minute, promis.":
    'Let’s tour the menu, in the order a file actually moves. One minute, promise.',
  'Gestion des dossiers — le cœur': 'File Management — the core',
  "Tous les dossiers vivent ici, de la création à la facture. Tout le reste s'y rattache.":
    'Every file lives here, from creation to invoice. Everything else connects to it.',
  'Ensuite : les photos': 'Next: the photos',
  'Les missions photo des agents sur le terrain (avant, pendant, après réparations).':
    'Field agents’ photo missions (before, during, after repairs).',
  'Puis : le chiffrage': 'Then: estimating',
  'Les devis des garages, à vérifier par vos chiffreurs.':
    'Garage estimates, verified by your estimators.',
  'Les rappels': 'Reminders',
  'Les demandes échangées entre collègues sur un dossier.':
    'Requests exchanged between colleagues about a file.',
  'La vue d’ensemble': 'The overview',
  "L'activité en direct : volumes, statuts, derniers changements.":
    'Live activity: volumes, statuses, latest changes.',
  'Les délais': 'Deadlines',
  "Chaque étape : à l'heure, en retard, ou à faire.":
    'Every step: on time, late, or still to do.',
  'La recherche': 'Search',
  'Retrouver un dossier en lecture seule, sans risque.':
    'Find any file, read-only, risk-free.',
  'L’administration': 'Administration',
  'Comptes, compagnies, tampons, jours fériés : la configuration du cabinet.':
    'Accounts, insurers, stamps, holidays: your firm’s configuration.',
  'À vous de jouer': 'Your turn',
  'Cliquez sur « Gestion des dossiers » pour continuer la visite là-bas.':
    'Click “File Management” to continue the tour there.',
  'Explorer la démo': 'Explore the demo',
  'Choisissez un rôle — aucun compte, aucun engagement.':
    'Pick a role — no account, no commitment.',
  'Supervision et réglages': 'Oversight & settings',
  'Pilote les dossiers': 'Drives the files',
  'Vérifie les devis': 'Verifies estimates',
  'Photos sur le terrain': 'Photos in the field',
  'Connexion...': 'Signing in...',
  'Conseil : essayez « Field Agent » depuis un téléphone, et les autres rôles depuis un ordinateur.':
    'Tip: try “Field Agent” on a phone, and the other roles on a computer.',
  'Connexion avec des identifiants (comptes d’essai)': 'Sign in with credentials (trial accounts)',
  'Retour aux accès démo en un clic': 'Back to one-click demo access',
};
