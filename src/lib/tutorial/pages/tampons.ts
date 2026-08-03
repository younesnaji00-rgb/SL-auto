import type { PageTutorial } from '../types';

export const tamponsTutorial: PageTutorial = {
  key: 'tampons',
  match: (p) => p === '/tampons',
  steps: [
    {
      title: 'Tampons de signature',
      body: "Les cachets apposés sur les PDF générés par l'application.",
    },
    {
      anchor: 'tam-import',
      title: 'Importer',
      body: "Choisissez les images de tampon puis lancez l'import.",
      side: 'bottom',
    },
    {
      anchor: 'tam-list',
      title: 'Gérer les tampons',
      body: 'Activez, désactivez ou supprimez un tampon.',
      side: 'top',
    },
    {
      anchor: 'tam-assign',
      title: 'Assigner',
      body: 'Choisissez le ou les tampons de chaque chiffreur.',
      side: 'top',
    },
  ],
};
