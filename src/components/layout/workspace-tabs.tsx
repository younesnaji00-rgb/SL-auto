'use client';

/**
 * Workspace tab strip — one component for every record kind (dossiers,
 * chiffrages). Hidden until at least one record is open; stays mounted on
 * every route so open work never disappears (kinds outside the current
 * section render dimmed).
 *
 * Keyboard (Alt-based because Ctrl/⌘+W, Ctrl+Tab are browser-reserved):
 *   Alt+W close active · Alt+1…9 jump · Alt+←/→ previous/next · Alt+Shift+T reopen.
 * Mouse: middle-click closes, double-click pins a preview tab, drag reorders.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Calculator, ChevronDown, FolderOpen, Pin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LIST_TAB_ID, useWorkspaceTabs, type KindTabsApi, type TabKind, type WorkspaceTab } from '@/hooks/use-workspace-tabs';
import { useHotkeys, type Hotkey } from '@/hooks/use-hotkeys';

const KIND_ICON: Record<TabKind, React.ElementType> = { dossier: FolderOpen, chiffrage: Calculator };

function confirmClose(api: KindTabsApi, id: string): boolean {
  if (!api.isDirty(id)) return true;
  return window.confirm('Cet onglet contient des modifications non enregistrées. Fermer quand même ?');
}

function KindStrip({ api, active }: { api: KindTabsApi; active: boolean }) {
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const Icon = KIND_ICON[api.kind];

  // Overflow detection → "N autres" menu.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [api.displayTabs.length]);

  // Keep the active tab in view.
  useEffect(() => {
    const el = scrollerRef.current?.querySelector<HTMLElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [api.activeTabId]);

  const goTo = useCallback(
    (id: string) => {
      if (id === LIST_TAB_ID) router.push(api.config.listHref);
      else router.push(api.config.detailHref(id));
    },
    [router, api.config],
  );

  const close = useCallback(
    (id: string) => {
      if (!confirmClose(api, id)) return;
      const nextId = api.closeTab(id);
      if (id === api.activeId) goTo(nextId ?? LIST_TAB_ID);
    },
    [api, goTo],
  );

  const tabs = api.tabs;
  const activeIndex = tabs.findIndex((t) => t.id === api.activeId);

  const hotkeys = useMemo<Hotkey[]>(() => {
    if (!active) return [];
    const list: Hotkey[] = [
      { keys: 'alt+w', label: "Fermer l'onglet actif", group: 'Onglets', allowInInput: true, handler: () => { if (api.activeId) close(api.activeId); } },
      { keys: 'alt+shift+t', label: 'Rouvrir le dernier onglet fermé', group: 'Onglets', allowInInput: true, handler: () => { const t = api.reopenClosed(); if (t) goTo(t.id); } },
      { keys: 'alt+arrowright', label: 'Onglet suivant', group: 'Onglets', allowInInput: true, handler: () => { const all = api.displayTabs; const i = all.findIndex((t) => t.id === api.activeTabId); const n = all[(i + 1) % all.length]; if (n) goTo(n.id); } },
      { keys: 'alt+arrowleft', label: 'Onglet précédent', group: 'Onglets', allowInInput: true, handler: () => { const all = api.displayTabs; const i = all.findIndex((t) => t.id === api.activeTabId); const n = all[(i - 1 + all.length) % all.length]; if (n) goTo(n.id); } },
    ];
    for (let n = 1; n <= 9; n++) {
      list.push({ keys: `alt+${n}`, label: n === 1 ? 'Aller à la liste (onglet 1)' : `Aller à l'onglet ${n}`, group: 'Onglets', allowInInput: true, handler: () => { const t = api.displayTabs[n - 1]; if (t) goTo(t.id); } });
    }
    return list;
  }, [active, api, close, goTo]);
  useHotkeys(hotkeys, [hotkeys]);

  const onDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) return;
    api.reorderTab(dragIndex, toIndex);
    setDragIndex(null);
  };

  return (
    <div className={cn('flex min-w-0 items-stretch', !active && 'opacity-60 hover:opacity-100 transition-opacity')} data-kind={api.kind}>
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label={api.kind === 'dossier' ? 'Dossiers ouverts' : 'Chiffrages ouverts'}
        className="flex min-w-0 items-end gap-1 overflow-x-auto px-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {api.displayTabs.map((tab, idx) => {
          const isActive = tab.id === api.activeTabId;
          const isList = tab.id === LIST_TAB_ID;
          const dirty = !isList && api.isDirty(tab.id);
          const tabIndexInTabs = idx - 1;
          return (
            <div
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              title={tab.label}
              draggable={!isList}
              onDragStart={() => setDragIndex(tabIndexInTabs)}
              onDragOver={(e) => { if (!isList && dragIndex !== null) e.preventDefault(); }}
              onDrop={() => { if (!isList) onDrop(tabIndexInTabs); }}
              onClick={() => { if (!isActive) goTo(tab.id); }}
              onDoubleClick={() => { if (!isList && tab.preview) api.pinTab(tab.id); }}
              onAuxClick={(e) => { if (e.button === 1 && !isList) { e.preventDefault(); close(tab.id); } }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(tab.id); }
                if (e.key === 'ArrowRight') { const n = api.displayTabs[idx + 1]; if (n) goTo(n.id); }
                if (e.key === 'ArrowLeft') { const n = api.displayTabs[idx - 1]; if (n) goTo(n.id); }
                if ((e.key === 'Delete' || e.key === 'Backspace') && !isList) { e.preventDefault(); close(tab.id); }
              }}
              className={cn(
                'group relative flex h-8 min-w-0 max-w-[220px] shrink-0 cursor-pointer select-none items-center gap-1.5 rounded-t-md border border-b-0 px-2.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'border-hairline bg-background font-medium text-ink shadow-[0_1px_0_0_hsl(var(--background))]'
                  : 'border-transparent text-ink-3 hover:bg-background/60 hover:text-ink',
                tab.preview && 'italic',
              )}
            >
              {isList && <Icon className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />}
              {tab.pinned && !isList && <Pin className="h-3 w-3 shrink-0 text-ink-4" aria-label="Épinglé" />}
              <span className="truncate">{tab.label}</span>
              {dirty && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label="Modifications non enregistrées" title="Modifications non enregistrées" />
              )}
              {!isList && (
                <button
                  type="button"
                  aria-label={`Fermer ${tab.label}`}
                  onClick={(e) => { e.stopPropagation(); close(tab.id); }}
                  className={cn(
                    'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    !isActive && 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {(overflowing || tabs.length > 1) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="mb-0.5 h-7 shrink-0 gap-1 self-end px-1.5 text-xs text-ink-3" aria-label="Tous les onglets">
              <ChevronDown className="h-3.5 w-3.5" />
              {overflowing && <span className="tabular-nums">{tabs.length}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="t-label">{tabs.length} onglet{tabs.length > 1 ? 's' : ''}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tabs.map((t: WorkspaceTab) => (
              <DropdownMenuItem key={t.id} onSelect={() => goTo(t.id)} className={cn('gap-2', t.id === api.activeId && 'font-medium')}>
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', api.isDirty(t.id) ? 'bg-primary' : 'bg-transparent')} />
                <span className="min-w-0 flex-1 truncate">{t.label}</span>
                <button
                  type="button"
                  aria-label={`Fermer ${t.label}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); close(t.id); }}
                  className="rounded-sm p-0.5 text-ink-3 hover:bg-surface-3 hover:text-ink"
                >
                  <X className="h-3 w-3" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {api.activeId && (
              <DropdownMenuItem onSelect={() => api.pinTab(api.activeId!)}>
                <Pin className="mr-2 h-3.5 w-3.5" />
                {tabs[activeIndex]?.pinned ? "Détacher l'onglet actif" : "Épingler l'onglet actif"}
              </DropdownMenuItem>
            )}
            {api.activeId && tabs.length > 1 && (
              <DropdownMenuItem onSelect={() => api.closeOthers(api.activeId!)}>Fermer les autres onglets</DropdownMenuItem>
            )}
            {api.closedCount > 0 && (
              <DropdownMenuItem onSelect={() => { const t = api.reopenClosed(); if (t) goTo(t.id); }}>Rouvrir le dernier onglet fermé</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export default function WorkspaceTabs() {
  const pathname = usePathname() || '';
  const dossier = useWorkspaceTabs('dossier');
  const chiffrage = useWorkspaceTabs('chiffrage');

  const kinds = [dossier, chiffrage].filter((k) => k.tabs.length > 0);
  if (kinds.length === 0) return null;

  return (
    <div className="flex h-9 w-full min-w-0 items-stretch gap-2 border-b border-hairline bg-surface-2" data-workspace-tabs>
      {kinds.map((api, i) => {
        const active = pathname === api.config.listHref || pathname.startsWith(`${api.config.listHref}/`);
        return (
          <React.Fragment key={api.kind}>
            {i > 0 && <div className="my-1.5 w-px shrink-0 bg-hairline-strong" aria-hidden />}
            <KindStrip api={api} active={active} />
          </React.Fragment>
        );
      })}
    </div>
  );
}
