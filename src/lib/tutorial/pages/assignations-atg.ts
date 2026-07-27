import type { PageTutorial } from '../types';

/**
 * Field-agent mission list (mobile-first). One step list serves both the
 * mobile card layout and the desktop table — absent anchors are auto-skipped.
 */
export const assignationsAtgTutorial: PageTutorial = {
  key: 'assignations-atg',
  match: (p) => p === '/assignations-atg',
  steps: [
    {
      title: 'Mes missions terrain',
      body:
        "Cette page liste vos missions photos sur le terrain : Avant réparation, En cours et Après. Chaque carte est un rendez-vous à réaliser.",
    },
    {
      anchor: 'atg-gps',
      title: 'Partage de position',
      body:
        "Activez le partage de position : la planification tient compte de l'endroit où vous êtes pour vous confier les missions proches.",
      side: 'bottom',
    },
    {
      anchor: 'atg-scan',
      title: 'Scanner une plaque',
      body:
        "Photographiez la plaque du véhicule : l'application retrouve le dossier correspondant et vous amène directement à l'import des photos.",
      side: 'bottom',
    },
    {
      anchor: 'atg-tabs',
      title: 'Types de mission',
      body:
        "Trois onglets : Avant (avant réparation), En cours et Après. Le chiffre indique le nombre de missions de chaque type.",
      side: 'bottom',
    },
    {
      anchor: 'atg-filters',
      title: 'Filtrer les missions',
      body: 'Recherchez par référence, assuré, adresse ou immatriculation, et filtrez par compagnie ou période.',
      side: 'bottom',
    },
    {
      anchor: 'atg-groups',
      title: 'Missions par échéance',
      body:
        "Les missions sont groupées : Aujourd'hui, En retard, À venir. Le badge rouge « En retard » apparaît après 24 h ouvrées.",
      side: 'top',
    },
    {
      anchor: 'atg-route',
      title: 'Itinéraire du jour',
      body:
        "Start ouvre Google Maps avec toutes les adresses du groupe, dans l'ordre des rendez-vous.",
      side: 'bottom',
    },
    {
      anchor: 'atg-groups',
      title: 'Ouvrir une mission',
      body:
        'Touchez une carte pour ouvrir la mission : prise de photos, documents et remarques.',
      side: 'top',
    },
  ],
};
