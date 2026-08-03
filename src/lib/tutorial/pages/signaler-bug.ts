import type { PageTutorial } from '../types';

// Non-admins see their own chat thread; admins see the inbox (conversation
// list + chat once a conversation is opened). Steps auto-skip when their
// anchor is absent, so one step list covers both audiences.
export const signalerBugTutorial: PageTutorial = {
  key: 'signaler-bug',
  match: (p) => p === '/signaler-bug',
  steps: [
    {
      title: 'Signaler un problème',
      body: "Une messagerie directe avec l'administrateur.",
    },
    {
      anchor: 'bug-thread',
      title: 'Le fil',
      body: 'Vos messages et les réponses, en temps réel.',
      side: 'top',
    },
    {
      anchor: 'bug-compose',
      title: 'Votre message',
      body: 'Décrivez le problème puis cliquez sur Envoyer.',
      side: 'top',
    },
    {
      anchor: 'bug-tools',
      title: 'Pièces jointes',
      body: 'Le trombone joint un fichier ; le micro enregistre un message vocal.',
      side: 'top',
    },
    {
      anchor: 'bug-inbox',
      title: 'Boîte admin',
      body: 'Toutes les conversations, avec leurs messages non lus.',
      side: 'right',
    },
  ],
};
