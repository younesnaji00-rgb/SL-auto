import type { PageTutorial } from '../types';

/**
 * Mes rappels: reminders received/sent about files. Row clicks navigate into
 * the dossier, so only the tab switches are hands-on; the final step brings
 * the page back to its default « Reçus » tab.
 */
export const mesRappelsTutorial: PageTutorial = {
  key: 'mes-rappels',
  match: (p) => p === '/mes-rappels',
  steps: [
    {
      title: 'Mes rappels',
      body: 'Les demandes de travail échangées avec vos collègues sur les dossiers.',
    },
    {
      anchor: 'rap-tabs',
      title: 'Reçus et Envoyés',
      body: '« Reçus » : pour vous. « Envoyés » : de vous.',
      side: 'bottom',
    },
    {
      anchor: 'rap-recus-table',
      title: 'Rappels reçus',
      body: "Chaque ligne montre le dossier, l'expéditeur et son message.",
      side: 'bottom',
    },
    {
      anchor: 'rap-recus-table',
      title: 'Traiter un rappel',
      body:
        "Un clic sur une ligne ouvre le dossier ; rien n'est publié avant le bouton orange « Sauvegarder ».",
      side: 'bottom',
    },
    {
      anchor: 'rap-statut',
      title: 'Statuts',
      body: 'Nouveau, Lu ou Traité.',
      side: 'left',
    },
    {
      anchor: 'rap-travail',
      title: 'Travail effectué',
      body: '« Voir le détail » montre ce qui a été fait pendant le traitement.',
      side: 'left',
    },
    {
      anchor: 'rap-tab-envoyes',
      title: 'Vos envois',
      body: 'Cliquez sur « Envoyés » pour suivre vos rappels.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'rap-tabs',
      title: 'Retour aux reçus',
      body: 'Chaque destinataire y est suivi. Cliquez sur « Reçus » pour revenir.',
      side: 'bottom',
      interact: 'click',
    },
  ],
};
