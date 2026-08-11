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
      // The whole actions row: camera + (demo) gallery import stay clickable.
      anchor: 'atgd-photo-actions',
      title: 'Prendre des photos',
      body:
        "L'agent photographie directement depuis son téléphone : chaque photo est horodatée, signée à son nom et part dans le dossier en temps réel.\nPour la démo, « Importer des photos » permet aussi de déposer des images depuis vos fichiers.",
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
      body:
        "C'est ici que l'agent dépose les pièces du dossier, directement sur le terrain.\nTouchez pour ouvrir le panneau documents.",
      side: 'top',
      interact: 'click',
    },
    {
      anchor: 'atgd-docs',
      title: 'Les 5 pièces du dossier',
      body:
        "Chaque pièce a sa carte : déposez les 5 fichiers ci-dessous (constat, carte grise, attestation, kilométrage, châssis) — l'IA lit même la carte grise.\nElles partent en direct dans le dossier, côté bureau. (Quand les pièces arrivent autrement — par courriel ou via la compagnie — on peut aussi les importer depuis la gestion du dossier, onglet « Importer un document ».)",
      side: 'top',
      dynamic: true,
      interact: 'until',
      until: () =>
        ['dosd-slot-pv', 'dosd-slot-carte', 'dosd-slot-attestation', 'dosd-slot-km', 'dosd-slot-vin'].every(
          (a) => !!document.querySelector(`[data-tour="atgd-docs"] [data-tour="${a}"] ul li`),
        ),
      links: [
        { href: '/demo-kit/{lang}/accident-report.pdf', label: 'Constat (PDF)', download: true },
        { href: '/demo-kit/{lang}/vehicle-registration.pdf', label: 'Carte grise (PDF)', download: true },
        { href: '/demo-kit/{lang}/insurance-certificate.pdf', label: 'Attestation (PDF)', download: true },
        { href: '/demo-kit/photos/odometer.png', label: 'Photo kilométrage', download: true },
        { href: '/demo-kit/photos/vin-plate.png', label: 'Photo châssis', download: true },
      ],
      prefill: [
        { href: '/demo-kit/{lang}/accident-report.pdf', name: 'accident-report.pdf', input: '[data-tour="atgd-docs"] [data-tour="dosd-slot-pv"] input[type=file]' },
        { href: '/demo-kit/{lang}/vehicle-registration.pdf', name: 'vehicle-registration.pdf', input: '[data-tour="atgd-docs"] [data-tour="dosd-slot-carte"] input[type=file]' },
        { href: '/demo-kit/{lang}/insurance-certificate.pdf', name: 'insurance-certificate.pdf', input: '[data-tour="atgd-docs"] [data-tour="dosd-slot-attestation"] input[type=file]' },
        { href: '/demo-kit/photos/odometer.png', name: 'odometer.png', input: '[data-tour="atgd-docs"] [data-tour="dosd-slot-km"] input[type=file]' },
        { href: '/demo-kit/photos/vin-plate.png', name: 'vin-plate.png', input: '[data-tour="atgd-docs"] [data-tour="dosd-slot-vin"] input[type=file]' },
      ],
    },
    {
      anchor: 'nav-/dossiers',
      title: 'Revenez au dossier',
      body:
        "Les 5 pièces (et tout ce que l'agent envoie) sont déjà arrivées dans le dossier, côté bureau.\nCliquez sur « Gestion des dossiers » pour y retourner.",
      side: 'right',
      interact: 'click',
      chain: 'dossiers',
      chainAt: 'Rouvrez votre dossier',
    },
  ],
  // Hops back into the dossier journey (title-based resume).
  noClosing: true,
};
