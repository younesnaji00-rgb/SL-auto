'use client';

/**
 * Workspace tabs — one store for every "browser-like" tab strip in the app
 * (dossiers, chiffrages). Replaces the two near-identical per-kind providers.
 *
 * Semantics (WinUI TabView / Zendesk ticket tabs / VS Code preview tabs):
 * - a permanent list tab per kind that cannot be closed;
 * - closing the active tab selects its neighbour;
 * - preview tabs (single click) are replaced by the next preview; pinning,
 *   editing or double-click makes them permanent;
 * - a dirty flag per tab (unsaved changes) with confirm-on-close;
 * - a closed-tab history for "reopen last closed";
 * - a cross-kind MRU ("Récents") persisted in localStorage.
 */

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

export type TabKind = 'dossier' | 'chiffrage';

export interface WorkspaceTab {
  id: string;
  label: string;
  /** Single-click preview: replaced by the next preview tab. */
  preview?: boolean;
  pinned?: boolean;
}

export interface RecentRecord {
  kind: TabKind;
  id: string;
  label: string;
  at: number;
}

export interface TabKindConfig {
  listHref: string;
  listLabel: string;
  detailHref: (id: string) => string;
  /** sessionStorage key (kept backward-compatible with the old per-kind stores). */
  storageKey: string;
}

export const TAB_KINDS: Record<TabKind, TabKindConfig> = {
  dossier: {
    listHref: '/dossiers',
    listLabel: 'Dossiers',
    detailHref: (id) => `/dossiers/${id}`,
    storageKey: 'sl-auto:dossier-tabs',
  },
  chiffrage: {
    listHref: '/assignations-chiffrage',
    listLabel: 'Chiffrages',
    detailHref: (id) => `/assignations-chiffrage/${id}`,
    storageKey: 'sl-auto:chiffrage-tabs',
  },
};

const RECENTS_KEY = 'sl-auto:recents';
const RECENTS_MAX = 8;
const CLOSED_MAX = 10;

type TabsByKind = Record<TabKind, WorkspaceTab[]>;

interface WorkspaceTabsValue {
  tabsByKind: TabsByKind;
  dirty: Record<string, boolean>; // `${kind}:${id}` → dirty
  recents: RecentRecord[];
  closedByKind: Record<TabKind, WorkspaceTab[]>;
  openTab: (kind: TabKind, id: string, label?: string, opts?: { preview?: boolean }) => void;
  closeTab: (kind: TabKind, id: string, activeId: string | null) => string | null;
  closeOthers: (kind: TabKind, keepId: string) => void;
  pinTab: (kind: TabKind, id: string) => void;
  reorderTab: (kind: TabKind, fromIndex: number, toIndex: number) => void;
  reopenClosed: (kind: TabKind) => WorkspaceTab | null;
  refreshTabLabel: (kind: TabKind, id: string, label: string) => void;
  setDirty: (kind: TabKind, id: string, dirty: boolean) => void;
  touchRecent: (kind: TabKind, id: string, label: string) => void;
}

const WorkspaceTabsContext = createContext<WorkspaceTabsValue | null>(null);

function shortId(id: string): string {
  return id.length <= 6 ? id : id.slice(0, 6);
}

function defaultLabel(kind: TabKind, id: string): string {
  return `${kind === 'dossier' ? 'Dossier' : 'Chiffrage'} ${shortId(id)}`;
}

function readTabs(kind: TabKind): WorkspaceTab[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(TAB_KINDS[kind].storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((t: any) => {
        if (!t || typeof t !== 'object') return null;
        // Accept the legacy `{dossierId|chiffrageId,label}` shape.
        const id = t.id ?? t.dossierId ?? t.chiffrageId;
        if (typeof id !== 'string' || typeof t.label !== 'string') return null;
        return { id, label: t.label, preview: !!t.preview, pinned: !!t.pinned } as WorkspaceTab;
      })
      .filter((t): t is WorkspaceTab => !!t);
  } catch {
    return [];
  }
}

function writeTabs(kind: TabKind, tabs: WorkspaceTab[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(TAB_KINDS[kind].storageKey, JSON.stringify(tabs));
  } catch {
    /* quota / privacy errors are non-fatal */
  }
}

function readRecents(): RecentRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r: any) => r && typeof r.id === 'string' && typeof r.label === 'string' && (r.kind === 'dossier' || r.kind === 'chiffrage'),
    );
  } catch {
    return [];
  }
}

function writeRecents(recents: RecentRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
  } catch {
    /* ignore */
  }
}

