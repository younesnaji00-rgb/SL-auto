import type { PageTutorial } from '../types';

// Guided tour of the dashboard (Admin / Responsable d'équipe only).
// Anchors live in src/app/(app)/dashboard/page.tsx (prefix `dash-`).
export const dashboardTutorial: PageTutorial = {
  key: 'dashboard',
  match: (p) => p === '/dashboard',
  steps: [
    {
      title: 'Tableau de bord',
      body:
        "Le tableau de bord donne aux administrateurs et responsables d'équipe une vision en temps réel de chaque processus du cabinet : volumes par statut, répartition par compagnie et fil de chaque changement — une force clé de la plateforme. Si des compagnies vous sont assignées, seuls leurs dossiers sont comptés.",
    },
    {
      anchor: 'dash-etat-card',
      title: 'Dossiers par état',
      body:
        "Chaque statut du flux s'affiche avec son nombre de dossiers. Cliquez sur une ligne pour lister ses dossiers ; le champ de recherche filtre la liste des statuts.",
      side: 'right',
    },
    {
      anchor: 'dash-etat-periode',
      title: 'Filtrer par période',
      body:
        "Aujourd'hui, Semaine, Mois, ou une plage Du / Au personnalisée : tous les chiffres de la page (états, graphiques, tableau) se recalculent sur les dossiers créés dans cette période.",
      side: 'bottom',
    },
    {
      anchor: 'dash-status-table',
      title: 'Dossiers du statut choisi',
      body:
        "La liste des dossiers du statut sélectionné dans la carte des états. Cliquez sur une référence pour ouvrir le dossier complet ; Fermer réaffiche le camembert en haut de page.",
      side: 'left',
    },
    {
      anchor: 'dash-pie',
      title: 'Volume par statut',
      body:
        'La part de chaque statut dans les dossiers de la période. Survolez une part du camembert pour voir le nombre exact.',
      side: 'left',
    },
    {
      anchor: 'dash-compagnie',
      title: 'Répartition par compagnie',
      body:
        "Le nombre de dossiers de chaque compagnie d'assurance sur la période choisie.",
      side: 'left',
    },
    {
      anchor: 'dash-changements-1',
      title: 'Changements récents',
      body:
        "Le fil de toute l'activité du cabinet : créations, planifications, chiffrages, documents, statuts… Les entrées apparues depuis votre dernière visite sont surlignées et marquées d'un +.",
      side: 'right',
    },
    {
      anchor: 'dash-chg-filtres-1',
      title: 'Filtrer le fil',
      body:
        'Affinez par date, type de changement, utilisateur ou nature de dossier. Le bouton Réinitialiser efface tous les filtres du panneau.',
      side: 'bottom',
    },
    {
      anchor: 'dash-changements-2',
      title: 'Deuxième fil indépendant',
      body:
        "Un second panneau identique avec ses propres filtres — préréglé sur les changements de statut — pour surveiller deux types d'activité en parallèle.",
      side: 'left',
    },
  ],
  lab: [
    {
      anchor: 'dash-etat-periode',
      title: 'Changez la période',
      body:
        'Cliquez sur « Semaine » : tous les chiffres de la page se recalculent sur les dossiers créés cette semaine.',
      action: 'click',
    },
    {
      anchor: 'dash-etat-card',
      title: 'Les états recalculés',
      body:
        'Observez la carte des états : chaque statut affiche maintenant son nombre de dossiers sur la période choisie.',
      action: 'observe',
    },
    {
      anchor: 'dash-etat-card',
      title: 'Explorez un statut',
      body:
        "Cliquez sur une ligne de statut : la liste de ses dossiers s'affiche plus bas sur la page.",
      action: 'click',
    },
    {
      anchor: 'dash-pie',
      title: 'Le camembert',
      body:
        'Survolez une part du camembert pour lire le nombre exact de dossiers de chaque statut.',
      action: 'observe',
    },
    {
      anchor: 'dash-compagnie',
      title: 'Par compagnie',
      body:
        "Ici, le volume de dossiers de chaque compagnie d'assurance sur la même période.",
      action: 'observe',
    },
    {
      anchor: 'dash-chg-filtres-1',
      title: 'Filtrez le fil',
      body:
        "Ouvrez le filtre « Type de changement » du fil d'activité en cliquant dessus.",
      action: 'click',
    },
    {
      anchor: 'dash-changements-1',
      title: 'Le fil en direct',
      body:
        'La liste se fermera à votre prochain clic. Ce fil trace chaque action du cabinet en temps réel — les nouveautés sont surlignées.',
      action: 'observe',
    },
  ],
};
