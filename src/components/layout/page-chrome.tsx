'use client';

/**
 * Page chrome registry — the glue that keeps the H1, the breadcrumb's last
 * crumb, `document.title` and the workspace tab label in agreement.
 *
 * A page (via <PageHeader> or the dossier record bar) registers its title for
 * the current pathname; the breadcrumb reads it back for id-like segments, and
 * the provider mirrors it into `document.title` and a polite live region so
 * assistive tech hears "Navigué vers …" on client-side route changes.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { documentTitle, findNavItem, titleForRoute } from '@/lib/nav-groups';
import { initDensity } from '@/lib/density';

interface PageChromeValue {
  /** Title registered for the current pathname (record identity on detail pages). */
  registeredTitle: string | null;
  registerTitle: (pathname: string, title: string | null) => void;
}

const PageChromeContext = createContext<PageChromeValue>({
  registeredTitle: null,
  registerTitle: () => {},
});

export function PageChromeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const [titles, setTitles] = useState<Record<string, string | null>>({});
  const [announcement, setAnnouncement] = useState('');
  const lastAnnouncedRef = useRef<string>('');

  const registerTitle = useCallback((path: string, title: string | null) => {
    setTitles((prev) => (prev[path] === title ? prev : { ...prev, [path]: title }));
  }, []);

  const registeredTitle = titles[pathname] ?? null;

  // Fallback title from the nav config when a page hasn't registered one.
  const effectiveTitle = useMemo(() => {
    if (registeredTitle) return registeredTitle;
    const item = findNavItem(pathname);
    return item ? titleForRoute(item.href) : null;
  }, [registeredTitle, pathname]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = documentTitle(effectiveTitle);
  }, [effectiveTitle]);

  // User display preferences that live on <html> (density).
  useEffect(() => {
    initDensity();
  }, []);

  // Announce route changes once per (pathname, title) pair.
  useEffect(() => {
    if (!effectiveTitle) return;
    const key = `${pathname}|${effectiveTitle}`;
    if (lastAnnouncedRef.current === key) return;
    lastAnnouncedRef.current = key;
    // Clear then set so identical consecutive titles still announce.
    setAnnouncement('');
    const t = window.setTimeout(() => setAnnouncement(`Navigué vers ${effectiveTitle}`), 50);
    return () => window.clearTimeout(t);
  }, [pathname, effectiveTitle]);

  const value = useMemo(() => ({ registeredTitle, registerTitle }), [registeredTitle, registerTitle]);

  return (
    <PageChromeContext.Provider value={value}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </PageChromeContext.Provider>
  );
}

export function usePageChrome() {
  return useContext(PageChromeContext);
}

/**
 * Register the page title for the current route. Pass `null` while loading;
 * the nav-config fallback is used meanwhile.
 */
export function useRegisterPageTitle(title: string | null | undefined) {
  const pathname = usePathname() || '/';
  const { registerTitle } = usePageChrome();
  useEffect(() => {
    registerTitle(pathname, title ?? null);
    return () => registerTitle(pathname, null);
  }, [pathname, title, registerTitle]);
}

/**
 * Skip link — first element in the tab order, visible only when focused.
 * Target: `<main id="main-content">` in the app layout.
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
    >
      Aller au contenu
    </a>
  );
}
