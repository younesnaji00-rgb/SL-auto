'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const URL_PARAM = 'f';

function encode(obj: unknown): string {
  try {
    const json = JSON.stringify(obj);
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

function decode(s: string): Record<string, any> | null {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Hook that persists filter state per page.
 *
 * - localStorage keeps the user's last filters across sessions.
 * - The URL (`?f=…`) mirrors them so a filtered list can be shared or
 *   bookmarked; a `?f=` in the address wins over localStorage on mount.
 */
export function usePersistedFilters<T extends Record<string, any>>(
  key: string,
  defaults: T
): [T, (updater: Partial<T> | ((prev: T) => T)) => void, (field?: keyof T) => void] {
  const storageKey = `filters_${key}`;

  const [filters, setFiltersRaw] = useState<T>(() => {
    if (typeof window === 'undefined') return defaults;
    try {
      const fromUrl = new URLSearchParams(window.location.search).get(URL_PARAM);
      if (fromUrl) {
        const parsed = decode(fromUrl);
        if (parsed) return { ...defaults, ...parsed } as T;
      }
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults so new fields get their default value
        return { ...defaults, ...parsed };
      }
    } catch {
      // Ignore corrupt data
    }
    return defaults;
  });

  // Persist to localStorage + URL whenever filters change
  const firstRun = useRef(true);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch {
      // Ignore quota errors
    }
    if (typeof window === 'undefined') return;
    // Mirror into the URL without a history entry (nuqs-style `replace`).
    try {
      const url = new URL(window.location.href);
      const isDefault = JSON.stringify(filters) === JSON.stringify(defaults);
      if (isDefault) {
        if (!url.searchParams.has(URL_PARAM) && firstRun.current) { firstRun.current = false; return; }
        url.searchParams.delete(URL_PARAM);
      } else {
        url.searchParams.set(URL_PARAM, encode(filters));
      }
      firstRun.current = false;
      const next = url.pathname + (url.search ? url.search : '') + url.hash;
      if (next !== window.location.pathname + window.location.search + window.location.hash) {
        window.history.replaceState(window.history.state, '', next);
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, filters]);

  const setFilters = useCallback((updater: Partial<T> | ((prev: T) => T)) => {
    setFiltersRaw(prev => {
      if (typeof updater === 'function') {
        return updater(prev);
      }
      return { ...prev, ...updater };
    });
  }, []);

  // Reset one field to its default, or reset all filters
  const clearFilter = useCallback((field?: keyof T) => {
    setFiltersRaw(prev => {
      if (field) {
        return { ...prev, [field]: defaults[field] };
      }
      return { ...defaults };
    });
  }, [defaults]);

  return [filters, setFilters, clearFilter];
}
