'use client';

/**
 * Workspace switcher — the phone form of the workspace tab strip
 * (mobile-synthesis §2, research A5: Chrome for Android shows a "Switch
 * tabs" count button, never a strip). A « N » chip (kind icon + count) in the
 * top bar's trailing slot, shown only when the store holds ≥ 2 tabs of the
 * current kind AND the route is inside that kind's section (same ruling as
 * the strip: dossier tabs on /dossiers pages, chiffrage tabs on
 * /assignations-chiffrage + /devis-editor). Tapping it opens a bottom sheet
 * listing the open records: 56 px rows (label, dirty dot, 44 px ×), the
 * active row highlighted, the list page first, « Fermer les autres » in the
 * footer. The store, preview / pin semantics and drafts are untouched.
 */

import React, { Suspense, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Calculator, FolderOpen, X } from 'lucide-react';
import { BottomSheet, BottomSheetFooter } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { LIST_TAB_ID, useWorkspaceTabs, type KindTabsApi, type TabKind } from '@/hooks/use-workspace-tabs';
import { useCloseThenNavigate } from '@/components/layout/plus-sheet';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

const KIND_ICON: Record<TabKind, React.ElementType> = { dossier: FolderOpen, chiffrage: Calculator };

function SwitcherInner() {
  const t = useT();
  const pathname = usePathname() || '';
  const searchParams = useSearchParams();
  const dossier = useWorkspaceTabs('dossier');
  const chiffrage = useWorkspaceTabs('chiffrage');
  const [open, setOpen] = useState(false);
  const navigate = useCloseThenNavigate(setOpen);

  // Same section + devis-editor rule as components/layout/workspace-tabs.tsx.
  const editorChiffrageId = pathname === '/devis-editor' ? searchParams.get('chiffrageId') : null;
  const chiffrageApi = useMemo<KindTabsApi>(
    () => (editorChiffrageId ? { ...chiffrage, activeId: editorChiffrageId, activeTabId: editorChiffrageId } : chiffrage),
    [chiffrage, editorChiffrageId],
  );
  const api = [dossier, chiffrageApi].find(
    (k) =>
      k.tabs.length >= 2 &&
      (pathname === k.config.listHref ||
        pathname.startsWith(`${k.config.listHref}/`) ||
        (k.kind === 'chiffrage' && pathname === '/devis-editor')),
  );
  if (!api) return null;

  const Icon = KIND_ICON[api.kind];
  const hrefOf = (id: string) => (id === LIST_TAB_ID ? api.config.listHref : api.config.detailHref(id));
  const title = api.kind === 'dossier' ? t('Dossiers ouverts') : t('Chiffrages ouverts');

  const close = (id: string) => {
    if (api.isDirty(id) && !window.confirm(t('Cet onglet contient des modifications non enregistrées. Fermer quand même ?'))) return;
    const nextId = api.closeTab(id);
    // Closing the record we are on navigates — after the sheet's own entry
    // is gone (see useCloseThenNavigate).
    if (id === api.activeId) navigate(hrefOf(nextId ?? LIST_TAB_ID));
  };

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${title} : ${api.tabs.length}`}
        onClick={() => setOpen(true)}
        className="inline-flex h-10 min-w-[44px] shrink-0 items-center justify-center gap-1 rounded-md bg-surface-2 px-2 text-[13px] font-semibold tabular-nums text-ink shadow-rim transition-colors hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        data-tour="shell-tabs-menu"
      >
        <Icon className="h-4 w-4 text-ink-2" aria-hidden />
        {api.tabs.length}
      </button>
      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={`${api.tabs.length} ${api.tabs.length > 1 ? t('onglets') : t('onglet')}`}
        flush
        footer={
          api.activeId && api.tabs.length > 1 ? (
            <BottomSheetFooter>
              <Button variant="outline" onClick={() => api.closeOthers(api.activeId!)}>
                {t('Fermer les autres onglets')}
              </Button>
            </BottomSheetFooter>
          ) : undefined
        }
      >
        <ul role="list" className="divide-y divide-hairline" data-tour="shell-tabs">
          {api.displayTabs.map((tab) => {
            const isList = tab.id === LIST_TAB_ID;
            const active = tab.id === api.activeTabId;
            const dirty = !isList && api.isDirty(tab.id);
            const label = isList ? t(tab.label) : tab.label;
            const href = hrefOf(tab.id);
            return (
              <li key={tab.id} className={cn('flex min-h-[56px] items-center', active && 'bg-accent')}>
                <a
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(href);
                  }}
                  className={cn(
                    'flex min-h-[56px] min-w-0 flex-1 items-center gap-3 px-4 text-[15px] transition-colors focus:outline-none focus-visible:bg-surface-2',
                    active ? 'font-semibold text-ink' : 'text-ink hover:bg-surface-2',
                    tab.preview && 'italic',
                  )}
                >
                  {isList && <Icon className="h-5 w-5 shrink-0 text-ink-2" aria-hidden />}
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                  {dirty && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-primary"
                      role="img"
                      aria-label={t('Modifications non enregistrées')}
                    />
                  )}
                </a>
                {!isList && (
                  <button
                    type="button"
                    aria-label={`${t('Fermer')} ${label}`}
                    onClick={() => close(tab.id)}
                    className="mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </BottomSheet>
    </>
  );
}

/** Renders nothing outside a record section or with fewer than two open tabs. */
export function WorkspaceSwitcher() {
  // useSearchParams needs a Suspense boundary for static prerendering.
  return (
    <Suspense fallback={null}>
      <SwitcherInner />
    </Suspense>
  );
}

export default WorkspaceSwitcher;
