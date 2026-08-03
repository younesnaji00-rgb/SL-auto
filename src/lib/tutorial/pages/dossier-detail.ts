import type { PageTutorial } from '../types';

/**
 * Dossier detail — the workflow centerpiece. The page is a vertical timeline
 * (sticky step bar + one section per stage). Three stages are hands-on: the
 * user clicks the timeline-bar button (`dosd-step-<id>`, interact 'click');
 * the section step that follows keeps a `click` prep on the SAME button —
 * re-clicking is idempotent (it only scrolls) and gives the scroll time to
 * settle before the highlight is measured. Remaining stages use engine
 * click-prep. The final step clicks back to step 1 so the page ends at the
 * top. Section ids follow DOSSIER_TIMELINE_STEPS display order:
 * 1, 4, 6, 9, 11, 10, 7, 8.
 */
export const dossierDetailTutorial: PageTutorial = {
  key: 'dossier-detail',
  match: (p) => p.startsWith('/dossiers/') && p !== '/dossiers',
  steps: [
    {
      title: "Le dossier d'expertise",
      body:
        "Toute la vie du sinistre sur une seule page, étape par étape.\nChaque information n'est saisie qu'une fois : elle se retrouve dans les devis, le rapport et la facture.",
    },
    {
      anchor: 'dosd-header',
      title: 'En-tête',
      body: "L'assuré, la compagnie et la référence restent toujours visibles ici.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-statut',
      title: 'Statut',
      body: 'Ce badge avance tout seul avec le dossier.',
      side: 'bottom',
    },
    {
      anchor: 'dosd-email',
      title: 'Email',
      body: 'Envoyez un email lié au dossier sans quitter la page.',
      side: 'bottom',
    },
    {
      anchor: 'dosd-historique',
      title: 'Historique',
      body: 'Qui a fait quoi, et quand.',
      side: 'bottom',
    },
    {
      anchor: 'dosd-rappel-banner',
      title: 'Rappel en cours',
      body: "Vos changements restent en brouillon jusqu'au clic sur « Sauvegarder ».",
      side: 'bottom',
    },
    {
      anchor: 'dosd-timeline',
      title: 'La frise des étapes',
      body: 'Chaque bouton mène à une étape du dossier.',
      side: 'bottom',
    },
    {
      anchor: 'dosd-step-1',
      title: 'Étape 1 : la mission',
      body: 'Cliquez sur la première étape de la frise.',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-sec-1',
      click: 'dosd-step-1',
      delay: 600,
      title: 'Création de mission',
      body: "Déposez le document de mission : l'IA le lit et remplit le dossier.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-step-4',
      title: 'Étape suivante',
      body: 'Cliquez sur « Planification avant ».',
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-sec-4',
      click: 'dosd-step-4',
      delay: 600,
      title: 'Planification avant',
      body: 'Le rendez-vous terrain et les photos avant réparation.',
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-6',
      click: 'dosd-step-6',
      delay: 600,
      title: 'Accord',
      body: "Les documents de l'accord conclu avec le garage.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-9',
      click: 'dosd-step-9',
      delay: 600,
      title: 'Pendant les travaux',
      body: 'La visite et les photos en cours de réparation.',
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-11',
      click: 'dosd-step-11',
      delay: 600,
      title: '2ème accord et +',
      body: "Un nouveau devis ? Déposez ici l'accord révisé.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-10',
      click: 'dosd-step-10',
      delay: 600,
      title: 'Planification après',
      body: 'Les photos après réparation, pour constater les travaux.',
      side: 'bottom',
    },
    {
      anchor: 'dosd-step-7',
      title: 'Vers le rapport',
      body: "Cliquez sur l'étape « Rapport ».",
      side: 'bottom',
      interact: 'click',
    },
    {
      anchor: 'dosd-sec-7',
      click: 'dosd-step-7',
      delay: 600,
      title: 'Rapport',
      body: "Le rapport d'expertise se génère en PDF, sans ressaisie.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-8',
      click: 'dosd-step-8',
      delay: 600,
      title: "Note d'honoraire",
      body: 'La facture du cabinet clôt le dossier.',
      side: 'bottom',
    },
    {
      anchor: 'dosd-header',
      click: 'dosd-step-1',
      delay: 600,
      title: 'Visite terminée',
      body: "Suivez la frise de haut en bas : c'est l'ordre naturel du travail.",
      side: 'bottom',
    },
  ],
};
