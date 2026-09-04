/**
 * Batch G — dialogs and shared feature components.
 *
 * French strings introduced by the UI redesign (⌘K command palette, the
 * document lightbox with paging + zoom controls, the dossier edit modal,
 * the observations tab and the camera capture sheet) that main's dictionary
 * had never seen. Keys are the exact French source strings.
 */
export const MERGE_G_EN: Record<string, string> = {
  // ⌘K command palette (global-search.tsx)
  'Rechercher et naviguer': 'Search and navigate',
  'Réf., plaque, assuré, page ou action…': 'Ref., plate, insured, page or action…',
  'Récents': 'Recent',
  'ouvert': 'open',
  'Aller à': 'Go to',
  'Assistant': 'Assistant',
  'Demander à l’assistant :': 'Ask the assistant:',
  'Réflexion…': 'Thinking…',
  'Suggestion indisponible pour le moment.': 'Suggestion unavailable right now.',
  'Aucune suggestion.': 'No suggestion.',
  'Recherche…': 'Searching…',
  'Aucun dossier ne correspond à': 'No file matches',
  'Sans réf.': 'No ref.',
  'Voir mes rappels': 'View my reminders',
  'Passer en mode clair': 'Switch to light mode',
  'Passer en mode sombre': 'Switch to dark mode',
  'Raccourcis clavier': 'Keyboard shortcuts',
  'naviguer': 'navigate',
  'ouvrir': 'open',
  'fermer': 'close',

  // Document preview lightbox (document-preview-lightbox.tsx)
  'Zoom': 'Zoom',
  'Zoom avant': 'Zoom in',
  'Zoom arrière': 'Zoom out',
  'réinitialiser': 'reset',
  'Molette pour zoomer progressivement, double-clic pour agrandir':
    'Scroll to zoom gradually, double-click to enlarge',
  'Pages du document': 'Document pages',

  // Camera capture (camera-capture.tsx)
  'Retirer la photo': 'Remove photo',

  // Dossier edit modal (modals/dossier-edit-modal.tsx)
  'Modifier le dossier': 'Edit file',
  'Téléphone assuré': 'Insured phone',
  'WhatsApp': 'WhatsApp',
  'Autre téléphone': 'Other phone',
  'Date de requête': 'Request date',
  'Date du sinistre': 'Loss date',
  'Intermédiaire et garage': 'Intermediary and repair shop',
  'E-mail intermédiaire': 'Intermediary email',
  'Réf. compagnie': 'Company ref.',
  'N° de police': 'Policy no.',
  'Nom du garage': 'Repair shop name',

  // Observations tab (observations-tab.tsx)
  'Aucune observation pour le moment': 'No observations yet',
  'Les observations ajoutées sur ce dossier apparaîtront ici.':
    'Observations added to this file will appear here.',

  // Send-email dialog (dossiers/envoyer-email-dialog.tsx)
  'Envoyé': 'Sent',
};
