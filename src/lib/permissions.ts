/**
 * Per-user permission helpers, layered on top of the role gate.
 *
 * Each "permission id" is either a sidebar `href` (e.g. `/dossiers`) or a
 * composite id with a `#`-suffixed sub-permission (e.g. `/mes-rappels#recus`,
 * `/compagnies#<compagnie-id>`, `/dossiers#validation`). The id is the key
 * used in `users/{uid}.deniedNavItems` and `users/{uid}.grantedNavItems`.
 *
 * Precedence (top-down):
 *   1. Explicit grant — overrides everything else.
 *   2. Explicit deny  — overrides the role gate.
 *   3. Role default   — the baseline.
 *
 * Clean writes from the admin UI keep each id in at most one list, but if
 * both ever contain the same id, grant wins per the order above.
 */

export interface PermissionProfile {
  deniedNavItems?: string[];
  grantedNavItems?: string[];
}

export function hasPermission(
  profile: PermissionProfile | null | undefined,
  permId: string,
  roleDefault: boolean,
): boolean {
  if (!profile) return roleDefault;
  if (profile.grantedNavItems?.includes(permId)) return true;
  if (profile.deniedNavItems?.includes(permId)) return false;
  return roleDefault;
}

/** Composite permission id builder — keeps the `#` separator centralised. */
export function subPermId(parentHref: string, subKey: string): string {
  return `${parentHref}#${subKey}`;
}

/** Known sub-permission ids. Sub-keys are colocated with the enforcement
 *  site for grep-ability; this table just enumerates them for the admin UI. */
export const SUB_PERMISSIONS = {
  RAPPELS_RECUS: '/mes-rappels#recus',
  RAPPELS_ENVOYES: '/mes-rappels#envoyes',
  DOSSIERS_VALIDATION: '/dossiers#validation',
} as const;

/**
 * Role baseline for the "Envoyés" tab on /mes-rappels. Gestionnaires only ever
 * receive rappels — they never send them — so the sent tab is hidden for them
 * by default. Senders (Admin, Responsable d'équipe) keep it. An explicit
 * per-user grant via /utilisateurs/[uid] still re-enables it if ever needed.
 *
 * Single source of truth shared by the /mes-rappels tab gate and the admin
 * permissions tree so the two can't drift.
 */
export function rappelsEnvoyesRoleDefault(role: string | undefined | null): boolean {
  return role !== 'Gestionnaire';
}
