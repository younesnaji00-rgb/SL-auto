/**
 * English strings for the demo-kit guided lifecycle (create a dossier with
 * the downloadable kit, import every document stage by stage).
 * Keys are the FRENCH source strings from src/lib/tutorial/pages/*.
 */
export const DEMO_KIT_EN: Record<string, string> = {
  // ── Dossiers page finale: download the kit, create the dossier ──
  'À vous de créer un dossier !': 'Your turn: create a file!',
  "Vous allez suivre un vrai dossier du début à la fin, avec des documents fictifs fournis à chaque étape (document de mission, photos, devis).\nCommençons par créer le dossier.":
    'You are about to follow a real file from start to finish, with fictional documents provided at every step (assignment document, photos, estimate).\nLet’s start by creating the file.',
  'Créer le dossier': 'Create the file',
  'Cliquez sur « Création de mission ».': 'Click “Mission creation”.',
  'La compagnie': 'The insurer',
  'Choisissez « Laurentide Assurance » — la compagnie du document du kit.':
    'Pick “Laurentide Assurance” — the insurer on the kit document.',
  "Votre rôle d'expert": 'Your appraiser role',
  "1er expert : l'expert principal du dossier.\n2ème expert : intervient si l'assuré ou l'assureur adverse conteste, ou en cas de suspicion.\nArbitre : tranche un désaccord entre les deux experts.\nPlus il y a d'experts en jeu, plus le formulaire affiche de champs pour saisir leurs noms.\nCes procédures peuvent varier d'un pays à l'autre — et l'application peut toujours être adaptée sur mesure à vos façons de faire.":
    '1st appraiser: the file’s primary appraiser.\n2nd appraiser: steps in when the insured or the opposing insurer disputes, or when suspicion arises.\nArbitrator: settles a disagreement between the two appraisers.\nThe more appraisers are at play, the more name fields the creation form shows.\nProcedures may vary from one country to another — and the app can always be custom-tailored to the way you work.',
  "Cliquez sur l'entonnoir, puis choisissez un type dans la liste.":
    'Click the funnel, then pick a type from the list.',
  '« ? » en bas à droite :': '“?” at the bottom right:',
  'lance la visite guidée — et reprend toujours là où vous vous étiez arrêté.':
    'starts the guided tour — always picking up right where you left off.',
  "Cliquez sur « Créer » : le dossier s'ouvre aussitôt.":
    'Click “Create”: the file opens right away.',

  // ── Dossier detail: the guided lifecycle ──
  'Toute la vie du sinistre sur une seule page.\nSuivons-la de haut en bas avec les documents du kit.':
    'The whole life of the claim on one page.\nLet’s walk it top to bottom with the kit documents.',
  "L'import magique": 'The magic import',
  "Téléchargez le document de mission ci-dessous, puis déposez-le ici (ou « Choisir un fichier »).\nLe document est lu et le dossier se remplit tout seul.":
    'Download the assignment document below, then drop it here (or “Choose a file”).\nThe document is read and the file fills itself in.',
  'Document de mission': 'Assignment document',
  'Devis du garage (PDF)': 'Repair estimate (PDF)',
  'Regardez !': 'Look!',
  "Assuré, immatriculation, compagnie, dates… tout est pré-rempli depuis le document.\nVérifiez, corrigez si besoin : rien n'est à ressaisir deux fois.":
    'Insured, plate, insurer, dates… everything was pre-filled from the document.\nCheck it and fix if needed: nothing is ever typed twice.',
  "Chaque bouton est une étape de la vie du dossier. Suivons-les dans l'ordre.":
    'Each button is a stage of the file’s life. Let’s follow them in order.',
  'Étape suivante : la visite terrain': 'Next: the field visit',
  'Les photos avant réparation': 'The before-repair photos',
  "Sur place, l'agent photographie le véhicule depuis son téléphone — jouons-le ici côté bureau.\nTéléchargez les 3 photos ci-dessous, puis cliquez sur « Ajouter » pour les déposer.":
    'On site, the agent shoots the vehicle from their phone — let’s play it here on the office side.\nDownload the 3 photos below, then click “Add” to upload them.',
  'Téléchargez les 2 photos ci-dessous, puis cliquez sur « Ajouter ».':
    'Download the 2 photos below, then click “Add”.',
  'Sur le terrain': 'Out in the field',
  "En vrai, vos agents envoient ces photos depuis leur téléphone.\nLeurs missions se gèrent dans « Assignations Agent de Terrain », dans le menu.":
    'In real life, your field agents send these photos from their phones.\nTheir missions are managed under “Field Agent Assignments” in the menu.',
  "L'accord": 'The agreement',
  'Cliquez sur « Accord ».': 'Click “Agreement”.',
  'Le devis du garage': 'The repair-shop quote',
  'Téléchargez le devis ci-dessous, puis ajoutez-le dans cette carte « Devis Garage ».':
    'Download the estimate below, then add it to this “Garage quote” card.',
  "L'IA lit aussi le devis": 'The AI reads the quote too',
  "Chaque ligne du devis devient modifiable pour vos chiffreurs.\nIls travaillent depuis « Assignations Chiffrage », dans le menu.":
    'Every line of the quote becomes editable for your estimators.\nThey work from “Estimating Assignments” in the menu.',
  'Cliquez sur « Planification en cours ».': 'Click “Planning — in progress”.',
  'Les photos pendant travaux': 'The photos during the works',
  'Après réparation': 'After the repairs',
  'Cliquez sur « Planification après ».': 'Click “Planning — after”.',
  'Le véhicule réparé': 'The repaired vehicle',
  'Le rapport': 'The report',
  "« Valider le dossier » (direction), puis « Générer le rapport » : le PDF se crée à partir de tout ce que vous venez d'importer — sans ressaisie.":
    '“Validate the file” (management), then “Generate the report”: the PDF is built from everything you just imported — nothing retyped.',
  'Dernière étape': 'Last step',
  "Cliquez sur « Note d'honoraire ».": 'Click “Fee Note”.',
  "La note d'honoraire": 'The fee note',
  'La facture du cabinet se dépose ici : elle clôt le dossier.':
    'The firm’s invoice goes here: it closes the file.',
  'Et ensuite ?': 'What next?',
  "Photos terrain : « Assignations Agent de Terrain ». Chiffrage : « Assignations Chiffrage ». Délais : « Suivi d'équipe ».\nTout le cabinet travaille sur le même dossier, sans double saisie.":
    'Field photos: “Field Agent Assignments”. Estimating: “Estimating Assignments”. Deadlines: “Team monitoring”.\nThe whole firm works on the same file, with nothing typed twice.',

  // ── Reminders sub-flow ──
  'Une demande à un collègue sur des dossiers précis ? Cliquez sur « Rappeler ».':
    'Need a colleague to act on specific files? Click “Remind”.',
  'Cochez les dossiers': 'Tick the files',
  'Cochez autant de dossiers que vous voulez dans la liste, puis cliquez sur « Suivant ».':
    'Tick as many files as you like in the list, then click “Next”.',
  'Envoyez la demande': 'Send the request',
  "« Annuler », à gauche, ressort du mode sélection sans rien envoyer.\nQuand votre sélection est prête, cliquez sur « Envoyer à ».":
    '“Cancel”, on the left, leaves selection mode without sending anything.\nWhen your selection is ready, click “Send to”.',
  'Le rappel': 'The reminder',
  'Écrivez votre demande, choisissez le destinataire — pour la démo, choisissez-VOUS (« vous ») afin de jouer aussi le rôle du destinataire — puis « Envoyer ».\nChaque destinataire le reçoit dans « Mes Rappels » et vous êtes notifié — zéro e-mail perdu.':
    'Write your request, pick the recipient — for this demo, pick YOURSELF (“you”) so you can also play the recipient — then “Send”.\nEach recipient gets it in “My Reminders” and you are notified — no lost e-mails.',
  'Suivons le rappel': 'Follow the reminder',
  'Votre rappel est parti — et comme vous êtes aussi destinataire, vous allez le recevoir.\nCliquez sur « Mes Rappels » dans le menu.':
    'Your reminder is on its way — and since you are also the recipient, you are about to receive it.\nClick “My Reminders” in the menu.',

  // ── Mes Rappels round-trip (treat your own reminder, replay highlights) ──
  'Les demandes de travail échangées avec vos collègues sur les dossiers.\nLe rappel envoyé il y a un instant est déjà arrivé — en direct.':
    'The work requests exchanged with your colleagues about files.\nThe reminder you sent a moment ago has already arrived — live.',
  'Cliquez sur « Envoyés » pour suivre vos rappels côté expéditeur.':
    'Click “Sent” to track your reminders from the sender’s side.',
  'Le suivi par destinataire': 'Tracking by recipient',
  'Chaque envoi est suivi : Nouveau, Lu, Traité — par destinataire et par dossier.\nVous saurez toujours qui a fait quoi, et quand.':
    'Every send is tracked: New, Read, Treated — per recipient and per file.\nYou will always know who did what, and when.',
  'Cliquez sur « Reçus » : jouons maintenant le rôle du destinataire.':
    'Click “Received”: now let’s play the recipient.',
  'Traitez votre rappel': 'Treat your reminder',
  "Cliquez sur la référence de votre rappel : le dossier s'ouvre en « session de traitement ».\nTout ce que vous y modifierez sera tracé pour l'expéditeur.":
    'Click your reminder’s reference: the file opens in a “treatment session”.\nEverything you change in it will be traced for the sender.',
  'Le travail effectué': 'The work done',
  'Votre rappel est passé en « Traité ».\nCliquez sur « Voir le détail » : vous voyez le dossier exactement comme le gestionnaire l’a laissé.':
    'Your reminder is now “Treated”.\nClick “View detail”: you see the file exactly as the manager left it.',
  'Qui et quand': 'Who and when',
  'Tout est dans l’en-tête : le gestionnaire qui a traité, l’heure de début de sa session et l’heure de la sauvegarde.':
    'It is all in the header: the manager who treated it, when their session started and when it was saved.',
  'Le résumé des changements': 'The change summary',
  'Le compte exact de ce qui a changé : vert = ajouts, jaune = modifications, rouge = suppressions.':
    'The exact count of what changed: green = additions, yellow = modifications, red = removals.',
  'Les modifications en couleurs': 'The changes, in colors',
  'Le dossier est reproduit tel que le gestionnaire l’a laissé : faites défiler — chaque champ touché est surligné de sa couleur, sur place.\nParcourez, puis « Suivant ».':
    'The file is reproduced exactly as the manager left it: scroll through — every touched field is highlighted in its color, in place.\nBrowse, then “Next”.',
  'Retour au dossier traité': 'Back to the treated file',
  'Zéro e-mail, zéro doute sur qui a changé quoi.\nRevenons sur le dossier : cliquez à nouveau sur la référence de votre rappel.':
    'Zero e-mails, zero doubt about who changed what.\nLet’s go back to the file: click your reminder’s reference again.',
  'Vos modifications sont publiées': 'Your changes are live',
  'Vous revoilà sur le dossier traité : vos changements sont maintenant sur le VRAI dossier — retrouvez le champ que vous avez modifié.':
    'Back on the treated file: your changes are now on the REAL file — find the field you modified.',
  "Ouvrez l'historique": 'Open the history',
  "Le dossier tient aussi son propre journal.\nCliquez sur « Historique » : il s'ouvre sur la droite.":
    'The file also keeps its own log.\nClick “History”: it opens on the right.',
  'Le journal du dossier': 'The file’s log',
  "Ce journal retrace les JALONS du dossier : chaque changement de statut et chaque pièce entrée ou supprimée — avec qui l'a fait et quand.\nIl ne détaille pas champ par champ ce qui a été retouché : pour cela, c'est le suivi de rappel que vous venez de voir, avec ses couleurs.\nEn haut, « Dates clés » récapitule les dates du dossier. Parcourez, puis « Suivant ».":
    'This log traces the file’s MILESTONES: every status change and every document added or removed — with who did it and when.\nIt does not break down field-by-field edits: that is what the reminder tracking you just saw does, with its colours.\nAt the top, “Key dates” recaps the file’s dates. Have a look, then “Next”.',
  'Reprenons la visite': 'Back to the tour',
  "La boucle est bouclée : rappel envoyé, reçu, traité, vérifié.\nCliquez sur « Gestion des dossiers » : la visite guidée continue là où vous l'aviez laissée.":
    'Full circle: reminder sent, received, treated, verified.\nClick “File Management”: the guided tour continues where you left it.',

  // ── Hidden rappel-treatment steps (dossier detail) ──
  'Le traitement commence': 'The treatment begins',
  "Le dossier s'est ouvert en session de traitement : tout ce que vous modifiez maintenant est enregistré pour l'expéditeur — qui, quoi, quand.":
    'The file opened in a treatment session: everything you change now is recorded for the sender — who, what, when.',
  'La bannière de traitement': 'The treatment banner',
  "Vos modifications restent locales jusqu'au bouton vert « Sauvegarder » de cette bannière — rien ne part avant.":
    'Your changes stay local until this banner’s green “Save” button — nothing leaves before that.',
  'Modifiez le dossier': 'Modify the file',
  'Cliquez sur « Modifier », puis faites les trois gestes que le suivi sait distinguer :\n• modifiez un champ rempli (ex. le téléphone) ;\n• videz un champ rempli ;\n• remplissez un champ vide.\nTerminez par « Enregistrer » : le compteur « modifications en attente » apparaît dans la bannière.':
    'Click “Edit”, then make the three moves the tracking can tell apart:\n• change a filled field (e.g. the phone);\n• clear a filled field;\n• fill an empty field.\nFinish with “Save”: the “pending changes” counter appears in the banner.',
  'Publiez vos modifications': 'Publish your changes',
  'Cliquez sur le bouton vert « Sauvegarder » : vos modifications partent sur le dossier et le rappel passe en « Traité ».':
    'Click the green “Save” button: your changes land on the file and the reminder switches to “Treated”.',
  'Retour aux rappels': 'Back to the reminders',
  "Retournez dans « Mes Rappels » pour voir ce que l'expéditeur voit de votre travail.":
    'Head back to “My Reminders” to see what the sender sees of your work.',

  // ── The cross-page journey ──
  'La séquence des étapes': 'The step sequence',
  "Cliquez sur la pastille de statut d'un dossier.": 'Click the status pill on any file.',
  'Toute la vie du dossier': 'The file’s whole life',
  "Chaque changement de statut, dans l'ordre : qui, quand, quoi.\nRegardez, puis fermez (×) pour continuer.":
    'Every status change, in order: who, when, what.\nHave a look, then close (×) to continue.',
  'Les pièces du dossier': 'The file’s documents',
  "Cinq pièces seront exigées avant le chiffrage : constat, carte grise, attestation, kilométrage, châssis.\nEn pratique, c'est l'agent de terrain qui les importe depuis SA page, sur place — nous le ferons là-bas dans un instant.\nMais parfois les pièces arrivent autrement — par courriel, envoyées par la compagnie, ou dans des circonstances particulières : vous pouvez alors les déposer ici, dans l'onglet « Importer un document ».":
    'Five documents are required before estimating: accident report, registration, insurance certificate, odometer, VIN.\nIn practice the field agent imports them from THEIR page, on site — we will do it there in a moment.\nBut sometimes the documents arrive another way — by e-mail, sent by the insurer, or under special circumstances: you can then drop them here, in the “Import a document” tab.',
  'Constat (PDF)': 'Accident report (PDF)',
  'Carte grise (PDF)': 'Registration (PDF)',
  'Attestation (PDF)': 'Insurance certificate (PDF)',
  'Photo kilométrage': 'Odometer photo',
  'Photo châssis': 'VIN photo',
  'Programmons la visite terrain': 'Let’s schedule the field visit',
  "Un agent de terrain se déplace pour photographier le véhicule et récupérer les pièces.\nCliquez sur « Nouvelle planification » pour créer sa mission.":
    'A field agent travels out to photograph the vehicle and collect the documents.\nClick “New schedule” to create their mission.',
  "L'agent": 'The agent',
  'Choisissez « Field Agent Demo ».': 'Pick “Field Agent Demo”.',
  'La date': 'The date',
  "Choisissez la date d'aujourd'hui.\nL'app peut même vérifier la faisabilité des tournées de l'agent via Google Maps.":
    'Pick today’s date.\nThe app can even check the feasibility of the agent’s route via Google Maps.',
  'Enregistrez': 'Save',
  "La mission apparaît instantanément chez l'agent.": 'The mission appears on the agent’s side instantly.',
  "L'adresse complète": 'The full address',
  "Tapez l'adresse du rendez-vous — par exemple « 455 boul. René-Lévesque O, Montréal, QC ».\nC'est elle qui alimente l'itinéraire Google Maps de l'agent.":
    'Type the appointment address — for example “455 boul. René-Lévesque O, Montréal, QC”.\nIt is what feeds the agent’s Google Maps route.',
  "Les consignes pour l'agent": 'Instructions for the agent',
  "Une observation type (menu) ou personnalisée (champ en dessous) : l'agent la voit sur sa mission.":
    'A preset remark (menu) or a custom one (field below): the agent sees it on their mission.',
  "La position de l'agent": 'The agent’s location',
  "L'app affiche ici la position GPS en direct de l'agent (avec lien Google Maps) et s'en sert pour vérifier que sa tournée est faisable.\nDémo oblige : cliquez sur « Demander la localisation de l'AT » — c'est la position de VOTRE navigateur qui jouera celle de l'agent.":
    'The app shows the agent’s live GPS position here (with a Google Maps link) and uses it to check that their route is feasible.\nDemo twist: click “Request the field agent’s location” — YOUR browser’s position will stand in for the agent’s.',
  'Une 2ème destination': 'A 2nd destination',
  'Les agents enchaînent plusieurs visites par jour.\nCliquez encore sur « Nouvelle planification » pour créer une seconde mission.':
    'Agents chain several visits a day.\nClick “New schedule” again to create a second mission.',
  'La 2ème mission': 'The 2nd mission',
  "Même agent, date d'aujourd'hui — mais une AUTRE adresse : tapez par exemple « 1000 rue De La Gauchetière O, Montréal, QC ».":
    'Same agent, today’s date — but a DIFFERENT address: type for example “1000 rue De La Gauchetière O, Montréal, QC”.',
  'Enregistrez la 2ème mission': 'Save the 2nd mission',
  "Cliquez sur « Enregistrer ».\nCôté agent, « Start » enchaînera toutes les adresses du jour dans UN itinéraire Google Maps ordonné.":
    'Click “Save”.\nOn the agent’s side, “Start” will chain all of the day’s addresses into ONE ordered Google Maps route.',
  'Allons voir côté agent': 'Let’s see the agent’s side',
  "C'est aussi là-bas que l'agent importe les pièces du dossier, directement sur le terrain.\nCliquez sur « Assignations Agent de Terrain » dans le menu.":
    'It is also where the agent imports the file’s documents, right in the field.\nClick “Field Agent Assignments” in the menu.',
  'Les remarques': 'Comments',
  "Sous chaque étape : des commentaires visibles par tous, ou par un rôle précis (menu avec l'œil).\nChacun voit qui a lu quoi.":
    'Under every stage: comments visible to everyone, or to one specific role (the eye menu).\nEveryone can see who has read what.',
  'Chaque ligne du devis devient un tableau modifiable pour vos chiffreurs.\nEnvoyons-le au chiffrage.':
    'Every line of the quote becomes an editable table for your estimators.\nLet’s send it to estimating.',
  'Assignez le chiffrage': 'Assign the estimating',
  'Toutes les pièces sont là : le bouton est déverrouillé.\nCliquez sur « Assigner au chiffrage ».':
    'All the documents are in: the button is unlocked.\nClick “Assign to estimating”.',
  'Le chiffreur': 'The estimator',
  'Choisissez « Estimator Demo ».': 'Pick “Estimator Demo”.',
  'Envoyez': 'Send',
  'Toutes les pièces et photos partent avec la mission.': 'Every document and photo travels with the mission.',
  'Suivons le dossier chez le chiffreur': 'Follow the file to the estimator',
  'Cliquez sur « Assignations Chiffrage » dans le menu.': 'Click “Estimating Assignments” in the menu.',
  "Vous venez de suivre UN dossier à travers toute l'équipe : terrain, chiffrage, direction — sans double saisie, sans e-mails.\n« Suivi d'équipe » veille sur tous les délais ; « Tampons » gère les cachets posés sur les devis.":
    'You just followed ONE file across the whole team: field, estimating, management — nothing typed twice, no e-mails.\n“Team monitoring” watches every deadline; “Stamps” manages the seals placed on estimates.',

  // ── Field agent pages ──
  "« Start » ouvre Google Maps avec toutes les adresses de la journée, dans l'ordre.":
    '“Start” opens Google Maps with the whole day’s addresses, in order.',
  "Photographiez la plaque : l'application retrouve le dossier toute seule.\nEssayez avec la plaque ci-dessous — elle correspond au dossier Honda Civic (F12 ABC) déjà présent dans la démo.":
    'Photograph the plate: the app finds the file on its own.\nTry it with the plate below — it matches the Honda Civic file (F12 ABC) already in the demo.',
  'Photo de plaque (démo)': 'Licence-plate photo (demo)',
  'Les rendez-vous du jour — la priorité de la tournée.':
    'Today’s appointments — the route’s priority.',
  'Le délai de 24 h ouvrées est dépassé : la barre passe au rouge.':
    'The 24-business-hour deadline has passed: the bar turns red.',
  'Les missions des prochains jours, déjà planifiées.':
    'The next days’ missions, already scheduled.',
  "Touchez le numéro pour appeler, l'adresse pour ouvrir la carte.\n(Démo fictive : aucun vrai numéro de téléphone n'est renseigné ici.)":
    'Tap the number to call, the address to open the map.\n(Fictional demo: no real phone number is filled in here.)',
  'Votre mission est déjà là': 'Your mission is already here',
  'La planification créée il y a un instant est arrivée en direct.\nCliquez dessus pour l’ouvrir.':
    'The schedule you created a moment ago arrived live.\nClick it to open it.',
  "L'agent photographie directement depuis son téléphone : chaque photo est horodatée, signée à son nom et part dans le dossier en temps réel.\nPour la démo, « Importer des photos » permet aussi de déposer des images depuis vos fichiers.":
    'The agent shoots straight from their phone: every photo is timestamped, signed with their name and lands in the file in real time.\nFor the demo, “Import photos” also lets you drop in images from your files.',
  "C'est ici que l'agent dépose les pièces du dossier, directement sur le terrain.\nTouchez pour ouvrir le panneau documents.":
    'This is where the agent drops the file’s documents, right in the field.\nTap to open the documents panel.',
  'Les 5 pièces du dossier': 'The file’s 5 documents',
  "Chaque pièce a sa carte : déposez les 5 fichiers ci-dessous (constat, carte grise, attestation, kilométrage, châssis) — l'IA lit même la carte grise.\nElles partent en direct dans le dossier, côté bureau. (Quand les pièces arrivent autrement — par courriel ou via la compagnie — on peut aussi les importer depuis la gestion du dossier, onglet « Importer un document ».)":
    'Each document has its card: drop the 5 files below (accident report, registration, insurance certificate, odometer, VIN) — the AI even reads the registration.\nThey land in the file live, on the office side. (When documents arrive another way — by e-mail or from the insurer — they can also be imported from file management, “Import a document” tab.)',
  'Revenez au dossier': 'Back to the file',
  "Les 5 pièces (et tout ce que l'agent envoie) sont déjà arrivées dans le dossier, côté bureau.\nCliquez sur « Gestion des dossiers » pour y retourner.":
    'The 5 documents (and everything the agent sends) have already landed in the file, on the office side.\nClick “File Management” to head back.',
  'Rouvrez votre dossier': 'Reopen your file',
  "Votre dossier est en haut de la liste : cliquez sur sa ligne pour reprendre la visite.\nSon onglet en haut (comme un navigateur) y ramène aussi — et dans le dossier, la frise des étapes vous ramène à l'étape où vous étiez.":
    'Your file is at the top of the list: click its row to resume the tour.\nIts tab at the top (like a browser) takes you back too — and inside the file, the stage timeline returns you to the stage you were on.',
  "Tout ce que l'agent envoie arrive en direct au bureau — ajoutez au moins une photo ou une pièce ici pour la voir apparaître dans le dossier.\nCliquez sur « Gestion des dossiers » pour y retourner.":
    'Everything the agent sends reaches the office live — add at least one photo or document here to see it appear in the file.\nClick “File Management” to head back.',
  "L'accord enregistré arrive tout seul dans le dossier.\nCliquez sur « Gestion des dossiers » pour y retourner.":
    'The saved agreement lands in the file by itself.\nClick “File Management” to head back.',
  "Tout ce que l'agent envoie arrive en direct au bureau.\nCliquez sur l'onglet du dossier en haut pour reprendre la visite.":
    'Everything the agent sends reaches the office live.\nClick the file’s tab at the top to resume the tour.',

  // ── Estimating pages ──
  'Votre dossier est arrivé': 'Your file has arrived',
  "L'assignation envoyée il y a un instant est déjà là, avec son délai de 24 h.\nCliquez sur la référence pour ouvrir le chiffrage.":
    'The assignment you sent a moment ago is already here, with its 24-hour deadline.\nClick the reference to open the estimate.',
  "Ouvrons l'éditeur": 'Open the editor',
  'Cliquez sur « Éditer » : le devis lu par l’IA devient un tableau intelligent.':
    'Click “Edit”: the AI-read quote becomes a smart table.',
  "L'IA a transformé le devis scanné du garage en tableau : vous vérifiez, sans rien ressaisir.":
    'The AI turned the shop’s scanned quote into a table: you verify, nothing retyped.',
  "Comparez avec l'original, puis cliquez « J'ai vérifié » pour déverrouiller le tableau.":
    'Compare with the original, then click “I checked” to unlock the table.',
  'Tout se calcule tout seul': 'Everything calculates itself',
  'Modifiez une quantité ou un prix : Total HT, TTC et les sommes en pied de tableau se recalculent instantanément.':
    'Change a quantity or a price: the pre-tax total, tax-included total and footer sums recalculate instantly.',
  'La TVA intelligente': 'Smart tax',
  "Passez le Type d'une ligne à « Originale » : sa TVA passe à 20 % automatiquement.":
    'Set a row’s Type to “OEM”: its tax rate jumps to 20% automatically.',
  'La vétusté qui sait': 'Depreciation that knows',
  'Type « Occasion » ? La cellule vétusté se désactive toute seule.\nLes flèches ± 5 ajustent toutes les lignes d’un coup.\nSaisissez une vétusté (ex. 10 %) sur votre ligne « Originale » — obligatoire avant l’enregistrement.':
    '“Used” part? The depreciation cell disables itself.\nThe ±5 arrows adjust every row at once.\nEnter a depreciation (e.g. 10%) on your “OEM” row — required before saving.',
  "Saisissez vos prix accordés ligne par ligne — jamais au-dessus du prix d'origine, l'éditeur y veille.\nL'en-tête de colonne bascule entre « accord » et « proposition » pour un 2ème expert.":
    'Type your agreed prices line by line — never above the original price, the editor enforces it.\nThe column header switches between “agreement” and “proposal” for a 2nd appraiser.',
  'Le total du devis et le total expert, toujours à jour.':
    'The quote total and the expert total, always up to date.',
  "Cliquez « Enregistrer » : l'aperçu PDF se génère.": 'Click “Save”: the PDF preview is generated.',
  'Le PDF sait quoi montrer': 'The PDF knows what to show',
  "La vétusté a disparu du PDF, l'accord est replié en une seule colonne « Prix Total Accordé ».\nEn proposition, une colonne vide « Accord 2ème expert » apparaît pour la signature.\nPosez aussi le tampon du cabinet (menu « Tampon »), puis confirmez ou fermez.":
    'Depreciation is gone from the PDF, and the agreement collapses into a single “Agreed Total” column.\nOn a proposal, an empty “2nd appraiser agreement” column appears for the signature.\nPlace the firm’s stamp too (“Stamp” menu), then confirm or close.',
  "L'accord enregistré arrive tout seul dans le dossier.\nCliquez sur l'onglet du dossier en haut : la visite y reprend.":
    'The saved agreement lands in the file by itself.\nClick the file’s tab at the top: the tour resumes there.',

  // ── Sidebar intro (visual order, File Management last) ──
  'Faisons le tour du menu, de haut en bas — en gardant le meilleur pour la fin. 1 minute, promis.':
    'Let’s tour the menu, top to bottom — saving the best for last. One minute, promise.',
  'Les compagnies': 'The insurers',
  "Les compagnies d'assurance avec lesquelles vous travaillez, et leurs dossiers.":
    'The insurance companies you work with, and their files.',
  'Les chiffrages': 'Estimating',
  'Le terrain': 'The field',
  "Tous les dossiers vivent ici, de la création à la facture — le meilleur pour la fin.\nCliquez sur « Gestion des dossiers » pour continuer la visite là-bas.":
    'Every file lives here, from creation to invoice — the best for last.\nClick “File Management” to continue the tour there.',

  // ── 2ème accord et + (cardinal serialization) ──
  'Les accords suivants': 'The follow-up agreements',
  'Cliquez sur « 2ème accord et + ».': 'Click “2nd agreement and up”.',
  'La sérialisation des accords': 'How agreements are serialized',
  "Un désaccord après le 1er accord ? Le bouton « + » sur une carte crée le devis 2ème accord — puis 3ème, et ainsi de suite : chaque itération est numérotée et archivée.\nC'est une nouvelle itération de l'accord (ou de la proposition) du chiffreur : son tableau reste le MÊME d'une version à l'autre, il reprend exactement là où il s'était arrêté.\nRien à faire ici pour la démo — c'est le circuit des désaccords.":
    'A dispute after the 1st agreement? The “+” button on a card creates the 2nd-agreement estimate — then 3rd, and so on: every iteration is numbered and archived.\nIt is a new iteration of the estimator’s agreement (or proposal): their table stays the SAME from one version to the next — they pick up exactly where they left off.\nNothing to do here for the demo — this is the dispute circuit.',
  'Devis 1er accord': 'Estimate — 1st agreement',
  'Facture 1er accord': 'Invoice — 1st agreement',
  'Devis 2ème accord': 'Estimate — 2nd agreement',
  'Facture 2ème accord': 'Invoice — 2nd agreement',
  'Devis 3ème accord': 'Estimate — 3rd agreement',
  'Facture 3ème accord': 'Invoice — 3rd agreement',
  'Devis 4ème accord': 'Estimate — 4th agreement',
  'Facture 4ème accord': 'Invoice — 4th agreement',
  "1ère proposition d'accord (devis)": '1st proposed agreement (estimate)',
  "1ère proposition d'accord (facture)": '1st proposed agreement (invoice)',
  "2ème proposition d'accord (devis)": '2nd proposed agreement (estimate)',
  "2ème proposition d'accord (facture)": '2nd proposed agreement (invoice)',
  "3ème proposition d'accord (devis)": '3rd proposed agreement (estimate)',
  "3ème proposition d'accord (facture)": '3rd proposed agreement (invoice)',
  'En attente de chiffrage : remplissez ce slot avant de créer le suivant.':
    'Awaiting estimating: fill this slot before creating the next one.',

  // ── ATG phone-view toggle ──
  'Vue téléphone': 'Phone view',
  'Vue bureau': 'Desktop view',
  "Vos rendez-vous photos : Avant, En cours et Après réparation.\nSur ordinateur, « Vue téléphone » (en haut) affiche l'interface exacte que l'agent voit sur son téléphone.":
    'Your photo appointments: Before, In progress and After repairs.\nOn a computer, “Phone view” (at the top) shows the exact interface the agent sees on their phone.',

  // ── Seeded history entries (dossiers/{id}/historique details) ──
  // Fixed strings written by scripts/seed-demo.mjs; the interpolated ones the
  // app writes at runtime are handled by src/lib/audit-rules.ts instead.
  'Dossier créé': 'File created',
  'Mission terrain programmée': 'Field mission scheduled',
  'Photos avant réparation reçues': 'Before-repair photos received',
  'Dossier assigné au chiffrage': 'File assigned to estimating',
  'Proposition du chiffreur': 'Estimator’s proposal',
  'Changement de statut': 'Status change',
  'Mission Avant planifiée — Field Agent Demo, Montréal.':
    'Before mission scheduled — Field Agent Demo, Montréal.',
  'Expertise en cours de réparation — visite atelier Fix Auto Laval.':
    'Appraisal during repairs — Fix Auto Laval shop visit.',
  'Devis garage reçu (4 285 $ CAD) — chiffrage en cours.':
    'Repair-shop estimate received (CAD $4,285) — estimating in progress.',
  "Proposition d'accord envoyée au garage — 3 640 $ CAD TTC.":
    'Proposed agreement sent to the repair shop — CAD $3,640 incl. tax.',
  '2ème accord après pièces supplémentaires — 5 120 $ CAD TTC.':
    '2nd agreement after additional parts — CAD $5,120 incl. tax.',
  'Accord final envoyé à la compagnie — 6 875 $ CAD TTC.':
    'Final agreement sent to the insurer — CAD $6,875 incl. tax.',
  'Perte totale — VAM 9 800 $ CAD, épave estimée 1 450 $ CAD.':
    'Total loss — ACV CAD $9,800, salvage estimated CAD $1,450.',

  // ── Field-agent list: overdue-aware copy + download disclosure ──
  "Le délai de 24 h ouvrées est dépassé : la mission passe en rouge, avec le retard accumulé.":
    'The 24 business-hour deadline has passed: the mission turns red, showing how late it is.',
  "Aucune mission en retard pour l'instant — ce groupe n'apparaît que s'il y en a.\nPassé 24 h ouvrées sans photos, la mission bascule ici et son badge de délai passe au rouge.":
    'Nothing is overdue right now — this group only appears when something is.\nAfter 24 business hours without photos, a mission moves here and its deadline badge turns red.',
  'Ces boutons téléchargent le fichier sur votre ordinateur.':
    'These buttons download the file to your computer.',

  // ── Planification modal (demo-visible strings) ──
  'Importer des photos': 'Import photos',
  'Démo : la position affichée est celle de votre navigateur — en production, celle du téléphone de l’agent.':
    'Demo: the position shown is your browser’s — in production, the agent’s phone.',
  'Assuré injoignable': 'Insured unreachable',
  "Véhicule hors ville d'expertise": 'Vehicle outside the appraisal city',
  'Assuré non disponible': 'Insured not available',
  'Rendez-vous reporté': 'Appointment postponed',
  'Numéro erroné': 'Wrong phone number',
  'Assuré en retard': 'Insured running late',

  // ── Tour engine chrome (prefill button, jump-to-step, self-recipient) ──
  'Déposer les fichiers pour moi': 'Drop the files in for me',
  'Import en cours…': 'Uploading…',
  'Fichiers déposés !': 'Files delivered!',
  'Échec — utilisez les boutons de téléchargement': 'Failed — use the download buttons',
  'Cliquez pour aller directement à une étape': 'Click to jump straight to a step',
  'Numéro d’étape': 'Step number',
  vous: 'you',
};
