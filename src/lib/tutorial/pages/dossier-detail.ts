import type { PageTutorial } from '../types';

/**
 * Dossier detail — the workflow centerpiece. The page is a vertical timeline
 * (sticky step bar + one section per stage), not tabs: each "click" step
 * presses the corresponding bar button (`dosd-step-<id>`, anchors in
 * timeline-bar.tsx) so the page scrolls to the stage, then highlights the
 * section header (`dosd-sec-<id>`, anchors in timeline.tsx). Section ids
 * follow DOSSIER_TIMELINE_STEPS display order: 1, 4, 6, 9, 11, 10, 7, 8.
 * The final step clicks back to step 1 so the page is left at the top.
 */
export const dossierDetailTutorial: PageTutorial = {
  key: 'dossier-detail',
  match: (p) => p.startsWith('/dossiers/') && p !== '/dossiers',
  steps: [
    {
      title: "Le dossier d'expertise",
      body:
        "Un dossier suit tout le cycle d'un sinistre : création de la mission, import des documents, planification des visites terrain, chiffrage, accord(s) avec le garage, rapport et note d'honoraire. Cette page regroupe toutes ces étapes sur une seule frise verticale.",
    },
    {
      anchor: 'dosd-header',
      title: 'En-tête du dossier',
      body:
        "La référence expert, l'assuré, la compagnie et l'immatriculation restent toujours visibles ici, quelle que soit l'étape sur laquelle vous travaillez.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-statut',
      title: 'Statut du dossier',
      body:
        "Ce badge avance automatiquement à mesure que le dossier progresse dans le flux : création → planification → chiffrage → accord → rapport. C'est le même statut coloré que dans la liste des dossiers.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-email',
      title: 'Envoyer un email',
      body:
        "Ouvre une fenêtre pour envoyer un email lié à ce dossier sans quitter la page.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-historique',
      title: 'Historique du dossier',
      body:
        "Chaque action (création, import, changement de statut, envoi au chiffrage…) est tracée. Ce panneau montre qui a fait quoi, et quand.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-rappel-banner',
      title: "Traitement d'un rappel",
      body:
        "Quand vous ouvrez un dossier depuis « Mes rappels », vos modifications restent locales : elles ne sont publiées qu'au clic sur « Sauvegarder ». Ce bandeau affiche le nombre de modifications en attente.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-timeline',
      title: 'La frise des étapes',
      body:
        "Tout le flux de travail du dossier, dans l'ordre. Cliquez sur une étape pour y accéder ; l'étape active se met en évidence pendant le défilement. Passons chaque étape en revue.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-1',
      click: 'dosd-step-1',
      delay: 600,
      title: 'Création de mission',
      body:
        "Le point de départ : déposez le document de mission et l'IA le lit pour pré-remplir tout le dossier (assuré, véhicule, compagnie, dates…). Vérifiez ensuite le formulaire d'informations, importez les devis du garage, puis cliquez « Envoyer vers chiffrage ».",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-4',
      click: 'dosd-step-4',
      delay: 600,
      title: 'Planification avant',
      body:
        "Planifiez la visite terrain avant réparation : rendez-vous, agent de terrain, photos « avant » du véhicule et observations de cette phase.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-6',
      click: 'dosd-step-6',
      delay: 600,
      title: 'Accord',
      body:
        "Après le chiffrage, déposez ici les documents du 1er accord conclu avec le garage (et les pièces de réforme le cas échéant), avec les observations liées à cet accord.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-9',
      click: 'dosd-step-9',
      delay: 600,
      title: 'Planification en cours',
      body:
        "Suivez la réparation pendant les travaux : visite intermédiaire, photos « en cours » et observations de cette phase.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-11',
      click: 'dosd-step-11',
      delay: 600,
      title: '2ème accord et +',
      body:
        "Si un nouveau devis arrive, un accord révisé est nécessaire : déposez ici les pièces du 2ème accord et des suivants. Cette étape exige que le 1er accord soit déjà complété.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-10',
      click: 'dosd-step-10',
      delay: 600,
      title: 'Planification après',
      body:
        "La visite finale après réparation : photos « après » pour constater les travaux réalisés, et dernières observations.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-7',
      click: 'dosd-step-7',
      delay: 600,
      title: 'Rapport',
      body:
        "Générez le rapport d'expertise en PDF à partir des données du dossier — l'aboutissement du travail technique.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-sec-8',
      click: 'dosd-step-8',
      delay: 600,
      title: "Note d'honoraire",
      body:
        "La facturation clôt le dossier : déposez ici la note d'honoraire du cabinet.",
      side: 'bottom',
    },
    {
      anchor: 'dosd-header',
      click: 'dosd-step-1',
      delay: 600,
      title: 'Visite terminée',
      body:
        "Vous connaissez maintenant le parcours complet d'un dossier. Suivez la frise de haut en bas : c'est l'ordre naturel du travail, et chaque action reste tracée dans l'historique.",
      side: 'bottom',
    },
  ],
};
