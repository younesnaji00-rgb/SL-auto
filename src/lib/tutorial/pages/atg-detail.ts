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
      body:
        "Touchez le numéro pour appeler, l'adresse pour ouvrir la carte.\n(Démo fictive : aucun vrai numéro de téléphone n'est renseigné ici.)",
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
      body:
        "L'agent photographie directement depuis son téléphone : chaque photo est horodatée, signée à son nom et part dans le dossier en temps réel.",
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'atgd-reforme',
      title: 'Proposition réforme',
      body: 'Véhicule visiblement irréparable ? Activez la proposition ici.',
      side: 'bottom',
    },
    {
      anchor: 'atgd-docs-toggle',
      title: 'Documents',
      body: "L'agent peut aussi déposer des pièces ici (carte grise, permis, constat…) : chacune a son emplacement.",
      side: 'top',
    },
    {
      anchor: 'nav-/dossiers',
      title: 'Revenez au dossier',
      body:
        "Tout ce que l'agent envoie arrive en direct au bureau — ajoutez au moins une photo ou une pièce ici pour la voir apparaître dans le dossier.\nCliquez sur « Gestion des dossiers » pour y retourner.",
      side: 'right',
      interact: 'click',
      chain: 'dossiers',
      chainAt: 'Rouvrez votre dossier',
    },
  ],
  // Hops back into the dossier journey (title-based resume).
  noClosing: true,
};
