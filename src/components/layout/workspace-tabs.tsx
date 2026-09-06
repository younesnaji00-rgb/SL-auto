'use client';

/**
 * Workspace tab strip — one component for every record kind (dossiers,
 * chiffrages). Hidden until at least one record is open, and each kind's
 * strip renders ONLY inside its own section (owner ruling 2026-09-02: the
 * dossier strip only on /dossiers pages, the chiffrage strip only on
 * /assignations-chiffrage pages — elsewhere the bar disappears entirely).
 * Open tabs survive regardless: the store keeps them, the strip just
 * unmounts.
 *
 * Keyboard (Alt-based because Ctrl/⌘+W, Ctrl+Tab are browser-reserved):
 *   Alt+W close active · Alt+1…9 jump · Alt+←/→ previous/next · Alt+Shift+T reopen.
 * Mouse: middle-click closes, double-click pins a preview tab, drag reorders.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
import { prefersReducedMotion } from '@/lib/motion';
import { useTabSlopeMorph } from '@/hooks/use-tab-morph';
import { useT } from '@/i18n';

const KIND_ICON: Record<TabKind, React.ElementType> = { dossier: FolderOpen, chiffrage: Calculator };

function confirmClose(api: KindTabsApi, id: string, t: (key: string) => string): boolean {
  if (!api.isDirty(id)) return true;
  return window.confirm(t('Cet onglet contient des modifications non enregistrées. Fermer quand même ?'));
}

function KindStrip({ api, active }: { api: KindTabsApi; active: boolean }) {
  const t = useT();
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const Icon = KIND_ICON[api.kind];

  // The active seat FLIES between tabs (symbiote morph, owner 2026-09-02).
  useTabSlopeMorph(scrollerRef);

  // FLIP (measure in layout px via offsetLeft — scroll- and zoom-independent):
  // when the tab ORDER changes (drag reorder, close), each surviving tab
  // animates from its old slot to its new one as a pure transform
  // (motion-spec §9, Paul Lewis FLIP; owner option H1 2026-09-02).
  const nodeRefs = useRef(new Map<string, HTMLElement>());
  const lastLeftsRef = useRef(new Map<string, number>());
  const orderKey = api.displayTabs.map((t) => t.id).join('|');
  React.useLayoutEffect(() => {
    const prev = lastLeftsRef.current;
    const next = new Map<string, number>();
    const reduce = prefersReducedMotion();
    nodeRefs.current.forEach((el, id) => {
      if (!el.isConnected) return;
      const left = el.offsetLeft;
      next.set(id, left);
      const old = prev.get(id);
      if (!reduce && old !== undefined && Math.abs(old - left) > 1 && typeof el.animate === 'function') {
        el.animate(
          [{ transform: `translateX(${old - left}px)` }, { transform: 'none' }],
          { duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
        );
      }
    });
    lastLeftsRef.current = next;
  }, [orderKey]);

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
      if (!confirmClose(api, id, t)) return;
      const finish = () => {
        const nextId = api.closeTab(id);
        if (id === api.activeId) goTo(nextId ?? LIST_TAB_ID);
      };
      // Exit = width collapse + fade, 150ms accelerate (owner option H1).
      // ONLY for background closes: closing the ACTIVE tab navigates, and
      // motion never gates input (motion-spec §1.3) — that close is instant.
      const el = nodeRefs.current.get(id);
      if (id === api.activeId || !el || prefersReducedMotion() || typeof el.animate !== 'function') {
        finish();
        return;
      }
      el.style.pointerEvents = 'none';
      el.style.overflow = 'hidden';
      el.style.minWidth = '0';
      const anim = el.animate(
        [
          { width: `${el.offsetWidth}px`, opacity: 1, paddingLeft: '12px', paddingRight: '12px' },
          { width: '0px', opacity: 0, paddingLeft: '0px', paddingRight: '0px' },
        ],
        { duration: 150, easing: 'cubic-bezier(0.3, 0, 1, 1)', fill: 'forwards' },
      );
      anim.onfinish = finish;
      anim.oncancel = finish;
    },
    [api, goTo, t],
  );

  const tabs = api.tabs;
  const activeIndex = tabs.findIndex((t) => t.id === api.activeId);

  const hotkeys = useMemo<Hotkey[]>(() => {
    if (!active) return [];
    const list: Hotkey[] = [
      { keys: 'alt+w', label: t("Fermer l'onglet actif"), group: t('Onglets'), allowInInput: true, handler: () => { if (api.activeId) close(api.activeId); } },
      { keys: 'alt+shift+t', label: t('Rouvrir le dernier onglet fermé'), group: t('Onglets'), allowInInput: true, handler: () => { const reopened = api.reopenClosed(); if (reopened) goTo(reopened.id); } },
      { keys: 'alt+arrowright', label: t('Onglet suivant'), group: t('Onglets'), allowInInput: true, handler: () => { const all = api.displayTabs; const i = all.findIndex((tab) => tab.id === api.activeTabId); const n = all[(i + 1) % all.length]; if (n) goTo(n.id); } },
      { keys: 'alt+arrowleft', label: t('Onglet précédent'), group: t('Onglets'), allowInInput: true, handler: () => { const all = api.displayTabs; const i = all.findIndex((tab) => tab.id === api.activeTabId); const n = all[(i - 1 + all.length) % all.length]; if (n) goTo(n.id); } },
    ];
    for (let n = 1; n <= 9; n++) {
      list.push({ keys: `alt+${n}`, label: n === 1 ? t('Aller à la liste (onglet 1)') : `${t("Aller à l'onglet")} ${n}`, group: t('Onglets'), allowInInput: true, handler: () => { const target = api.displayTabs[n - 1]; if (target) goTo(target.id); } });
    }
    return list;
  }, [active, api, close, goTo, t]);
  useHotkeys(hotkeys, [hotkeys]);

  const onDrop = (toIndex: number) => {
    if (dragIndex === null || dragIndex === toIndex) return;
    api.reorderTab(dragIndex, toIndex);
    setDragIndex(null);
  };

  return (
    <div className={cn('flex min-w-0 items-stretch self-stretch', !active && 'opacity-60 hover:opacity-100 transition-opacity')} data-kind={api.kind}>
      <div
        ref={scrollerRef}
        role="tablist"
        aria-label={api.kind === 'dossier' ? t('Dossiers ouverts') : t('Chiffrages ouverts')}
        // Raised tab on a visible track (owner ruling 2026-09-02; NN/g "Flat
        // design": quiet text-only tabs get skipped — the surface-2 strip is
        // the recessed track, the active tab a raised card with an accent
        // bar; NN/g Tabs Used Right: two selection indicators). items-end:
        // the tabs sit flush on the bar's bottom border so their outward
        // feet merge into the separation line (owner ruling ter).
        className="relative isolate flex min-w-0 items-end gap-4 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {api.displayTabs.map((tab, idx) => {
          const isActive = tab.id === api.activeTabId;
          const isList = tab.id === LIST_TAB_ID;
          const dirty = !isList && api.isDirty(tab.id);
          const tabIndexInTabs = idx - 1;
          // The permanent list tab's label is a config constant ("Dossiers" /
          // "Chiffrages") — a translation KEY. Record tabs carry live data.
          const label = isList ? t(tab.label) : tab.label;
          return (
            <div
              key={tab.id}
              ref={(el) => {
                if (el) nodeRefs.current.set(tab.id, el);
                else nodeRefs.current.delete(tab.id);
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              title={label}
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
                // Browser-tab shape (owner rulings 2026-09-02 + ter): `.tab-slope`
                // draws the trapezoid + outward feet (aria-selected drives the
                // active card fill; inactive tabs are grey surface-4).
                'tab-slope group relative flex h-8 min-w-0 max-w-[220px] shrink-0 cursor-pointer select-none items-center gap-1.5 self-end px-3 text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? 'font-semibold text-ink' : 'text-ink-3 hover:text-ink',
                tab.preview && 'italic',
              )}
            >
              {isList && <Icon className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />}
              {tab.pinned && !isList && <Pin className="h-3 w-3 shrink-0 text-ink-4" aria-label={t('Épinglé')} />}
              <span className="truncate">{label}</span>
              {dirty && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-label={t('Modifications non enregistrées')} title={t('Modifications non enregistrées')} />
              )}
              {!isList && (
                <button
                  type="button"
                  aria-label={`${t('Fermer')} ${label}`}
                  onClick={(e) => { e.stopPropagation(); close(tab.id); }}
                  // Ghost-style close (surface-3 hover, no rim at 16 px);
                  // revealed on hover/focus of inactive tabs.
                  className={cn(
                    'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink focus:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    // The strip is tablet-and-up, but a tablet is still a touch
                    // device: a close button that only appears on hover cannot
                    // be reached there (mobile pass 2026-09-06).
                    !isActive &&
                      '[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100',
                  )}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              {/* Accent bar (second indicator) — a real element because
                  ::after now draws the tab feet. */}
              <span
                aria-hidden
                className={cn('pointer-events-none absolute inset-x-2.5 bottom-[3px] h-0.5 rounded-full bg-primary transition-opacity duration-150', isActive ? 'opacity-100' : 'opacity-0')}
              />
              <span className="tab-feet" aria-hidden />
            </div>
          );
        })}
      </div>
      {(overflowing || tabs.length > 1) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 self-center px-1.5 text-xs text-ink-3" aria-label={t('Tous les onglets')} data-tour="shell-tabs-menu">
              <ChevronDown className="h-3.5 w-3.5" />
              {overflowing && <span className="tabular-nums">{tabs.length}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="t-label">{tabs.length} {tabs.length > 1 ? t('onglets') : t('onglet')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tabs.map((wt: WorkspaceTab) => (
              <DropdownMenuItem key={wt.id} onSelect={() => goTo(wt.id)} className={cn('gap-2', wt.id === api.activeId && 'font-medium')}>
                <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', api.isDirty(wt.id) ? 'bg-primary' : 'bg-transparent')} />
                <span className="min-w-0 flex-1 truncate">{wt.label}</span>
                <button
                  type="button"
                  aria-label={`${t('Fermer')} ${wt.label}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); close(wt.id); }}
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
                {tabs[activeIndex]?.pinned ? t("Détacher l'onglet actif") : t("Épingler l'onglet actif")}
              </DropdownMenuItem>
            )}
            {api.activeId && tabs.length > 1 && (
              <DropdownMenuItem onSelect={() => api.closeOthers(api.activeId!)}>{t('Fermer les autres onglets')}</DropdownMenuItem>
            )}
            {api.closedCount > 0 && (
              <DropdownMenuItem onSelect={() => { const reopened = api.reopenClosed(); if (reopened) goTo(reopened.id); }}>{t('Rouvrir le dernier onglet fermé')}</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function WorkspaceTabsInner() {
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const dossier = useWorkspaceTabs('dossier');
  const chiffrage = useWorkspaceTabs('chiffrage');

  // C7 — the devis editor is part of the chiffrage workflow
  // (chiffrage-redesign-spec): the chiffrage strip stays mounted on
  // /devis-editor and the active tab derives from the `chiffrageId` search
  // param (the route has no id segment there).
  const editorChiffrageId =
    pathname === '/devis-editor' ? searchParams.get('chiffrageId') : null;
  const chiffrageApi = useMemo(
    () =>
      editorChiffrageId
        ? { ...chiffrage, activeId: editorChiffrageId, activeTabId: editorChiffrageId }
        : chiffrage,
    [chiffrage, editorChiffrageId],
  );

  // Only the kind whose SECTION the user is currently in renders its strip
  // (owner ruling 2026-09-02) — on any other route the bar is absent.
  const kinds = [dossier, chiffrageApi].filter(
    (k) =>
      k.tabs.length > 0 &&
      (pathname === k.config.listHref ||
        pathname.startsWith(`${k.config.listHref}/`) ||
        (k.kind === 'chiffrage' && pathname === '/devis-editor')),
  );
  if (kinds.length === 0) return null;

  return (
    // Phones (< md) never show a tab strip: no phone browser does, the drag /
    // middle-click / double-click affordances are pointer-only, and the row
    // costs 40 px of a 844 px screen. The <WorkspaceSwitcher> chip in the
    // phone top bar opens the same list as a sheet instead (mobile-synthesis
    // §2, research A5).
    <div className="hidden h-10 w-full min-w-0 items-center gap-2 border-b border-hairline bg-surface-2 md:flex" data-workspace-tabs data-tour="shell-tabs">
      {kinds.map((api, i) => (
        <React.Fragment key={api.kind}>
          {i > 0 && <div className="my-1.5 w-px shrink-0 bg-hairline-strong" aria-hidden />}
          <KindStrip api={api} active />
        </React.Fragment>
      ))}
    </div>
  );
}

export default function WorkspaceTabs() {
  // C7 — useSearchParams requires a Suspense boundary above its caller for
  // static prerendering; the strip renders nothing during that fallback.
  return (
    <Suspense fallback={null}>
      <WorkspaceTabsInner />
    </Suspense>
  );
}
