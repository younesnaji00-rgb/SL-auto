import type { PageTutorial } from '../types';

/**
 * Assignation de chiffrage — detail page. Steps anchored on role-gated
 * elements ("Envoyer par mail" is gestionnaire-only, "Réforme" needs write
 * access, the Devis & Factures section needs at least one family) are
 * auto-skipped when absent.
 */
export const chiffrageDetailTutorial: PageTutorial = {
  key: 'chiffrage-detail',
  match: (p) => p.startsWith('/assignations-chiffrage/'),
  steps: [
    {
      title: "Détail d'une assignation",
      body:
        "C'est l'espace de travail du chiffrage d'un dossier : consultez les devis du garage, ouvrez l'éditeur structuré pour établir les accords, puis suivez l'envoi par mail et la décision de réforme.",
    },
    {
      anchor: 'chd-header',
      title: 'En-tête du dossier',
      body:
        'Référence du dossier, chiffreur assigné et statut actuel en couleur. Les actions principales (envoi par mail, réforme) sont à droite.',
      side: 'bottom',
    },
    {
      anchor: 'chd-observations',
      title: 'Observations',
      body:
        "Échangez des remarques avec le gestionnaire sur ce dossier. Chaque observation est horodatée et conservée dans l'historique.",
      side: 'bottom',
    },
    {
      anchor: 'chd-familles',
      title: 'Devis et factures par garage',
      body:
        "Une ligne par source : « Devis Garage 2 » correspond à un autre garage. Chaque ligne contient le document d'origine et ses créneaux d'accord — la proposition d'accord précède l'accord, et un 2ème ou 3ème accord ré-édite la même source depuis zéro. Cliquez sur « Éditer » pour ouvrir l'éditeur structuré du créneau, ou sur une vignette pour prévisualiser.",
      side: 'top',
    },
    {
      anchor: 'chd-doc-types',
      title: 'Filtrer par type de document',
      body:
        'Tous les types de pièces jointes avec leur nombre de documents. Les devis et factures sont regroupés par garage, avec leurs sous-sections Accords et Propositions. Cliquez sur un type pour filtrer la grille de droite.',
      side: 'right',
    },
    {
      anchor: 'chd-doc-grid',
      title: 'Les pièces jointes',
      body:
        'Toutes les pièces du dossier : devis et factures du garage, contre-devis, accords, photos… Survolez une vignette pour la prévisualiser ou la télécharger.',
      side: 'left',
    },
    {
      anchor: 'chd-doc-import',
      title: 'Importer des documents',
      body:
        "Sur cette page, l'import est désactivé pour le chiffreur : les nouveaux documents (contre-devis reçu de la compagnie, etc.) sont importés par le gestionnaire depuis la fiche dossier.",
      side: 'left',
    },
    {
      anchor: 'chd-mail',
      title: "Envoyer l'accord par mail",
      body:
        "Réservé au gestionnaire : choisissez un accord ou une proposition d'accord et envoyez-le en pièce jointe par email. Le dossier passe automatiquement au statut « Accord envoyé ».",
      side: 'bottom',
    },
    {
      anchor: 'chd-reforme',
      title: 'Décider une réforme',
      body:
        'Quand le véhicule est irréparable, ouvrez ce dialogue pour saisir la réforme : type (Technique ou Économique), valeurs et indemnisation. Un PDF récapitulatif est généré et le statut du dossier est mis à jour.',
      side: 'bottom',
    },
  ],
};
