'use client';

/**
 * Phone top bar (mobile pass 2026-09-06 — docs/research/mobile-synthesis.md §2,
 * research mobile-shell-navigation.md A2/A3/A4/A6/A7/A8).
 *
 * 48 px + safe-area-top, `.glass-bar`, pinned (never scroll-away). Anatomy:
 *
 *   [ monogram | ‹ Parent ]  [ title (+ subtitle) · count ]  [ + | search | ⋯ | switcher | bell | avatar ]
 *
 * Leading: the brand monogram on the role's own top-level destinations, a
 * « ‹ Parent » up-link everywhere else (NN/g: on mobile a single crumb
 * pointing up a level is all that is necessary). Up is NOT back: back stays
 * the platform's, and every overlay pushes a history entry so it closes first.
 *
 * Centre: the page title from the chrome registry — the phone never paints an
 * H1 in the body as well (NN/g content-to-chrome: 28 px title under a 56 px
 * bar was 100+ px of chrome before content).
 *
 * Trailing: at most the page's ONE primary action (filled 40×40 icon button —
 * no FAB on phones), a search icon when the page has a search field, a « ⋯ »
 * overflow (ActionSheet), the workspace switcher chip, the bell and the
 * avatar. On a record route (`upHref` published by the page) the shell's own
 * bell/avatar step aside: a pushed hierarchical screen shows back + title +
 * one trailing group (Apple HIG).
 *
 * Selection mode replaces the whole bar with <SelectionBar> (Android CAB).
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, MoreHorizontal, Plus, Search } from 'lucide-react';
import Logo from '@/components/logo';
import Notifications from '@/components/layout/notifications';
import UserMenu from '@/components/layout/user-menu';
import { WorkspaceSwitcher } from '@/components/layout/workspace-switcher';
import { SelectionBar } from '@/components/layout/selection-bar';
import { usePageChrome, type PhonePrimaryAction } from '@/components/layout/page-chrome';
import { useShellUi } from '@/components/layout/shell-ui';
import { useCrumbs } from '@/components/breadcrumb';
import { ActionSheet } from '@/components/ui/action-sheet';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { isNavItemActive } from '@/components/layout/mobile-nav';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

/** Content height of the bar (safe-area padding sits on top). */
export const PHONE_TOP_BAR_HEIGHT = 48;

const ICON_BTN =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

export default function PhoneTopBar() {
  const t = useT();
  const pathname = usePathname() || '';
  const { phone, registeredTitle } = usePageChrome();
  const { items } = useVisibleNav();
  const { canCreateDossier, openCreateDossier } = useShellUi();
  const crumbs = useCrumbs();
  const [moreOpen, setMoreOpen] = React.useState(false);

  // Selection mode owns the whole bar.
  if (phone.selection) {
    return (
      <header className="sticky top-0 z-40 shrink-0 glass-bar border-b border-hairline pt-[env(safe-area-inset-top)] md:hidden">
        <SelectionBar selection={phone.selection} />
      </header>
    );
  }

  const navItem = items.find((i) => isNavItemActive(pathname, i.href));
  const isRoot = !!navItem && (pathname === navItem.href || pathname === '/profil');
  const parent = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : null;
  const upHref = phone.upHref ?? (isRoot ? null : parent?.href ?? null);
  const upLabel = phone.upLabel ?? parent?.label ?? null;
  const onRecord = !!phone.upHref;

  const title = registeredTitle ?? (navItem ? navItem.title ?? navItem.label : null);
  const secondary = (phone.secondaryActions ?? []).filter((a) => !a.hidden);

  // The page's own primary, or « Nouveau dossier » on the dossiers list.
  const primary: PhonePrimaryAction | null =
    phone.primaryAction ??
    (canCreateDossier && pathname === '/dossiers'
      ? { label: t('Nouveau dossier'), icon: <Plus className="h-5 w-5" />, onClick: openCreateDossier, dataTour: 'shell-create' }
      : null);

  return (
    <header
      className="sticky top-0 z-40 shrink-0 glass-bar border-b border-hairline pt-[env(safe-area-inset-top)] md:hidden"
      data-phone-top-bar
    >
      <div className="flex h-12 items-center gap-1 pl-1 pr-1">
        {/* Leading: monogram on a root destination, « ‹ Parent » elsewhere. */}
        {upHref ? (
          <Link
            href={upHref}
            className="flex h-11 min-w-0 max-w-[8.5rem] shrink-0 items-center gap-0.5 rounded-md pl-1 pr-2 text-sm text-ink-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate">{t(upLabel ?? 'Retour')}</span>
          </Link>
        ) : (
          <Link href="/" className="flex h-11 w-11 shrink-0 items-center justify-center" aria-label={t('Accueil')}>
            <Logo collapsed />
          </Link>
        )}

        {/* Centre: the page title (one line) + optional second line + count. */}
        <div className="flex min-w-0 flex-1 flex-col justify-center px-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="min-w-0 truncate text-[17px] font-semibold leading-tight text-ink">{title ? t(title) : ''}</h1>
            {phone.count !== undefined && phone.count !== null && (
              <span className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                {phone.count}
              </span>
            )}
          </div>
          {phone.subtitle && <p className="truncate text-[12px] leading-tight text-ink-3">{phone.subtitle}</p>}
        </div>

        {/* Trailing group. */}
        <div className="flex shrink-0 items-center">
          {phone.onSearchFocus && (
            <button type="button" onClick={phone.onSearchFocus} className={ICON_BTN} aria-label={t('Rechercher')}>
              <Search className="h-5 w-5" />
            </button>
          )}
          {primary &&
            (primary.href ? (
              <Link
                href={primary.href}
                aria-label={primary.label}
                data-tour={primary.dataTour}
                className="ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-rim-filled transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {primary.icon ?? <Plus className="h-5 w-5" />}
              </Link>
            ) : (
              <button
                type="button"
                onClick={primary.onClick}
                disabled={primary.disabled}
                aria-label={primary.label}
                data-tour={primary.dataTour}
                className="ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-rim-filled transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {primary.icon ?? <Plus className="h-5 w-5" />}
              </button>
            ))}
          {secondary.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={ICON_BTN}
                aria-label={t('Plus d’actions')}
                aria-haspopup="dialog"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
              <ActionSheet open={moreOpen} onOpenChange={setMoreOpen} title={t('Actions')} items={secondary} />
            </>
          )}
          {!onRecord && (
            <>
              <WorkspaceSwitcher />
              <Notifications />
              <UserMenu compact />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
