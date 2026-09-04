import type { PageTutorial } from '../types';

export const joursFeriesTutorial: PageTutorial = {
  key: 'jours-feries',
  match: (p) => p === '/jours-feries',
  steps: [
    {
      title: 'Jours fériés',
      body: 'Ces dates sont exclues du calcul des délais.',
    },
    {
      anchor: 'jf-add',
      title: 'Ajouter une date',
      body: 'Choisissez un jour dans le calendrier puis cliquez sur Ajouter.',
      side: 'bottom',
    },
    {
      anchor: 'jf-ai',
      title: 'Import par IA',
      body: "Importez une capture d'écran : l'IA détecte les dates toute seule.",
      side: 'bottom',
    },
    {
      anchor: 'jf-bulk',
      title: 'Import en masse',
      body: "Collez une liste de dates, ou importez les jours fériés d'un pays en un clic.",
      side: 'top',
    },
    {
      anchor: 'jf-list',
      title: 'La liste',
      body: 'Supprimez une date avec la corbeille en cas d’erreur.',
      side: 'top',
    },
  ],
};
