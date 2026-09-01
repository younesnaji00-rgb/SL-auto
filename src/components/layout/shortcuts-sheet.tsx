'use client';

/**
 * `?` — searchable list of every registered keyboard shortcut, grouped.
 * Reads the live hotkey registry so it can never drift from the bindings.
 */

import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';
import { useRegisteredHotkeys, formatKeys } from '@/hooks/use-hotkeys';

const GROUP_ORDER = ['Général', 'Navigation', 'Onglets', 'Listes', 'Dossier'];

export function ShortcutsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const hotkeys = useRegisteredHotkeys();
  const [q, setQ] = useState('');

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const seen = new Set<string>();
    const filtered = hotkeys.filter((h) => {
      const key = `${h.group}|${h.keys}|${h.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      if (!needle) return true;
      return h.label.toLowerCase().includes(needle) || h.keys.toLowerCase().includes(needle);
    });
    const map = new Map<string, typeof filtered>();
    for (const h of filtered) {
      if (!map.has(h.group)) map.set(h.group, []);
      map.get(h.group)!.push(h);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      const ia = GROUP_ORDER.indexOf(a);
      const ib = GROUP_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [hotkeys, q]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Raccourcis clavier</SheetTitle>
          <SheetDescription>
            Les raccourcis à une lettre s&apos;utilisent hors des champs de saisie. « G puis D » signifie appuyer sur G, puis sur D.
          </SheetDescription>
        </SheetHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrer les raccourcis…"
            className="pl-8"
            aria-label="Filtrer les raccourcis"
          />
        </div>
        <div className="-mx-6 flex-1 overflow-y-auto px-6">
          {groups.length === 0 && <p className="py-8 text-center text-sm text-ink-3">Aucun raccourci ne correspond.</p>}
          {groups.map(([group, list]) => (
            <section key={group} className="mb-8">
              <h3 className="t-label mb-2">{group}</h3>
              <ul className="divide-y divide-hairline">
                {list.map((h) => (
                  <li key={`${h.keys}-${h.label}`} className="flex items-center justify-between gap-4 py-2 text-[13px] text-ink">
                    <span className="min-w-0 flex-1 truncate">{h.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {formatKeys(h.keys).map((k, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="t-caption">puis</span>}
                          <Kbd>{k}</Kbd>
                        </React.Fragment>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
