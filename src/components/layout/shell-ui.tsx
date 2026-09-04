'use client';

/**
 * Shell-level UI state: the command palette and the "Nouveau dossier" dialog
 * are mounted once here so that the header, the sidebar, the mobile bar and
 * global hotkeys can all open them.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useHotkeys, type Hotkey } from '@/hooks/use-hotkeys';
import { useSidebar } from '@/components/ui/sidebar';
import { CommandPalette } from '@/components/global-search';
import { CreateDossierDialog } from '@/components/dossiers/create-dossier-dialog';
import { useT } from '@/i18n';

interface ShellUiValue {
  openPalette: (initialQuery?: string) => void;
  openCreateDossier: () => void;
  canCreateDossier: boolean;
}

const ShellUiContext = createContext<ShellUiValue>({
  openPalette: () => {},
  openCreateDossier: () => {},
  canCreateDossier: false,
});

export function ShellUiProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const { canWrite, profile } = useCurrentUser();
  const { items } = useVisibleNav();
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const canCreateDossier = canWrite('dossiers');

  const openPalette = useCallback((initialQuery?: string) => {
    setPaletteQuery(initialQuery ?? '');
    setPaletteOpen(true);
  }, []);
  const openCreateDossier = useCallback(() => {
    if (canCreateDossier) setCreateOpen(true);
  }, [canCreateDossier]);

  // Global bindings. The chords still work for those who know them, but the
  // UI no longer advertises them (owner ruling 2026-09-03: no shortcut hints).
  const hotkeys = useMemo<Hotkey[]>(() => {
    const nav: Hotkey[] = items
      .filter((i) => i.hotkey)
      .map((i) => ({
        keys: i.hotkey!,
        // Nav titles/labels are French translation keys (lib/nav-groups.ts).
        label: `${t('Aller à')} ${t(i.title ?? i.label)}`,
        group: t('Navigation'),
        handler: () => router.push(i.href),
      }));
    const general: Hotkey[] = [
      { keys: 'mod+k', label: t('Rechercher / palette de commandes'), group: t('Général'), handler: () => openPalette(), allowInInput: true },
      { keys: '/', label: t('Rechercher'), group: t('Général'), handler: () => openPalette() },
      { keys: 'mod+b', label: t('Réduire / agrandir la barre latérale'), group: t('Général'), handler: () => toggleSidebar(), allowInInput: true },
      { keys: 'shift+d', label: t('Basculer le mode sombre'), group: t('Général'), handler: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
    ];
    if (canCreateDossier) {
      general.push({ keys: 'c', label: t('Nouveau dossier'), group: t('Général'), handler: () => setCreateOpen(true) });
    }
    return [...general, ...nav];
  }, [items, router, openPalette, toggleSidebar, setTheme, theme, canCreateDossier, t]);

  useHotkeys(hotkeys, [hotkeys]);

  const value = useMemo<ShellUiValue>(
    () => ({ openPalette, openCreateDossier, canCreateDossier }),
    [openPalette, openCreateDossier, canCreateDossier],
  );

  return (
    <ShellUiContext.Provider value={value}>
      {children}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        initialQuery={paletteQuery}
        onCreateDossier={canCreateDossier ? () => setCreateOpen(true) : undefined}
      />
      {canCreateDossier && profile && (
        <CreateDossierDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={(id) => {
            setCreateOpen(false);
            router.push(`/dossiers/${id}`);
          }}
        />
      )}
    </ShellUiContext.Provider>
  );
}

export function useShellUi() {
  return useContext(ShellUiContext);
}
