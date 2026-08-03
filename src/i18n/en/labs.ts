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

  // ═══ Merged interactive walkthroughs (rewrite of every page tour) ═══

  // ── Missions terrain (list) ──
  'Vos rendez-vous photos : Avant, En cours et Après réparation.':
    'Your photo appointments: Before, During and After repair.',
  'Activez-le pour recevoir les missions proches de vous.':
    'Turn it on to receive the missions near you.',
  "Photographiez la plaque : l'application retrouve le dossier toute seule.":
    'Photograph the plate: the app finds the file by itself.',
  'Touchez un onglet : Avant, En cours ou Après.':
    'Tap a tab: Before, During or After.',
  'Cherchez par nom, adresse ou immatriculation.':
    'Search by name, address or plate number.',
  'Par échéance': 'By due date',
  "Trois groupes : Aujourd'hui, En retard, À venir.":
    'Three groups: Today, Late, Upcoming.',
  '« Start » ouvre Google Maps avec toutes les adresses de la journée.':
    '“Start” opens Google Maps with all of the day’s addresses.',
  'Touchez une carte pour prendre les photos.':
    'Tap a card to take the photos.',

  // ── Assignations au chiffrage ──
  'Les dossiers à chiffrer : chaque chiffreur voit les siens.':
    'The files to estimate: each estimator sees their own.',
  'Filtre compagnie': 'Insurer filter',
  'Cliquez pour filtrer par compagnie.': 'Click to filter by insurer.',
  'Filtre chiffreur': 'Estimator filter',
  'Réservé aux responsables : la charge de chaque chiffreur.':
    "Managers only: each estimator's workload.",
  'Filtre réforme': 'Write-off filter',
  'Limite la liste aux dossiers en réforme.':
    'Narrows the list to write-off files.',
  'Filtre période': 'Period filter',
  'Affiche les assignations entre deux dates.':
    'Shows the assignments between two dates.',
  'La barre se remplit avec le temps et passe en rouge en cas de retard.':
    'The bar fills up over time and turns red when late.',
  'La liste': 'The list',
  "Cliquez sur la référence d'un dossier pour ouvrir son chiffrage.":
    "Click a file's reference to open its estimate.",

  // ── Mission terrain (detail) ──
  "Prenez les photos de l'étape et ajoutez les documents utiles.":
    'Take the stage photos and add any useful documents.',
  'Le rendez-vous': 'The appointment',
  "Touchez le numéro pour appeler, l'adresse pour ouvrir la carte.":
    'Tap the number to call, the address to open the map.',
  'Lisez et ajoutez des remarques sur la mission.':
    'Read and add remarks about the mission.',
  'Ouvrez les photos': 'Open the photos',
  'Touchez ici pour ouvrir le panneau photos.':
    'Tap here to open the photos panel.',
  'Chaque photo est signée à votre nom et part directement dans le dossier.':
    'Every photo is signed with your name and goes straight into the file.',
  'Véhicule visiblement irréparable ? Activez la proposition ici.':
    'Vehicle clearly beyond repair? Turn the proposal on here.',
  'Chaque pièce (carte grise, permis, constat…) a son emplacement.':
    'Each document (registration card, licence, report…) has its own slot.',
  'Photos envoyées : le bureau les voit immédiatement.':
    'Photos sent: the office sees them immediately.',

  // ── Chiffrage (detail) ──
  'Le chiffrage': 'The estimate',
  'Vérifiez les devis du garage et préparez les accords.':
    "Check the garage's estimates and prepare the agreements.",
  'En-tête': 'Header',
  'Le dossier, le chiffreur assigné et le statut en couleur.':
    'The file, the assigned estimator and the color-coded status.',
  'Échangez des remarques avec le gestionnaire ; tout est horodaté.':
    'Exchange remarks with the claim handler; everything is timestamped.',
  'Devis par garage': 'Estimates by garage',
  "Une ligne par garage ; « Éditer » ouvre l'éditeur du devis.":
    'One row per garage; “Edit” opens the estimate editor.',
  'Cliquez sur un type pour filtrer les pièces à droite.':
    'Click a type to filter the documents on the right.',
  'Survolez une vignette pour prévisualiser ou télécharger.':
    'Hover a thumbnail to preview or download.',
  'Import de documents': 'Document import',
  "Ici, l'import est réservé au gestionnaire, depuis la fiche dossier.":
    'Here, importing is reserved to the claim handler, from the file page.',
  "Envoie l'accord choisi en pièce jointe ; le statut avance tout seul.":
    'Sends the chosen agreement as an attachment; the status moves on by itself.',
  'Véhicule irréparable ? Saisissez ici la décision de réforme.':
    'Vehicle beyond repair? Enter the write-off decision here.',

  // ── Compagnies ──
  "Chaque compagnie d'assurance a sa carte et son propre tableau de bord.":
    'Each insurance company has its card and its own dashboard.',
  'Cliquez sur une carte pour ouvrir son tableau de bord.':
    'Click a card to open its dashboard.',
  'Le logo': 'The logo',
  "Cliquez sur l'encadré pour importer ou remplacer le logo.":
    'Click the frame to upload or replace the logo.',
  'Indicateurs': 'Key figures',
  'Total, nouveaux, en cours et terminés sur la période.':
    'Total, new, ongoing and completed over the period.',
  'Portefeuille': 'Portfolio',
  'Tous les dossiers de la compagnie, en temps réel.':
    "All of the insurer's files, in real time.",
  'La compagnie est déjà pré-remplie.': 'The insurer is already pre-filled.',

  // ── Consultation ──
  "Retrouvez n'importe quel dossier, en lecture seule : aucun risque de modification.":
    'Find any file, read-only: no risk of changing anything.',
  'Cliquez dans le champ : vous y taperez un nom, une référence ou une immatriculation.':
    'Click in the field: this is where you type a name, a reference or a plate number.',
  'Filtre nature': 'Claim-type filter',
  'Cliquez pour ouvrir la liste des types de sinistre.':
    'Click to open the list of claim types.',
  'Filtre statut': 'Status filter',
  'Affiche les dossiers à une étape précise.':
    'Shows the files at one specific stage.',
  'Limite la liste à une seule compagnie.':
    'Narrows the list to a single insurer.',
  'Cliquez sur une ligne pour ouvrir le dossier.':
    'Click a row to open the file.',

  // ── Tableau de bord ──
  "L'activité du cabinet en direct : volumes, statuts et derniers changements.":
    "The firm's activity, live: volumes, statuses and latest changes.",
  'Chaque ligne montre un statut et son nombre de dossiers.':
    'Each row shows a status and its file count.',
  'Choisissez un statut': 'Pick a status',
  "Cliquez sur une ligne : ses dossiers s'affichent.":
    'Click a row: its files appear.',
  'Les dossiers du statut': 'Files for the status',
  'Voici la liste correspondante ; une référence ouvre le dossier.':
    'Here is the matching list; a reference opens the file.',
  'La part de chaque statut sur la période.':
    "Each status's share over the period.",
  "Le volume de dossiers de chaque compagnie d'assurance.":
    'The file volume of each insurance company.',
  'Choisissez une période : Jour, Semaine ou Mois.':
    'Pick a period: Day, Week or Month.',
  'Chaque action du cabinet apparaît ici, en temps réel.':
    'Every action in the firm shows up here, in real time.',
  'Cliquez sur un des filtres pour affiner le fil.':
    'Click one of the filters to refine the feed.',
  'Deuxième fil': 'Second feed',
  'Un second fil indépendant, pour surveiller deux activités à la fois.':
    'A second, independent feed to watch two activities at once.',

  // ── Éditeur de devis ──
  "L'éditeur de devis": 'The estimate editor',
  "L'IA transforme le devis scanné du garage en tableau : vous vérifiez, sans rien ressaisir.":
    'AI turns the scanned garage estimate into a table: you verify, without re-typing anything.',
  'Les fichiers scannés qui alimentent ce tableau.':
    'The scanned files feeding this table.',
  "L'en-tête": 'The header',
  'Véhicule, client, assurance : préremplis, à vérifier.':
    'Vehicle, client, insurance: pre-filled, to be checked.',
  'Les lignes du devis': 'The estimate lines',
  'Une ligne par pièce ou opération ; les totaux se calculent tout seuls.':
    'One row per part or operation; the totals compute by themselves.',
  "Comparez avec l'original, puis cliquez « J'ai vérifié » pour déverrouiller.":
    'Compare with the original, then click “I checked” to unlock.',
  "Relancer l'IA": 'Re-run the AI',
  'Relit les documents scannés ; le tableau actuel est écrasé.':
    'Re-reads the scanned documents; the current table is overwritten.',
  "Colonnes d'accord": 'Agreement columns',
  "Saisissez le prix accordé par ligne, jamais au-dessus du prix d'origine.":
    'Enter the agreed price per line, never above the original price.',
  'Le total du devis et le total expert, calculés automatiquement.':
    'The estimate total and the expert total, computed automatically.',
  'Cochez pour travailler hors taxe.': 'Tick to work tax-free.',
  "Comparer l'original": 'Compare the original',
  'Affiche le document scanné à côté du tableau.':
    'Shows the scanned document next to the table.',
  'Aperçu PDF, choix du tampon, puis enregistrement dans le dossier.':
    'PDF preview, stamp choice, then saved into the file.',

  // ── Dossier (detail) ──
  "Toute la vie du sinistre sur une seule page, étape par étape.\nChaque information n'est saisie qu'une fois : elle se retrouve dans les devis, le rapport et la facture.":
    'The whole life of the claim on one page, stage by stage.\nEvery piece of information is entered only once: it flows into the estimates, the report and the invoice.',
  "L'assuré, la compagnie et la référence restent toujours visibles ici.":
    'The insured, the insurer and the reference always stay visible here.',
  'Ce badge avance tout seul avec le dossier.':
    'This badge moves forward with the file, on its own.',
  'Envoyez un email lié au dossier sans quitter la page.':
    'Send an email tied to the file without leaving the page.',
  'Qui a fait quoi, et quand.': 'Who did what, and when.',
  'Rappel en cours': 'Reminder in progress',
  "Vos changements restent en brouillon jusqu'au clic sur « Sauvegarder ».":
    'Your changes stay a draft until you click “Save”.',
  'Chaque bouton mène à une étape du dossier.':
    'Each button leads to a stage of the file.',
  'Cliquez sur la première étape de la frise.':
    'Click the first step in the timeline.',
  "Déposez le document de mission : l'IA le lit et remplit le dossier.":
    'Drop the assignment document: AI reads it and fills the file.',
  'Cliquez sur « Planification avant ».':
    'Click “Before-repair scheduling”.',
  'Le rendez-vous terrain et les photos avant réparation.':
    'The field appointment and the before-repair photos.',
  "Les documents de l'accord conclu avec le garage.":
    'The documents of the agreement reached with the garage.',
  'Pendant les travaux': 'During the works',
  'La visite et les photos en cours de réparation.':
    'The visit and the photos during repair.',
  "Un nouveau devis ? Déposez ici l'accord révisé.":
    'A new estimate? Drop the revised agreement here.',
  'Les photos après réparation, pour constater les travaux.':
    'The after-repair photos, to record the completed works.',
  "Cliquez sur l'étape « Rapport ».": 'Click the “Report” step.',
  "Le rapport d'expertise se génère en PDF, sans ressaisie.":
    'The appraisal report generates as a PDF, with no re-typing.',
  'La facture du cabinet clôt le dossier.':
    "The firm's invoice closes the file.",
  "Suivez la frise de haut en bas : c'est l'ordre naturel du travail.":
    'Follow the timeline top to bottom: that is the natural order of the work.',

  // ── Gestion des dossiers ──
  "Tous vos dossiers, de la création à la facture.\nÀ la création, l'IA lit le document de mission et remplit le dossier pour vous.":
    'All your files, from creation to invoice.\nAt creation, AI reads the assignment document and fills the file for you.',
  'Cliquez sur Jour, Semaine ou Mois.': 'Click Day, Week or Month.',
  'Cliquez ici pour effacer la recherche et les filtres.':
    'Click here to clear the search and the filters.',
  "Cliquez sur l'entonnoir : chaque colonne a son propre filtre.":
    'Click the funnel: each column has its own filter.',
  'Le badge coloré montre où en est chaque dossier.':
    'The colored badge shows where each file stands.',
  "Ce bouton crée un dossier ; l'IA le remplit en lisant le document de mission.":
    'This button creates a file; AI fills it by reading the assignment document.',
  'Cochez des dossiers et envoyez une demande à un collègue.':
    'Tick files and send a request to a colleague.',
  "Chaque ligne est un dossier ; cliquez dessus pour l'ouvrir.":
    'Each row is a file; click it to open it.',
  'Choisissez le nombre de lignes par page.':
    'Choose how many rows per page.',
  'Chaque dossier ouvert reste ici, comme dans un navigateur.':
    'Every open file stays here, like in a browser.',

  // ── Éditeur d'annotations ──
  'Annotez les PDF et photos du dossier : texte, lignes et tampons, exportables en PDF.':
    "Annotate the file's PDFs and photos: text, lines and stamps, exportable as PDF.",
  'Filtrez par type, puis ouvrez un fichier dans la liste juste à droite.':
    'Filter by type, then open a file in the list just to the right.',
  "L'outil par défaut : cliquez une annotation, glissez pour la déplacer.":
    'The default tool: click an annotation, drag to move it.',
  'Activez cet outil, cliquez sur le document et tapez directement.':
    'Activate this tool, click the document and type directly.',
  'Glissez sur le document, par exemple pour barrer une ligne de devis.':
    'Drag on the document, for example to strike out an estimate line.',
  "Choisissez un tampon puis cliquez sur le document pour l'apposer.":
    'Choose a stamp then click the document to apply it.',
  "Réglez la couleur, la taille du texte et l'épaisseur des lignes.":
    'Set the color, the text size and the line thickness.',
  'Zoomez pour la précision ; les boutons voisins pivotent le document.':
    'Zoom for precision; the buttons next to it rotate the document.',
  "Affichez une pièce du dossier à côté du fichier que vous annotez.":
    'Show a file document next to the one you are annotating.',
  'Sauvegarde vos annotations dans le chiffrage.':
    'Saves your annotations into the estimate.',
  'Génère un PDF avec vos annotations incrustées.':
    'Generates a PDF with your annotations burned in.',
  "L'outil actif, le zoom et la mention « Lecture seule » le cas échéant.":
    'The active tool, the zoom and the “Read-only” label when applicable.',

  // ── Jours fériés ──
  'Ces dates sont exclues du calcul des délais.':
    'These dates are excluded from deadline calculations.',
  'Choisissez un jour dans le calendrier puis cliquez sur Ajouter.':
    'Pick a day in the calendar then click Add.',
  "Importez une capture d'écran : l'IA détecte les dates toute seule.":
    'Upload a screenshot: AI detects the dates by itself.',
  "Collez une liste de dates, ou importez les jours fériés d'un pays en un clic.":
    "Paste a list of dates, or import a country's public holidays in one click.",
  'Supprimez une date avec la corbeille en cas d’erreur.':
    'Delete a date with the trash icon if it was added by mistake.',

  // ── Connexion ──
  'Connectez-vous avec les identifiants fournis par votre administrateur.':
    'Sign in with the credentials provided by your administrator.',
  'Tapez votre nom complet, pas une adresse e-mail ; majuscules ou minuscules, peu importe.':
    'Type your full name, not an email address; upper or lower case does not matter.',
  "L'icône en forme d'œil affiche votre saisie en clair.":
    'The eye icon shows what you typed in clear text.',
  'Basculez entre français et anglais à tout moment.':
    'Switch between French and English at any time.',
  "Utilisez l'un de ces noms avec le mot de passe indiqué.":
    'Use one of these names with the password shown.',

  // ── Mes rappels ──
  'Les demandes de travail échangées avec vos collègues sur les dossiers.':
    'The work requests exchanged with your colleagues about files.',
  '« Reçus » : pour vous. « Envoyés » : de vous.':
    '“Received”: for you. “Sent”: from you.',
  "Chaque ligne montre le dossier, l'expéditeur et son message.":
    'Each row shows the file, the sender and their message.',
  "Un clic sur une ligne ouvre le dossier ; rien n'est publié avant le bouton orange « Sauvegarder ».":
    'Clicking a row opens the file; nothing is published before the amber “Save” button.',
  'Nouveau, Lu ou Traité.': 'New, Read or Handled.',
  '« Voir le détail » montre ce qui a été fait pendant le traitement.':
    '“See details” shows what was done while handling it.',
  'Cliquez sur « Envoyés » pour suivre vos rappels.':
    'Click “Sent” to follow your reminders.',
  'Chaque destinataire y est suivi. Cliquez sur « Reçus » pour revenir.':
    'Each recipient is tracked there. Click “Received” to come back.',

  // ── Suivi d'équipe ──
  'Combien de dossiers ont passé chaque étape, et qui a fait quoi.\nLes retards se calculent tout seuls, en jours ouvrés.':
    'How many files cleared each stage, and who did what.\nDelays compute by themselves, in business days.',
  'Cliquez sur « Semaine » ou « Mois » : tout se recalcule.':
    'Click “Week” or “Month”: everything recomputes.',
  'Trois barres par carte : à temps (vert), en retard (orange), à faire (gris).':
    'Three bars per card: on time (green), late (orange), to do (grey).',
  'Le graphique': 'The chart',
  'Les mêmes chiffres en barres, étape par étape.':
    'The same figures as bars, stage by stage.',
  'Une ligne par compagnie ; plus la case est verte, plus le volume est élevé.':
    'One row per insurer; the greener the cell, the higher the volume.',
  'Ce que chaque personne a réalisé sur la période.':
    'What each person completed over the period.',
  "Cliquez sur l'onglet « Global ».": 'Click the “Global” tab.',
  "Un clic sur une barre colorée d'une carte liste les dossiers concernés.":
    "Clicking a card's colored bar lists the files involved.",

  // ── Signaler un problème ──
  "Une messagerie directe avec l'administrateur.":
    'A direct chat with the administrator.',
  'Le fil': 'The thread',
  'Vos messages et les réponses, en temps réel.':
    'Your messages and the replies, in real time.',
  'Votre message': 'Your message',
  'Décrivez le problème puis cliquez sur Envoyer.':
    'Describe the problem then click Send.',
  'Pièces jointes': 'Attachments',
  'Le trombone joint un fichier ; le micro enregistre un message vocal.':
    'The paperclip attaches a file; the microphone records a voice message.',
  'Boîte admin': 'Admin inbox',
  'Toutes les conversations, avec leurs messages non lus.':
    'All the conversations, with their unread messages.',

  // ── Tampons ──
  "Les cachets apposés sur les PDF générés par l'application.":
    'The seals applied to the PDFs generated by the app.',
  "Choisissez les images de tampon puis lancez l'import.":
    'Choose the stamp images then start the import.',
  'Activez, désactivez ou supprimez un tampon.':
    'Enable, disable or delete a stamp.',
  'Assigner': 'Assign',
  'Choisissez le ou les tampons de chaque chiffreur.':
    "Choose each estimator's stamp(s).",

  // ── Fiche utilisateur ──
  'Tout le compte au même endroit : profil, droits, activité et session.':
    'The whole account in one place: profile, rights, activity and session.',
  'Le profil': 'The profile',
  'Modifiez les informations puis cliquez sur Sauvegarder.':
    'Edit the information then click Save.',
  "Chaque interrupteur ouvre ou ferme l'accès à une page.":
    'Each switch grants or removes access to a page.',
  'Les dossiers dont ce compte est responsable.':
    'The files this account is responsible for.',
  'Activité': 'Activity',
  "Ses dernières actions dans l'application.":
    'Their latest actions in the app.',
  "L'appareil connecté ; « Déconnecter la session » libère le compte.":
    'The connected device; “Disconnect session” frees the account.',

  // ── Utilisateurs ──
  "Créez les comptes de l'équipe et gérez leurs accès.":
    "Create the team's accounts and manage their access.",
  "Nom complet et mot de passe : le nom sert d'identifiant de connexion.":
    'Full name and password: the name is the login identifier.',
  'Le rôle': 'The role',
  'Il définit ce que la personne peut voir et faire.':
    'It defines what the person can see and do.',
  'Tapez un nom : la liste se filtre aussitôt.':
    'Type a name: the list filters instantly.',
  "Cliquez pour n'afficher que les comptes d'un rôle.":
    'Click to show only the accounts of one role.',
  'Les comptes': 'The accounts',
  'Cliquez sur une ligne pour ouvrir la fiche du compte.':
    "Click a row to open the account's page.",

  // ── Visionneuse ──
  'Consultez les fichiers et leurs annotations, sans pouvoir rien modifier.':
    'Browse the files and their annotations, with no way to change anything.',
  'Filtrez par type, puis sélectionnez le fichier dans la liste.':
    'Filter by type, then select the file in the list.',
  'Affichez une pièce du dossier à côté du fichier consulté.':
    'Show a file document next to the one you are viewing.',
  'Zoomez et pivotez le document.': 'Zoom and rotate the document.',
  'Rien ne peut être modifié ici.': 'Nothing can be changed here.',
};
