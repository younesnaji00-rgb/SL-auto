'use client';

/**
 * Nav items the current user may see — the ONE place the role gate and the
 * per-user grant/deny overrides are combined. Used by the sidebar, the command
 * palette, the mobile bottom bar and the `g`-chord registry.
 *
 * Precedence (top-down):
 *   1. "Signaler un bug" — always visible.
 *   2. grantedNavItems — explicit grant overrides everything else.
 *   3. deniedNavItems — explicit deny hides even if the role allows.
 *   4. Role gate — the baseline: the profile's resolved role and, for a
 *      « responsable des … », its area only (lib/role-access.ts).
 */

import { useCallback, useMemo } from 'react';
import { NAV_GROUPS, type NavGroup, type NavItem } from '@/lib/nav-groups';
import { canOpenPath, roleOpensNavItem, type AccessScope, type BaseRole } from '@/lib/role-access';
import { useCurrentUser } from '@/hooks/use-current-user';

export function isNavItemVisible(
  item: NavItem,
  profile:
    | {
        role?: string;
        accessScope?: AccessScope | null;
        noAccess?: boolean;
        deniedNavItems?: string[];
        grantedNavItems?: string[];
      }
    | null
    | undefined,
): boolean {
  if (item.href === '/signaler-bug') return true;
  if (profile?.grantedNavItems?.includes(item.href)) return true;
  if (profile?.deniedNavItems?.includes(item.href)) return false;
  // The profile role is resolved (use-current-user.tsx); a label that opens
  // nothing keeps its own name there and opens no page.
  const role = profile?.noAccess ? null : ((profile?.role ?? null) as BaseRole | null);
  return roleOpensNavItem(item, { role, scope: profile?.accessScope ?? null });
}

export interface VisibleNav {
  /** Groups rendered in the sidebar nav list (non-empty only). */
  navGroups: NavGroup[];
  /** Items placed in the sidebar footer help menu. */
  footerItems: NavItem[];
  /** Every visible item, flat, in sidebar order. */
  items: NavItem[];
  isVisible: (href: string) => boolean;
  /** The role the gate was evaluated for (phone bar ordering). */
  role: string | undefined;
}

export function useVisibleNav(): VisibleNav {
  const { profile } = useCurrentUser();
  const role = profile?.role;
  const scope = profile?.accessScope ?? null;
  const noAccess = !!profile?.noAccess;
  const denied = profile?.deniedNavItems;
  const granted = profile?.grantedNavItems;

  return useMemo(() => {
    const p = { role, accessScope: scope, noAccess, deniedNavItems: denied, grantedNavItems: granted };
    const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => isNavItemVisible(i, p)) })).filter(
      (g) => g.items.length > 0,
    );
    const navGroups = groups.filter((g) => g.placement !== 'footer');
    const footerItems = groups.filter((g) => g.placement === 'footer').flatMap((g) => g.items);
    const items = groups.flatMap((g) => g.items);
    const set = new Set(items.map((i) => i.href));
    return { navGroups, footerItems, items, isVisible: (href: string) => set.has(href), role };
  }, [role, scope, noAccess, denied, granted]);
}

/**
 * Whether the current user may open a path — the shell's route guard
 * (layout.tsx), for hiding a link that would only bounce back: the
 * chiffrage responsable has no « Ouvrir le dossier ».
 */
export function useCanOpenPath(): (path: string) => boolean {
  const { profile } = useCurrentUser();
  const { items } = useVisibleNav();
  const role = profile?.noAccess ? null : profile?.role ?? null;
  const scope = profile?.accessScope ?? null;
  return useCallback(
    (path: string) => canOpenPath(path, { role, scope }, items.map((i) => i.href)),
    [role, scope, items],
  );
}
