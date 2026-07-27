import type { PageTutorial } from '../types';

export const utilisateurDetailTutorial: PageTutorial = {
  key: 'utilisateur-detail',
  match: (p) => p.startsWith('/utilisateurs/'),
  steps: [
    {
      title: 'Fiche utilisateur',
      body:
        "Cette page regroupe tout ce qui concerne un compte : informations, permissions, dossiers assignés, activité et session. Elle est réservée aux administrateurs.",
    },
    {
      anchor: 'usrd-profile',
      title: 'Modifier le profil',
      body:
        "Modifiez les coordonnées, le rôle, le statut et les compagnies de l'utilisateur, puis cliquez sur Sauvegarder pour enregistrer les changements.",
      side: 'right',
    },
    {
      anchor: 'usrd-permissions',
      title: 'Permissions par page',
      body:
        "Chaque interrupteur accorde ou retire l'accès à une page, au-delà de ce que le rôle prévoit. Les badges « Accordé » et « Retiré » signalent les exceptions au rôle. Dépliez une ligne pour affiner les sous-permissions.",
      side: 'right',
    },
    {
      anchor: 'usrd-dossiers',
      title: 'Dossiers assignés',
      body:
        "Les dossiers dont cet utilisateur est responsable. Cliquez sur une ligne pour ouvrir le dossier.",
      side: 'top',
    },
    {
      anchor: 'usrd-activity',
      title: "Historique d'activité",
      body:
        "Les dernières actions effectuées par cet utilisateur dans l'application (changements de statut, modifications de dossiers…).",
      side: 'left',
    },
    {
      anchor: 'usrd-session',
      title: 'Session et appareil',
      body:
        "Les rôles de base (Gestionnaire, Chiffreur, Agent de Terrain) ne peuvent être connectés que sur un seul appareil à la fois. Cette carte montre l'appareil et l'adresse IP connectés ; « Déconnecter la session » libère le compte pour un autre appareil.",
      side: 'left',
    },
  ],
};
