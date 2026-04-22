'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDossierTabs } from '@/hooks/use-dossier-tabs';

/**
 * Horizontal strip of in-app "browser tabs" for opened dossiers.
 * Mimics the semantics of real browser tabs but lives inside the app shell.
 */
export default function DossierTabsBar() {
  const router = useRouter();
  const { tabs, activeDossierId, closeTab } = useDossierTabs();

  // Reserve the same height whether tabs are present or not to avoid jitter.
  if (tabs.length === 0) {
    return <div className="h-0" aria-hidden="true" />;
  }

  const handleTabClick = (id: string) => {
    if (id === activeDossierId) return;
    router.push(`/dossiers/${id}`);
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    const nextId = closeTab(id);
    // Only navigate if we just closed the active tab.
    if (id === activeDossierId) {
      if (nextId) {
        router.push(`/dossiers/${nextId}`);
      } else {
        router.push('/dossiers');
      }
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Dossiers ouverts"
      className="flex h-10 w-full items-stretch gap-1 overflow-x-auto whitespace-nowrap border-b bg-muted/30 px-2"
    >
      {tabs.map((tab) => {
        const isActive = tab.dossierId === activeDossierId;
        return (
          <div
            key={tab.dossierId}
            role="tab"
            aria-selected={isActive}
            tabIndex={0}
            onClick={() => handleTabClick(tab.dossierId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleTabClick(tab.dossierId);
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
            <button
              type="button"
              aria-label={`Fermer ${tab.label}`}
              onClick={(e) => handleClose(e, tab.dossierId)}
              className={cn(
                'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors',
                'hover:bg-destructive/10 hover:text-destructive focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
