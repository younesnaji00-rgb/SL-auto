'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LIST_TAB_ID, useChiffrageTabs } from '@/hooks/use-chiffrage-tabs';

export default function ChiffrageTabsBar() {
  const router = useRouter();
  const { displayTabs, activeTabId, activeChiffrageId, closeTab } = useChiffrageTabs();

  if (displayTabs.length === 0) {
    return <div className="h-0" aria-hidden="true" />;
  }

  const handleTabClick = (id: string) => {
    if (id === activeTabId) return;
    if (id === LIST_TAB_ID) {
      router.push('/assignations-chiffrage');
      return;
    }
    router.push(`/assignations-chiffrage/${id}`);
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const nextId = closeTab(id);
    if (id === activeChiffrageId) {
      if (nextId) {
        router.push(`/assignations-chiffrage/${nextId}`);
      } else {
        router.push('/assignations-chiffrage');
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Chiffrages ouverts"
      className="flex h-10 w-full items-stretch gap-1 overflow-x-auto whitespace-nowrap border-b bg-muted/30 px-2"
    >
      {displayTabs.map((tab) => {
        const isActive = tab.chiffrageId === activeTabId;
        const isListTab = tab.chiffrageId === LIST_TAB_ID;
        return (
          <div
            key={tab.chiffrageId}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => handleTabClick(tab.chiffrageId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTabClick(tab.chiffrageId);
              }
            }}
            className={cn(
              'group relative flex min-w-0 max-w-[220px] shrink-0 cursor-pointer items-center gap-2 self-end rounded-t-md border border-b-0 px-3 py-1.5 text-xs transition-colors',
              isActive
                ? 'border-border bg-background font-semibold text-foreground shadow-sm'
                : 'border-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground'
            )}
            title={tab.label}
          >
            <span className="truncate">{tab.label}</span>
            {!isListTab && (
              <button
                type="button"
                aria-label={`Fermer ${tab.label}`}
                onClick={(e) => handleClose(e, tab.chiffrageId)}
                className={cn(
                  'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors',
                  'hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                )}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
