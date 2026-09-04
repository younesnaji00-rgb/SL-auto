/**
 * Merge batch F — admin, consultation, login and API.
 *
 * French strings introduced by the UI redesign (nav-upgrade) on:
 *   /utilisateurs (list + [uid] detail), /tampons, /jours-feries,
 *   /consultation, /compagnies, /signaler-bug and /login.
 *
 * Keys are the FRENCH source strings exactly as they appear in code. Several
 * keys carry a NARROW/NO-BREAK SPACE before their colon (French typography,
 * written as  ) — those are distinct from the plain-space variants that
 * already live in dossiers.ts / dashboard.ts, so both must exist.
 */
export const MERGE_F_EN: Record<string, string> = {
  // ── Shared micro-copy (ellipsis variants of existing keys) ──
  'Ajout…': 'Adding…',
  'Analyse en cours…': 'Analyzing…',
  'Connexion…': 'Signing in…',
  'Création…': 'Creating…',
  'Déconnexion…': 'Signing out…',
  'Suppression…': 'Deleting…',
  'Connecté': 'Signed in',
  'facultatif': 'optional',
  'sans nom': 'unnamed',
  'Afficher le mot de passe': 'Show password',
  'Masquer le mot de passe': 'Hide password',

  // ── /jours-feries (holidays) ──
  'Dates pendant lesquelles les délais ne sont pas comptés (compteur hors délai).':
    'Dates on which deadlines are not counted (overdue counter paused).',
  'Calendrier des jours fériés': 'Holiday calendar',
  'Jour férié': 'Holiday',
  'Choisir le': 'Choose',
  'Choisissez une date': 'Choose a date',
  'Cette date est déjà dans la liste': 'This date is already in the list',
  'Annuler la suppression': 'Undo the deletion',
  'Cliquer un jour du calendrier remplit le champ · les jours fériés existants sont en teinte':
    'Click a day in the calendar to fill the field · existing holidays are tinted',
  'Importer depuis une image': 'Import from an image',
  "Capture listant les jours fériés de l'année · PNG, JPG, WEBP · les doublons sont ignorés":
    "Screenshot listing the year's holidays · PNG, JPG, WEBP · duplicates are skipped",
  'Dates': 'Dates',
  'Une date par ligne au format AAAA-MM-JJ, les doublons et formats invalides sont ignorés':
    'One date per line in YYYY-MM-DD format; duplicates and invalid formats are skipped',
  "Échec de l'analyse": 'Analysis failed',
  "Aucune date n'a été trouvée dans l'image. Essayez une capture plus nette.":
    'No date was found in the image. Try a sharper screenshot.',
  'Importer les jours fériés': 'Import statutory holidays',
  "Aucune date n'est enregistrée : les délais sont comptés tous les jours.":
    'No date is saved: deadlines are counted every day.',
  'Prochain jour férié': 'Next holiday',
  'Passé': 'Past',
  // Weekday header row (date-fns `EEEEEE` style abbreviations)
  'lun.': 'Mon',
  'mar.': 'Tue',
  'mer.': 'Wed',
  'jeu.': 'Thu',
  'ven.': 'Fri',
  'sam.': 'Sat',
  'dim.': 'Sun',
  'Mois précédent': 'Previous month',
  'Mois suivant': 'Next month',

  // ── /tampons (stamps) ──
  "Le nom du tampon est dérivé du nom de fichier, sans l'extension.":
    'The stamp name is derived from the file name, without the extension.',
  'Choisir des images': 'Choose images',
  "Fichiers en attente d'import": 'Files waiting to be imported',
  'Ajouter le premier tampon': 'Add the first stamp',
  "Aucun tampon n'est encore enregistré.": 'No stamp has been saved yet.',
  'Tampon actif': 'Stamp active',
  'ce tampon': 'this stamp',
  'Chiffreurs': 'Estimators',
  'Tampons de': 'Stamps for',
  "Aucun utilisateur n'a le rôle Chiffreur.": 'No user has the Estimator role.',
  'Supprimer le tampon': 'Delete the stamp',
  "Le fichier sera retiré du stockage et le tampon de la base. Les chiffreurs auxquels il est assigné n'y auront plus accès. Cette action est irréversible.":
    'The file will be removed from storage and the stamp from the database. Estimators it is assigned to will lose access to it. This action cannot be undone.',

  // ── /utilisateurs (list) ──
  'Au moins 6 caractères': 'At least 6 characters',
  "Compagnies d'assurance": 'Insurers',
  'Rechercher ou créer une zone': 'Search or create a zone',
  'Nom, prénom ou email': 'Last name, first name, or email',
  'Effacer la recherche': 'Clear the search',
  'Recherche :': 'Search:',
  'Aucun utilisateur ne correspond': 'No user matches',
  'Ajouter le premier utilisateur': 'Add the first user',
  'Effacez la recherche ou le filtre de rôle.': 'Clear the search or the role filter.',
  'Le formulaire « Ajouter un utilisateur » crée le compte et son identifiant.':
    'The "Add a user" form creates the account and its sign-in name.',
  'Effacer les filtres': 'Clear the filters',
  'Remplir le formulaire': 'Fill in the form',
  'Impossible : dernier compte Admin': 'Not possible: last Admin account',
  'C’est le dernier compte Admin — créez-en un autre avant de supprimer celui-ci.':
    'This is the last Admin account — create another one before deleting it.',
  'Il s’agit de votre propre compte — vous perdrez immédiatement l’accès.':
    'This is your own account — you will lose access immediately.',
  'Son compte, sa fiche et ses entrées dans les collections liées (agents / chiffreurs) seront retirés. Cette action est irréversible.':
    'Their account, profile, and entries in the related collections (field agents / estimators) will be removed. This action cannot be undone.',

  // ── /utilisateurs/[uid] (detail) ──
  "Ce compte n'existe plus ou l'adresse est incorrecte.":
    'This account no longer exists, or the address is incorrect.',
  'Vide = accès à tous les dossiers ; sinon uniquement ceux des compagnies choisies':
    'Empty = access to every file; otherwise only files of the selected insurers',
  "Villes dans lesquelles l'utilisateur intervient, plusieurs choix possibles":
    'Cities where the user operates; multiple choices allowed',
  'Dernière connexion': 'Last login',
  'Modifications non enregistrées': 'Unsaved changes',
  'Les dossiers créés par ou confiés à cet utilisateur apparaîtront ici.':
    'Files created by or assigned to this user will appear here.',
  'Les changements effectués par cet utilisateur apparaîtront ici.':
    'Changes made by this user will appear here.',
  "Son compte et sa fiche seront définitivement supprimés. Les journaux d'activité (historique, workflow) qui lui sont attribués seront conservés. Cette action est irréversible.":
    'Their account and profile will be permanently deleted. Activity logs (history, workflow) attributed to them will be kept. This action cannot be undone.',
  // Role captions shown under the Rôle field (src/lib/role-descriptions.ts)
  'Accès complet : dossiers, assignations, utilisateurs et paramètres':
    'Full access: files, assignments, users, and settings',
  'Tableau de bord, suivi, dossiers, rappels, chiffrage et terrain':
    'Dashboard, monitoring, files, reminders, estimating, and field work',
  'Gère les dossiers de sinistres et reçoit des rappels':
    'Manages claim files and receives reminders',
  'Traite les dossiers assignés au chiffrage': 'Handles files assigned for estimating',
  'Réalise les missions terrain qui lui sont assignées': 'Carries out the field assignments given to them',
  'Consultation des dossiers (lecture seule) et jours fériés':
    'File lookup (read-only) and statutory holidays',

  // ── /consultation ──
  'Erreur de chargement': 'Loading error',
  'tous statuts': 'all statuses',
  'Retirer le filtre': 'Remove the filter',
  'Filtrer sur': 'Filter on',
  'Réf., assuré, matricule…': 'Ref., insured, plate…',
  'Rechercher un dossier par référence, assuré ou matricule':
    'Search for a file by reference, insured, or license plate',
  'Période de requête': 'Request period',
  'Afficher / masquer des colonnes': 'Show / hide columns',
  'Exporter la liste filtrée en Excel': 'Export the filtered list to Excel',
  'Exporté': 'Exported',
  // French typography: these carry a NO-BREAK SPACE before the colon.
  'Nature :': 'Type of claim:',
  'Statut :': 'Status:',
  'Compagnie :': 'Insurer:',
  'Type :': 'Type:',
  'Du :': 'From:',
  'Au :': 'To:',
  'Retirer le filtre type de dossier': 'Remove the file-type filter',
  'Dossiers en consultation': 'Files in lookup',
  'Réf. expert': 'Appraiser ref.',
  'Aucun dossier ne correspond aux filtres': 'No file matches the filters',
  'Aucun résultat pour': 'No results for',
  'existe dans': 'appears in',
  'dossier hors de ces filtres.': 'file outside these filters.',
  'dossiers hors de ces filtres.': 'files outside these filters.',
  'Aucun dossier n’a encore été créé.': 'No file has been created yet.',
  'Rechercher partout': 'Search everywhere',
  'la recherche': 'the search',
  'la nature': 'the type of claim',
  'le statut': 'the status',
  'la compagnie': 'the insurer',
  'le type de dossier': 'the file type',
  'la période du': 'the period from',
  'Afficher plus': 'Show more',
  'restants': 'remaining',
  'Affichés': 'Showing',

  // ── /compagnies ──
  'Aucune compagnie accessible': 'No insurer accessible',
  "Aucune compagnie partenaire n'est visible avec vos permissions actuelles.":
    'No partner insurer is visible with your current permissions.',
  'Compagnies partenaires': 'Partner insurers',
  'Importer le logo de': 'Upload the logo for',
  'Total dossiers': 'Total files',
  'toutes périodes': 'all periods',
  'Portefeuille dossiers': 'File portfolio',
  'Aucun dossier sur cette période': 'No file in this period',
  "Aucun dossier n'est encore associé à cette compagnie.":
    'No file is associated with this insurer yet.',
  'Effacer la période': 'Clear the period',

  // ── /signaler-bug ──
  'Conversations des utilisateurs': 'User conversations',
  'Conversations': 'Conversations',
  'non lu': 'unread',
  'non lus': 'unread',
  'Retour aux conversations': 'Back to the conversations',
  "Les messages de l'utilisateur s'afficheront ici.": "The user's messages will appear here.",
  'Retirer la pièce jointe': 'Remove the attachment',
  'Décrivez le problème…': 'Describe the issue…',
};
