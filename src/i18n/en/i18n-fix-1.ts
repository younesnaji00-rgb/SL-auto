/**
 * i18n gap-fill batch 1 — peek panels and dossier record surfaces.
 *
 * Files covered: components/dossiers/dossier-peek-panel.tsx, record-bar.tsx,
 * dossier-context-panel.tsx, components/chiffrage/queue-peek-sheet.tsx,
 * accord-pipeline.tsx, lib/dossier-todos.ts and the display labels exported by
 * lib/dossier-steps.ts (which its consumers already render through `t()`).
 *
 * Only keys ABSENT from every other file in src/i18n/en live here.
 */
export const I18N_FIX_1_EN: Record<string, string> = {
  // ── Dossier peek panel ────────────────────────────────────────────────
  'Aperçu du dossier': 'File preview',
  "Fermer l'aperçu (Échap)": 'Close preview (Esc)',
  // « Créé il y a un mois » / "Created a month ago" — the relative part is
  // formatted by date-fns with dateFnsLocale().
  'Créé': 'Created',
  'Dernière observation': 'Latest observation',

  // ── Record bar ────────────────────────────────────────────────────────
  'Retour aux dossiers': 'Back to files',
  'Dossier précédent': 'Previous file',
  'de la liste': 'in the list',
  'Annuler les modifications de cette session': "Discard this session's changes",
  "Plus d'actions": 'More actions',
  'Envoyer au chiffrage': 'Send to estimating',
  'Supprimer le dossier': 'Delete file',

  // ── Workflow steps (lib/dossier-steps.ts — rendered via t() elsewhere) ─
  // Pairs with the existing 'Création de mission': 'Mission creation'.
  'Mission': 'Mission',
  'Visite avant': 'Visit — before',
  'Visite en cours': 'Visit — in progress',
  'Visite après': 'Visit — after',
  '2ᵉ accord': '2nd agreement',
  // '2ème accord et +' already lives in components.ts.
  'Bloqué': 'Blocked',
  'Nécessite le 1er accord': 'Requires the 1st agreement',
  'Planifier la visite avant': 'Schedule the visit — before',
  'Planifier la visite en cours': 'Schedule the visit — in progress',
  'Planifier la visite après': 'Schedule the visit — after',
  "Déposer la note d'honoraire": 'Submit the fee note',

  // ── Dossier context panel ─────────────────────────────────────────────
  'Contexte du dossier': 'File context',
  'À faire': 'To do',
  'Rien à faire — dossier à jour.': 'Nothing to do — file up to date.',
  // 'Aucune observation.' already lives in dossiers.ts.
  'Aucun rappel actif pour vous sur ce dossier.': 'No active reminder for you on this file.',
  'Aucune entrée.': 'No entries.',
  'Tout voir': 'View all',

  // ── « À faire » rows (lib/dossier-todos.ts) ───────────────────────────
  'pièce manquante': 'missing document',
  'pièces manquantes': 'missing documents',
  'Visite avant à planifier': 'Before visit to schedule',
  'Visite en cours à planifier': 'In-progress visit to schedule',
  'Visite après à planifier': 'After visit to schedule',
  'Photos avant attendues': 'Before photos expected',
  'Photos en cours attendues': 'In-progress photos expected',
  'Photos après attendues': 'After photos expected',
  'Visite planifiée le': 'Visit scheduled on',
  'Visite planifiée': 'Visit scheduled',
  'Planifier': 'Schedule',
  '1er accord attendu': '1st agreement expected',
  '2ème accord attendu': '2nd agreement expected',
  'À envoyer au chiffrage': 'To send to estimating',
  'Dès que les pièces requises sont reçues': 'As soon as the required documents are received',
  'Rapport à déposer': 'Report to submit',
  'Rapport à générer': 'Report to generate',
  "Note d'honoraire à déposer": 'Fee note to submit',
  'Honoraires': 'Fees',

  // ── Chiffrage queue peek sheet ────────────────────────────────────────
  'Assuré non renseigné': 'Insured not specified',
  "Date d'assignation": 'Assignment date',
  'Fichiers': 'Files',
  'Voir les observations': 'View observations',
  'Ouvrir le chiffrage': 'Open the estimate',

  // ── Accord pipeline ───────────────────────────────────────────────────
  // Column labels come from the French ordinal generators in lib/devis-schema
  // (toOrdinalFr / toOrdinalFeminineFr); the enumerable results are keys.
  'Source': 'Source',
  'Proposition': 'Proposal',
  'Actuel': 'Current',
  'Remplacé': 'Superseded',
  '6ème accord': '6th agreement',
  '7ème accord': '7th agreement',
  'Éditer le 1er accord': 'Edit the 1st agreement',
  'Créer le 2ème accord': 'Create the 2nd agreement',
  'Créer le 3ème accord': 'Create the 3rd agreement',
  'Créer le 4ème accord': 'Create the 4th agreement',
  'Créer le 5ème accord': 'Create the 5th agreement',
  'Créer le 6ème accord': 'Create the 6th agreement',
  'Créer le 7ème accord': 'Create the 7th agreement',
};

export default I18N_FIX_1_EN;
