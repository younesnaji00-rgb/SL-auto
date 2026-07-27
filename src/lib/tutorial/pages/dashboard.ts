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
        "Vue d'ensemble en temps réel de l'activité du cabinet, réservée aux administrateurs et responsables d'équipe : volumes par statut, répartition par compagnie et fil des derniers changements. Si des compagnies vous sont assignées, seuls leurs dossiers sont comptés.",
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
};
