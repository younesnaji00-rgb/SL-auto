import type { PageTutorial } from '../types';

export const joursFeriesTutorial: PageTutorial = {
  key: 'jours-feries',
  match: (p) => p === '/jours-feries',
  steps: [
    {
      title: 'Jours fériés',
      body:
        "Les délais des dossiers sont comptés en jours ouvrés : les dates listées ici sont exclues du calcul des échéances et des compteurs hors délai. Tenez ce calendrier à jour chaque année.",
    },
    {
      anchor: 'jf-add',
      title: 'Ajouter une date',
      body:
        "Choisissez un jour dans le calendrier puis cliquez sur Ajouter. Les doublons sont refusés automatiquement.",
      side: 'bottom',
    },
    {
      anchor: 'jf-ai',
      title: 'Import par IA',
      body:
        "Importez une capture d'écran listant les jours fériés de l'année : l'IA détecte les dates et les ajoute automatiquement, en ignorant les doublons.",
      side: 'bottom',
    },
    {
      anchor: 'jf-bulk',
      title: 'Import en masse',
      body:
        "Collez une liste de dates (une par ligne, format YYYY-MM-DD) puis cliquez sur Importer. Le bouton de gauche charge le calendrier par défaut en un clic.",
      side: 'top',
    },
    {
      anchor: 'jf-list',
      title: 'Liste des dates',
      body:
        "Toutes les dates enregistrées, triées par ordre chronologique. Supprimez une date avec la corbeille si elle a été ajoutée par erreur.",
      side: 'top',
    },
  ],
};
