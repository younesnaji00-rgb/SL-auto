import type { PageTutorial } from '../types';

/**
 * Guided tour of the Suivi d'équipe funnel page.
 * Anchors live in src/app/(app)/monitoring/page.tsx (prefix `mon-`).
 */

/**
 * True once the user actually changed the period. Unlike the dashboard, this
 * page's Du/Au pickers are PRE-FILLED (default = today), so "a date is
 * present" proves nothing. Instead we snapshot the zone's buttons (labels,
 * formatted dates, and which preset carries the active `bg-primary` variant)
 * on the first poll of the step and advance when that signature changes —
 * i.e. when a preset was applied or a date was really picked. Merely opening
 * a calendar changes nothing inside the zone (the calendar is portaled).
 * The baseline resets itself after 2s without polls (step left/re-entered).
 */
let periodeBaseline: string | null = null;
let periodeLastPoll = 0;
const periodeChanged = (): boolean => {
  const now = Date.now();
  if (now - periodeLastPoll > 2000) periodeBaseline = null;
  periodeLastPoll = now;
  const zone = document.querySelector('[data-tour="mon-periode"]');
  if (!zone) return false;
  const sig = Array.from(zone.querySelectorAll('button'))
    .map((b) => `${b.className.includes('bg-primary') ? '*' : ''}${b.textContent}`)
    .join('|');
  if (periodeBaseline === null) {
    periodeBaseline = sig;
    return false;
  }
  return sig !== periodeBaseline;
};

export const monitoringTutorial: PageTutorial = {
  key: 'monitoring',
  match: (p) => p === '/monitoring',
  steps: [
    {
      title: "Suivi d'équipe",
      body:
        'Combien de dossiers ont passé chaque étape, et qui a fait quoi.\nLes retards se calculent tout seuls, en jours ouvrés.',
    },
    {
      anchor: 'mon-periode',
      title: 'Choisir la période',
      body: 'Cliquez sur « Semaine » ou « Mois » : tout se recalcule.',
      side: 'bottom',
      interact: 'until',
      until: periodeChanged,
    },
    {
      anchor: 'mon-kpis',
      title: 'Une carte par étape',
      body: 'Trois barres par carte : à temps (vert), en retard (orange), à faire (gris).',
      side: 'bottom',
    },
    {
      anchor: 'mon-chart',
      title: 'Le graphique',
      body: 'Les mêmes chiffres en barres, étape par étape.',
      side: 'top',
    },
    {
      anchor: 'mon-tab-compagnie',
      title: 'Vue par compagnie',
      body: "Cliquez sur l'onglet « Par compagnie ».",
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'mon-compagnie-table',
      title: 'Le tableau compagnies',
      body: 'Une ligne par compagnie ; plus la case est verte, plus le volume est élevé.',
      side: 'top',
      dynamic: true,
    },
    {
      anchor: 'mon-tab-user',
      title: 'Vue par utilisateur',
      body: "Cliquez sur l'onglet « Par utilisateur ».",
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'mon-user-table',
      title: "L'activité de l'équipe",
      body: 'Ce que chaque personne a réalisé sur la période.',
      side: 'top',
      dynamic: true,
    },
    {
      anchor: 'mon-tab-global',
      title: 'Retour au global',
      body: "Cliquez sur l'onglet « Global ».",
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'mon-kpis',
      title: 'Explorer les dossiers',
      body: "Un clic sur une barre colorée d'une carte liste les dossiers concernés.",
      side: 'bottom',
      dynamic: true,
    },
  ],
};
