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
      body:
        "La page de l'agent de terrain : ses rendez-vous photos — Avant, En cours et Après réparation — groupés par échéance, avec l'itinéraire du jour.\nTout ce que l'agent capture ici part en direct dans le dossier, côté bureau.",
    },
    {
      anchor: 'atg-phone-toggle',
      title: 'La vue téléphone',
      body:
        "Cette page est pensée mobile : l'agent la vit sur son téléphone.\nCliquez sur « Vue téléphone » pour voir son interface EXACTE, cadrée comme un téléphone.",
      side: 'bottom',
      // until (not click): the swap can also have happened a beat earlier
      // (e.g. during the intro) — advance as soon as the phone frame is on.
      interact: 'until',
      until: () => !!document.querySelector('[data-tour="atg-desktop-toggle"]'),
    },
    {
      anchor: 'atg-desktop-toggle',
      title: "Ce que voit l'agent",
      body:
        "Vous êtes dans l'écran réel de l'agent : onglets, missions, itinéraire — à l'identique.\nCliquez sur « Vue bureau » pour continuer la visite en grand.",
      side: 'bottom',
      dynamic: true,
      // Only meaningful when the desktop toggle exists (i.e. NOT already on
      // a real phone, where there is nothing to switch back to).
      onlyIf: () => !!document.querySelector('[data-tour="atg-phone-toggle"]'),
      interact: 'click',
    },
    {
      anchor: 'atg-gps',
      title: 'Partage de position',
      body: 'Activez-le pour recevoir les missions proches de vous.',
      side: 'bottom',
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
