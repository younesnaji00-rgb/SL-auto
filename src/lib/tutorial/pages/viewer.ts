import type { PageTutorial } from '../types';

// Read-only viewer tour — see docs/TUTORIALS.md. The comparison step's
// anchor only renders when the viewer was opened with a dossierId;
// DOM-presence filtering skips it otherwise.
export const viewerPageTutorial: PageTutorial = {
  key: 'viewer',
  match: (p) => p === '/viewer',
  steps: [
    {
      title: 'Visionneuse de documents',
      body:
        "Cette page affiche en lecture seule les fichiers d'un chiffrage et les pièces du dossier, avec les annotations existantes. Rien ne peut y être modifié.",
    },
    {
      anchor: 'view-doc-filter',
      title: 'Choisir un fichier',
      body:
        "Filtrez par type de document, puis sélectionnez le fichier à afficher dans la liste juste à droite.",
      side: 'bottom',
    },
    {
      anchor: 'view-comparison',
      title: 'Comparer deux pièces',
      body:
        "Ouvrez le panneau de comparaison pour afficher une photo ou un document du dossier à côté du fichier consulté.",
      side: 'bottom',
    },
    {
      anchor: 'view-zoom',
      title: 'Zoomer sur le document',
      body:
        "Rapprochez ou éloignez la vue. Les boutons de rotation juste à droite pivotent le document par quarts de tour.",
      side: 'bottom',
    },
    {
      anchor: 'view-readonly',
      title: 'Lecture seule',
      body:
        "Ce badge rappelle qu'aucune modification n'est possible ici. Pour annoter un fichier, ouvrez-le depuis l'éditeur du chiffrage.",
      side: 'bottom',
      align: 'end',
    },
  ],
};
