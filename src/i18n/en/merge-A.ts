/**
 * English strings introduced by the chiffrage / editor redesign (merge batch A).
 *
 * Covers the chiffrage queue + detail pages, the structured devis editor, the
 * documents filter panel, the annotation editor, the read-only viewer, the
 * reference (comparison) panel, the réforme dialog and the devis preview.
 *
 * Keys are the FRENCH source strings exactly as they appear in the code.
 */

export const MERGE_A_EN: Record<string, string> = {
  // ── Chiffrage queue (assignations-chiffrage) ────────────────────────────
  'File de chiffrage': 'Estimating queue',
  'Ouvrir le chiffrage en surbrillance': 'Open the highlighted estimate',
  'Aperçu du chiffrage en surbrillance': 'Preview the highlighted estimate',
  'Quitter la surbrillance': 'Clear the highlight',
  'Portée de la file': 'Queue scope',
  'Réf., assuré, plaque…': 'Ref., insured, plate…',
  'Rechercher dans la file': 'Search the queue',
  'Aucun chiffrage pour ces filtres': 'No estimates match these filters',
  'Élargissez la période ou réinitialisez les filtres pour revoir la file.':
    'Widen the date range or clear the filters to see the queue again.',
  'Voir les': 'View the',
  'observation': 'observation',
  'observations': 'observations',
  'en retard': 'overdue',
  'Moins de 6 h': 'Under 6 h',
  'h restantes': 'h left',
  'min restantes': 'min left',

  // ── Chiffrage detail (assignations-chiffrage/[id]) ──────────────────────
  'Correction terminée': 'Review complete',
  'Correction en cours': 'Review in progress',
  'Chiffrage précédent': 'Previous estimate',
  'Chiffrage suivant': 'Next estimate',
  'Position': 'Position',
  'Chiffrage terminé': 'Estimate complete',
  'File terminée': 'Queue complete',
  'Retour à la file': 'Back to the queue',
  'Rester': 'Stay',
  'Mode traitement': 'Processing mode',
  'Passer': 'Skip',
  'Quitter le mode': 'Exit mode',
  'Devis et factures': 'Estimates and invoices',
  'Devis & factures': 'Estimates & invoices',

  // ── Chiffrage file board (chiffrage/[id]) ───────────────────────────────
  'Mode « Correction native » : utilisez l\'éditeur pour barrer les erreurs et ajouter vos corrections directement sur le document.':
    'Native correction mode: use the editor to strike through errors and add your corrections directly on the document.',
  "dans l'éditeur": 'in the editor',
  'Image': 'Image',
  'PDF/Doc': 'PDF/Doc',
  'Voir le PDF exporté': 'View the exported PDF',

  // ── Devis editor route guard ────────────────────────────────────────────
  'Paramètres manquants': 'Missing parameters',
  "Le paramètre chiffrageId est requis pour ouvrir l'éditeur.":
    'The chiffrageId parameter is required to open the editor.',

  // ── Structured devis editor ─────────────────────────────────────────────
  'Editer les': 'Edit the',
  'devis': 'estimate',
  'facture': 'invoice',
  'factures': 'invoices',
  'sera ajouté aux pièces jointes du dossier.': 'will be added to the file attachments.',
  '(s) fusionne(s) :': '(s) merged:',
  'dans cette assignation': 'in this assignment',
  'Document enregistré': 'Document saved',
  'Accord enregistré': 'Agreement saved',
  'Retour au dossier': 'Back to the file',
  'Dossier suivant': 'Next file',
  'Fermer la confirmation': 'Dismiss the confirmation',
  'Replier les informations': 'Collapse the details',
  'Déplier les informations': 'Expand the details',
  'Vétusté manquante': 'Missing depreciation',
  'Supprimer la ligne': 'Delete the row',
  'Ajouter une ligne': 'Add a row',
  'Redimensionner la comparaison': 'Resize the comparison',
  'accordé': 'agreed',
  'proposé': 'proposed',

  // ── Documents filter panel ──────────────────────────────────────────────
  'Devis, facture…': 'Estimate, invoice…',
  'Rechercher un type de document': 'Search a document type',
  'Versions': 'Versions',
  'document': 'document',
  'documents': 'documents',
  'Les documents importés apparaîtront ici.': 'Imported documents will appear here.',
  'Choisissez un autre type ou « Tous les documents ».':
    'Pick another type, or "All documents".',

  // ── Annotation editor (/editor) ─────────────────────────────────────────
  'Fichier': 'File',
  'Fichier du dossier : les annotations ne sont pas enregistrées':
    'File-level document: annotations are not saved',
  'Outils': 'Tools',
  'Sélectionner / déplacer': 'Select / move',
  'Encre': 'Ink',
  'Couleur': 'Colour',
  'Trait': 'Stroke',
  'Annotations': 'Annotations',
  'Supprimer la sélection': 'Delete the selection',
  "Supprimer l'annotation": 'Delete the annotation',
  'Zoom — cliquer le % pour réinitialiser': 'Zoom — click the % to reset',
  '+ molette': '+ scroll',
  'Rotation': 'Rotation',
  'Rotation −90°': 'Rotate −90°',

  // ── Read-only viewer (/viewer) ──────────────────────────────────────────
  'annotation': 'annotation',
  'annotations': 'annotations',

  // ── Réforme dialog ──────────────────────────────────────────────────────
  'Type de réforme': 'Write-off type',
  'Différence des valeurs': 'Difference in values',
  'Méthode de calcul': 'Calculation method',
  'Déposer le dossier': 'Submit the file',
};
