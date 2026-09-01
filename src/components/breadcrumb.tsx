'use client';

/**
 * Location breadcrumb (NN/g: hierarchy, not history).
 *
 * - Labels come from `NAV_GROUPS` / `EXTRA_ROUTES` — never hand-written here.
 * - No app-name root crumb: the sidebar is the home link.
 * - Top-level pages render nothing (the H1 is the location).
 * - Id-like segments are replaced by the title the page registered through
 *   <PageHeader> / the record bar (e.g. "SL-2026-0106 · Roy"), never shown raw.
 */

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { EXTRA_ROUTES, labelForRoute } from '@/lib/nav-groups';
import { usePageChrome } from '@/components/layout/page-chrome';

/** Firestore-id-like segments (16+ alphanumeric chars) or `[uid]`-style ids. */
const isIdSegment = (segment: string): boolean => /^[A-Za-z0-9_-]{16,}$/.test(segment);

export interface Crumb {
  href: string;
  label: string;
  isCurrent: boolean;
}

export function useCrumbs(): Crumb[] {
  const pathname = usePathname() || '/';
  const { registeredTitle } = usePageChrome();
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [];
  const root = `/${segments[0]}`;
  const extra = EXTRA_ROUTES[root];
  if (extra?.parent) {
    const parentLabel = labelForRoute(extra.parent);
    if (parentLabel) crumbs.push({ href: extra.parent, label: parentLabel, isCurrent: false });
  }
  const rootLabel = labelForRoute(root) ?? segments[0].charAt(0).toUpperCase() + segments[0].slice(1).replace(/-/g, ' ');
  crumbs.push({ href: root, label: rootLabel, isCurrent: segments.length === 1 });

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const href = '/' + segments.slice(0, i + 1).join('/');
    const isLast = i === segments.length - 1;
    let label: string;
    if (isIdSegment(seg)) {
      label = isLast && registeredTitle ? registeredTitle : '…';
    } else {
      label = labelForRoute(href) ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ');
    }
    crumbs.push({ href, label, isCurrent: isLast });
  }
  return crumbs;
}

const Breadcrumb = () => {
  const crumbs = useCrumbs();
  // Top-level pages: the H1 is the location; a one-item breadcrumb is noise.
  if (crumbs.length <= 1) return null;

  return (
    // NN/g breadcrumbs (https://www.nngroup.com/articles/breadcrumbs/):
    // hierarchy not history; "the last breadcrumb (denoting the current
    // page) should not be a link"; ">"-style separators; never wrap; on
    // phones only the parent level (see MobileUpCrumb in header.tsx).
    // Type = t-caption (12 px ink-3) so it never competes with the H1.
    <nav aria-label="Fil d'Ariane" className="flex min-w-0">
      <ol className="t-caption flex min-w-0 items-center gap-1.5 whitespace-nowrap">
        {crumbs.map((c, index) => (
          <React.Fragment key={c.href}>
            {index > 0 && (
              <li aria-hidden="true" className="shrink-0 text-ink-4">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
            )}
            <li className="min-w-0">
              {c.isCurrent ? (
                <span className="block truncate font-medium text-ink" aria-current="page">
                  {c.label}
                </span>
              ) : (
                <Link href={c.href} className="block truncate rounded-sm py-1 transition-colors hover:text-ink">
                  {c.label}
                </Link>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
