'use client';

/**
 * Phone top bar (mobile redesign 2026-09-14 — Claude Design handoff
 * `Phone.dc.html`, turns 3–4; supersedes the 2026-09-06 bar).
 *
 * 48 px + safe-area-top, `.glass-bar`, pinned. Two anatomies:
 *
 *   ROOT (an area destination)
 *   [ logo 28 ]  [ Dossiers 42 | Rappels 3 ]        [ ⌕ ] [ ⚙︎² ] [ + ] [ ⋯ ]
 *                 ↑ 30 px segment toggle of the area's sub-destinations, or
 *                   the page title + subtitle when the area has ONE destination
 *                 (Admin: title « Administration », chips row UNDER the bar)
 *   ── optional second row when ⌕ is pressed: [ ⌕ Réf., assuré, plaque… ] [ ⇅ Récents ]
 *
 *   RECORD (a pushed screen — the page published `upHref`, or the route is
 *   deeper than its destination)
 *   [ ‹ Dossiers ]  SL-25-0412 (statut)               [ ⋯ ]
 *                   Karim Benjelloun · 12345-A-6
 *
 * Pages feed the bar through `usePhoneChrome({...})` (page-chrome.tsx):
 * `count` (own segment pill), `search` (inline field), `filters` (icon +
 * badge), `primaryAction` (36 px filled button — « + » or the plate scanner),
 * `secondaryActions` (« ⋯ » rows), `titleChip`, `subtitle`, `upHref/upLabel`.
 * The Rappels segment count is the unread rappels, read here.
 *
 * Gone from the phone bar (design): the bell, the avatar and the workspace
 * switcher. What they carried is the Travail badge and the root « ⋯ » sheet
 * (mode sombre · aide · signaler un bug · déconnexion).
 *
 * Selection mode replaces the whole bar with <SelectionBar> (Android CAB).
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpDown, ChevronLeft, MoreHorizontal, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import Logo from '@/components/logo';
import { SelectionBar } from '@/components/layout/selection-bar';
import { RootMoreSheet } from '@/components/layout/root-more-sheet';
import { usePageChrome, type PhonePrimaryAction } from '@/components/layout/page-chrome';
import { useShellUi } from '@/components/layout/shell-ui';
import { useCrumbs } from '@/components/breadcrumb';
import { ActionSheet } from '@/components/ui/action-sheet';
import { Badge } from '@/components/ui/badge';
import { Segmented } from '@/components/ui/segmented';
import { ScopePills, type ScopePill } from '@/components/ui/scope-pills';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useRappels } from '@/hooks/use-rappels';
import { isNavItemActive } from '@/components/layout/mobile-nav';
import { mobileAreaForPath, mobileAreasFor, mobileLabelFor } from '@/lib/nav-groups';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

/** Content height of the bar row (safe-area padding sits on top; the search / chips rows add to it). */
export const PHONE_TOP_BAR_HEIGHT = 48;

const ICON_BTN =
  'inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

const PRIMARY_BTN =
  'mx-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-rim-filled transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 [&>svg]:h-5 [&>svg]:w-5';

