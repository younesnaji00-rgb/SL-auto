'use client';

/**
 * Shared page header — the one place a page's title, count, primary action,
 * tabs and filters live (Atlassian page-header anatomy: title line with
 * actions right-aligned, filters/tabs below, left-aligned).
 *
 * Also owns the "where am I" mechanics: registers the title for the breadcrumb
 * and `document.title`, and moves keyboard focus to the H1 on route change so
 * screen-reader users land on the new page's heading.
 */

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRegisterPageTitle } from './page-chrome';

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
  /** Right slot — at most one filled primary button. */
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
}: PageHeaderProps) {
  const pathname = usePathname();
  const h1Ref = useRef<HTMLHeadingElement>(null);
  const text = titleText ?? (typeof title === 'string' ? title : undefined);
  useRegisterPageTitle(text ?? null);

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
    <header className={cn('flex flex-col gap-3', className)} data-page-header>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {backHref && (
            <Button variant="outline" size="icon" asChild className="h-9 w-9 shrink-0 mt-0.5">
              <Link href={backHref} aria-label={backLabel} title={backLabel}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              {icon && <span className="inline-flex shrink-0 text-muted-foreground [&>svg]:h-5 [&>svg]:w-5">{icon}</span>}
              <h1
                ref={h1Ref}
                tabIndex={-1}
                className={cn('min-w-0 outline-none', compact ? 't-title' : 't-display')}
              >
                {title}
              </h1>
              {count !== undefined && count !== null && (
                <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-muted px-2 text-xs font-medium tabular-nums text-muted-foreground">
                  {count}
                </span>
              )}
              {meta}
            </div>
            {subtitle && (
              <p className={cn('mt-1 max-w-[65ch] text-ink-3', compact ? 'text-xs' : 'text-sm')}>{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {tabs && <div className="flex flex-wrap items-center gap-2">{tabs}</div>}
      {filters && <div className="flex flex-wrap items-center gap-2">{filters}</div>}
    </header>
  );
}

export default PageHeader;
