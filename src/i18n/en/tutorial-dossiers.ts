// French source string -> English translation (guided tutorials).
// Covers the Gestion des dossiers list tour and the dossier-detail tour.
// Titles already translated elsewhere (nav/common/components/dossiers dicts)
// are NOT repeated here: 'Gestion des dossiers', 'Recherche rapide' (+ its
// body in tutorial-core), 'Envoyer un email', 'Création de mission',
// 'Planification avant/en cours/après', '2ème accord et +', 'Accord',
// 'Rapport', "Note d'honoraire".
export const TUTORIAL_DOSSIERS_EN: Record<string, string> = {
  // ── Dossiers list (/dossiers) ──
  "C'est la liste de travail principale du gestionnaire : chaque sinistre y apparaît comme un dossier, de sa création jusqu'à la note d'honoraire. Depuis cette page vous créez, recherchez, filtrez et ouvrez les dossiers.":
    'This is the claim manager’s main worklist: every claim appears here as a file, from creation through to the fee note. From this page you create, search, filter and open files.',
  'Raccourcis de date': 'Date shortcuts',
  "Filtrez par date de création en un clic : Jour, Semaine ou Mois. « Personnalisé » s'utilise avec les deux champs de dates juste à côté pour une période libre.":
    'Filter by creation date in one click: Day, Week or Month. “Custom” works with the two date fields right next to it for a free date range.',
  'Réinitialiser les filtres': 'Reset the filters',
  "Ce bouton efface d'un coup la recherche, les dates et tous les filtres de colonnes pour revenir à la liste complète.":
    'This button clears the search, the dates and every column filter at once, bringing back the full list.',
  'Filtres par colonne': 'Per-column filters',
  "Chaque entonnoir dans l'en-tête filtre sa colonne : nature, statut, compagnie, observation ou créateur. Les filtres actifs s'affichent en badges au-dessus du tableau.":
    'Each funnel icon in the header filters its own column: claim type, status, insurer, observation or creator. Active filters show as badges above the table.',
  'Colonne Statut': 'Status column',
  "Le badge coloré indique l'étape du dossier dans le flux (création → planification → chiffrage → accord → rapport). Cliquez sur la cellule d'une ligne pour voir l'historique des statuts.":
    'The colored badge shows where the file sits in the workflow (creation → scheduling → estimating → agreement → report). Click the cell on a row to see its status history.',
  'Créer un dossier': 'Create a file',
  "« Création de mission » ouvre la fenêtre de création : choisissez la compagnie et le rôle de l'expert. Le dossier s'ouvre ensuite et l'IA peut pré-remplir toutes les informations en scannant le document de mission.":
    '“Create assignment” opens the creation dialog: pick the insurance company and the expert’s role. The file then opens, where the AI can pre-fill all its information by scanning the assignment document.',
  'Envoyer des rappels': 'Send reminders',
  "« Rappeler » active un mode de sélection : cochez des dossiers puis « Envoyer à » pour adresser un rappel à un ou plusieurs gestionnaires, avec une observation facultative.":
    '“Send reminder” switches on a selection mode: tick files, then “Send to” to send a reminder to one or more claim managers, with an optional note.',
  'La liste des dossiers': 'The file list',
  "Chaque ligne est un dossier. Cliquez n'importe où sur la ligne pour l'ouvrir ; les icônes à droite permettent d'ouvrir le dossier, de consulter son workflow ou de le supprimer.":
    'Each row is a file. Click anywhere on the row to open it; the icons on the right open the file, show its workflow or delete it.',
  'Pagination': 'Pagination',
  "Choisissez le nombre de lignes par page et naviguez entre les pages. Le total de dossiers filtrés s'affiche ici.":
    'Choose how many rows per page and move between pages. The total number of filtered files is shown here.',
  'Onglets de dossiers': 'File tabs',
  "Chaque dossier ouvert reste ici sous forme d'onglet, comme dans un navigateur. Passez d'un dossier à l'autre sans perdre le fil ; le premier onglet ramène toujours à cette liste.":
    'Every open file stays here as a tab, like in a browser. Switch between files without losing your place; the first tab always brings you back to this list.',

  // ── Dossier detail (/dossiers/[id]) ──
  "Le dossier d'expertise": 'The appraisal file',
  "Un dossier suit tout le cycle d'un sinistre : création de la mission, import des documents, planification des visites terrain, chiffrage, accord(s) avec le garage, rapport et note d'honoraire. Cette page regroupe toutes ces étapes sur une seule frise verticale.":
    'A file follows the whole life of a claim: assignment creation, document import, field-visit scheduling, estimating, agreement(s) with the garage, report and fee note. This page gathers all those stages on one vertical timeline.',
  'En-tête du dossier': 'File header',
  "La référence expert, l'assuré, la compagnie et l'immatriculation restent toujours visibles ici, quelle que soit l'étape sur laquelle vous travaillez.":
    'The expert reference, insured, insurer and license plate stay visible here at all times, whichever stage you are working on.',
  'Statut du dossier': 'File status',
  "Ce badge avance automatiquement à mesure que le dossier progresse dans le flux : création → planification → chiffrage → accord → rapport. C'est le même statut coloré que dans la liste des dossiers.":
    'This badge advances automatically as the file moves through the workflow: creation → scheduling → estimating → agreement → report. It is the same color-coded status as in the file list.',
  "Ouvre une fenêtre pour envoyer un email lié à ce dossier sans quitter la page.":
    'Opens a dialog to send an email related to this file without leaving the page.',
  'Historique du dossier': 'File history',
  "Chaque action (création, import, changement de statut, envoi au chiffrage…) est tracée. Ce panneau montre qui a fait quoi, et quand.":
    'Every action (creation, import, status change, sending to estimating…) is logged. This panel shows who did what, and when.',
  "Traitement d'un rappel": 'Handling a reminder',
  "Quand vous ouvrez un dossier depuis « Mes rappels », vos modifications restent locales : elles ne sont publiées qu'au clic sur « Sauvegarder ». Ce bandeau affiche le nombre de modifications en attente.":
    'When you open a file from “My reminders”, your changes stay local: they are only published when you click “Save”. This banner shows how many changes are pending.',
  'La frise des étapes': 'The step timeline',
  "Tout le flux de travail du dossier, dans l'ordre. Cliquez sur une étape pour y accéder ; l'étape active se met en évidence pendant le défilement. Passons chaque étape en revue.":
    'The file’s entire workflow, in order. Click a step to jump to it; the active step highlights as you scroll. Let’s walk through each stage.',
  "Le point de départ : déposez le document de mission et l'IA le lit pour pré-remplir tout le dossier (assuré, véhicule, compagnie, dates…). Vérifiez ensuite le formulaire d'informations, importez les devis du garage, puis cliquez « Envoyer vers chiffrage ».":
    'The starting point: drop in the assignment document and the AI reads it to pre-fill the whole file (insured, vehicle, insurer, dates…). Then check the information form, import the garage quotes, and click “Send to estimating”.',
  "Planifiez la visite terrain avant réparation : rendez-vous, agent de terrain, photos « avant » du véhicule et observations de cette phase.":
    'Schedule the pre-repair field visit: appointment, field agent, “before” photos of the vehicle and this phase’s observations.',
  "Après le chiffrage, déposez ici les documents du 1er accord conclu avec le garage (et les pièces de réforme le cas échéant), avec les observations liées à cet accord.":
    'After estimating, drop the documents of the 1st agreement reached with the garage here (and any write-off paperwork), along with the observations tied to that agreement.',
  "Suivez la réparation pendant les travaux : visite intermédiaire, photos « en cours » et observations de cette phase.":
    'Follow the repair while work is underway: mid-repair visit, “in progress” photos and this phase’s observations.',
  "Si un nouveau devis arrive, un accord révisé est nécessaire : déposez ici les pièces du 2ème accord et des suivants. Cette étape exige que le 1er accord soit déjà complété.":
    'If a new quote comes in, a revised agreement is needed: drop the 2nd (and later) agreement documents here. This stage requires the 1st agreement to be completed first.',
  "La visite finale après réparation : photos « après » pour constater les travaux réalisés, et dernières observations.":
    'The final post-repair visit: “after” photos to confirm the completed work, and the last observations.',
  "Générez le rapport d'expertise en PDF à partir des données du dossier — l'aboutissement du travail technique.":
    'Generate the appraisal report as a PDF from the file’s data — the culmination of the technical work.',
  "La facturation clôt le dossier : déposez ici la note d'honoraire du cabinet.":
    'Billing closes the file: drop the firm’s fee note here.',
  'Visite terminée': 'Tour complete',
  "Vous connaissez maintenant le parcours complet d'un dossier. Suivez la frise de haut en bas : c'est l'ordre naturel du travail, et chaque action reste tracée dans l'historique.":
    'You now know a file’s full journey. Work down the timeline from top to bottom: that is the natural order of the work, and every action stays logged in the history.',
};