export default function PhoneTopBar() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname() || '';
  const { phone, registeredTitle } = usePageChrome();
  const { items } = useVisibleNav();
  const { canCreateDossier, openCreateDossier } = useShellUi();
  const { rappels } = useRappels();
  const crumbs = useCrumbs();
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const areas = useMemo(() => mobileAreasFor(items), [items]);
  const area = useMemo(() => mobileAreaForPath(areas, pathname), [areas, pathname]);
  const navItem = useMemo(() => {
    let best: (typeof items)[number] | null = null;
    for (const i of items) if (isNavItemActive(pathname, i.href) && (!best || i.href.length > best.href.length)) best = i;
    return best;
  }, [items, pathname]);
  const isRoot = !!navItem && pathname === navItem.href && !phone.upHref;

  // The inline search closes when the route changes; it re-opens on its own
  // when a page comes back with a query already applied.
  useEffect(() => setSearchOpen(false), [pathname]);
  const searchValue = phone.search?.value ?? '';
  useEffect(() => {
    if (searchValue) setSearchOpen(true);
  }, [searchValue]);

  // Selection mode owns the whole bar.
  if (phone.selection) {
    return (
      <header className="sticky top-0 z-40 shrink-0 glass-bar border-b border-hairline pt-[env(safe-area-inset-top)] md:hidden">
        <SelectionBar selection={phone.selection} />
      </header>
    );
  }

  const unread = rappels.filter((r) => !r.read && !r.resolvedAt).length;
  const parent = crumbs.length >= 2 ? crumbs[crumbs.length - 2] : null;
  const upHref = phone.upHref ?? (isRoot ? null : parent?.href ?? navItem?.href ?? null);
  const upLabel = phone.upLabel ?? (phone.upHref ? null : parent?.label ?? (navItem ? mobileLabelFor(navItem) : null));

  // ── Root centre: segments · chips title · plain title ─────────────────
  const segmentItems = area && area.sub === 'segments' && area.items.length >= 2 ? area.items : null;
  const rootTitle =
    phone.title ?? (area?.sub === 'chips' ? area.title ?? area.label : navItem ? mobileLabelFor(navItem) : registeredTitle ?? '');
  const adminChips: ScopePill[] | null =
    area && area.sub === 'chips'
      ? area.items.map((i) => ({ key: i.href, label: t(i.label), href: i.href, active: isNavItemActive(pathname, i.href) }))
      : null;

  const secondary = (phone.secondaryActions ?? []).filter((a) => !a.hidden);
  const primary: PhonePrimaryAction | null =
    phone.primaryAction ??
    (canCreateDossier && pathname === '/dossiers'
      ? { label: t('Nouveau dossier'), icon: <Plus />, onClick: openCreateDossier, dataTour: 'shell-create' }
      : null);

  const toggleSearch = () => {
    if (!phone.search) return;
    if (searchOpen) {
      // Closing clears: a hidden query must never keep filtering the list.
      if (phone.search.value) phone.search.onChange('');
      setSearchOpen(false);
    } else {
      setSearchOpen(true);
    }
  };

  return (
    <header
      className="sticky top-0 z-40 shrink-0 glass-bar border-b border-hairline pt-[env(safe-area-inset-top)] md:hidden"
      data-phone-top-bar
    >
      <div className="flex h-12 items-center gap-0.5 px-1.5">
        {isRoot ? (
          <>
            <Link href="/" className="flex h-11 w-11 shrink-0 items-center justify-center" aria-label={t('Accueil')}>
              <Logo collapsed className="[&_img]:h-7 [&_img]:w-7 [&>span]:h-7 [&>span]:w-7 [&>span]:text-sm" />
            </Link>
            {segmentItems ? (
              <Segmented
                size="xs"
                aria-label={t(area!.label)}
                className="min-w-0 flex-1 rounded-lg"
                value={navItem?.href}
                onValueChange={(href) => {
                  if (href !== pathname) router.push(href);
                }}
                options={segmentItems.map((i) => {
                  const own = isNavItemActive(pathname, i.href);
                  const count = i.href === '/mes-rappels' ? (unread > 0 ? unread : null) : own ? phone.count ?? null : null;
                  return {
                    value: i.href,
                    labelText: t(i.label),
                    label: (
                      <>
                        <span className="truncate">{t(i.label)}</span>
                        {count !== null && count !== undefined && count !== '' && (
                          <span className={cn('text-[11px] font-medium tabular-nums', own ? 'text-ink-2' : 'text-ink-3')}>{count}</span>
                        )}
                      </>
                    ),
                  };
                })}
              />
            ) : (
              <div className="flex min-w-0 flex-1 flex-col justify-center px-1">
                <div className="flex min-w-0 items-center gap-1.5">
                  <h1 className="min-w-0 truncate font-headline text-[17px] font-semibold leading-tight text-ink">{rootTitle ? t(rootTitle) : ''}</h1>
                  {!adminChips && phone.count !== undefined && phone.count !== null && phone.count !== '' && (
                    <span className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                      {phone.count}
                    </span>
                  )}
                </div>
                {phone.subtitle && <p className="truncate text-[12px] leading-tight text-ink-3">{phone.subtitle}</p>}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Record: « ‹ Parent » — up, not back (NN/g: one crumb pointing up). */}
            {upHref ? (
              <Link
                href={upHref}
                className="flex h-11 min-w-0 max-w-[7.5rem] shrink-0 items-center gap-0.5 rounded-md pl-1 pr-2 text-sm text-ink-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden />
                <span className="truncate">{upLabel ? t(upLabel) : ''}</span>
              </Link>
            ) : (
              <Link href="/" className="flex h-11 w-11 shrink-0 items-center justify-center" aria-label={t('Accueil')}>
                <Logo collapsed className="[&_img]:h-7 [&_img]:w-7 [&>span]:h-7 [&>span]:w-7 [&>span]:text-sm" />
              </Link>
            )}
            <div className="flex min-w-0 flex-1 flex-col justify-center px-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <h1 className={cn('min-w-0 truncate text-[16px] font-semibold leading-tight text-ink', phone.titleChip && 'font-mono tabular-nums')}>
                  {registeredTitle ? t(registeredTitle) : navItem ? t(navItem.title ?? navItem.label) : ''}
                </h1>
                {phone.titleChip && (
                  <Badge variant={phone.titleChip.tone ?? 'neutral'} className="max-w-[130px] shrink-0 truncate">
                    <span className="truncate">{t(phone.titleChip.label)}</span>
                  </Badge>
                )}
                {!phone.titleChip && phone.count !== undefined && phone.count !== null && phone.count !== '' && (
                  <span className="inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                    {phone.count}
                  </span>
                )}
              </div>
              {phone.subtitle && <p className="truncate text-[12px] leading-tight text-ink-3">{phone.subtitle}</p>}
            </div>
          </>
        )}

        {/* Trailing group: ⌕ · filtres · primary · ⋯ */}
        <div className="ml-0.5 flex shrink-0 items-center">
          {phone.search && (
            <button
              type="button"
              onClick={toggleSearch}
              aria-pressed={searchOpen}
              aria-label={t('Rechercher')}
              data-tour={phone.search.dataTour}
              className={cn(ICON_BTN, searchOpen && 'bg-surface-3 text-ink')}
            >
              <Search className="h-5 w-5" />
            </button>
          )}
          {phone.filters && (
            <button
              type="button"
              onClick={phone.filters.onOpen}
              aria-label={phone.filters.count > 0 ? `${t('Filtres')} (${phone.filters.count})` : t('Filtres')}
              data-tour={phone.filters.dataTour}
              className={cn(ICON_BTN, 'relative')}
            >
              <SlidersHorizontal className="h-5 w-5" />
              {phone.filters.count > 0 && (
                <span className="absolute right-0 top-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
                  {phone.filters.count}
                </span>
              )}
            </button>
          )}
          {primary &&
            (primary.href && !primary.disabled ? (
              <Link href={primary.href} aria-label={primary.label} data-tour={primary.dataTour} className={PRIMARY_BTN}>
                {primary.icon ?? <Plus />}
              </Link>
            ) : (
              <button type="button" onClick={primary.onClick} disabled={primary.disabled} aria-label={primary.label} data-tour={primary.dataTour} className={PRIMARY_BTN}>
                {primary.icon ?? <Plus />}
              </button>
            ))}
          {(isRoot || secondary.length > 0) && (
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={ICON_BTN}
              aria-label={t('Plus d’actions')}
              aria-haspopup="dialog"
              data-tour="shell-more"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Inline search row. */}
      {phone.search && searchOpen && (
        <div role="search" className="flex items-center gap-2 px-3 pb-2 animate-in fade-in-0 duration-150 motion-reduce:animate-none">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              value={phone.search.value}
              placeholder={phone.search.placeholder}
              aria-label={phone.search.ariaLabel ?? phone.search.placeholder ?? t('Rechercher')}
              onChange={(e) => phone.search!.onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                else if (e.key === 'Escape') {
                  e.stopPropagation();
                  toggleSearch();
                }
              }}
              className={cn(
                'h-10 w-full rounded-md border border-input bg-card pl-9 text-[16px] text-ink outline-none placeholder:text-ink-3 focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-search-cancel-button]:hidden',
                phone.search.value ? 'pr-10' : 'pr-3',
              )}
            />
            {phone.search.value && (
              <button
                type="button"
                aria-label={t('Effacer la recherche')}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => phone.search!.onChange('')}
                className="absolute right-0.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {phone.search.onSort && phone.search.sortLabel && (
            <button
              type="button"
              onClick={phone.search.onSort}
              aria-label={`${t('Trier')} : ${phone.search.sortLabel}`}
              className="inline-flex h-10 max-w-[38vw] shrink-0 items-center gap-1 rounded-md px-1.5 text-[13px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowUpDown className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate font-medium text-ink">{phone.search.sortLabel}</span>
            </button>
          )}
        </div>
      )}

      {/* Admin area: the destination chips live IN the bar. */}
      {isRoot && adminChips && (
        <ScopePills pills={adminChips} flush={false} ariaLabel={t('Administration')} className="pb-0 [&>div]:pb-2 [&>div]:pt-0" />
      )}

      {isRoot ? (
        <RootMoreSheet open={moreOpen} onOpenChange={setMoreOpen} pageActions={secondary} />
      ) : (
        secondary.length > 0 && <ActionSheet open={moreOpen} onOpenChange={setMoreOpen} title={t('Actions')} items={secondary} />
      )}
    </header>
  );
}
