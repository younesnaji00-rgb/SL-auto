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
      body: 'Consultez les fichiers et leurs annotations, sans pouvoir rien modifier.',
    },
    {
      anchor: 'view-doc-filter',
      title: 'Choisir un fichier',
      body: 'Filtrez par type, puis sélectionnez le fichier dans la liste.',
      side: 'bottom',
    },
    {
      anchor: 'view-comparison',
      title: 'Comparer',
      body: 'Affichez une pièce du dossier à côté du fichier consulté.',
      side: 'bottom',
    },
    {
      anchor: 'view-zoom',
      title: 'Zoom et rotation',
      body: 'Zoomez et pivotez le document.',
      side: 'bottom',
    },
    {
      anchor: 'view-readonly',
      title: 'Lecture seule',
      body: 'Rien ne peut être modifié ici.',
      side: 'bottom',
      align: 'end',
    },
  ],
};
