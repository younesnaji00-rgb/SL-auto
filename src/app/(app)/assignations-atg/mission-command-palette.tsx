'use client';

/**
 * Ctrl+K / ⌘K palette for « Missions terrain » — actions first, then les
 * missions du jour, en retard et à venir. Follows the global-search palette
 * pattern (src/components/global-search.tsx): Dialog + sr-only DialogTitle +
 * Command, group headings in ink-3 sentence case, rows 13 px ink.
 * The page mounts it once; it owns its open state and the global shortcut.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Filter, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Kbd } from '@/components/ui/kbd';

export interface PaletteMission {
  key: string;
  refLabel: string;
  assureNom?: string;
  matricule?: string;
  agentTerrain?: string;
  adresse?: string;
  compagnie?: string;
  groupLabel: 'En retard' | "Aujourd'hui" | 'À venir';
}

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface MissionCommandPaletteProps {
  missions: PaletteMission[];
  actions: PaletteAction[];
  onOpenMission: (key: string) => void;
}

/** Lowercase + strip diacritics so « reunion » matches « réunion ». */
function fold(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Icon only when trivially readable from the verb; otherwise none. */
function actionIcon(label: string): React.ElementType | null {
  const l = fold(label);
  if (l.includes('filtr')) return Filter;
  if (l.includes('reinitialis') || l.includes('actualis') || l.includes('rafraich')) return RotateCcw;
  if (l.includes('export') || l.includes('telecharg')) return Download;
  return null;
}

export default function MissionCommandPalette({
  missions,
  actions,
  onOpenMission,
}: MissionCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K / ⌘K toggles — even from an input (standard palette behavior).
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        // Capture phase + preventDefault: the app shell's use-hotkeys registry
        // binds mod+k to the GLOBAL search palette and bails on
        // `e.defaultPrevented` — on this page the mission palette takes the
        // shortcut over the global one (the header search button still opens
        // the global palette).
        e.preventDefault();
        e.stopPropagation();
        setOpen((v) => !v);
      }
      // Escape is handled by the Dialog primitive — not duplicated here.
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, []);

  const close = () => setOpen(false);

  const missionRows = useMemo(
    () =>
      missions.map((m) => ({
        ...m,
        // cmdk matches on `value`: key first for uniqueness, then every
        // searchable field (folded) so ref, assuré, plaque, agent, adresse
        // and compagnie all hit.
        value: fold(
          [m.key, m.refLabel, m.assureNom, m.matricule, m.agentTerrain, m.adresse, m.compagnie]
            .filter(Boolean)
            .join(' '),
        ),
      })),
    [missions],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="top-[12%] translate-y-0 overflow-hidden p-0 sm:max-w-xl"
        aria-describedby={undefined}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">Palette de commandes</DialogTitle>
        {/* Group headings: 12 px, sentence case, ink-3, never uppercase
            (spelled out — `.t-*` are component classes). Rows = 13 px ink. */}
        <Command
          loop
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-normal [&_[cmdk-group-heading]]:normal-case [&_[cmdk-group-heading]]:tracking-normal [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-item]]:text-[13px] [&_[cmdk-item]]:text-ink [&_[cmdk-item]_svg]:text-ink-2"
        >
          <CommandInput ref={inputRef} placeholder="Rechercher une mission ou une action…" />
          <CommandList className="max-h-[calc(60vh/var(--app-zoom))]">
            <CommandEmpty>Aucun résultat</CommandEmpty>

            {actions.length > 0 && (
              <CommandGroup heading="Actions">
                {actions.map((a) => {
                  const Icon = actionIcon(a.label);
                  return (
                    <CommandItem
                      key={a.id}
                      value={fold(`action:${a.id} ${a.label}`)}
                      onSelect={() => {
                        a.run();
                        close();
                      }}
                      className="gap-3"
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0 text-ink-3" />}
                      <span className="min-w-0 flex-1 truncate">{a.label}</span>
                      {a.hint && <span className="shrink-0 text-xs text-ink-3">{a.hint}</span>}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {missionRows.length > 0 && (
              <CommandGroup heading="Missions">
                {missionRows.map((m) => (
                  <CommandItem
                    key={m.key}
                    value={m.value}
                    onSelect={() => {
                      onOpenMission(m.key);
                      close();
                    }}
                    className="gap-3"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="t-mono font-semibold">{m.refLabel}</span>
                      {m.assureNom && <span className="text-ink-2"> · {m.assureNom}</span>}
                    </span>
                    {/* Plain ink-3 text, not a colored badge — color economy. */}
                    <span className="shrink-0 text-xs text-ink-3">{m.groupLabel}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
          <div className="t-caption flex items-center justify-between gap-3 border-t border-hairline px-3 py-2">
            <span className="flex items-center gap-1.5">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> naviguer
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>↵</Kbd> ouvrir
            </span>
            <span className="flex items-center gap-1.5">
              <Kbd>Échap</Kbd> fermer
            </span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
