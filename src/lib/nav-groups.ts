import type React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Building2,
  Calculator,
  UserCheck,
  BookOpen,
  Bug,
  Gauge,
  Stamp,
  CalendarDays,
} from 'lucide-react';

export type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: string[] | null;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'ESPACE',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['Admin', "Responsable d'équipe"] },
      { href: '/monitoring', icon: Gauge, label: "Suivi d'équipe", roles: ['Admin', "Responsable d'équipe"] },
      { href: '/dossiers', icon: FolderOpen, label: 'Gestion des dossiers', roles: ['Admin', "Responsable d'équipe", 'Gestionnaire'] },
      { href: '/consultation', icon: BookOpen, label: 'Consultation', roles: ['Admin', "Responsable d'équipe", 'Gestionnaire', 'Chiffreur', 'Directeur', 'Directeur des opérations', 'Directeur technique'] },
      { href: '/compagnies', icon: Building2, label: 'Compagnies', roles: ['Admin', "Responsable d'équipe"] },
    ],
  },
  {
    label: 'ASSIGNATIONS',
    items: [
      { href: '/assignations-chiffrage', icon: Calculator, label: 'Assignations Chiffrage', roles: ['Admin', "Responsable d'équipe", 'Chiffreur'] },
      { href: '/assignations-atg', icon: UserCheck, label: 'Assignations Agent de Terrain', roles: ['Admin', "Responsable d'équipe", 'Agent de Terrain'] },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { href: '/utilisateurs', icon: Users, label: 'Utilisateurs', roles: ['Admin'] },
      { href: '/tampons', icon: Stamp, label: 'Tampons', roles: ['Admin'] },
      { href: '/jours-feries', icon: CalendarDays, label: 'Jours fériés', roles: ['Admin', 'Directeur', 'Directeur des opérations', 'Directeur technique'] },
    ],
  },
  {
    label: 'DIVERS',
    items: [
      { href: '/signaler-bug', icon: Bug, label: 'Signaler un bug', roles: null },
    ],
  },
];

/**
 * Returns true iff this nav item is visible to the given role. A null `roles`
 * means "everyone"; otherwise the role must be in the list.
 */
export function isItemVisibleToRole(item: NavItem, role: string | undefined): boolean {
  if (!item.roles) return true;
  if (!role) return false;
  return item.roles.includes(role);
}

/**
 * First nav route the given role can see, walking groups in declaration order.
 * Used to silently redirect users who land on a page their role can't access.
 * Falls back to `/signaler-bug` (universally visible) if nothing matches.
 */
export function getDefaultRouteForRole(role: string | undefined): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (isItemVisibleToRole(item, role)) return item.href;
    }
  }
  return '/signaler-bug';
}
