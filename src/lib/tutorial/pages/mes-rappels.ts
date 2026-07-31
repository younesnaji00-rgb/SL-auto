import type { PageTutorial } from '../types';

/**
 * Mes rappels: reminders received/sent about files. Core behavior to teach:
 * opening a received rappel starts a tracked work session on the file, where
 * edits stay in a LOCAL draft until the amber « Sauvegarder » button flushes
 * them.
 */
export const mesRappelsTutorial: PageTutorial = {
  key: 'mes-rappels',
  match: (p) => p === '/mes-rappels',
  steps: [
    {
      title: 'Mes rappels',
      body:
        "Cette page regroupe les rappels : des demandes de travail sur un dossier, envoyées par un responsable ou par vous.",
    },
    {
      anchor: 'rap-tabs',
      title: 'Reçus et Envoyés',
      body:
        "« Reçus » : les rappels qui vous sont adressés. « Envoyés » : ceux que vous avez adressés aux autres.",
      side: 'bottom',
    },
    {
      anchor: 'rap-recus-table',
      title: 'Rappels reçus',
      body:
        "Chaque ligne indique le dossier concerné, qui a envoyé le rappel et son message.",
      side: 'bottom',
    },
    {
      anchor: 'rap-recus-table',
      title: 'Traiter un rappel',
      body:
        "Cliquez sur une ligne : le dossier s'ouvre en session de travail. Vos modifications restent en brouillon local jusqu'au clic sur le bouton orange « Sauvegarder » du dossier.",
      side: 'bottom',
    },
    {
      anchor: 'rap-statut',
      title: 'Statuts des rappels',
      body:
        "Nouveau (pas encore ouvert), Lu (consulté), Traité (travail sauvegardé ou marqué traité via le bouton).",
      side: 'left',
    },
    {
      anchor: 'rap-travail',
      title: 'Travail effectué',
      body:
        "« Voir le détail » rejoue la session : observations ajoutées et modifications faites sur le dossier pendant le traitement.",
      side: 'left',
    },
    {
      anchor: 'rap-tab-envoyes',
      title: 'Suivre vos envois',
      body:
        "L'onglet Envoyés groupe vos rappels par envoi et suit chaque destinataire : Nouveau, Lu, Traité.",
      side: 'bottom',
    },
  ],
  lab: [
    {
      anchor: 'rap-tabs',
      title: 'Reçus et Envoyés',
      body:
        "« Reçus » : les rappels qui vous sont adressés. « Envoyés » : ceux que vous avez adressés aux autres.",
      action: 'observe',
    },
    {
      anchor: 'rap-recus-table',
      title: 'Vos rappels reçus',
      body:
        'Chaque ligne indique le dossier concerné, qui a envoyé le rappel et son message.',
      action: 'observe',
    },
    {
      anchor: 'rap-recus-table',
      title: 'Le brouillon local',
      body:
        "Cliquer sur une ligne ouvrirait le dossier en session de travail : vos modifications resteraient en brouillon local jusqu'au clic sur le bouton orange « Sauvegarder ». Poursuivons la visite sans ouvrir de dossier.",
      action: 'observe',
    },
    {
      anchor: 'rap-statut',
      title: 'Statuts des rappels',
      body:
        'Nouveau (pas encore ouvert), Lu (consulté), Traité (travail sauvegardé ou marqué traité via le bouton).',
      action: 'observe',
    },
    {
      anchor: 'rap-tab-envoyes',
      title: 'Vos envois',
      body:
        "Cliquez sur l'onglet « Envoyés » pour suivre les rappels que vous avez adressés.",
      action: 'click',
    },
    {
      anchor: 'rap-tabs',
      title: 'Retour aux reçus',
      body:
        'Chaque destinataire y est suivi : Nouveau, Lu, Traité. Cliquez maintenant sur « Reçus » pour revenir à l\'onglet initial.',
      action: 'click',
    },
  ],
};
