'use client';

/**
 * Backward-compatible facade over the generic workspace-tabs store.
 * New code should use `useWorkspaceTabs('dossier')` directly.
 */

import React, { useMemo } from 'react';
import { LIST_TAB_ID, useWorkspaceTabs } from './use-workspace-tabs';

export { LIST_TAB_ID };

export interface DossierTab {
  dossierId: string;
  label: string;
  preview?: boolean;
  pinned?: boolean;
}

interface DossierTabsContextValue {
  tabs: DossierTab[];
  displayTabs: DossierTab[];
  activeDossierId: string | null;
  activeTabId: string | null;
  openTab: (dossierId: string, label?: string, opts?: { preview?: boolean }) => void;
  closeTab: (dossierId: string) => string | null;
  refreshTabLabel: (dossierId: string, label: string) => void;
}

/** No-op wrapper kept so existing layouts don't break; the real provider is WorkspaceTabsProvider. */
export function DossierTabsProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

export function useDossierTabs(): DossierTabsContextValue {
  const api = useWorkspaceTabs('dossier');
  return useMemo(
    () => ({
      tabs: api.tabs.map((t) => ({ dossierId: t.id, label: t.label, preview: t.preview, pinned: t.pinned })),
      displayTabs: api.displayTabs.map((t) => ({ dossierId: t.id, label: t.label, preview: t.preview, pinned: t.pinned })),
      activeDossierId: api.activeId,
      activeTabId: api.activeTabId,
      openTab: api.openTab,
      closeTab: api.closeTab,
      refreshTabLabel: api.refreshTabLabel,
    }),
    [api],
  );
}
