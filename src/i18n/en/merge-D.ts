/**
 * English strings introduced by the redesigned dossier-timeline components
 * (batch D of the nav-upgrade × main merge):
 *   step-1-import · step-2-information · step-4-pieces · timeline ·
 *   timeline-bar · typed-documents-grid · family-row · slot-card
 *
 * Keys are the FRENCH source strings exactly as they appear in the code.
 * Only strings the pre-merge dictionary never carried are listed here.
 */

export const MERGE_D_EN: Record<string, string> = {
  // ── family-row.tsx ───────────────────────────────────────────────────
  'Développer': 'Expand',
  'Garage numéro': 'Repair shop number',
  'reçu': 'received',
  'reçus': 'received',

  // ── slot-card.tsx ────────────────────────────────────────────────────
  'Échanger': 'Swap',
  'Déplacer ici': 'Move here',
  'pages': 'pages',
  'Pages': 'Pages',
  'Déposer un document': 'Upload a document',
  'Glisser vers un autre emplacement pour reclasser':
    'Drag to another slot to reclassify',
  'Ajouter un devis (nouveau garage)': 'Add an estimate (new repair shop)',
  'Ajouter une facture (nouveau garage)': 'Add an invoice (new repair shop)',
  "Généré depuis l'étape Rapport": 'Generated from the Report step',

  // ── timeline.tsx / timeline-bar.tsx ──────────────────────────────────
  'Étape': 'Step',
  'Étapes du dossier': 'File steps',

  // ── step-4-pieces.tsx ────────────────────────────────────────────────
  'Ajouter des pièces': 'Add documents',

  // ── step-2-information.tsx ───────────────────────────────────────────
  'champ requis manquant': 'required field missing',
  'champs requis manquants': 'required fields missing',
  'Document source': 'Source document',
  'Ctrl + molette pour zoomer progressivement':
    'Ctrl + scroll wheel to zoom gradually',
  'Ajuster à la largeur': 'Fit to width',
  'ajuster à la largeur': 'fit to width',
  'Ouvrir en plein écran': 'Open full screen',
  'Aucun document source dans ce dossier.':
    'No source document in this file.',

  // ── step-1-import.tsx ────────────────────────────────────────────────
  'Pré-remplir depuis un document': 'Pre-fill from a document',
  'Déposez la lettre de mission pour pré-remplir les informations.':
    'Drop the assignment letter to pre-fill the information.',
  'Chargement du document source': 'Loading the source document',
  'Pré-rempli depuis': 'Pre-filled from',
  'Retirer': 'Remove',
  'Aucun document importé': 'No document imported',
  "Déposez votre lettre de mission, constat ou document d'assurance pour lancer le pré-remplissage par l'IA.":
    'Drop your assignment letter, accident report or insurance document to start the AI pre-fill.',
  'Document source introuvable': 'Source document not found',
  'Document source introuvable.': 'Source document not found.',
  "Il a peut-être été supprimé depuis l'étape Pièces jointes.":
    'It may have been deleted from the Attachments step.',
};
