import type { PageTutorial } from '../types';

/**
 * Field-agent mission list (mobile-first). One step list serves both the
 * mobile card layout and the desktop table — absent anchors are auto-skipped.
 * Only the tab switch is hands-on: GPS toggle, plate scan, route and cards
 * all trigger permissions, camera or navigation.
 */
export const assignationsAtgTutorial: PageTutorial = {
  key: 'assignations-atg',
  match: (p) => p === '/assignations-atg',
  steps: [
    {
      title: 'Mes missions terrain',
      body: 'Vos rendez-vous photos : Avant, En cours et Après réparation.',
    },
    {
      anchor: 'atg-gps',
      title: 'Partage de position',
      body: 'Activez-le pour recevoir les missions proches de vous.',
      side: 'bottom',
    },
    {
      anchor: 'atg-scan',
      title: 'Scanner une plaque',
      body:
        "Photographiez la plaque : l'application retrouve le dossier toute seule.\nEssayez avec la plaque ci-dessous — elle correspond au dossier Honda Civic (F12 ABC) déjà présent dans la démo.",
      side: 'bottom',
      links: [
        { href: '/demo-kit/photos/license-plate.png', label: 'Photo de plaque (démo)', download: true },
      ],
      // No-download path: hand the plate photo straight to the scanner's
      // real file input, exactly as if it had been shot with the camera.
      prefill: [
        {
          href: '/demo-kit/photos/license-plate.png',
          name: 'license-plate.png',
          input: '[data-tour="atg-scan"] input[type=file]',
        },
      ],
    },
    {
      // Presentational: switching tabs must NOT advance the tour — the
      // user explores, then clicks « Suivant » himself.
      anchor: 'atg-tabs',
      title: 'Types de mission',
      body: 'Touchez un onglet : Avant, En cours ou Après.',
      side: 'bottom',
    },
    {
      anchor: 'atg-filters',
      title: 'Filtres',
      body: 'Cherchez par nom, adresse ou immatriculation.',
      side: 'bottom',
    },
    // Everything below depends on the missions DATA — dynamic keeps the
    // steps when the tour starts before Firestore has delivered the list
    // (they resolve to their real anchors by the time the user gets there).
    {
      anchor: 'atg-groups',
      title: 'Par échéance',
      body: "Trois groupes : Aujourd'hui, En retard, À venir.",
      side: 'top',
      dynamic: true,
    },
    {
      anchor: 'atg-group-today',
      title: "Aujourd'hui",
      body: 'Les rendez-vous du jour — la priorité de la tournée.',
      side: 'bottom',
      dynamic: true,
    },
    {
      // The "En retard" group is absent from the DOM when nothing is
      // overdue (the page only renders non-empty groups), so the copy adapts
      // instead of describing a section that isn't on screen.
      anchor: 'atg-group-expired',
      title: 'En retard',
      body:
        "Le délai de 24 h ouvrées est dépassé : la mission passe en rouge, avec le retard accumulé.",
      bodyFn: () =>
        document.querySelector('[data-tour="atg-group-expired"]')
          ? "Le délai de 24 h ouvrées est dépassé : la mission passe en rouge, avec le retard accumulé."
          : "Aucune mission en retard pour l'instant — ce groupe n'apparaît que s'il y en a.\nPassé 24 h ouvrées sans photos, la mission bascule ici et son badge de délai passe au rouge.",
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'atg-group-future',
      title: 'À venir',
      body: 'Les missions des prochains jours, déjà planifiées.',
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'atg-route',
      title: 'Itinéraire du jour',
      body: "« Start » ouvre Google Maps avec toutes les adresses de la journée, dans l'ordre.",
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'atg-row',
      title: 'Votre mission est déjà là',
      body: 'La planification créée il y a un instant est arrivée en direct.\nCliquez dessus pour l’ouvrir.',
      side: 'top',
      dynamic: true,
      interact: 'click',
      chain: 'atg-detail',
    },
  ],
  // Chains into the mission detail — the closing pitch lives at the end of
  // the journey, back on the dossier.
  noClosing: true,
};
