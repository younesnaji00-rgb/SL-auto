'use client';

/**
 * Backward-compatible facade over the generic workspace-tabs store.
 * New code should use `useWorkspaceTabs('chiffrage')` directly.
 */

import React, { useMemo } from 'react';
import { LIST_TAB_ID, useWorkspaceTabs } from './use-workspace-tabs';

export { LIST_TAB_ID };

export interface ChiffrageTab {
  chiffrageId: string;
  label: string;
  preview?: boolean;
  pinned?: boolean;
}

interface ChiffrageTabsContextValue {
  tabs: ChiffrageTab[];
  displayTabs: ChiffrageTab[];
  activeChiffrageId: string | null;
  activeTabId: string | null;
  openTab: (chiffrageId: string, label?: string, opts?: { preview?: boolean }) => void;
  closeTab: (chiffrageId: string) => string | null;
  refreshTabLabel: (chiffrageId: string, label: string) => void;
}

/** No-op wrapper kept so existing layouts don't break; the real provider is WorkspaceTabsProvider. */
export function ChiffrageTabsProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function useChiffrageTabs(): ChiffrageTabsContextValue {
  const api = useWorkspaceTabs('chiffrage');
  return useMemo(
    () => ({
      tabs: api.tabs.map((t) => ({ chiffrageId: t.id, label: t.label, preview: t.preview, pinned: t.pinned })),
      displayTabs: api.displayTabs.map((t) => ({ chiffrageId: t.id, label: t.label, preview: t.preview, pinned: t.pinned })),
      activeChiffrageId: api.activeId,
      activeTabId: api.activeTabId,
      openTab: api.openTab,
      closeTab: api.closeTab,
      refreshTabLabel: api.refreshTabLabel,
    }),
    [api],
  );
}
