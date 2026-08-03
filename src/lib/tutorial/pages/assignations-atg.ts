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
      body: "Photographiez la plaque : l'application retrouve le dossier toute seule.",
      side: 'bottom',
    },
    {
      anchor: 'atg-tabs',
      title: 'Types de mission',
      body: 'Touchez un onglet : Avant, En cours ou Après.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'atg-filters',
      title: 'Filtres',
      body: 'Cherchez par nom, adresse ou immatriculation.',
      side: 'bottom',
    },
    {
      anchor: 'atg-groups',
      title: 'Par échéance',
      body: "Trois groupes : Aujourd'hui, En retard, À venir.",
      side: 'top',
    },
    {
      anchor: 'atg-route',
      title: 'Itinéraire du jour',
      body: '« Start » ouvre Google Maps avec toutes les adresses de la journée.',
      side: 'bottom',
    },
    {
      anchor: 'atg-groups',
      title: 'Ouvrir une mission',
      body: 'Touchez une carte pour prendre les photos.',
      side: 'top',
    },
  ],
};
