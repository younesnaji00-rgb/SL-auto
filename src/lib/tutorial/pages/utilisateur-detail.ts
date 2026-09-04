import type { PageTutorial } from '../types';

export const utilisateurDetailTutorial: PageTutorial = {
  key: 'utilisateur-detail',
  match: (p) => p.startsWith('/utilisateurs/'),
  steps: [
    {
      title: 'Fiche utilisateur',
      body: 'Tout le compte au même endroit : profil, droits, activité et session.',
    },
    {
      anchor: 'usrd-profile',
      title: 'Le profil',
      body: 'Modifiez les informations puis cliquez sur Sauvegarder.',
      side: 'right',
    },
    {
      anchor: 'usrd-permissions',
      title: 'Permissions',
      body: "Chaque interrupteur ouvre ou ferme l'accès à une page.",
      side: 'right',
    },
    {
      anchor: 'usrd-dossiers',
      title: 'Dossiers assignés',
      body: 'Les dossiers dont ce compte est responsable.',
      side: 'top',
    },
    {
      anchor: 'usrd-activity',
      title: 'Activité',
      body: "Ses dernières actions dans l'application.",
      side: 'left',
    },
    {
      anchor: 'usrd-session',
      title: 'Session et appareil',
      body: "L'appareil connecté ; « Déconnecter la session » libère le compte.",
      side: 'left',
    },
  ],
};
