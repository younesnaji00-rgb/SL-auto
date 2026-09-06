// French source string -> English translation (guided tutorials).
// Dashboard + Monitoring (Suivi d'équipe) tours. Titles already translated in
// other dictionaries ('Tableau de bord', 'Changements récents', 'Répartition
// par compagnie', "Suivi d'équipe", 'Volume par étape', 'Activité par
// utilisateur') are intentionally NOT duplicated here.
export const TUTORIAL_DASHBOARD_EN: Record<string, string> = {
  // ── Dashboard ──
  "Vue d'ensemble en temps réel de l'activité du cabinet, réservée aux administrateurs et responsables d'équipe : volumes par statut, répartition par compagnie et fil des derniers changements. Si des compagnies vous sont assignées, seuls leurs dossiers sont comptés.":
    'A real-time overview of the firm’s activity, reserved for admins and team leads: volumes by status, split by insurer and a feed of the latest changes. If insurers are assigned to you, only their files are counted.',
  'Dossiers par état': 'Files by status',
  "Chaque statut du flux s'affiche avec son nombre de dossiers. Cliquez sur une ligne pour lister ses dossiers ; le champ de recherche filtre la liste des statuts.":
    'Every workflow status appears with its file count. Click a row to list its files; the search box filters the status list.',
  'Filtrer par période': 'Filter by period',
  "Aujourd'hui, Semaine, Mois, ou une plage Du / Au personnalisée : tous les chiffres de la page (états, graphiques, tableau) se recalculent sur les dossiers créés dans cette période.":
    'Today, Week, Month, or a custom From / To range: every figure on the page (statuses, charts, table) recomputes over the files created in that period.',
  'Dossiers du statut choisi': 'Files in the chosen status',
  "La liste des dossiers du statut sélectionné dans la carte des états. Cliquez sur une référence pour ouvrir le dossier complet ; Fermer réaffiche le camembert en haut de page.":
    'The list of files in the status selected in the status card. Click a reference to open the full file; Close brings the pie chart back to the top of the page.',
  'Volume par statut': 'Volume by status',
  'La part de chaque statut dans les dossiers de la période. Survolez une part du camembert pour voir le nombre exact.':
    'Each status’s share of the period’s files. Hover a slice of the pie to see the exact count.',
  "Le nombre de dossiers de chaque compagnie d'assurance sur la période choisie.":
    'How many files each insurance company has over the chosen period.',
  "Le fil de toute l'activité du cabinet : créations, planifications, chiffrages, documents, statuts… Les entrées apparues depuis votre dernière visite sont surlignées et marquées d'un +.":
    'The feed of all firm activity: creations, scheduling, estimates, documents, statuses… Entries added since your last visit are highlighted and marked with a +.',
  'Filtrer le fil': 'Filter the feed',
  'Affinez par date, type de changement, utilisateur ou nature de dossier. Le bouton Réinitialiser efface tous les filtres du panneau.':
    'Narrow by date, change type, user or file type. The Reset button clears all the panel’s filters.',
  'Deuxième fil indépendant': 'Second independent feed',
  "Un second panneau identique avec ses propres filtres — préréglé sur les changements de statut — pour surveiller deux types d'activité en parallèle.":
    'A second identical panel with its own filters — preset to status changes — to watch two kinds of activity side by side.',

  // ── Monitoring (Suivi d'équipe) ──
  "Cette page mesure l'avancement du flux de travail : combien de dossiers ont franchi chaque étape (création, expertises, accords, facture, rapport), dans les délais ou non, et qui a fait quoi. Elle sert aux responsables à piloter l'équipe.":
    'This page measures workflow progress: how many files completed each step (creation, inspections, agreements, invoice, report), on time or late, and who did what. Team leads use it to steer the team.',
  'Choisir la période': 'Pick the period',
  'Jour, Semaine et Mois sont des raccourcis ; les champs Du / Au définissent une plage personnalisée. Réinitialiser revient à la journée en cours.':
    'Day, Week and Month are shortcuts; the From / To fields set a custom range. Reset returns to the current day.',
  'Trois vues': 'Three views',
  "Global montre le funnel de toutes les étapes ; Par compagnie et Par utilisateur ventilent les mêmes chiffres par compagnie d'assurance ou par membre de l'équipe.":
    'Global shows the funnel of every step; By insurer and By user break the same figures down by insurance company or by team member.',
  'Une carte par étape': 'One card per step',
  "Chaque carte suit une étape du flux avec trois barres : en délai (vert) = réalisée dans les temps sur la période ; hors délai (orange) = réalisée en retard ; non réalisé (gris) = dossiers qui n'ont pas encore franchi l'étape.":
    'Each card tracks one workflow step with three bars: on time (green) = completed on time within the period; late (amber) = completed past the deadline; not done (gray) = files that haven’t completed the step yet.',
  'Le même funnel en graphique : le nombre de dossiers ayant franchi chaque étape pendant la période sélectionnée.':
    'The same funnel as a chart: how many files completed each step during the selected period.',
  'Vue par compagnie': 'Insurer view',
  "Chaque ligne est une compagnie, chaque colonne une étape du flux. Plus une cellule est verte, plus le volume est élevé dans sa colonne.":
    'Each row is an insurer, each column a workflow step. The greener a cell, the higher the volume within its column.',
  'Filtrer les utilisateurs': 'Filter users',
  'Limitez le tableau à un rôle précis ou cherchez un utilisateur par son nom.':
    'Limit the table to one role, or search for a user by name.',
  "Les étapes réalisées par chaque membre de l'équipe sur la période, avec un total par personne. Les utilisateurs sans activité apparaissent à zéro.":
    'The steps each team member completed over the period, with a per-person total. Users with no activity show as zero.',
  'Explorer les dossiers': 'Drill into the files',
  "Cliquez sur une barre colorée d'une carte pour ouvrir la liste des dossiers concernés. Un clic sur un dossier vous amène directement à l'étape correspondante du dossier.":
    'Click a colored bar on a card to open the list of files behind it. Clicking a file takes you straight to the matching step of the file.',

  // ── Role dashboards tour (2026-09-06) ──
  "Ce qui vous attend maintenant, ce qui est en retard, et votre rythme — rien d'autre.\nLes analyses d'équipe (entonnoir, délais, tendances) restent dans Suivi d'équipe.":
    'What is waiting for you now, what is late, and your own pace — nothing else.\nTeam analytics (funnel, cycle times, trends) stay in Team monitoring.',
  'Les chiffres du jour': 'Today’s numbers',
  'En cours, en retard, terminés sur 7 jours face aux 7 jours précédents.\nUne couleur n’apparaît que quand quelque chose dépasse le délai.':
    'In progress, late, and completed over 7 days against the 7 days before.\nA color only appears when something goes past its deadline.',
  'La liste de ce qui vous revient, du plus ancien au plus récent. Chaque ligne ouvre le dossier ou la mission.\nQuand elle est vide, c’est une bonne nouvelle : tout avance.':
    'The list of what is yours to handle, oldest to newest. Each row opens the file or the assignment.\nWhen it is empty, that is good news: everything is moving.',
  'Ce qui attend un tiers': 'What is waiting on someone else',
  'Ici, rien ne dépend de vous : le dossier est chez le chiffreur, chez l’agent, ou n’a pas bougé depuis plus de 2 jours ouvrés.':
    'Nothing here is on you: the file is with the estimator, with the field appraiser, or it has not moved for more than 2 business days.',
  'Heure, dossier, adresse — et trois boutons : ouvrir la mission, l’itinéraire, appeler.':
    'Time, file, address — and three buttons: open the assignment, get directions, call.',
  'RDV passé sans photos, ou plus de 24 h ouvrées depuis la planification. « Rien en retard » est le meilleur écran possible.':
    'Appointment passed with no photos, or more than 24 business hours since scheduling. “Nothing late” is the best screen you can get.',
  'Direction, puis un onglet par rôle': 'Leadership, then one tab per role',
  'Direction répond à « où en est le cabinet » ; Gestionnaires, Chiffreurs et Terrain reprennent les mêmes blocs que le tableau de bord de chacun, additionnés pour l’équipe.':
    'Leadership answers “where does the firm stand”; File handlers, Estimators and Field pick up the same blocks as each person’s own dashboard, added up for the team.',
  'Le délai qui vous juge': 'The cycle time you are judged on',
  'De la requête de la compagnie au dépôt du rapport, en médiane, sur les dossiers CLÔTURÉS de la période.\nLe P90 à côté dit ce que vit le dossier le plus lent sur dix : c’est lui qui fait les réclamations.':
    'From the carrier’s assignment request to the report being submitted, as a median, on the files CLOSED in the period.\nThe P90 beside it tells you what the slowest file in ten goes through: that is the one that generates complaints.',
  'Où passent les jours': 'Where the days go',
  'Le délai total découpé étape par étape. La barre pleine est la médiane, le fond clair le P90, et chaque ligne imprime son effectif — une étape mesurée sur trois dossiers ne se lit pas comme une étape mesurée sur cent.':
    'The total cycle time broken down step by step. The solid bar is the median, the light background the P90, and every row prints its count — a step measured on three files does not read like a step measured on a hundred.',
  'La profondeur, par question': 'Depth, one question at a time',
  'Compagnies, Qualité, Terrain, Portefeuille, Flux : chaque onglet répond à une question, pour que l’écran d’accueil garde cinq chiffres et pas quarante.':
    'Carriers, Quality, Field, Portfolio, Flow: each tab answers one question, so the landing screen keeps five figures instead of forty.',
  'Tout ce qui est en retard maintenant, avec la personne concernée. Une ligne ouvre l’élément.':
    'Everything that is late right now, with the person it belongs to. A row opens the item.',
  'La longueur de la barre, c’est la charge ; le second chiffre, le retard. Cliquez sur une personne pour voir son tableau de bord.':
    'The length of the bar is the workload; the second figure is what is late. Click a person to see their dashboard.',
  'Les mêmes définitions que chacun voit chez soi, et la ligne « Médiane équipe » pour situer — jamais un classement.':
    'The same definitions each person sees on their own screen, plus the “Team median” row to place yourself — never a ranking.',
  'Voir une personne': 'View one person',
  'Choisissez quelqu’un : la page devient son tableau de bord, exactement comme il le voit, suivi de son contexte de charge.':
    'Pick someone: the page becomes their dashboard, exactly as they see it, followed by their workload context.',
};
