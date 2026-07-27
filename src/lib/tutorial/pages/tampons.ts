import type { PageTutorial } from '../types';

export const tamponsTutorial: PageTutorial = {
  key: 'tampons',
  match: (p) => p === '/tampons',
  steps: [
    {
      title: 'Tampons de signature',
      body:
        "Les tampons sont les images de cachet apposées sur les devis et documents PDF générés par l'application. Cette page, réservée aux administrateurs, sert à les importer et à les attribuer.",
    },
    {
      anchor: 'tam-import',
      title: 'Importer des images',
      body:
        "Sélectionnez une ou plusieurs images de tampon. Le nom du tampon est repris du nom de fichier ; vérifiez la file d'attente puis lancez l'import.",
      side: 'bottom',
    },
    {
      anchor: 'tam-list',
      title: 'Gérer les tampons',
      body:
        "Activez ou désactivez un tampon avec l'interrupteur (un tampon inactif n'est plus proposé), ou supprimez-le définitivement avec la corbeille.",
      side: 'top',
    },
    {
      anchor: 'tam-assign',
      title: 'Assigner aux chiffreurs',
      body:
        "Choisissez le ou les tampons de chaque chiffreur : ce sont eux qui signeront ses documents. Un chiffreur peut disposer de plusieurs tampons.",
      side: 'top',
    },
  ],
};
