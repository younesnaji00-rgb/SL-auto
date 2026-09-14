'use client';

/**
 * Phone bottom navigation bar (mobile redesign 2026-09-14 — Claude Design
 * handoff `Phone.dc.html`; supersedes the 2026-09-06 combo rule).
 *
 * FIVE fixed AREAS at most — Pilotage · Travail · Chiffrage · Terrain · Admin
 * (`MOBILE_AREAS` in lib/nav-groups.ts). A tab is an area, not a page: its
 * sub-destinations (Dossiers | Rappels, Tableau de bord | Suivi d'équipe, the
 * four Admin lists) are the segment toggle / chips row of the TOP bar. Areas
 * the role cannot see are dropped, so a gestionnaire gets Pilotage · Travail,
 * an agent de terrain Pilotage · Terrain, an admin all five. Never a
 * hamburger, never a side drawer, no « Plus » tab any more.
 *
 * Tapping an area returns to the sub-destination the user last visited in it
 * (remembered per area for the session), else the area's first destination.
 *
 * Geometry: 56 px content + max(8px, safe-area) padding, full-width columns
 * with a 48×48 hit area, 24 px icons (stroke 1.75 / 2.25 active), 11.5 px
 * one-line labels, active = teal + 56×32 tinted pill (Material indicator) +
 * aria-current. Badge = unread rappels, on Travail.
 *
 * Visibility: phones only (`md:hidden`); never hides on scroll; hidden while
 * the on-screen keyboard is open, in phone landscape, and when a page mounts
 * a <BottomActionBar> (one bottom bar at a time). `useBottomBarState()` is
 * the single source of that decision — the app layout mirrors it into
 * `data-bottom-bar` so the `--bottom-bar` CSS variable follows.
 */

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useRappels } from '@/hooks/use-rappels';
import { useIsPhoneLandscape, useKeyboardOpen } from '@/hooks/use-viewport-class';
import { usePageChrome } from '@/components/layout/page-chrome';
import { mobileAreaForPath, mobileAreasFor, type MobileAreaKey, type ResolvedMobileArea } from '@/lib/nav-groups';
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

/** Route match used by every phone nav surface (bar, top-bar segments). */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === '/dashboard') return false;
  return pathname.startsWith(`${href}/`);
}

/* Last sub-destination visited per area — session memory so « Travail »
   brings the reader back to Rappels when that is where they were. */
const LAST_KEY = 'sl:phone-area-last';
function readLast(): Partial<Record<MobileAreaKey, string>> {
  try {
    return JSON.parse(window.sessionStorage.getItem(LAST_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeLast(map: Partial<Record<MobileAreaKey, string>>) {
  try {
    window.sessionStorage.setItem(LAST_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Where an area tab points: the last visited destination of the area, else its first. */
export function areaTargetHref(area: ResolvedMobileArea, last: Partial<Record<MobileAreaKey, string>>): string {
  const remembered = last[area.key];
  if (remembered && area.items.some((i) => i.href === remembered)) return remembered;
  return area.items[0].href;
}

const tabClass = (active: boolean) =>
  cn(
    'flex h-14 w-full flex-col items-center justify-center gap-1 px-1 text-[11.5px] font-medium leading-none transition-colors motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
    active ? 'text-primary' : 'text-ink-3 hover:text-ink',
  );

const pillClass = (active: boolean) =>
  cn('relative flex h-8 w-14 items-center justify-center rounded-full transition-colors duration-200', active && 'bg-accent');

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="absolute -top-0.5 right-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-status-info-fg px-1 text-[10px] font-semibold tabular-nums text-status-info-bg ring-2 ring-background">
      {n > 99 ? '99+' : n}
    </span>
  );
}

export default function MobileNav() {
  const t = useT();
  const pathname = usePathname() || '';
  const { items } = useVisibleNav();
  const { rappels } = useRappels();
  const state = useBottomBarState();

  const unread = rappels.filter((r) => !r.read && !r.resolvedAt).length;
  const areas = useMemo(() => mobileAreasFor(items), [items]);
  const current = useMemo(() => mobileAreaForPath(areas, pathname), [areas, pathname]);

  // Remember the sub-destination per area (state so the tab hrefs update).
  const [last, setLast] = React.useState<Partial<Record<MobileAreaKey, string>>>({});
  useEffect(() => setLast(readLast()), []);
  useEffect(() => {
    if (!current) return;
    const item = current.items.find((i) => isNavItemActive(pathname, i.href));
    if (!item) return;
    setLast((prev) => {
      if (prev[current.key] === item.href) return prev;
      const next = { ...prev, [current.key]: item.href };
      writeLast(next);
      return next;
    });
  }, [pathname, current]);

  if (areas.length === 0) return null;

  return (
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
        {areas.map((area) => {
          const Icon = area.icon;
          const active = current?.key === area.key;
          return (
            <li key={area.key}>
              <Link href={areaTargetHref(area, last)} aria-current={active ? 'page' : undefined} className={tabClass(active)} data-area={area.key}>
                <span className={pillClass(active)}>
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.25 : 1.75} />
                  {area.key === 'travail' && <Badge n={unread} />}
                </span>
                <span className="max-w-full truncate">{t(area.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
