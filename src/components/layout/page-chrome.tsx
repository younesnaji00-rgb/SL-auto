'use client';

/**
 * Page chrome registry — the glue that keeps the H1, the breadcrumb's last
 * crumb, `document.title` and the workspace tab label in agreement.
 *
 * A page (via <PageHeader> or the dossier record bar) registers its title for
 * the current pathname; the breadcrumb reads it back for id-like segments, and
 * the provider mirrors it into `document.title` and a polite live region so
 * assistive tech hears "Navigué vers …" on client-side route changes.
 *
 * Mobile pass (2026-09-06, docs/research/mobile-synthesis.md §2): on phones
 * the top bar paints the page title, its count, ONE primary action and a
 * « ⋯ » overflow, and the bottom bar can be replaced by a contextual action
 * bar or a selection bar. Pages publish those through `usePhoneChrome(...)`;
 * the shell components read `usePageChrome().phone`. Everything is keyed by
 * pathname so a page that unmounts takes its chrome with it.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { documentTitle, findNavItem, titleForRoute } from '@/lib/nav-groups';
import { initDensity } from '@/lib/density';
import { useT } from '@/i18n';
import type { ActionItem } from '@/components/ui/action-sheet';

/** One filled 40×40 icon button in the phone top bar (A6). */
export interface PhonePrimaryAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  /** `data-tour` anchor to keep the tutorial pointing at the action. */
  dataTour?: string;
}

/** Contextual selection bar replacing the top bar (B §6 / Android CAB). */
export interface PhoneSelection {
  count: number;
  label?: string;
  onExit: () => void;
  onSelectAll?: () => void;
  allSelected?: boolean;
}

export interface PhoneChrome {
  /** Count pill next to the title. */
  count?: number | string | null;
  primaryAction?: PhonePrimaryAction | null;
  /** Rows of the « ⋯ » action sheet in the top bar. */
  secondaryActions?: ActionItem[];
  /** The page has a search field: the top bar shows a search icon that calls this. */
  onSearchFocus?: (() => void) | null;
  selection?: PhoneSelection | null;
  /** Set by <BottomActionBar>: the nav bar hides, `--bottom-bar` follows. */
  hideBottomNav?: boolean;
  /** Record pages: the top bar shows an up-link to this route instead of the crumb parent. */
  upHref?: string | null;
  upLabel?: string | null;
  /** Second title line (record pages: assuré name under the ref). */
  subtitle?: string | null;
}

interface PageChromeValue {
  /** Title registered for the current pathname (record identity on detail pages). */
  registeredTitle: string | null;
  registerTitle: (pathname: string, title: string | null) => void;
  /** Phone chrome published by the current page (merged from every caller). */
  phone: PhoneChrome;
  publishPhone: (pathname: string, key: string, chrome: PhoneChrome | null) => void;
}

const PageChromeContext = createContext<PageChromeValue>({
  registeredTitle: null,
  registerTitle: () => {},
  phone: {},
  publishPhone: () => {},
});

export function PageChromeProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname() || '/';
  const [titles, setTitles] = useState<Record<string, string | null>>({});
  const [phoneByPath, setPhoneByPath] = useState<Record<string, Record<string, PhoneChrome>>>({});
  const [announcement, setAnnouncement] = useState('');
  const lastAnnouncedRef = useRef<string>('');

  const registerTitle = useCallback((path: string, title: string | null) => {
    setTitles((prev) => (prev[path] === title ? prev : { ...prev, [path]: title }));
  }, []);

  const publishPhone = useCallback((path: string, key: string, chrome: PhoneChrome | null) => {
    setPhoneByPath((prev) => {
      const forPath = { ...(prev[path] ?? {}) };
      if (chrome) forPath[key] = chrome;
      else delete forPath[key];
      return { ...prev, [path]: forPath };
    });
  }, []);

  const registeredTitle = titles[pathname] ?? null;

  // Later publishers win on conflicting keys (a record bar publishing after
  // the page header), so ordering follows mount order.
  const phone = useMemo<PhoneChrome>(() => {
    const parts = phoneByPath[pathname];
    if (!parts) return {};
    return Object.values(parts).reduce<PhoneChrome>((acc, p) => ({ ...acc, ...p }), {});
  }, [phoneByPath, pathname]);

  // Fallback title from the nav config when a page hasn't registered one.
  const effectiveTitle = useMemo(() => {
    if (registeredTitle) return registeredTitle;
    const item = findNavItem(pathname);
    return item ? titleForRoute(item.href) : null;
  }, [registeredTitle, pathname]);

  // The registry stores the FRENCH key (the breadcrumb translates it the same
  // way); translate only where the title is actually shown.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.title = documentTitle(effectiveTitle ? t(effectiveTitle) : effectiveTitle);
  }, [effectiveTitle, t]);

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
    const timer = window.setTimeout(() => setAnnouncement(`${t('Navigué vers')} ${t(effectiveTitle)}`), 50);
    return () => window.clearTimeout(timer);
  }, [pathname, effectiveTitle, t]);

  const value = useMemo(
    () => ({ registeredTitle, registerTitle, phone, publishPhone }),
    [registeredTitle, registerTitle, phone, publishPhone],
  );

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

let phoneKeySeq = 0;

/**
 * Publish phone chrome for the current route. Callers pass a memoised object
 * (or inline — the hook compares by JSON of the non-function fields and the
 * identity of functions, so re-renders with equal content don't loop).
 *
 *   usePhoneChrome({ primaryAction: { label: 'Nouveau dossier', icon: <Plus/>, onClick }, secondaryActions, onSearchFocus });
 */
export function usePhoneChrome(chrome: PhoneChrome | null | undefined) {
  const pathname = usePathname() || '/';
  const { publishPhone } = usePageChrome();
  const keyRef = useRef<string>('');
  if (!keyRef.current) keyRef.current = `pc${++phoneKeySeq}`;
  // Stable signature: primitives by value, functions/nodes by identity.
  const sig = chrome
    ? JSON.stringify({
        count: chrome.count ?? null,
        pa: chrome.primaryAction ? [chrome.primaryAction.label, chrome.primaryAction.href ?? null, !!chrome.primaryAction.disabled, chrome.primaryAction.dataTour ?? null] : null,
        sa: chrome.secondaryActions?.map((a) => [String(a.key ?? ''), typeof a.label === 'string' ? a.label : '', !!a.hidden, !!a.disabled, !!a.destructive, a.href ?? null]) ?? null,
        sel: chrome.selection ? [chrome.selection.count, chrome.selection.label ?? null, !!chrome.selection.allSelected] : null,
        hide: !!chrome.hideBottomNav,
        up: [chrome.upHref ?? null, chrome.upLabel ?? null],
        sub: chrome.subtitle ?? null,
        hasSearch: !!chrome.onSearchFocus,
      })
    : 'null';
  const fnRef = useRef(chrome);
  fnRef.current = chrome;
  useEffect(() => {
    const key = keyRef.current;
    publishPhone(pathname, key, fnRef.current ?? null);
    return () => publishPhone(pathname, key, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, sig, publishPhone]);
}

/**
 * Skip link — first element in the tab order, visible only when focused.
 * Target: `<main id="main-content">` in the app layout.
 */
export function SkipToContent() {
  const t = useT();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-rim-filled"
    >
      {t('Aller au contenu')}
    </a>
  );
}
