import type { PageTutorial } from '../types';

/**
 * Field-agent mission detail (mobile-first): photos per mission stage,
 * documents, réforme toggle. The Photos panel is opened via `click` on the
 * camera step and closed again by the final step so the page ends on its
 * default state.
 */
export const atgDetailTutorial: PageTutorial = {
  key: 'atg-detail',
  match: (p) => p.startsWith('/assignations-atg/'),
  steps: [
    {
      title: 'Détail de la mission',
      body:
        "Votre mission sur ce dossier : prendre les photos de l'étape (Avant, En cours ou Après) et ajouter les documents si besoin.",
    },
    {
      anchor: 'atgd-header',
      title: 'Infos du rendez-vous',
      body:
        "Référence, assuré, téléphone et adresse. Touchez le numéro pour appeler, l'adresse pour ouvrir Google Maps.",
      side: 'bottom',
    },
    {
      anchor: 'atgd-observations',
      title: 'Remarques',
      body: "Consultez et ajoutez des remarques liées à cette étape de la mission.",
      side: 'bottom',
    },
    {
      anchor: 'atgd-camera',
      title: 'Prendre des photos',
      body:
        "Ouvre l'appareil photo. Chaque photo est marquée à votre nom et envoyée dans le dossier ; la première fait avancer le statut automatiquement.",
      side: 'bottom',
      click: 'atgd-photos-toggle',
      dynamic: true,
    },
    {
      anchor: 'atgd-reforme',
      title: 'Proposition réforme',
      body:
        "Véhicule visiblement irréparable ? Activez la proposition de réforme : la limite passe de 30 à 60 photos par section.",
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'atgd-docs-toggle',
      title: 'Documents',
      body:
        "Touchez Documents pour photographier ou importer les pièces du dossier (carte grise, permis, constat…), chacune dans son emplacement.",
      side: 'top',
    },
    {
      anchor: 'atgd-header',
      title: 'Mission terminée',
      body:
        "Une fois les photos envoyées, le bureau les voit immédiatement et le dossier avance. Revenez à la liste avec la flèche.",
      side: 'bottom',
      click: 'atgd-photos-toggle',
      dynamic: true,
    },
  ],
};
