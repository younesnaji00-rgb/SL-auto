import type { PageTutorial } from '../types';

/**
 * Guided tour of the dashboard (Admin / Responsable d'équipe only).
 * Anchors live in src/app/(app)/dashboard/page.tsx (prefix `dash-`).
 *
 * Ordering note: the "Répartition par Compagnie" card always exists in the
 * DOM, but its chart body swaps to an "Aucune donnée" empty state as soon as
 * the period filter excludes every dossier (the old lab made users click
 * «Semaine» FIRST, which blanked the charts on aged demo data). All chart
 * steps therefore run BEFORE the interactive period step, and the period
 * step comes last among the data widgets — the activity feeds after it
 * ignore the period filter entirely.
 */

/**
 * True once the user actually picked a period: choosing a preset or a
 * calendar date fills the Du/Au DatePicker triggers with a formatted date
 * (digits). Preset labels and empty-picker placeholders contain no digits in
 * FR or EN, so this only fires on a real selection — merely opening the
 * calendar changes nothing inside the zone (the calendar is portaled).
 */
const periodePicked = (): boolean => {
  const zone = document.querySelector('[data-tour="dash-etat-periode"]');
  if (!zone) return false;
  return Array.from(zone.querySelectorAll('button')).some((b) =>
    /\d/.test(b.textContent || ''),
  );
};

export const dashboardTutorial: PageTutorial = {
  key: 'dashboard',
  match: (p) => p === '/dashboard',
  steps: [
    {
      title: 'Tableau de bord',
      body:
        "L'activité du cabinet en direct : volumes, statuts et derniers changements.",
    },
    {
      anchor: 'dash-etat-card',
      title: 'Dossiers par état',
      body: 'Chaque ligne montre un statut et son nombre de dossiers.',
      side: 'right',
    },
    {
      anchor: 'dash-etat-card',
      title: 'Choisissez un statut',
      body: "Cliquez sur une ligne : ses dossiers s'affichent.",
      side: 'right',
      interact: 'click',
    },
    {
      anchor: 'dash-status-table',
      title: 'Les dossiers du statut',
      body: 'Voici la liste correspondante ; une référence ouvre le dossier.',
      side: 'left',
    },
    {
      anchor: 'dash-pie',
      title: 'Volume par statut',
      body: 'La part de chaque statut sur la période.',
      side: 'left',
    },
    {
      anchor: 'dash-compagnie',
      title: 'Par compagnie',
      body: "Le volume de dossiers de chaque compagnie d'assurance.",
      side: 'left',
    },
    {
      anchor: 'dash-etat-periode',
      title: 'Filtrer par période',
      body: 'Choisissez une période : Jour, Semaine ou Mois.',
      side: 'bottom',
      interact: 'until',
      until: periodePicked,
    },
    {
      anchor: 'dash-changements-1',
      title: 'Changements récents',
      body: 'Chaque action du cabinet apparaît ici, en temps réel.',
      side: 'right',
    },
    {
      anchor: 'dash-chg-filtres-1',
      title: 'Filtrer le fil',
      body: 'Cliquez sur un des filtres pour affiner le fil.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dash-changements-2',
      title: 'Deuxième fil',
      body: 'Un second fil indépendant, pour surveiller deux activités à la fois.',
      side: 'left',
    },
  ],
};
