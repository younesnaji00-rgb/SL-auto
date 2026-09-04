/**
 * Batch C — dossier detail tabs and modals.
 *
 * French strings introduced by the UI redesign that main's dictionary had
 * never seen. Key = the French source string exactly as it appears in code.
 */
export const MERGE_C_EN: Record<string, string> = {
  // ── Planification tab ──
  'Visites planifiées': 'Scheduled visits',
  'Aucune visite planifiée': 'No scheduled visit',
  'Programmer une visite': 'Schedule a visit',
  // Built as: `${t('Programmez la visite')} « before » ${t('pour assigner…')}`
  'Programmez la visite': 'Schedule the',
  'pour assigner un agent de terrain.': 'visit to assign a field agent.',
  'Visite': 'Visit',
  'modifiée par': 'modified by',

  // ── Historique tab ──
  'Aucun changement de statut': 'No status change',

  // ── Information tab ──
  'Aucune information': 'No information',

  // ── Planification history modal ──
  'Aucun historique': 'No history',
  "Aucune version antérieure n'a été enregistrée pour ce dossier.":
    'No earlier version has been recorded for this file.',

  // ── Chiffrage modal ──
  'Envoyé': 'Sent',

  // ── Photos tab ──
  'Déposez ou sélectionnez des photos pour cette section.':
    'Drop or select photos for this section.',
  // Suffix of the "12/30 photos" counter shown inside a step facet.
  'photos': 'photos',

  // ── Rapport tab (diagram browser tabs) ──
  'Vue dessus': 'Top view',
  'Vue dessous': 'Underside view',
  'Vue du diagramme': 'Diagram view',

  // ── Documents tab ──
  'Rechercher un fichier ou un type…': 'Search a file or a type…',
  'Rechercher un fichier ou un type de document': 'Search a file or a document type',
  'Sélection de documents': 'Document selection',
  'document sélectionné': 'document selected',
  'documents sélectionnés': 'documents selected',
  'Fichier :': 'File:',
  'Gérer les types de documents': 'Manage document types',
  'Toutes les pièces requises sont déposées.': 'All required documents are uploaded.',
  'Pièces requises': 'Required documents',
  "Ajouter un document d'un autre type": 'Add a document of another type',
  'Autre type…': 'Other type…',
  'Choisir la catégorie': 'Choose the category',
  'Aucun autre document ne correspond à': 'No other document matches',
  'pièce requise manquante': 'required document missing',
  'pièces requises manquantes': 'required documents missing',
  'Devient le nom de la colonne rouge (ex : « 1er accord », « Expert arbitre »).':
    'Becomes the name of the red column (e.g. "1st agreement", "Umpire appraiser").',
  // Toast built as: `${t('Documents échangés :')} A ↔ B`
  'Documents échangés :': 'Documents swapped:',
  // Toast built as: `${t('Document déplacé vers')} « B »`
  'Document déplacé vers': 'Document moved to',
  'Erreur lors du reclassement': 'Reclassification failed',
  'Impossible de déplacer le document.': 'Could not move the document.',
  // Socket hints / empty captions — translated downstream by slot-card.
  'obligatoire': 'required',
  'au moins un des deux': 'at least one of the two',
  'Déposer': 'Drop',
};
