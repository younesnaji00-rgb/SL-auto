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
};
