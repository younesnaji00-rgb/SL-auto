'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useParams, usePathname } from 'next/navigation';

export const LIST_TAB_ID = '__list__';

export interface ChiffrageTab {
  chiffrageId: string;
  label: string;
}

interface ChiffrageTabsContextValue {
  tabs: ChiffrageTab[];
  displayTabs: ChiffrageTab[];
  activeChiffrageId: string | null;
  activeTabId: string | null;
  openTab: (chiffrageId: string, label?: string) => void;
  closeTab: (chiffrageId: string) => string | null;
  refreshTabLabel: (chiffrageId: string, label: string) => void;
}

const STORAGE_KEY = 'sl-auto:chiffrage-tabs';

const ChiffrageTabsContext = createContext<ChiffrageTabsContextValue | null>(null);

function shortId(id: string): string {
  return id.length <= 6 ? id : id.slice(0, 6);
}

function defaultLabel(chiffrageId: string): string {
  return `Chiffrage ${shortId(chiffrageId)}`;
}

function readFromStorage(): ChiffrageTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (t): t is ChiffrageTab =>
          !!t &&
          typeof t === 'object' &&
          typeof (t as ChiffrageTab).chiffrageId === 'string' &&
          typeof (t as ChiffrageTab).label === 'string'
      )
      .map((t) => ({ chiffrageId: t.chiffrageId, label: t.label }));
  } catch {
    return [];
  }
}

function writeToStorage(tabs: ChiffrageTab[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // ignore quota / privacy errors
  }
}

export function ChiffrageTabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<ChiffrageTab[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readFromStorage();
    if (stored.length > 0) setTabs(stored);
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    writeToStorage(tabs);
  }, [tabs]);

  const pathname = usePathname() || '';
  const params = useParams();
  const rawId = params && (params as Record<string, string | string[] | undefined>).id;
  const idFromParams = Array.isArray(rawId) ? rawId[0] : rawId;
  const activeChiffrageId = useMemo<string | null>(() => {
    if (idFromParams && typeof idFromParams === 'string' && pathname.startsWith('/assignations-chiffrage/')) {
      return idFromParams;
    }
    return null;
  }, [idFromParams, pathname]);

  const openTab = useCallback((chiffrageId: string, label?: string) => {
    if (!chiffrageId) return;
    if (chiffrageId === LIST_TAB_ID) return;
    const hasExplicitLabel = !!label && label.trim().length > 0;
    const safeLabel = hasExplicitLabel ? label!.trim() : defaultLabel(chiffrageId);
    setTabs((prev) => {
      const existing = prev.find((t) => t.chiffrageId === chiffrageId);
      if (existing) {
        if (hasExplicitLabel && existing.label !== safeLabel) {
          return prev.map((t) => (t.chiffrageId === chiffrageId ? { ...t, label: safeLabel } : t));
        }
        return prev;
      }
      return [...prev, { chiffrageId, label: safeLabel }];
    });
  }, []);

  const refreshTabLabel = useCallback((chiffrageId: string, label: string) => {
    if (!chiffrageId || !label || label.trim().length === 0) return;
    const trimmed = label.trim();
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.chiffrageId === chiffrageId);
      if (idx === -1) return prev;
      if (prev[idx].label === trimmed) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], label: trimmed };
      return next;
    });
  }, []);

  const closeTab = useCallback(
    (chiffrageId: string): string | null => {
      if (chiffrageId === LIST_TAB_ID) return null;
      let nextId: string | null = null;
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.chiffrageId === chiffrageId);
        if (idx === -1) return prev;
        const isActive = chiffrageId === activeChiffrageId;
        if (isActive) {
          const neighbor = prev[idx + 1] ?? prev[idx - 1] ?? null;
          nextId = neighbor ? neighbor.chiffrageId : null;
        } else {
          nextId = activeChiffrageId;
        }
        return prev.filter((t) => t.chiffrageId !== chiffrageId);
      });
      return nextId;
    },
    [activeChiffrageId]
  );

  const displayTabs = useMemo<ChiffrageTab[]>(
    () => [{ chiffrageId: LIST_TAB_ID, label: 'Chiffrages' }, ...tabs],
    [tabs]
  );

  const activeTabId = useMemo<string | null>(() => {
    if (pathname === '/assignations-chiffrage') return LIST_TAB_ID;
    return activeChiffrageId;
  }, [pathname, activeChiffrageId]);

  const value = useMemo<ChiffrageTabsContextValue>(
    () => ({ tabs, displayTabs, activeChiffrageId, activeTabId, openTab, closeTab, refreshTabLabel }),
    [tabs, displayTabs, activeChiffrageId, activeTabId, openTab, closeTab, refreshTabLabel]
  );

  return React.createElement(ChiffrageTabsContext.Provider, { value }, children);
}

export function useChiffrageTabs(): ChiffrageTabsContextValue {
  const ctx = useContext(ChiffrageTabsContext);
  if (!ctx) {
    throw new Error('useChiffrageTabs must be used within a ChiffrageTabsProvider');
  }
  return ctx;
}
