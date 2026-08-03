import type { PageTutorial } from '../types';

/**
 * Field-agent mission detail (mobile-first). The user opens the Photos panel
 * himself (interact 'click' on the toggle); the final step clicks the same
 * toggle to close it so the page ends on its default state. Camera, réforme
 * and document actions stay describe-only (permissions / real uploads).
 */
export const atgDetailTutorial: PageTutorial = {
  key: 'atg-detail',
  match: (p) => p.startsWith('/assignations-atg/'),
  steps: [
    {
      title: 'Détail de la mission',
      body: "Prenez les photos de l'étape et ajoutez les documents utiles.",
    },
    {
      anchor: 'atgd-header',
      title: 'Le rendez-vous',
      body: "Touchez le numéro pour appeler, l'adresse pour ouvrir la carte.",
      side: 'bottom',
    },
    {
      anchor: 'atgd-observations',
      title: 'Remarques',
      body: 'Lisez et ajoutez des remarques sur la mission.',
      side: 'bottom',
    },
    {
      anchor: 'atgd-photos-toggle',
      title: 'Ouvrez les photos',
      body: 'Touchez ici pour ouvrir le panneau photos.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'atgd-camera',
      title: 'Prendre des photos',
      body: 'Chaque photo est signée à votre nom et part directement dans le dossier.',
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'atgd-reforme',
      title: 'Proposition réforme',
      body: 'Véhicule visiblement irréparable ? Activez la proposition ici.',
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'atgd-docs-toggle',
      title: 'Documents',
      body: 'Chaque pièce (carte grise, permis, constat…) a son emplacement.',
      side: 'top',
    },
    {
      anchor: 'atgd-header',
      title: 'Mission terminée',
      body: 'Photos envoyées : le bureau les voit immédiatement.',
      side: 'bottom',
      click: 'atgd-photos-toggle',
      dynamic: true,
    },
  ],
};