export function WorkspaceTabsProvider({ children }: { children: React.ReactNode }) {
  const [tabsByKind, setTabsByKind] = useState<TabsByKind>({ dossier: [], chiffrage: [] });
  const [closedByKind, setClosedByKind] = useState<Record<TabKind, WorkspaceTab[]>>({ dossier: [], chiffrage: [] });
  const [dirty, setDirtyState] = useState<Record<string, boolean>>({});
  const [recents, setRecents] = useState<RecentRecord[]>([]);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    setTabsByKind({ dossier: readTabs('dossier'), chiffrage: readTabs('chiffrage') });
    setRecents(readRecents());
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    writeTabs('dossier', tabsByKind.dossier);
    writeTabs('chiffrage', tabsByKind.chiffrage);
  }, [tabsByKind]);

  const touchRecent = useCallback((kind: TabKind, id: string, label: string) => {
    if (!id) return;
    setRecents((prev) => {
      const rest = prev.filter((r) => !(r.kind === kind && r.id === id));
      const next = [{ kind, id, label: label || defaultLabel(kind, id), at: Date.now() }, ...rest].slice(0, RECENTS_MAX);
      writeRecents(next);
      return next;
    });
  }, []);

  const openTab = useCallback(
    (kind: TabKind, id: string, label?: string, opts?: { preview?: boolean }) => {
      if (!id || id === LIST_TAB_ID) return;
      const hasLabel = !!label && label.trim().length > 0;
      const safeLabel = hasLabel ? label!.trim() : defaultLabel(kind, id);
      setTabsByKind((prev) => {
        const list = prev[kind];
        const existing = list.find((t) => t.id === id);
        if (existing) {
          let changed = false;
          const next = list.map((t) => {
            if (t.id !== id) return t;
            const updated = { ...t };
            if (hasLabel && t.label !== safeLabel) { updated.label = safeLabel; changed = true; }
            // Re-opening an existing preview without `preview` promotes it.
            if (t.preview && !opts?.preview) { updated.preview = false; changed = true; }
            return updated;
          });
          return changed ? { ...prev, [kind]: next } : prev;
        }
        let next = list;
        if (opts?.preview) {
          // Replace the current preview tab (if any) instead of adding one.
          const previewIdx = list.findIndex((t) => t.preview);
          if (previewIdx !== -1) {
            next = list.slice();
            next[previewIdx] = { id, label: safeLabel, preview: true };
            return { ...prev, [kind]: next };
          }
        }
        return { ...prev, [kind]: [...list, { id, label: safeLabel, preview: !!opts?.preview }] };
      });
      if (hasLabel) touchRecent(kind, id, safeLabel);
    },
    [touchRecent],
  );

  const refreshTabLabel = useCallback(
    (kind: TabKind, id: string, label: string) => {
      const trimmed = (label || '').trim();
      if (!id || !trimmed) return;
      setTabsByKind((prev) => {
        const list = prev[kind];
        const idx = list.findIndex((t) => t.id === id);
        if (idx === -1 || list[idx].label === trimmed) return prev;
        const next = list.slice();
        next[idx] = { ...next[idx], label: trimmed };
        return { ...prev, [kind]: next };
      });
      touchRecent(kind, id, trimmed);
    },
    [touchRecent],
  );

  const closeTab = useCallback((kind: TabKind, id: string, activeId: string | null): string | null => {
    if (id === LIST_TAB_ID) return null;
    let nextId: string | null = null;
    setTabsByKind((prev) => {
      const list = prev[kind];
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      if (id === activeId) {
        const neighbor = list[idx + 1] ?? list[idx - 1] ?? null;
        nextId = neighbor ? neighbor.id : null;
      } else {
        nextId = activeId;
      }
      const closed = list[idx];
      setClosedByKind((c) => ({ ...c, [kind]: [closed, ...c[kind].filter((t) => t.id !== closed.id)].slice(0, CLOSED_MAX) }));
      return { ...prev, [kind]: list.filter((t) => t.id !== id) };
    });
    setDirtyState((d) => {
      const key = `${kind}:${id}`;
      if (!(key in d)) return d;
      const { [key]: _omit, ...rest } = d;
      return rest;
    });
    return nextId;
  }, []);

  const closeOthers = useCallback((kind: TabKind, keepId: string) => {
    setTabsByKind((prev) => ({ ...prev, [kind]: prev[kind].filter((t) => t.id === keepId || t.pinned) }));
  }, []);

  const pinTab = useCallback((kind: TabKind, id: string) => {
    setTabsByKind((prev) => ({
      ...prev,
      [kind]: prev[kind].map((t) => (t.id === id ? { ...t, pinned: !t.pinned, preview: false } : t)),
    }));
  }, []);

  const reorderTab = useCallback((kind: TabKind, fromIndex: number, toIndex: number) => {
    setTabsByKind((prev) => {
      const list = prev[kind].slice();
      if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) return prev;
      const [moved] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, moved);
      return { ...prev, [kind]: list };
    });
  }, []);

  const reopenClosed = useCallback(
    (kind: TabKind): WorkspaceTab | null => {
      const last = closedByKind[kind][0] ?? null;
      if (!last) return null;
      setClosedByKind((c) => ({ ...c, [kind]: c[kind].slice(1) }));
      openTab(kind, last.id, last.label);
      return last;
    },
    [closedByKind, openTab],
  );

  const setDirty = useCallback((kind: TabKind, id: string, isDirty: boolean) => {
    const key = `${kind}:${id}`;
    setDirtyState((d) => {
      if (!!d[key] === isDirty) return d;
      if (!isDirty) {
        const { [key]: _omit, ...rest } = d;
        return rest;
      }
      return { ...d, [key]: true };
    });
  }, []);

  const value = useMemo<WorkspaceTabsValue>(
    () => ({
      tabsByKind,
      dirty,
      recents,
      closedByKind,
      openTab,
      closeTab,
      closeOthers,
      pinTab,
      reorderTab,
      reopenClosed,
      refreshTabLabel,
      setDirty,
      touchRecent,
    }),
    [tabsByKind, dirty, recents, closedByKind, openTab, closeTab, closeOthers, pinTab, reorderTab, reopenClosed, refreshTabLabel, setDirty, touchRecent],
  );

  return <WorkspaceTabsContext.Provider value={value}>{children}</WorkspaceTabsContext.Provider>;
}

