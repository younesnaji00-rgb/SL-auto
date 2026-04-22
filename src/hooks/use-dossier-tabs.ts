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

export interface DossierTab {
  dossierId: string;
  label: string;
}

interface DossierTabsContextValue {
  tabs: DossierTab[];
  activeDossierId: string | null;
  openTab: (dossierId: string, label?: string) => void;
  closeTab: (dossierId: string) => string | null;
  refreshTabLabel: (dossierId: string, label: string) => void;
}

const STORAGE_KEY = 'sl-auto:dossier-tabs';

const DossierTabsContext = createContext<DossierTabsContextValue | null>(null);

function shortId(id: string): string {
  return id.length <= 6 ? id : id.slice(0, 6);
}

function defaultLabel(dossierId: string): string {
  return `Dossier ${shortId(dossierId)}`;
}

function readFromStorage(): DossierTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (t): t is DossierTab =>
          !!t &&
          typeof t === 'object' &&
          typeof (t as DossierTab).dossierId === 'string' &&
          typeof (t as DossierTab).label === 'string'
      )
      .map((t) => ({ dossierId: t.dossierId, label: t.label }));
  } catch {
    return [];
  }
}

function writeToStorage(tabs: DossierTab[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
  } catch {
    // ignore quota / privacy errors
  }
}

export function DossierTabsProvider({ children }: { children: React.ReactNode }) {
  const [tabs, setTabs] = useState<DossierTab[]>([]);
  const hydrated = useRef(false);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = readFromStorage();
    if (stored.length > 0) setTabs(stored);
  }, []);

  // Mirror to sessionStorage on each change (after hydration)
  useEffect(() => {
    if (!hydrated.current) return;
    writeToStorage(tabs);
  }, [tabs]);

  const pathname = usePathname() || '';
  const params = useParams();
  const rawId = params && (params as Record<string, string | string[] | undefined>).id;
  const idFromParams = Array.isArray(rawId) ? rawId[0] : rawId;
  const activeDossierId = useMemo<string | null>(() => {
    if (idFromParams && typeof idFromParams === 'string' && pathname.startsWith('/dossiers/')) {
      return idFromParams;
    }
    return null;
  }, [idFromParams, pathname]);

  const openTab = useCallback((dossierId: string, label?: string) => {
    if (!dossierId) return;
    const safeLabel = label && label.trim().length > 0 ? label.trim() : defaultLabel(dossierId);
    setTabs((prev) => {
      const existing = prev.find((t) => t.dossierId === dossierId);
      if (existing) {
        // If we now have a better (non-default) label, upgrade it
        if (
          label &&
          label.trim().length > 0 &&
          existing.label !== safeLabel &&
          existing.label === defaultLabel(dossierId)
        ) {
          return prev.map((t) => (t.dossierId === dossierId ? { ...t, label: safeLabel } : t));
        }
        return prev;
      }
      return [...prev, { dossierId, label: safeLabel }];
    });
  }, []);

  const refreshTabLabel = useCallback((dossierId: string, label: string) => {
    if (!dossierId || !label || label.trim().length === 0) return;
    const trimmed = label.trim();
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.dossierId === dossierId);
      if (idx === -1) return prev;
      if (prev[idx].label === trimmed) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], label: trimmed };
      return next;
    });
  }, []);

  const closeTab = useCallback(
    (dossierId: string): string | null => {
      let nextId: string | null = null;
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.dossierId === dossierId);
        if (idx === -1) return prev;
        const isActive = dossierId === activeDossierId;
        if (isActive) {
          const neighbor = prev[idx + 1] ?? prev[idx - 1] ?? null;
          nextId = neighbor ? neighbor.dossierId : null;
        } else {
          nextId = activeDossierId;
        }
        return prev.filter((t) => t.dossierId !== dossierId);
      });
      return nextId;
    },
    [activeDossierId]
  );

  const value = useMemo<DossierTabsContextValue>(
    () => ({ tabs, activeDossierId, openTab, closeTab, refreshTabLabel }),
    [tabs, activeDossierId, openTab, closeTab, refreshTabLabel]
  );

  return React.createElement(DossierTabsContext.Provider, { value }, children);
}

export function useDossierTabs(): DossierTabsContextValue {
  const ctx = useContext(DossierTabsContext);
  if (!ctx) {
    throw new Error('useDossierTabs must be used within a DossierTabsProvider');
  }
  return ctx;
}
