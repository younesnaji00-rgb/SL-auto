import type { PageTutorial } from '../types';

/**
 * Assignation de chiffrage — detail page. Steps anchored on role-gated
 * elements ("Envoyer par mail" is gestionnaire-only, "Réforme" needs write
 * access, the Devis & Factures section needs at least one family) are
 * auto-skipped when absent. The document-type list is hands-on (safe filter).
 */
export const chiffrageDetailTutorial: PageTutorial = {
  key: 'chiffrage-detail',
  match: (p) => p.startsWith('/assignations-chiffrage/'),
  steps: [
    {
      title: 'Le chiffrage',
      body: 'Vérifiez les devis du garage et préparez les accords.',
    },
    {
      anchor: 'chd-header',
      title: 'En-tête',
      body: 'Le dossier, le chiffreur assigné et le statut en couleur.',
      side: 'bottom',
    },
    {
      anchor: 'chd-observations',
      title: 'Observations',
      body: 'Échangez des remarques avec le gestionnaire ; tout est horodaté.',
      side: 'bottom',
    },
    {
      anchor: 'chd-familles',
      title: 'Devis par garage',
      body: "Une ligne par garage ; « Éditer » ouvre l'éditeur du devis.",
      side: 'top',
    },
    {
      anchor: 'chd-doc-types',
      title: 'Types de documents',
      body: 'Cliquez sur un type pour filtrer les pièces à droite.',
      side: 'right',
      interact: 'click',
    },
    {
      anchor: 'chd-doc-grid',
      title: 'Les pièces jointes',
      body: 'Survolez une vignette pour prévisualiser ou télécharger.',
      side: 'left',
    },
    {
      anchor: 'chd-mail',
      title: 'Envoyer par mail',
      body: "Envoie l'accord choisi en pièce jointe ; le statut avance tout seul.",
      side: 'bottom',
    },
    {
      anchor: 'chd-reforme',
      title: 'Réforme',
      body: 'Véhicule irréparable ? Saisissez ici la décision de réforme.',
      side: 'bottom',
    },
    {
      anchor: 'slot-editer',
      title: "Ouvrons l'éditeur",
      body: 'Cliquez sur « Éditer » : le devis lu par l’IA devient un tableau intelligent.',
      side: 'top',
      interact: 'click',
      chain: 'devis-editor',
    },
  ],
  // Chains into the devis editor — the journey continues there.
  noClosing: true,
};
