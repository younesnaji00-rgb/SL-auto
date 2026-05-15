import { NAV_GROUPS, isItemVisibleToRole } from './nav-groups';

/**
 * Role → first nav item the user can actually see, in the order rendered by
 * the sidebar. Drives the breadcrumb root link, the root-page redirect, and
 * the /dashboard fallback redirect — so users without dashboard access never
 * see "Accès refusé" or a dead link to a hidden page.
 *
 * Falls back to /dashboard only when nothing matches (defensive — should be
 * unreachable since every defined role has at least one visible item).
 */
export function landingPathFor(role: string | undefined): string {
  for (const group of NAV_GROUPS) {
    for (const item of group.items) {
      // Skip the catch-all "Signaler un bug" (roles: null) so we never route
      // a user to the bug-report page as their primary landing.
      if (item.roles === null) continue;
      if (isItemVisibleToRole(item, role)) return item.href;
    }
  }
  return '/dashboard';
}
