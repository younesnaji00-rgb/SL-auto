'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook that persists filter state to localStorage per page.
 * Reads stored values on mount, writes on every change.
 */
export function usePersistedFilters<T extends Record<string, any>>(
  key: string,
  defaults: T
): [T, (updater: Partial<T> | ((prev: T) => T)) => void, (field?: keyof T) => void] {
  const storageKey = `filters_${key}`;

  const [filters, setFiltersRaw] = useState<T>(() => {
    if (typeof window === 'undefined') return defaults;
    try {
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

  // Persist to localStorage whenever filters change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(filters));
    } catch {
      // Ignore quota errors
    }
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
