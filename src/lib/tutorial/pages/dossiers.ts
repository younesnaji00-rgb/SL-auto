import type { PageTutorial } from '../types';

/**
 * Gestion des dossiers — the gestionnaire's main worklist.
 * Anchors: `dos-*` in src/app/(app)/dossiers/client-page.tsx
 * (+ `dos-tabs` on the shared dossier tabs bar in the app layout).
 */
export const dossiersTutorial: PageTutorial = {
  key: 'dossiers',
  match: (p) => p === '/dossiers',
  steps: [
    {
      title: 'Gestion des dossiers',
      body:
        "C'est la liste de travail principale du gestionnaire : chaque sinistre y apparaît comme un dossier, de sa création jusqu'à la note d'honoraire. À la création, l'IA scanne le document de mission et pré-remplit le dossier — fini la ressaisie des informations déjà écrites par la compagnie. Depuis cette page vous créez, recherchez, filtrez et ouvrez les dossiers.",
    },
    {
      anchor: 'dos-search',
      title: 'Recherche rapide',
      body:
        "Tapez une référence, un nom d'assuré ou une immatriculation : la liste se filtre au fur et à mesure de la saisie.",
      side: 'bottom',
    },
    {
      anchor: 'dos-date-presets',
      title: 'Raccourcis de date',
      body:
        "Filtrez par date de création en un clic : Jour, Semaine ou Mois. « Personnalisé » s'utilise avec les deux champs de dates juste à côté pour une période libre.",
      side: 'bottom',
    },
    {
      anchor: 'dos-reset',
      title: 'Réinitialiser les filtres',
      body:
        "Ce bouton efface d'un coup la recherche, les dates et tous les filtres de colonnes pour revenir à la liste complète.",
      side: 'bottom',
    },
    {
      anchor: 'dos-col-nature',
      title: 'Filtres par colonne',
      body:
        "Chaque entonnoir dans l'en-tête filtre sa colonne : nature, statut, compagnie, observation ou créateur. Les filtres actifs s'affichent en badges au-dessus du tableau.",
      side: 'bottom',
    },
    {
      anchor: 'dos-col-statut',
      title: 'Colonne Statut',
      body:
        "Le badge coloré indique l'étape du dossier dans le flux (création → planification → chiffrage → accord → rapport). Cliquez sur la cellule d'une ligne pour voir l'historique des statuts.",
      side: 'bottom',
    },
    {
      anchor: 'dos-create',
      title: 'Créer un dossier',
      body:
        "« Création de mission » ouvre la fenêtre de création : choisissez la compagnie et le rôle de l'expert. Le dossier s'ouvre ensuite et l'IA peut pré-remplir toutes les informations en scannant le document de mission.",
      side: 'bottom',
    },
    {
      anchor: 'dos-rappeler',
      title: 'Envoyer des rappels',
      body:
        "« Rappeler » active un mode de sélection : cochez des dossiers puis « Envoyer à » pour adresser un rappel à un ou plusieurs gestionnaires, avec une observation facultative.",
      side: 'bottom',
    },
    {
      anchor: 'dos-table',
      title: 'La liste des dossiers',
      body:
        "Chaque ligne est un dossier. Cliquez n'importe où sur la ligne pour l'ouvrir ; les icônes à droite permettent d'ouvrir le dossier, de consulter son workflow ou de le supprimer.",
      side: 'top',
    },
    {
      anchor: 'dos-pagination',
      title: 'Pagination',
      body:
        "Choisissez le nombre de lignes par page et naviguez entre les pages. Le total de dossiers filtrés s'affiche ici.",
      side: 'top',
    },
    {
      anchor: 'dos-tabs',
      title: 'Onglets de dossiers',
      body:
        "Chaque dossier ouvert reste ici sous forme d'onglet, comme dans un navigateur. Passez d'un dossier à l'autre sans perdre le fil ; le premier onglet ramène toujours à cette liste.",
      side: 'bottom',
    },
  ],
  lab: [
    {
      anchor: 'dos-search',
      title: 'La recherche',
      body: 'Cliquez dans le champ de recherche pour lui donner le focus.',
      action: 'click',
    },
    {
      anchor: 'dos-search',
      title: 'Recherche instantanée',
      body:
        "Ici vous taperiez une référence, un nom d'assuré ou une immatriculation : la liste se filtre à chaque caractère saisi.",
      action: 'observe',
    },
    {
      anchor: 'dos-col-nature',
      title: 'Filtres de colonne',
      body: "Cliquez sur l'entonnoir de la colonne Nature pour ouvrir son filtre.",
      action: 'click',
    },
    {
      anchor: 'dos-col-statut',
      title: 'La colonne Statut',
      body:
        "Le menu se fermera à votre prochain clic. Observez la colonne Statut : le badge coloré indique l'étape de chaque dossier dans le flux.",
      action: 'observe',
    },
    {
      anchor: 'dos-create',
      title: 'Créez une mission',
      body: 'Cliquez sur « Création de mission » pour ouvrir la fenêtre de création.',
      action: 'click',
    },
    {
      anchor: 'dos-create',
      title: 'Refermez la fenêtre',
      body:
        "Fermez la fenêtre avec Échap. Une fois le dossier créé, l'IA scanne le document de mission et pré-remplit toutes les informations.",
      action: 'observe',
    },
    {
      anchor: 'dos-table',
      title: 'La liste de travail',
      body:
        "Chaque ligne est un dossier ; un clic sur la ligne l'ouvrirait. Vous savez maintenant chercher, filtrer et créer.",
      action: 'observe',
    },
  ],
};
