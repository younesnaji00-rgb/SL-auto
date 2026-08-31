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
 *   4. Role gate — the baseline.
 */

import { useMemo } from 'react';
import { NAV_GROUPS, isItemVisibleToRole, type NavGroup, type NavItem } from '@/lib/nav-groups';
import { useCurrentUser } from '@/hooks/use-current-user';

export function isNavItemVisible(
  item: NavItem,
  profile: { role?: string; deniedNavItems?: string[]; grantedNavItems?: string[] } | null | undefined,
): boolean {
  if (item.href === '/signaler-bug') return true;
  if (profile?.grantedNavItems?.includes(item.href)) return true;
  if (profile?.deniedNavItems?.includes(item.href)) return false;
  return isItemVisibleToRole(item, profile?.role);
}

export interface VisibleNav {
  /** Groups rendered in the sidebar nav list (non-empty only). */
  navGroups: NavGroup[];
  /** Items placed in the sidebar footer help menu. */
  footerItems: NavItem[];
  /** Every visible item, flat, in sidebar order. */
  items: NavItem[];
  isVisible: (href: string) => boolean;
}

export function useVisibleNav(): VisibleNav {
  const { profile } = useCurrentUser();
  const role = profile?.role;
  const denied = profile?.deniedNavItems;
  const granted = profile?.grantedNavItems;

  return useMemo(() => {
    const p = { role, deniedNavItems: denied, grantedNavItems: granted };
    const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => isNavItemVisible(i, p)) })).filter(
      (g) => g.items.length > 0,
    );
    const navGroups = groups.filter((g) => g.placement !== 'footer');
    const footerItems = groups.filter((g) => g.placement === 'footer').flatMap((g) => g.items);
    const items = groups.flatMap((g) => g.items);
    const set = new Set(items.map((i) => i.href));
    return { navGroups, footerItems, items, isVisible: (href: string) => set.has(href) };
  }, [role, denied, granted]);
}
