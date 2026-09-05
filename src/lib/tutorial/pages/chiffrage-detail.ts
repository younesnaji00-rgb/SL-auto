import type { PageTutorial } from '../types';

/**
 * Assignation de chiffrage — detail page. Steps anchored on role-gated
 * elements ("Envoyer par mail" is gestionnaire-only, "Réforme" needs write
 * access, the accord pipeline needs at least one devis family) are
 * auto-skipped when absent, as is the queue spine (it only exists when the
 * user arrived from the queue). The document-type list is hands-on (safe
 * filter).
 */
export const chiffrageDetailTutorial: PageTutorial = {
  key: 'chiffrage-detail',
  match: (p) => p.startsWith('/assignations-chiffrage/'),
  steps: [
    {
      title: 'Le chiffrage',
      body:
        "Vérifiez les devis du garage et préparez les accords.\nToute la page est faite pour être traitée sans souris : lire, corriger, envoyer, passer au suivant.",
    },
    {
      anchor: 'chd-header',
      title: 'En-tête',
      body:
        "Le dossier, le correcteur assigné, la plaque, le statut — et « Correction en cours » ou « terminée » d'un coup d'œil.\n« ‹ Assignations au chiffrage » ramène à la file.",
      side: 'bottom',
      cursorAt: 'left',
    },
    {
      anchor: 'chd-queue-spine',
      title: 'Vous êtes le n° … sur …',
      body:
        "Quand vous arrivez depuis la file, ces flèches enchaînent les chiffrages dans l'ordre de la file — sans repasser par la liste entre chacun.",
      side: 'bottom',
    },
    {
      anchor: 'chd-mode-traitement',
      title: 'Le mode traitement',
      body:
        "Ce bandeau apparaît quand vous traitez la file d'affilée : il annonce la fin du chiffrage courant et propose de passer au suivant.\nIl propose — il n'impose pas : « Rester » vous laisse sur place.",
      side: 'bottom',
      dynamic: true,
    },
    {
      anchor: 'chd-familles',
      title: 'La chaîne des accords',
      body:
        "Une bande par garage, et de gauche à droite la chaîne complète : le devis d'origine, la proposition, l'accord, puis les révisions suivantes.\nUne case vide est une étape qui reste à faire — la ligne se lit comme une phrase.\nS'il y a plus de colonnes que d'écran, les flèches « ‹ › » au-dessus font défiler toute la grille d'un bloc.",
      side: 'top',
      cursorAt: 'left',
    },
    {
      anchor: 'chd-doc-types',
      title: 'Types de documents',
      body: 'Cliquez sur un type pour ne garder que ces pièces à droite.',
      side: 'right',
      interact: 'click',
    },
    {
      anchor: 'chd-doc-grid',
      title: 'Les pièces jointes',
      body:
        "Les vignettes sont les documents eux-mêmes. Cliquez pour agrandir sans quitter la page — l'aperçu s'ouvre par-dessus, jamais dans un nouvel onglet.",
      side: 'left',
    },
    {
      anchor: 'chd-doc-import',
      title: 'Ajouter une pièce',
      body: "Un document reçu en dehors de l'app se dépose ici et rejoint le dossier.",
      side: 'left',
    },
    {
      anchor: 'chd-observations',
      title: 'Observations',
      body: 'Échangez des remarques avec le gestionnaire ; tout est horodaté.',
      side: 'bottom',
    },
    {
      anchor: 'chd-reforme',
      title: 'Réforme',
      body: 'Véhicule irréparable ? Saisissez ici la décision de réforme.',
      side: 'bottom',
    },
    {
      anchor: 'chd-mail',
      title: 'Envoyer par mail',
      body: "Envoie l'accord choisi en pièce jointe ; le statut avance tout seul.",
      side: 'bottom',
    },
    {
      anchor: 'slot-editer',
      title: "Ouvrons l'éditeur",
      body:
        "Dans la chaîne, une case en attente porte un bouton « Éditer ».\nCliquez dessus : le devis lu par l'IA devient un tableau intelligent.",
      side: 'top',
      interact: 'click',
      chain: 'devis-editor',
    },
  ],
  // Chains into the devis editor — the journey continues there.
  noClosing: true,
};
