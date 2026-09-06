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
  Bell,
} from 'lucide-react';

/**
 * Single source of truth for every navigable destination.
 *
 * `label` is the short name (≤ 2 words) used in the sidebar, the mobile bar and
 * the breadcrumb. `title` is the long page heading (falls back to `label`) used
 * by <PageHeader>, `document.title` and the workspace tab strip. Keep the two in
 * sync here — never hand-write a destination name in a page.
 */
export type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  /** Long page heading. Defaults to `label`. */
  title?: string;
  /** One-line description shown under the page heading. */
  subtitle?: string;
  roles: string[] | null;
  /**
   * Lower = earlier in the mobile bottom bar (Phase 3). Items without a rank
   * never appear in the bottom bar (they stay reachable from Profil / ⌘K).
   */
  mobileRank?: number;
  /** Global `g`-chord that navigates here (see hooks/use-hotkeys.ts). */
  hotkey?: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
  /** `footer` groups render in the sidebar help menu, not in the nav list. */
  placement?: 'nav' | 'footer';
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Opérations',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['Admin', "Responsable d'équipe", 'Gestionnaire', 'Chiffreur', 'Agent de Terrain'], mobileRank: 3, hotkey: 'g t' },
      { href: '/monitoring', icon: Gauge, label: "Suivi d'équipe", subtitle: 'Funnel des étapes — combien de dossiers ont franchi chaque étape.', roles: ['Admin', "Responsable d'équipe"], hotkey: 'g s' },
      { href: '/dossiers', icon: FolderOpen, label: 'Dossiers', subtitle: 'Gérer et suivre tous les dossiers de sinistres', roles: ['Admin', "Responsable d'équipe", 'Gestionnaire'], mobileRank: 1, hotkey: 'g d' },
      { href: '/mes-rappels', icon: Bell, label: 'Rappels', title: 'Mes rappels', roles: ['Admin', "Responsable d'équipe", 'Gestionnaire'], mobileRank: 2, hotkey: 'g r' },
      { href: '/consultation', icon: BookOpen, label: 'Consultation', subtitle: 'Consulter tous les dossiers de sinistres (lecture seule)', roles: ['Admin', "Responsable d'équipe", 'Gestionnaire', 'Directeur', 'Directeur des opérations', 'Directeur technique'], mobileRank: 1 },
      { href: '/compagnies', icon: Building2, label: 'Compagnies', subtitle: 'Sélectionnez une compagnie partenaire pour consulter ses indicateurs et dossiers.', roles: ['Admin', "Responsable d'équipe"] },
    ],
  },
  {
    label: 'Assignations',
    items: [
      { href: '/assignations-chiffrage', icon: Calculator, label: 'Chiffrage', title: 'Assignations au chiffrage', roles: ['Admin', "Responsable d'équipe", 'Chiffreur'], mobileRank: 1, hotkey: 'g c' },
      { href: '/assignations-atg', icon: UserCheck, label: 'Terrain', title: 'Missions terrain', roles: ['Admin', "Responsable d'équipe", 'Agent de Terrain'], mobileRank: 1, hotkey: 'g m' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { href: '/utilisateurs', icon: Users, label: 'Utilisateurs', subtitle: 'Ajouter, gérer et assigner des rôles aux utilisateurs.', roles: ['Admin'], hotkey: 'g u' },
      { href: '/tampons', icon: Stamp, label: 'Tampons', subtitle: 'Gérez les tampons utilisés pour signer les devis et documents générés.', roles: ['Admin'] },
      { href: '/jours-feries', icon: CalendarDays, label: 'Jours fériés', subtitle: 'Dates pendant lesquelles les délais ne sont pas comptés (compteur hors délai).', roles: ['Admin', 'Directeur', 'Directeur des opérations', 'Directeur technique'] },
    ],
  },
  {
    label: 'Aide',
    placement: 'footer',
    items: [
      { href: '/signaler-bug', icon: Bug, label: 'Signaler un bug', roles: null },
    ],
  },
];

/** Routes that are reachable but not sidebar destinations (breadcrumb labels). */
export const EXTRA_ROUTES: Record<string, { label: string; parent?: string }> = {
  '/chiffrage': { label: 'Chiffrage', parent: '/assignations-chiffrage' },
  '/devis-editor': { label: 'Éditeur de devis', parent: '/assignations-chiffrage' },
  '/profil': { label: 'Profil' },
};

/** Flat list of every nav item, in sidebar order. */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

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

/** Nav item whose href is the longest prefix of `pathname` (or null). */
export function findNavItem(pathname: string): NavItem | null {
  let best: NavItem | null = null;
  for (const item of NAV_ITEMS) {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  }
  return best;
}

/** Short label for a top-level route segment ("/dossiers" → "Dossiers"). */
export function labelForRoute(href: string): string | null {
  const item = NAV_ITEMS.find((i) => i.href === href);
  if (item) return item.label;
  const extra = EXTRA_ROUTES[href];
  return extra ? extra.label : null;
}

/** Long page heading for a nav route ("/assignations-chiffrage" → "Assignations au chiffrage"). */
export function titleForRoute(href: string): string | null {
  const item = NAV_ITEMS.find((i) => i.href === href);
  if (item) return item.title ?? item.label;
  return labelForRoute(href);
}

export const APP_NAME = 'SL-auto';

/** `document.title` convention — one place, so every surface agrees. */
export function documentTitle(pageTitle?: string | null): string {
  return pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME;
}
