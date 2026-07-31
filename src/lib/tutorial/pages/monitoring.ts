import type { PageTutorial } from '../types';

// Guided tour of the Suivi d'équipe funnel page.
// Anchors live in src/app/(app)/monitoring/page.tsx (prefix `mon-`).
export const monitoringTutorial: PageTutorial = {
  key: 'monitoring',
  match: (p) => p === '/monitoring',
  steps: [
    {
      title: "Suivi d'équipe",
      body:
        "Cette page mesure l'avancement du flux de travail : combien de dossiers ont franchi chaque étape (création, expertises, accords, facture, rapport), et qui a fait quoi. Le respect des délais se calcule automatiquement, en jours ouvrés et jours fériés exclus — aucun tableau à tenir à la main pour traquer les retards. Elle sert aux responsables à piloter l'équipe.",
    },
    {
      anchor: 'mon-periode',
      title: 'Choisir la période',
      body:
        'Jour, Semaine et Mois sont des raccourcis ; les champs Du / Au définissent une plage personnalisée. Réinitialiser revient à la journée en cours.',
      side: 'bottom',
    },
    {
      anchor: 'mon-tabs',
      title: 'Trois vues',
      body:
        "Global montre le funnel de toutes les étapes ; Par compagnie et Par utilisateur ventilent les mêmes chiffres par compagnie d'assurance ou par membre de l'équipe.",
      side: 'bottom',
    },
    {
      anchor: 'mon-kpis',
      title: 'Une carte par étape',
      body:
        "Chaque carte suit une étape du flux avec trois barres : en délai (vert) = réalisée dans les temps sur la période ; hors délai (orange) = réalisée en retard ; non réalisé (gris) = dossiers qui n'ont pas encore franchi l'étape.",
      side: 'bottom',
    },
    {
      anchor: 'mon-chart',
      title: 'Volume par étape',
      body:
        'Le même funnel en graphique : le nombre de dossiers ayant franchi chaque étape pendant la période sélectionnée.',
      side: 'top',
    },
    {
      anchor: 'mon-compagnie-table',
      title: 'Vue par compagnie',
      body:
        "Chaque ligne est une compagnie, chaque colonne une étape du flux. Plus une cellule est verte, plus le volume est élevé dans sa colonne.",
      side: 'top',
      click: 'mon-tab-compagnie',
      dynamic: true,
    },
    {
      anchor: 'mon-user-filtres',
      title: 'Filtrer les utilisateurs',
      body:
        'Limitez le tableau à un rôle précis ou cherchez un utilisateur par son nom.',
      side: 'bottom',
      click: 'mon-tab-user',
      dynamic: true,
    },
    {
      anchor: 'mon-user-table',
      title: 'Activité par utilisateur',
      body:
        "Les étapes réalisées par chaque membre de l'équipe sur la période, avec un total par personne. Les utilisateurs sans activité apparaissent à zéro.",
      side: 'top',
      dynamic: true,
    },
    {
      anchor: 'mon-kpis',
      title: 'Explorer les dossiers',
      body:
        "Cliquez sur une barre colorée d'une carte pour ouvrir la liste des dossiers concernés. Un clic sur un dossier vous amène directement à l'étape correspondante du dossier.",
      side: 'bottom',
      click: 'mon-tab-global',
      dynamic: true,
    },
  ],
  lab: [
    {
      anchor: 'mon-periode',
      title: 'Choisissez la période',
      body: 'Cliquez sur « Mois » : tout le funnel se recalcule sur le mois en cours.',
      action: 'click',
    },
    {
      anchor: 'mon-kpis',
      title: "Les cartes d'étape",
      body:
        'Chaque carte suit une étape avec trois barres : en délai (vert), hors délai (orange), non réalisé (gris). Les délais se calculent en jours ouvrés, jours fériés exclus.',
      action: 'observe',
    },
    {
      anchor: 'mon-tab-compagnie',
      title: 'Vue par compagnie',
      body: "Cliquez sur l'onglet « Par compagnie ».",
      action: 'click',
    },
    {
      anchor: 'mon-compagnie-table',
      click: 'mon-tab-compagnie',
      title: 'Le tableau compagnies',
      body:
        'Une ligne par compagnie, une colonne par étape : plus la cellule est verte, plus le volume est élevé.',
      action: 'observe',
    },
    {
      anchor: 'mon-tab-user',
      title: 'Vue par utilisateur',
      body: "Cliquez sur l'onglet « Par utilisateur ».",
      action: 'click',
    },
    {
      anchor: 'mon-user-table',
      click: 'mon-tab-user',
      title: "L'activité de l'équipe",
      body:
        "Les étapes réalisées par chaque membre de l'équipe sur la période, avec un total par personne.",
      action: 'observe',
    },
    {
      anchor: 'mon-tab-global',
      title: 'Retour au global',
      body: "Cliquez sur l'onglet « Global » pour revenir au funnel complet.",
      action: 'click',
    },
    {
      anchor: 'mon-chart',
      title: 'Le funnel en graphique',
      body:
        "Le même funnel en barres. Astuce : sur une carte d'étape, cliquer une barre colorée ouvre la liste des dossiers concernés.",
      action: 'observe',
    },
  ],
};
