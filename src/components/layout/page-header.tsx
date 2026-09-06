'use client';

/**
 * Shared page header — the one place a page's title, count, primary action,
 * tabs and filters live (Atlassian page-header anatomy: title line with
 * actions right-aligned, filters/tabs below, left-aligned).
 *
 * Also owns the "where am I" mechanics: registers the title for the breadcrumb
 * and `document.title`, and moves keyboard focus to the H1 on route change so
 * screen-reader users land on the new page's heading.
 *
 * Mobile pass (2026-09-06, mobile-synthesis §2 A3): below `md` this component
 * paints NO heading, subtitle, meta or back button — the phone top bar carries
 * the title, the count, one primary action and a « ⋯ » sheet, published here
 * through the chrome registry. What survives in the body is the `tabs` row
 * (sticky under the bar) and the `filters` row.
 */

import React, { useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRegisterPageTitle, usePhoneChrome, type PhonePrimaryAction } from './page-chrome';
import type { ActionItem } from '@/components/ui/action-sheet';
import { useT } from '@/i18n';

export interface PageHeaderProps {
  title: React.ReactNode;
  /** Plain-text version of `title` used for document.title / breadcrumb. Required when `title` is not a string. */
  titleText?: string;
  subtitle?: React.ReactNode;
  /** Count shown as a muted pill next to the title. */
  count?: number | string | null;
  /** Small icon before the title (kept for pages that had one). */
  icon?: React.ReactNode;
  /** Chips/badges rendered inline after the title (status, role…). */
  meta?: React.ReactNode;
  /** Right slot — at most one filled primary button, placed LAST (right end). */
  actions?: React.ReactNode;
  /** Row under the title (Tabs / segmented controls). */
  tabs?: React.ReactNode;
  /** Row under the tabs (search, selects, chips). */
  filters?: React.ReactNode;
  /** Parent route: renders a "‹ Parent" back link before the title. */
  backHref?: string;
  backLabel?: string;
  /** Skip the H1 auto-focus (e.g. when the page focuses an input itself). */
  noAutoFocus?: boolean;
  /** Visual size — `compact` for detail pages and mobile-first screens. */
  size?: 'default' | 'compact';
  className?: string;
  /** PHONE: the page's one primary action (filled 40×40 icon button in the bar). */
  primaryAction?: PhonePrimaryAction | null;
  /** PHONE: rows of the top bar's « ⋯ » action sheet. */
  secondaryActions?: ActionItem[];
  /** PHONE: the bar shows a search icon that calls this (focuses the page's field). */
  onSearchFocus?: () => void;
  /** PHONE: keep the `tabs` row from sticking (pages that have their own sticky row). */
  tabsNotSticky?: boolean;
}

export function PageHeader({
  title,
  titleText,
  subtitle,
  count,
  icon,
  meta,
  actions,
  tabs,
  filters,
  backHref,
  backLabel = 'Retour',
  noAutoFocus,
  size = 'default',
  className,
  primaryAction,
  secondaryActions,
  onSearchFocus,
  tabsNotSticky,
}: PageHeaderProps) {
  const t = useT();
  const pathname = usePathname();
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const text = titleText ?? (typeof title === 'string' ? title : undefined);
  useRegisterPageTitle(text ?? null);

  // Phone chrome: the bar paints what the body no longer does.
  const phone = useMemo(
    () => ({
      count: count ?? null,
      primaryAction: primaryAction ?? null,
      secondaryActions,
      onSearchFocus: onSearchFocus ?? null,
    }),
    [count, primaryAction, secondaryActions, onSearchFocus],
  );
  usePhoneChrome(phone);

  // Move focus to the heading on route change (Gatsby × Fable finding: heading
  // focus is the clearest cue for assistive-tech users). Skip when the user is
  // already interacting with a field (e.g. autofocus search).
  useEffect(() => {
    if (noAutoFocus) return;
    const el = h1Ref.current;
    if (!el) return;
    const active = document.activeElement;
    if (active && active !== document.body && active.tagName !== 'A' && active !== el) return;
    const t = window.setTimeout(() => el.focus({ preventScroll: true }), 0);
    return () => window.clearTimeout(t);
  }, [pathname, noAutoFocus]);

  const compact = size === 'compact';

  return (
    // Title = t-display (28/600 Outfit), subtitle = t-caption; the page's
    // `space-y-6` wrapper provides the 24 px below the header.
    <header className={cn('flex flex-col gap-3', className)} data-page-header>
      {/* The title line is desktop/tablet only — on a phone it lives in the bar. */}
      <div className="hidden flex-wrap items-start justify-between gap-x-4 gap-y-2 md:flex">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {backHref && (
            <Button variant="outline" size="icon" asChild className="mt-0.5 h-9 w-9 shrink-0">
              {/* `backLabel` defaults to the French key "Retour"; a caller that
                  already translated its own label round-trips unchanged. */}
              <Link href={backHref} aria-label={t(backLabel)} title={t(backLabel)}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              {icon && <span className="inline-flex shrink-0 text-ink-3 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>}
              <h1
                ref={h1Ref}
                tabIndex={-1}
                className={cn('min-w-0 outline-none', compact ? 't-title' : 't-display')}
              >
                {title}
              </h1>
              {count !== undefined && count !== null && (
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                  {count}
                </span>
              )}
              {meta}
            </div>
            {subtitle && (
              <p className="t-caption mt-1 max-w-[65ch]">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>}
      </div>
      {tabs && (
        <div
          className={cn(
            'flex flex-wrap items-center gap-2',
            // Phone: the tab row is the page's own sticky row, right under the
            // 48 px bar (assignations-atg pattern, kept app-wide).
            !tabsNotSticky &&
              'max-md:sticky max-md:top-0 max-md:z-20 max-md:-mx-4 max-md:flex-nowrap max-md:overflow-x-auto max-md:bg-background max-md:px-4 max-md:py-2 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden',
          )}
        >
          {tabs}
        </div>
      )}
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
    </header>
  );
}

export default PageHeader;
