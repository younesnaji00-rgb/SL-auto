/**
 * Batch H — app chrome, UI primitives and « Mes rappels ».
 *
 * Strings the UI redesign introduced (sidebar chrome, breadcrumb, the master-
 * detail rappels queue and the session-replay lightbox) that the pre-merge
 * dictionaries never saw. Keys are the FRENCH source strings exactly as they
 * appear in code.
 */
export const MERGE_H_EN: Record<string, string> = {
  // ── Sidebar / breadcrumb chrome ─────────────────────────────────────
  'Opérations': 'Operations',
  'Administration': 'Administration',
  'Aide': 'Help',
  'Terrain': 'Field',
  'Profil': 'Profile',
  'Agrandir': 'Expand',
  'Agrandir la barre latérale': 'Expand the sidebar',
  'Réduire la barre latérale': 'Collapse the sidebar',
  "Fil d'Ariane": 'Breadcrumb',

  // ── Notification bell ───────────────────────────────────────────────
  'Aucun rappel': 'No reminders',
  'Aucun rappel en attente': 'No pending reminders',
  'Les rappels qui vous sont envoyés apparaîtront ici.': 'Reminders sent to you will appear here.',
  'Tout marquer comme lu': 'Mark all as read',
  'Voir tous les rappels': 'View all reminders',
  'De': 'From',
  'non lu': 'unread',
  'non lus': 'unread',

  // ── Shared primitives ───────────────────────────────────────────────
  'Sélectionner…': 'Select…',
  'Mois précédent': 'Previous month',
  'Mois suivant': 'Next month',

  // ── Mes rappels — queue ─────────────────────────────────────────────
  'État des rappels': 'Reminder state',
  'Traités': 'Resolved',
  'Aucun rappel reçu': 'No reminders received',
  'Aucun rappel traité': 'No resolved reminders',
  'Aucun rappel envoyé': 'No reminders sent',
  'Les rappels envoyés depuis un dossier apparaîtront ici.': 'Reminders sent from a file will appear here.',
  'Les rappels marqués comme traités apparaîtront ici.': 'Reminders marked as resolved will appear here.',
  'Les rappels que vous envoyez depuis un dossier apparaîtront ici.': 'Reminders you send from a file will appear here.',
  'Tout est traité': 'All resolved',
  'Aucun rappel en attente — les nouveaux apparaîtront ici.': 'No pending reminders — new ones will appear here.',
  'Ouvrir les dossiers': 'Open Files',
  'Détail des rappels': 'Reminder details',
  'Détail du rappel': 'Reminder detail',
  'Observation, travail effectué et actions du rappel sélectionné.':
    'Note, work performed and actions for the selected reminder.',
  'Réduire le détail': 'Collapse details',
  'rappel': 'reminder',
  'rappels': 'reminders',
  'Rappel suivant': 'Next reminder',
  'Rappel précédent': 'Previous reminder',
  'Fermer le détail': 'Close the detail pane',
  'Rappel remis en attente': 'Reminder set back to pending',
  'Impossible d’annuler': 'Could not undo',

  // ── Session replay lightbox ─────────────────────────────────────────
  "Avant le rappel — document d'origine": 'Before the reminder — original record',
  'Après le rappel — document modifié': 'After the reminder — updated record',
  "L'état du dossier tel qu'il était à l'envoi du rappel : une copie figée, non modifiable.":
    'The file as it stood when the reminder was sent: a frozen, read-only copy.',
  "Le dossier tel qu'il est aujourd'hui : ce que le gestionnaire a changé pendant le traitement est surligné.":
    'The file as it stands today: everything the manager changed while handling it is highlighted.',
  'Légende des surlignages': 'Highlight legend',
  'Masquer': 'Hide',
  "Aucun instantané de départ n'a été enregistré pour cette session : les valeurs d'origine ne sont pas disponibles.":
    'No starting snapshot was saved for this session, so the original values are unavailable.',
  "Certaines listes (documents, photos, planifications…) n'ont pas été enregistrées dans l'instantané de départ et apparaissent vides.":
    'Some lists (documents, photos, appointments…) were not saved in the starting snapshot and appear empty.',
};
