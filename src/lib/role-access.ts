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
import { roles as ROLE_LIST } from '@/lib/dossiers-data';

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

/** The three teams whose hands-on work can be assigned to a person. */
export type TeamRole = 'Gestionnaire' | 'Chiffreur' | 'Agent de Terrain';

const TEAM_OF_SCOPE: Record<AccessScope, TeamRole> = {
  operations: 'Gestionnaire',
  chiffrage: 'Chiffreur',
  terrain: 'Agent de Terrain',
};

/**
 * The team whose work an account does: its own role, or the team a
 * « Responsable des … » leads — a responsable also does the work of their
 * team (owner ruling 2026-10-14: the Responsable des agents de terrain goes on
 * site and takes the photos, the Responsable des chiffreurs chiffre, the
 * Responsable des gestionnaires plans the visits). `null` = Admin, the
 * Directeurs, a label that opens nothing.
 */
export function teamRoleOf(label: string | null | undefined): TeamRole | null {
  const access = resolveRoleAccess(label);
  if (!access.role) return null;
  if (access.role !== 'Admin') return access.role;
  return access.scope ? TEAM_OF_SCOPE[access.scope] : null;
}

/**
 * Whether the signed-in account does this team's work (its member, or its
 * Responsable). Reads the stored label (`roleLabel`) — the resolved `role`
 * of a responsable is Admin.
 */
export function doesTeamWork(
  profile: { role?: string | null; roleLabel?: string | null } | null | undefined,
  team: TeamRole,
): boolean {
  return teamRoleOf(profile?.roleLabel ?? profile?.role) === team;
}

/** Whether the label is a « Responsable des … » of one team (the « Responsable » pill of the pickers). */
export function isTeamLead(label: string | null | undefined): boolean {
  const access = resolveRoleAccess(label);
  return access.role === 'Admin' && !!access.scope;
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

/**
 * Pages outside the sidebar that a side opens (the chiffrage queue opens the
 * devis editor). Each responsable also opens what the work of their team
 * links to (owner ruling 2026-10-14): the gestionnaire's devis editor.
 */
const SCOPE_EXTRA_ROUTES: Record<AccessScope, string[]> = {
  operations: ['/devis-editor', '/chiffrage'],
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
 * Pages outside the sidebar that a role's work links to: the devis editor
 * from a chiffrage, the legacy /chiffrage/[id] page. The Agent de terrain has
 * none.
 */
const ROLE_EXTRA_ROUTES: Partial<Record<BaseRole, string[]>> = {
  Gestionnaire: ['/devis-editor', '/chiffrage'],
  Chiffreur: ['/devis-editor', '/chiffrage'],
};

/**
 * Detail pages a role opens through a link without opening their list: a
 * chiffreur opens the dossier of its chiffrage (« Ouvrir le dossier »), not
 * the Dossiers list.
 */
const ROLE_DETAIL_PREFIXES: Partial<Record<BaseRole, string[]>> = {
  Chiffreur: ['/dossiers/'],
};

/** The same for a side: the Responsable des chiffreurs opens the dossier of a chiffrage like a chiffreur (2026-10-14). */
const SCOPE_DETAIL_PREFIXES: Record<AccessScope, string[]> = {
  operations: [],
  chiffrage: ['/dossiers/'],
  terrain: [],
};

/**
 * Whether a page opens for this account — the shell's route guard
 * (layout.tsx). Admin and the Directeurs open everything. Every other account
 * opens the pages of its own navigation (`navHrefs`: the sidebar after grants
 * and denies) and the pages its work links to. A label that opens nothing
 * opens nothing.
 *
 * Until 2026-10-10 a Gestionnaire or a Chiffreur opened ANY page by typing
 * its address (live: a gestionnaire got Utilisateurs, a chiffreur the
 * Dossiers list and Mes rappels).
 */
export function canOpenPath(
  pathname: string,
  access: { role: string | null | undefined; scope: AccessScope | null | undefined },
  navHrefs: readonly string[],
): boolean {
  if (!access.role) return false;
  if (access.role === 'Admin' && !access.scope) return true;
  const role = access.role as BaseRole;
  const extras = access.scope ? scopeExtraRoutes(access.scope) : ROLE_EXTRA_ROUTES[role] ?? [];
  const allowed = [...navHrefs, ...extras];
  if (allowed.some((h) => pathname === h || pathname.startsWith(`${h}/`))) return true;
  const details = access.scope ? SCOPE_DETAIL_PREFIXES[access.scope] : ROLE_DETAIL_PREFIXES[role] ?? [];
  return details.some((prefix) => pathname.startsWith(prefix));
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
    'Droits Admin côté gestionnaires uniquement : dossiers, rappels, consultation, compagnies, suivi d’équipe et le tableau de bord de son équipe. Reçoit aussi des rappels comme un gestionnaire',
  chiffrage: 'Droits Admin sur le chiffrage uniquement, et le tableau de bord de l’équipe des chiffreurs. Peut aussi recevoir des chiffrages comme un chiffreur',
  terrain: 'Droits Admin sur les missions terrain uniquement, et le tableau de bord de l’équipe terrain. Peut aussi recevoir des missions et prendre les photos comme un agent',
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

// ── Role filters ────────────────────────────────────────────────────────────

/** The fixed list's label of each « Responsable des … » side. */
const SCOPE_ROLE_LABEL: Record<AccessScope, string> = {
  operations: 'Responsable des gestionnaires',
  chiffrage: 'Responsable des chiffreurs',
  terrain: 'Responsable des agents de terrain',
};

/**
 * The label of the fixed list (`roles` in dossiers-data.ts) a stored role
 * means, whatever its spelling — « directeur », « DIRECTEUR GÉNÉRAL »,
 * « Reponsable agents de terrain » — or the trimmed label itself when it
 * means none of them. The role filters compare these (QA #058: filtering on
 * « Directeur » or « Responsable des agents de terrain » in Suivi d'équipe
 * found nobody, the accounts' labels being spelt otherwise). '' when empty.
 */
export function canonicalRoleLabel(label: string | null | undefined): string {
  const raw = String(label ?? '').trim();
  const key = roleKey(raw);
  if (!key) return '';
  const listed = ROLE_LIST.find((r) => roleKey(r) === key);
  if (listed) return listed;
  const access = resolveRoleAccess(raw);
  if (access.role === 'Admin' && access.scope) return SCOPE_ROLE_LABEL[access.scope];
  if (/^directeur\b/.test(key)) {
    if (key.includes('operation')) return 'Directeur des opérations';
    if (key.includes('technique')) return 'Directeur technique';
    return 'Directeur';
  }
  if (access.role && access.role !== 'Admin') return access.role;
  return raw;
}

/** Same role for a filter: both labels mean the same role of the list. */
export function sameRole(a: string | null | undefined, b: string | null | undefined): boolean {
  const ca = canonicalRoleLabel(a);
  return !!ca && ca === canonicalRoleLabel(b);
}

/**
 * A role filter's options: the fixed list, then any label found on the
 * accounts that means none of its roles, so no account is out of reach of
 * the filter.
 */
export function roleFilterOptions(accountRoles: ReadonlyArray<string | null | undefined>): string[] {
  const out = [...ROLE_LIST] as string[];
  const seen = new Set(out.map((r) => roleKey(r)));
  for (const r of accountRoles) {
    const label = canonicalRoleLabel(r);
    if (!label || seen.has(roleKey(label))) continue;
    seen.add(roleKey(label));
    out.push(label);
  }
  return out;
}
