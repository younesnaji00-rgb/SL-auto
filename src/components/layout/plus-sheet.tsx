'use client';

/**
 * « Plus » sheet — the labelled overflow of the phone bottom bar for roles
 * that see ≥ 5 destinations (mobile-synthesis §2; research A1: Frost
 * Priority+ "creates a scent", Facebook's fifth "More" tab). A `BottomSheet
 * tall` listing every destination that did not fit in the bar, grouped like
 * the sidebar (Opérations / Assignations / Administration), then the account
 * rows: Profil, « Aide / Tutoriel », Signaler un bug, Déconnexion. 56 px rows,
 * icon + label, the rappels count on Rappels, the current page highlighted.
 *
 * Navigation and the history stack: the sheet holds a history entry (platform
 * back closes it). Tapping a row must NOT pop that entry and push the route
 * in the same tick — the two traversals race and can land the user back on
 * the origin page. `useCloseThenNavigate` closes first, waits for the pop,
 * then navigates.
 */

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bug, HelpCircle, LogOut, UserRound } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useSignOut } from '@/components/layout/user-menu';
import { openTutorial } from '@/components/tutorial/tutorial-launcher';
import { tutorialsEnabledFor } from '@/lib/tutorial/access';
import { PROFIL_HREF, type NavItem } from '@/lib/nav-groups';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

/** Route match shared with the bar (kept local to avoid a module cycle with mobile-nav). */
const isActive = (pathname: string, href: string) =>
  pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));

/**
 * Close an overlay that owns a history entry, THEN navigate: the overlay's
 * cleanup pops its entry (`history.back()`), the resulting `popstate` is our
 * cue to push the new route. A 250 ms fallback covers the no-entry case.
 * Same-route taps only close.
 */
export function useCloseThenNavigate(setOpen: (open: boolean) => void) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const pending = useRef<null | (() => void)>(null);
  useEffect(() => () => pending.current?.(), []);
  return useCallback(
    (href: string) => {
      if (href === pathname) {
        setOpen(false);
        return;
      }
      pending.current?.();
      let done = false;
      const go = () => {
        if (done) return;
        done = true;
        window.removeEventListener('popstate', go);
        window.clearTimeout(timer);
        pending.current = null;
        router.push(href);
      };
      const timer = window.setTimeout(go, 250);
      window.addEventListener('popstate', go);
      pending.current = () => {
        done = true;
        window.removeEventListener('popstate', go);
        window.clearTimeout(timer);
      };
      setOpen(false);
    },
    [router, pathname, setOpen],
  );
}

const rowClass = (active: boolean) =>
  cn(
    'flex min-h-[56px] w-full items-center gap-4 px-4 text-left text-[15px] transition-colors focus:outline-none focus-visible:bg-surface-2',
    active ? 'bg-accent font-medium text-primary' : 'text-ink hover:bg-surface-2',
  );

export interface PlusSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Destinations that did not fit in the bar (from `mobileBarFor`). */
  overflow: NavItem[];
  unread?: number;
}

export function PlusSheet({ open, onOpenChange, overflow, unread = 0 }: PlusSheetProps) {
  const t = useT();
  const pathname = usePathname() || '';
  const { navGroups, role } = useVisibleNav();
  const signOut = useSignOut();
  const navigate = useCloseThenNavigate(onOpenChange);

  // Overflow items in sidebar grouping and order.
  const groups = useMemo(() => {
    const set = new Set(overflow.map((i) => i.href));
    return navGroups
      .map((g) => ({ label: g.label, items: g.items.filter((i) => set.has(i.href)) }))
      .filter((g) => g.items.length > 0);
  }, [navGroups, overflow]);

  const canUseTutorials = tutorialsEnabledFor(role);

  const onRow = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    navigate(href);
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={t('Plus')} detent="tall" flush>
      <nav aria-label={t('Autres destinations')}>
        {groups.map((g) => (
          <section key={g.label} className="border-b border-hairline pb-2">
            <h3 className="t-label px-4 pb-1 pt-3">{t(g.label)}</h3>
            <ul>
              {g.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    {/* A real link (long-press, middle-click, a11y), but the
                        tap goes through the close-then-navigate path. */}
                    <Link href={item.href} onClick={(e) => onRow(e, item.href)} aria-current={active ? 'page' : undefined} className={rowClass(active)}>
                      <Icon className="h-6 w-6 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
                      {item.href === '/mes-rappels' && unread > 0 && (
                        <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-status-info-bg px-1.5 text-[11px] font-semibold tabular-nums text-status-info-fg">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <section className="pb-2">
          <h3 className="t-label px-4 pb-1 pt-3">{t('Compte')}</h3>
          <ul>
            <li>
              <Link href={PROFIL_HREF} onClick={(e) => onRow(e, PROFIL_HREF)} aria-current={isActive(pathname, PROFIL_HREF) ? 'page' : undefined} className={rowClass(isActive(pathname, PROFIL_HREF))}>
                <UserRound className="h-6 w-6 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{t('Profil')}</span>
              </Link>
            </li>
            {canUseTutorials && (
              <li>
                <button
                  type="button"
                  className={rowClass(false)}
                  onClick={() => {
                    onOpenChange(false);
                    // Let the sheet's exit start before the tour overlay mounts.
                    window.setTimeout(openTutorial, 220);
                  }}
                >
                  <HelpCircle className="h-6 w-6 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{t('Aide / Tutoriel')}</span>
                </button>
              </li>
            )}
            <li>
              <Link href="/signaler-bug" onClick={(e) => onRow(e, '/signaler-bug')} aria-current={isActive(pathname, '/signaler-bug') ? 'page' : undefined} className={rowClass(isActive(pathname, '/signaler-bug'))}>
                <Bug className="h-6 w-6 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{t('Signaler un bug')}</span>
              </Link>
            </li>
          </ul>
        </section>

        <section className="border-t border-hairline pb-[max(8px,env(safe-area-inset-bottom))]">
          <ul>
            <li>
              <button
                type="button"
                className={cn(rowClass(false), 'text-status-danger-fg')}
                onClick={() => {
                  onOpenChange(false);
                  void signOut();
                }}
              >
                <LogOut className="h-6 w-6 shrink-0" strokeWidth={1.75} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{t('Déconnexion')}</span>
              </button>
            </li>
          </ul>
        </section>
      </nav>
    </BottomSheet>
  );
}

export default PlusSheet;
