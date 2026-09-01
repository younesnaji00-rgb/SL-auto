'use client';

/**
 * Mobile bottom navigation (Material 3 navigation bar / Apple HIG tab bar):
 * 3–4 always-visible labelled destinations derived from the nav config
 * (`mobileRank`) for the current role, plus Profil. Never a hamburger, never
 * a "Plus" tab — everything else lives on Profil or in ⌘K.
 */

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserRound } from 'lucide-react';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useRappels } from '@/hooks/use-rappels';
import { cn } from '@/lib/utils';

export const MOBILE_NAV_HEIGHT = 60;
const MAX_DESTINATIONS = 3; // + Profil = 4

export default function MobileNav() {
  const pathname = usePathname() || '';
  const { items, isVisible } = useVisibleNav();
  const { rappels } = useRappels();
  const unread = rappels.filter((r) => !r.read && !r.resolvedAt).length;

  const destinations = useMemo(() => {
    const ranked = items
      .filter((i) => typeof i.mobileRank === 'number')
      .map((i, idx) => ({ i, idx }))
      .sort((a, b) => (a.i.mobileRank! - b.i.mobileRank!) || (a.idx - b.idx))
      .map((x) => x.i)
      .slice(0, MAX_DESTINATIONS);
    return ranked;
  }, [items]);

  if (destinations.length === 0) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 glass-bar border-t border-hairline lg:hidden"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
    >
      <ul className="grid auto-cols-fr grid-flow-col">
        {destinations.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 pt-2 text-[11.5px] font-medium leading-none transition-colors motion-safe:active:scale-[0.97]',
                  active ? 'text-primary' : 'text-ink-3 hover:text-ink',
                )}
              >
                <span className={cn('relative flex h-8 w-14 items-center justify-center rounded-full transition-colors', active && 'bg-accent')}>
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
                  {item.href === '/mes-rappels' && unread > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-status-info-fg px-1 text-[11px] font-semibold tabular-nums text-status-info-bg ring-2 ring-background">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/profil"
            aria-current={isActive('/profil') ? 'page' : undefined}
            className={cn(
              'flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 pt-2 text-[11.5px] font-medium leading-none transition-colors motion-safe:active:scale-[0.97]',
              isActive('/profil') ? 'text-primary' : 'text-ink-3 hover:text-ink',
            )}
          >
            <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-colors', isActive('/profil') && 'bg-accent')}>
              <UserRound className="h-6 w-6" strokeWidth={isActive('/profil') ? 2.25 : 1.75} />
            </span>
            <span>Profil</span>
          </Link>
        </li>
      </ul>
      {/* Keep the search reachable on phones for roles whose bar has no Recherche */}
      {!isVisible('/dossiers') && null}
    </nav>
  );
}
