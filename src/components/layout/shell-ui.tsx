'use client';

/**
 * Shell-level UI state: the command palette, the shortcuts sheet and the
 * "Nouveau dossier" dialog are mounted once here so that the header, the
 * sidebar, the mobile bar and global hotkeys can all open them.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useHotkeys, type Hotkey } from '@/hooks/use-hotkeys';
import { useSidebar } from '@/components/ui/sidebar';
import { CommandPalette } from '@/components/global-search';
import { ShortcutsSheet } from '@/components/layout/shortcuts-sheet';
import { CreateDossierDialog } from '@/components/dossiers/create-dossier-dialog';

interface ShellUiValue {
  openPalette: (initialQuery?: string) => void;
  openShortcuts: () => void;
  openCreateDossier: () => void;
  canCreateDossier: boolean;
}

const ShellUiContext = createContext<ShellUiValue>({
  openPalette: () => {},
  openShortcuts: () => {},
  openCreateDossier: () => {},
  canCreateDossier: false,
});

export function ShellUiProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { canWrite, profile } = useCurrentUser();
  const { items } = useVisibleNav();
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const canCreateDossier = canWrite('dossiers');

  const openPalette = useCallback((initialQuery?: string) => {
    setPaletteQuery(initialQuery ?? '');
    setPaletteOpen(true);
  }, []);
  const openShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const openCreateDossier = useCallback(() => {
    if (canCreateDossier) setCreateOpen(true);
  }, [canCreateDossier]);

  // Global bindings. Navigation chords come from the nav config so the sidebar
  // tooltips, the palette and the `?` sheet all show the same keys.
  const hotkeys = useMemo<Hotkey[]>(() => {
    const nav: Hotkey[] = items
      .filter((i) => i.hotkey)
      .map((i) => ({
        keys: i.hotkey!,
        label: `Aller à ${i.title ?? i.label}`,
        group: 'Navigation',
        handler: () => router.push(i.href),
      }));
    const general: Hotkey[] = [
      { keys: 'mod+k', label: 'Rechercher / palette de commandes', group: 'Général', handler: () => openPalette(), allowInInput: true },
      { keys: '/', label: 'Rechercher', group: 'Général', handler: () => openPalette() },
      { keys: '?', label: 'Afficher les raccourcis clavier', group: 'Général', handler: () => setShortcutsOpen(true) },
      { keys: 'mod+b', label: 'Réduire / agrandir la barre latérale', group: 'Général', handler: () => toggleSidebar(), allowInInput: true },
      { keys: 'shift+d', label: 'Basculer le mode sombre', group: 'Général', handler: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
    ];
    if (canCreateDossier) {
      general.push({ keys: 'c', label: 'Nouveau dossier', group: 'Général', handler: () => setCreateOpen(true) });
    }
    return [...general, ...nav];
  }, [items, router, openPalette, toggleSidebar, setTheme, theme, canCreateDossier]);

  useHotkeys(hotkeys, [hotkeys]);

  const value = useMemo<ShellUiValue>(
    () => ({ openPalette, openShortcuts, openCreateDossier, canCreateDossier }),
    [openPalette, openShortcuts, openCreateDossier, canCreateDossier],
  );

  return (
    <ShellUiContext.Provider value={value}>
      {children}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        initialQuery={paletteQuery}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onCreateDossier={canCreateDossier ? () => setCreateOpen(true) : undefined}
      />
      <ShortcutsSheet open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
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
