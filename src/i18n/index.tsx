'use client';

/**
 * Lightweight i18n layer (white-label / multi-language support).
 *
 * Design: the FRENCH source string IS the translation key. `t('Enregistrer')`
 * returns "Save" in English and passes through unchanged in French. A missing
 * English entry falls back to the French text, so partial coverage can never
 * render a broken key — the app degrades to its original French.
 *
 * Usage in components:
 *   const t = useT();
 *   <Button>{t('Enregistrer')}</Button>
 *
 * Usage in non-React code (PDF generators, toast payload builders):
 *   import { t } from '@/i18n';
 *
 * NEVER wrap strings that are persisted to Firestore or compared as values
 * (roles, statuses, option ids) at their WRITE/COMPARE sites — only wrap at
 * DISPLAY sites.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { fr as dfFr, enCA as dfEnCA } from 'date-fns/locale';
import type { Locale as DateFnsLocale } from 'date-fns';
import { BRAND, type BrandLocale } from '@/lib/brand';
import { EN } from './en';

export type Locale = BrandLocale;

export const SUPPORTED_LOCALES: Locale[] = ['fr', 'en'];
export const LOCALE_NAMES: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
};

const STORAGE_KEY = `${BRAND.storagePrefix}.locale`;

const DEFAULT_LOCALE: Locale =
  (process.env.NEXT_PUBLIC_DEFAULT_LOCALE as Locale | undefined) ?? BRAND.defaultLocale;

// Module-level current locale so non-React code (PDF generators, email
// builders) translates consistently with the UI. The provider keeps this
// in sync with React state.
let currentLocale: Locale = DEFAULT_LOCALE;

const DICTIONARIES: Partial<Record<Locale, Record<string, string>>> = {
  en: EN,
};

/** Translate `key` (the French source string) into the active locale. */
export function t(key: string): string {
  if (currentLocale === 'fr') return key;
  const dict = DICTIONARIES[currentLocale];
  return dict?.[key] ?? key;
}

/** Current locale for non-React code. */
export function getLocale(): Locale {
  return currentLocale;
}

/** date-fns locale object matching the active language. */
export function dateFnsLocale(): DateFnsLocale {
  return currentLocale === 'en' ? dfEnCA : dfFr;
}

/** BCP-47 tag for toLocaleDateString / toLocaleString call sites. */
export function intlLocale(): string {
  return currentLocale === 'en' ? 'en-CA' : 'fr-FR';
}

// ── React context ─────────────────────────────────────────────────────

interface LocaleContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Initial render (incl. SSR) always uses the brand default so hydration
  // matches; the stored preference is applied right after mount.
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && SUPPORTED_LOCALES.includes(stored) && stored !== locale) {
        currentLocale = stored;
        setLocaleState(stored);
      }
    } catch {
      // Storage unavailable (private mode) — stay on the default.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((l: Locale) => {
    currentLocale = l;
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Non-fatal.
    }
    try {
      document.documentElement.lang = l;
    } catch {
      // SSR / non-DOM — ignore.
    }
  }, []);

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/**
 * Reactive translator — components re-render with the new language when the
 * user switches. Prefer this over the bare `t` import inside components.
 */
export function useT(): (key: string) => string {
  const { locale } = useLocale();
  return useCallback(
    (key: string) => {
      if (locale === 'fr') return key;
      return DICTIONARIES[locale]?.[key] ?? key;
    },
    [locale],
  );
}
