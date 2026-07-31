// French source string -> English translation.
// Hands-on lab steps ("Démarrer la démo") + marketing-enriched tour intros.
// Strings reused verbatim from existing tours (titles like 'Création de
// mission', bodies like the rap-tabs explainer) already live in other
// tutorial-*.ts dictionaries and are NOT duplicated here.
export const LABS_EN: Record<string, string> = {
  // ── Enriched intros ──
  "Le tableau de bord donne aux administrateurs et responsables d'équipe une vision en temps réel de chaque processus du cabinet : volumes par statut, répartition par compagnie et fil de chaque changement — une force clé de la plateforme. Si des compagnies vous sont assignées, seuls leurs dossiers sont comptés.":
    'The dashboard gives administrators and team leads a real-time view of every process in the firm: volumes by status, breakdown by insurer, and a feed of every change — a key strength of the platform. If insurers are assigned to you, only their files are counted.',
  "C'est la liste de travail principale du gestionnaire : chaque sinistre y apparaît comme un dossier, de sa création jusqu'à la note d'honoraire. À la création, l'IA scanne le document de mission et pré-remplit le dossier — fini la ressaisie des informations déjà écrites par la compagnie. Depuis cette page vous créez, recherchez, filtrez et ouvrez les dossiers.":
    "This is the claim handler's main worklist: every claim appears here as a file, from creation to the fee note. At creation, AI scans the assignment document and pre-fills the file — no more re-typing information the insurer already wrote. From this page you create, search, filter, and open files.",
  "Un dossier suit tout le cycle d'un sinistre : création de la mission, import des documents, planification des visites terrain, chiffrage, accord(s) avec le garage, rapport et note d'honoraire — le tout sur une seule frise verticale. Chaque information n'est saisie qu'une fois : elle se déverse automatiquement dans les devis, les accords, le rapport et la note d'honoraire, sans double saisie d'une étape à l'autre.":
    'A file follows the full life cycle of a claim: assignment creation, document import, field-visit scheduling, estimating, agreement(s) with the garage, report, and fee note — all on a single vertical timeline. Every piece of information is entered only once: it flows automatically into the estimates, the agreements, the report, and the fee note, with no duplicate data entry between stages.',
  "Cette page mesure l'avancement du flux de travail : combien de dossiers ont franchi chaque étape (création, expertises, accords, facture, rapport), et qui a fait quoi. Le respect des délais se calcule automatiquement, en jours ouvrés et jours fériés exclus — aucun tableau à tenir à la main pour traquer les retards. Elle sert aux responsables à piloter l'équipe.":
    'This page measures workflow progress: how many files cleared each stage (creation, appraisals, agreements, invoice, report), and who did what. Deadline compliance is computed automatically, in business days with public holidays excluded — no spreadsheet to maintain by hand to chase delays. Team leads use it to steer the team.',
  "L'IA lit le devis scanné du garage et le transforme en tableau, ligne par ligne : aucune ressaisie manuelle du devis. Votre rôle se limite à vérifier chaque valeur extraite, l'ajuster si besoin, puis fixer les prix accordés et enregistrer le document.":
    'AI reads the scanned garage estimate and turns it into a table, line by line: no manual re-keying of the estimate. Your role is limited to verifying each extracted value, adjusting it if needed, then setting the agreed prices and saving the document.',

  // ── Dashboard lab ──
  'Changez la période': 'Change the period',
  'Cliquez sur « Semaine » : tous les chiffres de la page se recalculent sur les dossiers créés cette semaine.':
    'Click “Week”: every figure on the page recomputes over the files created this week.',
  'Les états recalculés': 'The recomputed statuses',
  'Observez la carte des états : chaque statut affiche maintenant son nombre de dossiers sur la période choisie.':
    'Look at the status card: each status now shows its file count for the chosen period.',
  'Explorez un statut': 'Explore a status',
  "Cliquez sur une ligne de statut : la liste de ses dossiers s'affiche plus bas sur la page.":
    'Click a status row: the list of its files appears further down the page.',
  'Le camembert': 'The pie chart',
  'Survolez une part du camembert pour lire le nombre exact de dossiers de chaque statut.':
    'Hover a slice of the pie to read the exact file count for each status.',
  "Ici, le volume de dossiers de chaque compagnie d'assurance sur la même période.":
    'Here, the file volume of each insurance company over the same period.',
  'Filtrez le fil': 'Filter the feed',
  "Ouvrez le filtre « Type de changement » du fil d'activité en cliquant dessus.":
    'Open the activity feed’s “Change type” filter by clicking it.',
  'Le fil en direct': 'The live feed',
  'La liste se fermera à votre prochain clic. Ce fil trace chaque action du cabinet en temps réel — les nouveautés sont surlignées.':
    'The list will close on your next click. This feed traces every action in the firm in real time — new entries are highlighted.',

  // ── Dossiers lab ──
  'La recherche': 'The search box',
  'Cliquez dans le champ de recherche pour lui donner le focus.':
    'Click inside the search box to give it focus.',
  'Recherche instantanée': 'Instant search',
  "Ici vous taperiez une référence, un nom d'assuré ou une immatriculation : la liste se filtre à chaque caractère saisi.":
    'Here you would type a reference, an insured’s name or a license plate: the list filters with every character typed.',
  'Filtres de colonne': 'Column filters',
  "Cliquez sur l'entonnoir de la colonne Nature pour ouvrir son filtre.":
    'Click the funnel on the claim-type column to open its filter.',
  'La colonne Statut': 'The Status column',
  "Le menu se fermera à votre prochain clic. Observez la colonne Statut : le badge coloré indique l'étape de chaque dossier dans le flux.":
    'The menu will close on your next click. Look at the Status column: the colored badge shows each file’s stage in the workflow.',
  'Créez une mission': 'Create an assignment',
  'Cliquez sur « Création de mission » pour ouvrir la fenêtre de création.':
    'Click “Mission creation” to open the creation dialog.',
  'Refermez la fenêtre': 'Close the dialog',
  "Fermez la fenêtre avec Échap. Une fois le dossier créé, l'IA scanne le document de mission et pré-remplit toutes les informations.":
    'Close the dialog with Escape. Once the file is created, AI scans the assignment document and pre-fills all the information.',
  'La liste de travail': 'The worklist',
  "Chaque ligne est un dossier ; un clic sur la ligne l'ouvrirait. Vous savez maintenant chercher, filtrer et créer.":
    'Each row is a file; clicking the row would open it. You now know how to search, filter, and create.',

  // ── Dossier detail lab ──
  "Cette barre liste toutes les étapes du dossier, dans l'ordre du travail. Chaque bouton est cliquable — parcourons-en quelques-unes.":
    'This bar lists every stage of the file, in working order. Each button is clickable — let’s walk through a few.',
  'Étape 1 : la mission': 'Step 1: the assignment',
  'Cliquez sur la première étape de la frise pour vous y rendre.':
    'Click the first step of the timeline to jump to it.',
  "Tout part d'ici : l'IA lit le document de mission et pré-remplit le formulaire. Ces informations alimenteront ensuite devis, accords et rapport sans ressaisie.":
    'Everything starts here: AI reads the assignment document and pre-fills the form. That information then feeds estimates, agreements, and the report with no re-typing.',
  'Étape suivante': 'Next step',
  "Cliquez sur l'étape « Planification avant » dans la frise.":
    'Click the “Planning — before” step in the timeline.',
  'La visite terrain avant réparation : rendez-vous, agent de terrain et photos « avant » du véhicule.':
    'The field visit before repair: appointment, field agent, and “before” photos of the vehicle.',
  'Vers le rapport': 'On to the report',
  "Cliquez sur l'étape « Rapport » dans la frise.":
    'Click the “Report” step in the timeline.',
  'Le rapport': 'The report',
  "Le rapport d'expertise se génère en PDF à partir des données déjà saisies dans le dossier — rien à retaper.":
    'The appraisal report is generated as a PDF from the data already entered in the file — nothing to retype.',
  'Retour en haut': 'Back to the top',
  'Cliquez à nouveau sur la première étape pour revenir en haut du dossier.':
    'Click the first step again to return to the top of the file.',

  // ── Monitoring lab ──
  'Choisissez la période': 'Pick the period',
  'Cliquez sur « Mois » : tout le funnel se recalcule sur le mois en cours.':
    'Click “Month”: the whole funnel recomputes over the current month.',
  "Les cartes d'étape": 'The stage cards',
  'Chaque carte suit une étape avec trois barres : en délai (vert), hors délai (orange), non réalisé (gris). Les délais se calculent en jours ouvrés, jours fériés exclus.':
    'Each card tracks one stage with three bars: on time (green), late (orange), not done (gray). Deadlines are computed in business days, public holidays excluded.',
  "Cliquez sur l'onglet « Par compagnie ».": 'Click the “By insurer” tab.',
  'Le tableau compagnies': 'The insurer table',
  'Une ligne par compagnie, une colonne par étape : plus la cellule est verte, plus le volume est élevé.':
    'One row per insurer, one column per stage: the greener the cell, the higher the volume.',
  'Vue par utilisateur': 'User view',
  "Cliquez sur l'onglet « Par utilisateur ».": 'Click the “By user” tab.',
  "L'activité de l'équipe": 'Team activity',
  "Les étapes réalisées par chaque membre de l'équipe sur la période, avec un total par personne.":
    'The stages completed by each team member over the period, with a total per person.',
  'Retour au global': 'Back to Global',
  "Cliquez sur l'onglet « Global » pour revenir au funnel complet.":
    'Click the “Global” tab to return to the full funnel.',
  'Le funnel en graphique': 'The funnel as a chart',
  "Le même funnel en barres. Astuce : sur une carte d'étape, cliquer une barre colorée ouvre la liste des dossiers concernés.":
    'The same funnel as bars. Tip: on a stage card, clicking a colored bar opens the list of the files behind it.',

  // ── Mes rappels lab ──
  'Vos rappels reçus': 'Your received reminders',
  'Le brouillon local': 'The local draft',
  "Cliquer sur une ligne ouvrirait le dossier en session de travail : vos modifications resteraient en brouillon local jusqu'au clic sur le bouton orange « Sauvegarder ». Poursuivons la visite sans ouvrir de dossier.":
    'Clicking a row would open the file in a work session: your edits would stay in a local draft until you click the amber “Save” button. Let’s continue the walkthrough without opening a file.',
  'Vos envois': 'Your sent reminders',
  "Cliquez sur l'onglet « Envoyés » pour suivre les rappels que vous avez adressés.":
    'Click the “Sent” tab to follow the reminders you sent.',
  'Retour aux reçus': 'Back to received',
  "Chaque destinataire y est suivi : Nouveau, Lu, Traité. Cliquez maintenant sur « Reçus » pour revenir à l'onglet initial.":
    'Each recipient is tracked there: New, Read, Handled. Now click “Received” to return to the initial tab.',

  // ── Consultation lab ──
  "Cliquez dans le champ de recherche : c'est ici que vous taperiez une référence, un nom d'assuré ou une immatriculation.":
    'Click inside the search box: this is where you would type a reference, an insured’s name or a license plate.',
  'Cliquez sur le filtre de nature pour ouvrir sa liste (RC, Dommages, Vol…).':
    'Click the claim-type filter to open its list (liability, damage, theft…).',
  'La liste se fermera à votre prochain clic. Ce filtre-ci affiche les dossiers à une étape précise du flux : création → planification → chiffrage → accord → rapport.':
    'The list will close on your next click. This filter shows the files at one specific stage of the workflow: creation → scheduling → estimating → agreement → report.',
  'Ouvrez le filtre statut': 'Open the status filter',
  'Cliquez sur le filtre de statut pour voir les étapes disponibles.':
    'Click the status filter to see the available stages.',
  "La liste se fermera à votre prochain clic. Ce dernier filtre limite les résultats à une seule compagnie d'assurance.":
    'The list will close on your next click. This last filter narrows the results to a single insurance company.',
  "Les dossiers filtrés s'affichent ici avec leur statut en couleur ; un clic sur une ligne ouvrirait le dossier, en lecture seule.":
    'The filtered files appear here with their color-coded status; clicking a row would open the file, read-only.',
};
