'use client';

/**
 * Phone bottom navigation bar (mobile pass 2026-09-06 — docs/research/
 * mobile-synthesis.md §2, research mobile-shell-navigation.md A1/A8/A9).
 *
 * Combo rule (NN/g combo nav 86 % vs hidden 57 %; Frost Priority+): a role
 * that sees ≤ 4 destinations gets them all + Profil; a role that sees ≥ 5
 * gets its top 4 (explicit per-role `mobileOrder` in lib/nav-groups.ts) +
 * « Plus », a labelled fifth tab opening a bottom sheet with the rest,
 * grouped like the sidebar. Never a hamburger, never a side drawer.
 *
 * Geometry: 56 px content + max(8px, safe-area) padding, full-width
 * columns with a 48×48 hit area, 24 px icons (stroke 1.75 / 2.25 active),
 * 11.5 px one-line labels, active = teal + 56×32 tinted pill (Material
 * indicator) + aria-current. Badge on Rappels only.
 *
 * Visibility: phones only (`md:hidden`); never hides on scroll; hidden while
 * the on-screen keyboard is open, in phone landscape, and when a page mounts
 * a <BottomActionBar> (one bottom bar at a time). `useBottomBarState()` is
 * the single source of that decision — the app layout mirrors it into
 * `data-bottom-bar` so the `--bottom-bar` CSS variable follows.
 */

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, UserRound } from 'lucide-react';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useRappels } from '@/hooks/use-rappels';
import { useIsPhoneLandscape, useKeyboardOpen } from '@/hooks/use-viewport-class';
import { usePageChrome } from '@/components/layout/page-chrome';
import { PlusSheet } from '@/components/layout/plus-sheet';
import { mobileBarFor, mobileLabelFor, PROFIL_HREF, type NavItem } from '@/lib/nav-groups';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

/** Content height of the bar (the safe-area padding comes on top). */
export const MOBILE_NAV_HEIGHT = 56;

export type BottomBarState = 'nav' | 'action' | 'none';

/**
 * Which bottom bar the phone shell shows right now. `nav` = this bar,
 * `action` = a page's <BottomActionBar> replaced it, `none` = nothing
 * (keyboard open, phone landscape). Read by the bar itself and by the app
 * layout (`data-bottom-bar` → `--bottom-bar`).
 */
export function useBottomBarState(): BottomBarState {
  const { phone } = usePageChrome();
  const keyboard = useKeyboardOpen();
  const landscape = useIsPhoneLandscape();
  if (keyboard) return 'none';
  if (phone.hideBottomNav) return 'action';
  if (landscape) return 'none';
  return 'nav';
}

/** Route match used by every phone nav surface (bar, Plus sheet, Profil hub). */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/dashboard') return false;
  return pathname.startsWith(`${href}/`);
}

const tabClass = (active: boolean) =>
  cn(
    'flex h-14 w-full flex-col items-center justify-center gap-1 px-1 text-[11.5px] font-medium leading-none transition-colors motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
    active ? 'text-primary' : 'text-ink-3 hover:text-ink',
  );

const pillClass = (active: boolean) =>
  cn('relative flex h-8 w-14 items-center justify-center rounded-full transition-colors', active && 'bg-accent');

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-status-info-fg px-1 text-[11px] font-semibold tabular-nums text-status-info-bg ring-2 ring-background">
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default function MobileNav() {
  const t = useT();
  const pathname = usePathname() || '';
  const { items, role } = useVisibleNav();
  const { rappels } = useRappels();
  const state = useBottomBarState();
  const [plusOpen, setPlusOpen] = useState(false);

  const unread = rappels.filter((r) => !r.read && !r.resolvedAt).length;
  const { bar, overflow, hasPlus } = useMemo(() => mobileBarFor(items, role), [items, role]);

  // « Plus » is the active tab whenever the current page lives inside it
  // (an overflow destination, Profil, the bug form) — the bar must always
  // tell the user which area they are in (Apple HIG tab bars).
  const plusActive =
    hasPlus &&
    (overflow.some((i: NavItem) => isNavItemActive(pathname, i.href)) ||
      isNavItemActive(pathname, PROFIL_HREF) ||
      isNavItemActive(pathname, '/signaler-bug'));

  return (
    <>
      <nav
        aria-label={t('Navigation principale')}
        data-tour="shell-mobile-nav"
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 glass-bar border-t border-hairline md:hidden',
          'pb-[max(8px,env(safe-area-inset-bottom))]',
          state !== 'nav' && 'hidden',
        )}
      >
        <ul className="grid auto-cols-fr grid-flow-col">
          {bar.map((item) => {
            const Icon = item.icon;
            const active = isNavItemActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? 'page' : undefined} className={tabClass(active)}>
                  <span className={pillClass(active)}>
                    <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
                    {item.href === '/mes-rappels' && <Badge n={unread} />}
                  </span>
                  <span className="max-w-full truncate">{t(mobileLabelFor(item))}</span>
                </Link>
              </li>
            );
          })}
          {hasPlus ? (
            <li>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={plusOpen}
                aria-current={plusActive ? 'page' : undefined}
                onClick={() => setPlusOpen(true)}
                className={tabClass(plusActive)}
              >
                <span className={pillClass(plusActive)}>
                  <LayoutGrid className="h-6 w-6" strokeWidth={plusActive ? 2.25 : 1.75} />
                </span>
                <span>{t('Plus')}</span>
              </button>
            </li>
          ) : (
            <li>
              <Link
                href={PROFIL_HREF}
                aria-current={isNavItemActive(pathname, PROFIL_HREF) ? 'page' : undefined}
                className={tabClass(isNavItemActive(pathname, PROFIL_HREF))}
              >
                <span className={pillClass(isNavItemActive(pathname, PROFIL_HREF))}>
                  <UserRound className="h-6 w-6" strokeWidth={isNavItemActive(pathname, PROFIL_HREF) ? 2.25 : 1.75} />
                </span>
                <span>{t('Profil')}</span>
              </Link>
            </li>
          )}
        </ul>
      </nav>
      {hasPlus && <PlusSheet open={plusOpen} onOpenChange={setPlusOpen} overflow={overflow} unread={unread} />}
    </>
  );
}
