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
      body:
        "Cette page est une messagerie directe avec l'administrateur pour signaler un problème ou poser une question. Elle est accessible à tous les rôles.",
    },
    {
      anchor: 'bug-thread',
      title: 'Fil de discussion',
      body:
        "Vos messages et les réponses de l'administrateur s'affichent ici en temps réel, du plus ancien au plus récent.",
      side: 'top',
    },
    {
      anchor: 'bug-compose',
      title: 'Décrire le problème',
      body:
        "Tapez votre message puis cliquez sur Envoyer (ou touche Entrée). Décrivez ce que vous faisiez, ce qui était attendu et ce qui s'est produit.",
      side: 'top',
    },
    {
      anchor: 'bug-tools',
      title: 'Joindre une preuve',
      body:
        "Le trombone joint un fichier (capture d'écran, document…) et le micro enregistre un message vocal de 2 minutes maximum.",
      side: 'top',
    },
    {
      anchor: 'bug-inbox',
      title: 'Boîte de réception admin',
      body:
        "Côté administrateur : toutes les conversations, avec le nombre de messages non lus. Cliquez sur un utilisateur pour ouvrir son fil et lui répondre.",
      side: 'right',
    },
  ],
};
