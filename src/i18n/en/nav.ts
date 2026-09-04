// French source string -> English translation. Filled by the i18n sweep.
export const NAV_EN: Record<string, string> = {
  // ── Sidebar group labels (also permission ids — keys must stay French) ──
  'ESPACE': 'WORKSPACE',
  'ASSIGNATIONS': 'ASSIGNMENTS',
  'ADMIN': 'ADMIN',
  'DIVERS': 'OTHER',

  // ── Nav item labels (from src/lib/nav-groups.ts) ──
  'Tableau de bord': 'Dashboard',
  "Suivi d'équipe": 'Team Monitoring',
  'Gestion des dossiers': 'File Management',
  'Mes rappels': 'My Reminders',
  'Consultation': 'Lookup',
  'Assignations Chiffrage': 'Estimating Assignments',
  'Assignations Agent de Terrain': 'Field Assignments',
  'Tampons': 'Stamps',
  'Jours fériés': 'Holidays',
  'Signaler un bug': 'Report a bug',

  // ── Breadcrumb route labels ──
  'Éditeur de devis': 'Estimate Editor',
  'Éditeur PDF': 'PDF Editor',
  'Aperçu': 'Preview',

  // ── In-app tab bars ──
  'Dossiers ouverts': 'Open files',
  'Chiffrages ouverts': 'Open estimates',

  // ── Sidebar footer / insurer submenu ──
  'Mode clair': 'Light mode',
  'Mode sombre': 'Dark mode',
  'Déconnexion': 'Sign out',
  'Nom de la compagnie...': 'Insurer name...',
  'Cette action est irréversible. Les dossiers liés à cette compagnie ne seront pas supprimés.':
    'This action cannot be undone. Files linked to this insurer will not be deleted.',

  // ── Notifications dropdown ──
  'Notifications': 'Notifications',
  'non lue(s)': 'unread',
  'Aucune nouvelle activité': 'No new activity',
  'Aucune notification': 'No notifications',
  'Vous serez notifié des changements importants ici.':
    'You will be notified of important changes here.',

  // ── Offline / sync indicator ──
  'Mode hors ligne — Vos modifications seront synchronisées automatiquement une fois reconnecté.':
    'Offline mode — Your changes will sync automatically once you reconnect.',
  'fichier en attente': 'file pending',
  'fichiers en attente': 'files pending',
  'Synchronisation en cours —': 'Syncing —',
  "fichier en cours d'envoi...": 'file uploading...',
  "fichiers en cours d'envoi...": 'files uploading...',
};
