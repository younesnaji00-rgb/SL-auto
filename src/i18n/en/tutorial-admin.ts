// French source string -> English translation (guided tutorials).
// Strings already present in other dictionaries (admin.ts, nav.ts…) are NOT
// repeated here: 'Filtrer par rôle', 'Dossiers assignés',
// "Historique d'activité", 'Jours fériés', 'Ajouter une date'.
export const TUTORIAL_ADMIN_EN: Record<string, string> = {
  // ── Utilisateurs ──
  'Gestion des utilisateurs': 'User management',
  "Cette page permet aux administrateurs de créer les comptes de l'équipe et de gérer leurs accès. Chaque compte a un rôle qui détermine les pages et actions disponibles.":
    'This page lets administrators create the team’s accounts and manage their access. Each account has a role that determines which pages and actions are available.',
  'Créer un compte': 'Create an account',
  "Renseignez le nom complet et un mot de passe. Le nom complet sert d'identifiant : l'utilisateur se connecte en tapant son nom exact, sans adresse email.":
    'Enter the full name and a password. The full name is the login: the user signs in by typing their exact name, no email address needed.',
  'Choisir le rôle': 'Pick the role',
  "Le rôle définit les droits : Admin et directeurs supervisent tout, le Gestionnaire suit les dossiers, le Chiffreur établit les devis, l'Agent de Terrain constate sur place. Ces trois derniers rôles sont limités à un seul appareil à la fois.":
    'The role defines the rights: Admin and directors oversee everything, the Manager tracks files, the Estimator writes estimates, the Field Agent inspects on site. Those last three roles are limited to one device at a time.',
  'Rechercher un utilisateur': 'Find a user',
  'Tapez un nom ou un email : la liste se filtre instantanément.':
    'Type a name or an email: the list filters instantly.',
  "Affichez uniquement les comptes d'un rôle donné. Un badge rappelle le filtre actif ; cliquez sur la croix pour le retirer.":
    'Show only the accounts of a given role. A badge shows the active filter; click the cross to clear it.',
  'Liste des comptes': 'Account list',
  "Chaque ligne montre le mot de passe (icône œil), le rôle et le statut. Un compte Inactif ne peut plus se connecter. Cliquez sur une ligne pour ouvrir la fiche détaillée.":
    'Each row shows the password (eye icon), the role and the status. An Inactive account can no longer sign in. Click a row to open the detailed profile.',

  // ── Fiche utilisateur ──
  'Fiche utilisateur': 'User profile',
  "Cette page regroupe tout ce qui concerne un compte : informations, permissions, dossiers assignés, activité et session. Elle est réservée aux administrateurs.":
    'This page gathers everything about one account: details, permissions, assigned files, activity and session. It is reserved for administrators.',
  'Modifier le profil': 'Edit the profile',
  "Modifiez les coordonnées, le rôle, le statut et les compagnies de l'utilisateur, puis cliquez sur Sauvegarder pour enregistrer les changements.":
    'Change the user’s details, role, status and insurers, then click Save to record the changes.',
  'Permissions par page': 'Per-page permissions',
  "Chaque interrupteur accorde ou retire l'accès à une page, au-delà de ce que le rôle prévoit. Les badges « Accordé » et « Retiré » signalent les exceptions au rôle. Dépliez une ligne pour affiner les sous-permissions.":
    'Each switch grants or revokes access to a page, beyond what the role provides. The “Granted” and “Revoked” badges flag exceptions to the role. Expand a row to fine-tune sub-permissions.',
  "Les dossiers dont cet utilisateur est responsable. Cliquez sur une ligne pour ouvrir le dossier.":
    'The files this user is responsible for. Click a row to open the file.',
  "Les dernières actions effectuées par cet utilisateur dans l'application (changements de statut, modifications de dossiers…).":
    'The latest actions performed by this user in the app (status changes, file edits…).',
  'Session et appareil': 'Session and device',
  "Les rôles de base (Gestionnaire, Chiffreur, Agent de Terrain) ne peuvent être connectés que sur un seul appareil à la fois. Cette carte montre l'appareil et l'adresse IP connectés ; « Déconnecter la session » libère le compte pour un autre appareil.":
    'Basic roles (Manager, Estimator, Field Agent) can only be signed in on one device at a time. This card shows the connected device and IP address; “Disconnect session” frees the account for another device.',

  // ── Compagnies ──
  'Compagnies partenaires': 'Partner insurers',
  "Cette page liste les compagnies d'assurance partenaires du cabinet. Chaque compagnie dispose de son propre tableau de bord avec ses indicateurs et ses dossiers.":
    'This page lists the firm’s partner insurance companies. Each insurer has its own dashboard with its indicators and files.',
  'Choisir une compagnie': 'Pick an insurer',
  "Cliquez sur une carte pour ouvrir le tableau de bord de la compagnie : statistiques, portefeuille de dossiers et création de dossier pré-remplie.":
    'Click a card to open the insurer’s dashboard: statistics, file portfolio and pre-filled file creation.',
  'Logo de la compagnie': 'Insurer logo',
  "Cliquez sur l'encadré du logo pour importer ou remplacer l'image de la compagnie. Ce logo apparaît ensuite sur ses cartes et documents.":
    'Click the logo box to upload or replace the insurer’s image. This logo then appears on its cards and documents.',
  'Indicateurs clés': 'Key indicators',
  "Le volume de dossiers de la compagnie sur la période filtrée : total, nouveaux, en cours et terminés.":
    'The insurer’s file volume over the filtered period: total, new, in progress and closed.',
  'Portefeuille de dossiers': 'File portfolio',
  "Tous les dossiers de la compagnie en temps réel. Filtrez par période avec les dates en haut à droite, puis ouvrez un dossier via l'icône de la colonne Gérer.":
    'All the insurer’s files in real time. Filter by period with the dates at the top right, then open a file via the icon in the Manage column.',
  'Créer un dossier': 'Create a file',
  "Ouvre le formulaire de création d'un dossier avec la compagnie déjà pré-remplie.":
    'Opens the file-creation form with the insurer already pre-filled.',

  // ── Tampons ──
  'Tampons de signature': 'Signature stamps',
  "Les tampons sont les images de cachet apposées sur les devis et documents PDF générés par l'application. Cette page, réservée aux administrateurs, sert à les importer et à les attribuer.":
    'Stamps are the seal images placed on the estimates and PDF documents the app generates. This admin-only page is where you upload and assign them.',
  'Importer des images': 'Upload images',
  "Sélectionnez une ou plusieurs images de tampon. Le nom du tampon est repris du nom de fichier ; vérifiez la file d'attente puis lancez l'import.":
    'Select one or more stamp images. The stamp name is taken from the file name; review the queue then start the import.',
  'Gérer les tampons': 'Manage stamps',
  "Activez ou désactivez un tampon avec l'interrupteur (un tampon inactif n'est plus proposé), ou supprimez-le définitivement avec la corbeille.":
    'Enable or disable a stamp with the switch (an inactive stamp is no longer offered), or delete it permanently with the trash icon.',
  'Assigner aux chiffreurs': 'Assign to estimators',
  "Choisissez le ou les tampons de chaque chiffreur : ce sont eux qui signeront ses documents. Un chiffreur peut disposer de plusieurs tampons.":
    'Choose each estimator’s stamp(s): these are what will sign their documents. An estimator can have several stamps.',

  // ── Jours fériés ──
  "Les délais des dossiers sont comptés en jours ouvrés : les dates listées ici sont exclues du calcul des échéances et des compteurs hors délai. Tenez ce calendrier à jour chaque année.":
    'File deadlines are counted in business days: the dates listed here are excluded from deadline calculations and overdue counters. Keep this calendar up to date every year.',
  "Choisissez un jour dans le calendrier puis cliquez sur Ajouter. Les doublons sont refusés automatiquement.":
    'Pick a day in the calendar then click Add. Duplicates are rejected automatically.',
  'Import par IA': 'AI import',
  "Importez une capture d'écran listant les jours fériés de l'année : l'IA détecte les dates et les ajoute automatiquement, en ignorant les doublons.":
    'Upload a screenshot listing the year’s public holidays: the AI detects the dates and adds them automatically, skipping duplicates.',
  'Import en masse': 'Bulk import',
  "Collez une liste de dates (une par ligne, format YYYY-MM-DD) puis cliquez sur Importer. Le bouton de gauche charge le calendrier par défaut en un clic.":
    'Paste a list of dates (one per line, YYYY-MM-DD format) then click Import. The button on the left loads the default calendar in one click.',
  'Liste des dates': 'Date list',
  "Toutes les dates enregistrées, triées par ordre chronologique. Supprimez une date avec la corbeille si elle a été ajoutée par erreur.":
    'All the recorded dates, sorted chronologically. Delete a date with the trash icon if it was added by mistake.',

  // ── Signaler un bug ──
  'Signaler un problème': 'Report an issue',
  "Cette page est une messagerie directe avec l'administrateur pour signaler un problème ou poser une question. Elle est accessible à tous les rôles.":
    'This page is a direct messaging line to the administrator to report an issue or ask a question. It is available to every role.',
  'Fil de discussion': 'Conversation thread',
  "Vos messages et les réponses de l'administrateur s'affichent ici en temps réel, du plus ancien au plus récent.":
    'Your messages and the administrator’s replies appear here in real time, oldest to newest.',
  'Décrire le problème': 'Describe the issue',
  "Tapez votre message puis cliquez sur Envoyer (ou touche Entrée). Décrivez ce que vous faisiez, ce qui était attendu et ce qui s'est produit.":
    'Type your message then click Send (or press Enter). Describe what you were doing, what you expected, and what actually happened.',
  'Joindre une preuve': 'Attach evidence',
  "Le trombone joint un fichier (capture d'écran, document…) et le micro enregistre un message vocal de 2 minutes maximum.":
    'The paperclip attaches a file (screenshot, document…) and the microphone records a voice message of up to 2 minutes.',
  'Boîte de réception admin': 'Admin inbox',
  "Côté administrateur : toutes les conversations, avec le nombre de messages non lus. Cliquez sur un utilisateur pour ouvrir son fil et lui répondre.":
    'On the administrator side: every conversation, with its unread-message count. Click a user to open their thread and reply.',
};
