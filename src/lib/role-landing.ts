import { landingPathForAccess, resolveRoleAccess, type AccessScope } from './role-access';

/**
 * Role → first nav item the user can actually see, in the order rendered by
 * the sidebar. Drives the breadcrumb root link, the root-page redirect, and
 * the /dashboard fallback redirect — so users without dashboard access never
 * see "Accès refusé" or a dead link to a hidden page.
 *
 * Takes the stored label (the login page) or the resolved profile role, with
 * the profile's scope when there is one (lib/role-access.ts). Falls back to
 * /dashboard only for a label that opens nothing — the app shell then shows
 * the no-access screen.
 */
export function landingPathFor(role: string | undefined, scope?: AccessScope | null): string {
  const access = resolveRoleAccess(role);
  return landingPathForAccess(scope ? { ...access, scope } : access);
}