function useStore(): WorkspaceTabsValue {
  const ctx = useContext(WorkspaceTabsContext);
  if (!ctx) throw new Error('useWorkspaceTabs must be used within a WorkspaceTabsProvider');
  return ctx;
}

/** Cross-kind data: recents, dirty map, raw store. */
export function useWorkspaceStore() {
  return useStore();
}

export interface KindTabsApi {
  kind: TabKind;
  config: TabKindConfig;
  tabs: WorkspaceTab[];
  /** Permanent list tab + open tabs. */
  displayTabs: WorkspaceTab[];
  /** Id of the record currently open (route param), or null. */
  activeId: string | null;
  /** Active tab id: LIST_TAB_ID on the list route, else the record id. */
  activeTabId: string | null;
  isDirty: (id: string) => boolean;
  openTab: (id: string, label?: string, opts?: { preview?: boolean }) => void;
  closeTab: (id: string) => string | null;
  closeOthers: (keepId: string) => void;
  pinTab: (id: string) => void;
  reorderTab: (fromIndex: number, toIndex: number) => void;
  reopenClosed: () => WorkspaceTab | null;
  refreshTabLabel: (id: string, label: string) => void;
  setDirty: (id: string, dirty: boolean) => void;
  closedCount: number;
}

/** Per-kind API — what tab strips and pages use. */
export function useWorkspaceTabs(kind: TabKind): KindTabsApi {
  const store = useStore();
  const config = TAB_KINDS[kind];
  const pathname = usePathname() || '';
  const params = useParams();
  const rawId = params && (params as Record<string, string | string[] | undefined>).id;
  const idFromParams = Array.isArray(rawId) ? rawId[0] : rawId;

  const activeId = useMemo<string | null>(() => {
    if (idFromParams && typeof idFromParams === 'string' && pathname.startsWith(`${config.listHref}/`)) return idFromParams;
    return null;
  }, [idFromParams, pathname, config.listHref]);

  const tabs = store.tabsByKind[kind];
  const displayTabs = useMemo<WorkspaceTab[]>(() => [{ id: LIST_TAB_ID, label: config.listLabel, pinned: true }, ...tabs], [tabs, config.listLabel]);
  const activeTabId = pathname === config.listHref ? LIST_TAB_ID : activeId;

  return useMemo<KindTabsApi>(
    () => ({
      kind,
      config,
      tabs,
      displayTabs,
      activeId,
      activeTabId,
      isDirty: (id) => !!store.dirty[`${kind}:${id}`],
      openTab: (id, label, opts) => store.openTab(kind, id, label, opts),
      closeTab: (id) => store.closeTab(kind, id, activeId),
      closeOthers: (keepId) => store.closeOthers(kind, keepId),
      pinTab: (id) => store.pinTab(kind, id),
      reorderTab: (from, to) => store.reorderTab(kind, from, to),
      reopenClosed: () => store.reopenClosed(kind),
      refreshTabLabel: (id, label) => store.refreshTabLabel(kind, id, label),
      setDirty: (id, d) => store.setDirty(kind, id, d),
      closedCount: store.closedByKind[kind].length,
    }),
    [kind, config, tabs, displayTabs, activeId, activeTabId, store],
  );
}

/** Mark the current record tab dirty while `isDirty` is true (auto-clears on unmount). */
export function useTabDirty(kind: TabKind, id: string | null | undefined, isDirty: boolean) {
  const store = useStore();
  useEffect(() => {
    if (!id) return;
    store.setDirty(kind, id, isDirty);
    return () => store.setDirty(kind, id, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, id, isDirty]);
}
