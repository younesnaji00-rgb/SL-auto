/**
 * Plain-French description of each canonical role, shown under the Rôle field
 * at the point of assignment (element-specs addendum ter E / SaaSUI
 * permissions: "an admin who never read docs picks right the first time").
 * Access lists mirror lib/nav-groups.ts; custom roles created via the options
 * manager simply show no caption.
 */
export const ROLE_DESCRIPTIONS: Record<string, string> = {
  'Admin': 'Accès complet : dossiers, assignations, utilisateurs et paramètres',
  "Responsable d'équipe": 'Tableau de bord, suivi, dossiers, rappels, chiffrage et terrain',
  'Gestionnaire': 'Gère les dossiers de sinistres et reçoit des rappels',
  'Chiffreur': 'Traite les dossiers assignés au chiffrage',
  'Agent de Terrain': 'Réalise les missions terrain qui lui sont assignées',
  'Directeur': 'Consultation des dossiers (lecture seule) et jours fériés',
  'Directeur des opérations': 'Consultation des dossiers (lecture seule) et jours fériés',
  'Directeur technique': 'Consultation des dossiers (lecture seule) et jours fériés',
};
