/**
 * What each role opens (owner rulings 2026-09-25 and 2026-10-01).
 *
 * The role list is fixed: `roles` in dossiers-data.ts, the same labels as the
 * Firestore `options_roles` collection (the gear that added roles from
 * Utilisateurs is gone). An account whose label matched no role saw no page
 * and looped on « Chargement… ». The profile now carries the role resolved
 * here, so every existing check (sidebar, pages, canWrite, canDelete…) runs on
 * it; the label stays the name the account shows and records.
 *
 * - Admin and every Directeur: Admin rights everywhere.
 * - Responsable des gestionnaires / des chiffreurs / des agents de terrain:
 *   Admin rights on their own side only — the Opérations pages, the chiffrage
 *   queue or the missions terrain — and the Tableau de bord of their own team.
 *   Nothing of the other sides.
 * - Gestionnaire, Chiffreur, Agent de Terrain: unchanged.
 * - Labels typed before the list was fixed still resolve (case, accents, the
 *   « reponsable » typo); « Responsable d'équipe » and « Responsable
 *   technique » keep the Admin rights of the 2026-09-25 ruling.
 * - Any other label: no access — a clear screen instead of the loop, never
 *   Admin by default.
 */

import { NAV_GROUPS, isItemVisibleToRole, type NavItem } from '@/lib/nav-groups';

/** The roles the code's checks know: every label resolves to one of them. */
export type BaseRole = 'Admin' | 'Gestionnaire' | 'Chiffreur' | 'Agent de Terrain';

/** The side of the firm a « Responsable des … » runs. */
export type AccessScope = 'operations' | 'chiffrage' | 'terrain';

export interface RoleAccess {
  /** The role every permission check runs on; `null` = a label that opens nothing. */
  role: BaseRole | null;
  /** Admin rights limited to one side; `null` = no limit. */
  scope: AccessScope | null;
}

/** Case, accents, apostrophes and spacing ignored; the « reponsable » typo read as « responsable ». */
export function roleKey(label: string | null | undefined): string {
  return String(label ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^reponsable\b/, 'responsable');
}

const BASE_ROLES: Record<string, BaseRole> = {
  admin: 'Admin',
  gestionnaire: 'Gestionnaire',
  chiffreur: 'Chiffreur',
  'agent de terrain': 'Agent de Terrain',
};

export function resolveRoleAccess(label: string | null | undefined): RoleAccess {
  const key = roleKey(label);
  const base = BASE_ROLES[key];
  if (base) return { role: base, scope: null };
  if (/^directeur\b/.test(key)) return { role: 'Admin', scope: null };
  if (/^responsable\b/.test(key)) {
    if (key.includes('gestionnaire')) return { role: 'Admin', scope: 'operations' };
    if (key.includes('chiffr')) return { role: 'Admin', scope: 'chiffrage' };
    if (key.includes('terrain')) return { role: 'Admin', scope: 'terrain' };
    if (key.includes('equipe') || key.includes('technique')) return { role: 'Admin', scope: null };
  }
  return { role: null, scope: null };
}

/**
 * Sidebar pages of each side: its own pages and the Tableau de bord, which
 * shows that team only (dashboard/admin-dashboard.tsx). Opérations follows its
 * sidebar group.
 */
function scopeHrefs(scope: AccessScope): string[] {
  switch (scope) {
    case 'operations':
      return NAV_GROUPS.find((g) => g.label === 'Opérations')?.items.map((i) => i.href) ?? [];
    case 'chiffrage':
      return ['/dashboard', '/assignations-chiffrage'];
    case 'terrain':
      return ['/dashboard', '/assignations-atg'];
  }
}

/** Pages outside the sidebar that a side opens (the chiffrage queue opens the devis editor). */
const SCOPE_EXTRA_ROUTES: Record<AccessScope, string[]> = {
  operations: [],
  chiffrage: ['/chiffrage', '/devis-editor'],
  terrain: [],
};

export function scopeExtraRoutes(scope: AccessScope | null | undefined): string[] {
  return scope ? SCOPE_EXTRA_ROUTES[scope] : [];
}

/** The `canWrite` sections (use-current-user.tsx) a side writes in, with Admin rights. */
const SCOPE_WRITE_SECTIONS: Record<AccessScope, string[]> = {
  operations: ['dossiers'],
  chiffrage: ['assignations-chiffrage'],
  terrain: ['assignations-atg'],
};

export function scopeWritesSection(scope: AccessScope, section: string): boolean {
  return SCOPE_WRITE_SECTIONS[scope].includes(section);
}

/** Whether the role opens this sidebar page by default (before per-user grants and denies). */
export function roleOpensNavItem(item: NavItem, access: RoleAccess): boolean {
  if (!item.roles) return true;
  if (!access.role) return false;
  if (access.scope) return scopeHrefs(access.scope).includes(item.href);
  return isItemVisibleToRole(item, access.role);
}

/**
 * Whether a page opens for this account — the shell's route guard
 * (layout.tsx). The Agent de terrain and a « Responsable des … » open the
 * pages of their own navigation (`navHrefs`: the sidebar after grants and
 * denies) and the pages their side opens; any other role opens every page,
 * each page checking its own role. A label that opens nothing opens nothing.
 */
export function canOpenPath(
  pathname: string,
  access: { role: string | null | undefined; scope: AccessScope | null | undefined },
  navHrefs: readonly string[],
): boolean {
  if (!access.role) return false;
  if (access.role !== 'Agent de Terrain' && !access.scope) return true;
  const allowed = [...navHrefs, ...scopeExtraRoutes(access.scope)];
  return allowed.some((h) => pathname === h || pathname.startsWith(`${h}/`));
}

/** First page after login: the role's first sidebar page (never « Signaler un bug »). */
export function landingPathForAccess(access: RoleAccess): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      if (item.roles === null) continue;
      if (roleOpensNavItem(item, access)) return item.href;
    }
  }
  return '/dashboard';
}

const BASE_DESCRIPTIONS: Record<BaseRole, string> = {
  'Admin': 'Accès complet : dossiers, assignations, utilisateurs et paramètres',
  'Gestionnaire': 'Gère les dossiers de sinistres et reçoit des rappels',
  'Chiffreur': 'Traite les dossiers assignés au chiffrage',
  'Agent de Terrain': 'Réalise les missions terrain qui lui sont assignées',
};

const SCOPE_DESCRIPTIONS: Record<AccessScope, string> = {
  operations:
    'Droits Admin côté gestionnaires uniquement : dossiers, rappels, consultation, compagnies, suivi d’équipe et le tableau de bord de son équipe',
  chiffrage: 'Droits Admin sur le chiffrage uniquement, et le tableau de bord de l’équipe des chiffreurs',
  terrain: 'Droits Admin sur les missions terrain uniquement, et le tableau de bord de l’équipe terrain',
};

/**
 * Caption under the Rôle field of Utilisateurs (element-specs addendum ter E:
 * an admin who never read the docs picks right the first time). A label that
 * opens nothing says so before the account is created.
 */
export function describeRole(label: string | null | undefined): string | null {
  if (!String(label ?? '').trim()) return null;
  const access = resolveRoleAccess(label);
  if (!access.role) return 'Ce rôle ne donne accès à aucune page.';
  if (access.scope) return SCOPE_DESCRIPTIONS[access.scope];
  if (access.role === 'Admin' && roleKey(label) !== 'admin') return 'Mêmes droits que l’Admin';
  return BASE_DESCRIPTIONS[access.role];
}
