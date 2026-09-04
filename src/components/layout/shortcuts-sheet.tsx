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
import { useT } from '@/i18n';

// Registration sites already translate `label` and `group` (see shell-ui,
// workspace-tabs, the list pages), so the rows below render them AS IS — a
// second t() would be harmless (the key round-trips) but misleading. The
// ordering table is the one place that must be translated here, otherwise the
// group names never match in English and every group falls to the tail.
const GROUP_ORDER = ['Général', 'Navigation', 'Onglets', 'Listes', 'Dossier'];

export function ShortcutsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const hotkeys = useRegisteredHotkeys();
  const [q, setQ] = useState('');

  const groupOrder = useMemo(() => GROUP_ORDER.map((g) => t(g)), [t]);

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
      const ia = groupOrder.indexOf(a);
      const ib = groupOrder.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  }, [hotkeys, q, groupOrder]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('Raccourcis clavier')}</SheetTitle>
          <SheetDescription>
            {t("Les raccourcis à une lettre s'utilisent hors des champs de saisie. « G puis D » signifie appuyer sur G, puis sur D.")}
          </SheetDescription>
        </SheetHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('Filtrer les raccourcis…')}
            className="pl-8"
            aria-label={t('Filtrer les raccourcis')}
          />
        </div>
        <div className="-mx-6 flex-1 overflow-y-auto px-6">
          {groups.length === 0 && <p className="py-8 text-center text-sm text-ink-3">{t('Aucun raccourci ne correspond.')}</p>}
          {groups.map(([group, list]) => (
            <section key={group} className="mb-8">
              <h3 className="t-label mb-2">{group}</h3>
              <ul className="divide-y divide-hairline">
                {list.map((h) => (
                  // §4 rows: 44 px, hairlines only, label + <Kbd> at the row end.
                  <li key={`${h.keys}-${h.label}`} className="flex min-h-11 items-center justify-between gap-4 py-2 text-[13px] text-ink">
                    <span className="min-w-0 flex-1 truncate">{h.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {formatKeys(h.keys).map((k, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="t-caption">{t('puis')}</span>}
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
