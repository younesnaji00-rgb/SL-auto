import type { PageTutorial } from '../types';

/**
 * Guided tour of the Tableau de bord (2026-09-06 role dashboards).
 * Anchors live in src/app/(app)/dashboard/*.tsx (prefix `dash-`).
 *
 * One step list serves every role: steps whose anchor is not on screen are
 * dropped by the DOM-presence filter, so a Chiffreur sees the tiles + file
 * steps, an Agent de Terrain the next-mission steps, an Admin the tab steps.
 */
export const dashboardTutorial: PageTutorial = {
  key: 'dashboard',
  match: (p) => p === '/dashboard',
  steps: [
    {
      title: 'Tableau de bord',
      body: "Ce qui vous attend maintenant, ce qui est en retard, et votre rythme — rien d'autre.\nLes analyses d'équipe (entonnoir, délais, tendances) restent dans Suivi d'équipe.",
    },
    {
      anchor: 'dash-tiles',
      title: 'Les chiffres du jour',
      body: 'En cours, en retard, terminés sur 7 jours face aux 7 jours précédents.\nUne couleur n’apparaît que quand quelque chose dépasse le délai.',
      side: 'bottom',
    },
    {
      anchor: 'dash-worklist',
      title: 'À traiter',
      body: 'La liste de ce qui vous revient, du plus ancien au plus récent. Chaque ligne ouvre le dossier ou la mission.\nQuand elle est vide, c’est une bonne nouvelle : tout avance.',
      side: 'right',
    },
    {
      anchor: 'dash-context',
      title: 'Ce qui attend un tiers',
      body: 'Ici, rien ne dépend de vous : le dossier est chez le chiffreur, chez l’agent, ou n’a pas bougé depuis plus de 2 jours ouvrés.',
      side: 'left',
    },
    {
      anchor: 'dash-next',
      title: 'Prochaine mission',
      body: 'Heure, dossier, adresse — et trois boutons : ouvrir la mission, l’itinéraire, appeler.',
      side: 'bottom',
    },
    {
      anchor: 'dash-late',
      title: 'En retard',
      body: 'RDV passé sans photos, ou plus de 24 h ouvrées depuis la planification. « Rien en retard » est le meilleur écran possible.',
      side: 'top',
    },
    {
      anchor: 'dash-tabs',
      title: 'Direction, puis un onglet par rôle',
      body: 'Direction répond à « où en est le cabinet » ; Gestionnaires, Chiffreurs et Terrain reprennent les mêmes blocs que le tableau de bord de chacun, additionnés pour l’équipe.',
      side: 'bottom',
    },
    {
      anchor: 'dir-northstar',
      title: 'Le délai qui vous juge',
      body: 'De la requête de la compagnie au dépôt du rapport, en médiane, sur les dossiers CLÔTURÉS de la période.\nLe P90 à côté dit ce que vit le dossier le plus lent sur dix : c’est lui qui fait les réclamations.',
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'dir-ladder',
      title: 'Où passent les jours',
      body: 'Le délai total découpé étape par étape. La barre pleine est la médiane, le fond clair le P90, et chaque ligne imprime son effectif — une étape mesurée sur trois dossiers ne se lit pas comme une étape mesurée sur cent.',
      side: 'top',
      dynamic: true,
    },
    {
      anchor: 'dir-tabs',
      title: 'La profondeur, par question',
      body: 'Compagnies, Qualité, Terrain, Portefeuille, Flux : chaque onglet répond à une question, pour que l’écran d’accueil garde cinq chiffres et pas quarante.',
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'dash-exceptions',
      title: 'Exceptions',
      body: 'Tout ce qui est en retard maintenant, avec la personne concernée. Une ligne ouvre l’élément.',
      side: 'right',
      click: 'dash-tab-gestionnaires',
      dynamic: true,
    },
    {
      anchor: 'dash-charge',
      title: 'Charge par personne',
      body: 'La longueur de la barre, c’est la charge ; le second chiffre, le retard. Cliquez sur une personne pour voir son tableau de bord.',
      side: 'left',
    },
    {
      anchor: 'dash-par-personne',
      title: 'Par personne',
      body: 'Les mêmes définitions que chacun voit chez soi, et la ligne « Médiane équipe » pour situer — jamais un classement.',
      side: 'top',
    },
    {
      anchor: 'dash-user-select',
      title: 'Voir une personne',
      body: 'Choisissez quelqu’un : la page devient son tableau de bord, exactement comme il le voit, suivi de son contexte de charge.',
      side: 'bottom',
    },
  ],
};
