'use client';

/**
 * Saved views — name and recall a filter set (Linear "custom views",
 * Airtable "personal views"). Stored per browser under `views_<key>`; the
 * filters themselves are also mirrored into the URL by usePersistedFilters,
 * so a view is shareable by copying the address.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Bookmark, BookmarkPlus, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface SavedView<T> {
  id: string;
  name: string;
  filters: T;
  createdAt: number;
}

function read<T>(key: string): SavedView<T>[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`views_${key}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, views: SavedView<T>[]) {
  try {
    window.localStorage.setItem(`views_${key}`, JSON.stringify(views));
  } catch {
    /* ignore */
  }
}

function sameFilters(a: any, b: any): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function SavedViews<T extends Record<string, any>>({
  storageKey,
  current,
  onApply,
  className,
}: {
  storageKey: string;
  current: T;
  onApply: (filters: T) => void;
  className?: string;
}) {
  const [views, setViews] = useState<SavedView<T>[]>([]);
  useEffect(() => setViews(read<T>(storageKey)), [storageKey]);

  const active = views.find((v) => sameFilters(v.filters, current));

  const save = useCallback(() => {
    const name = window.prompt('Nom de la vue :', active?.name ?? '');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    setViews((prev) => {
      const existing = prev.find((v) => v.name.toLowerCase() === trimmed.toLowerCase());
      const next = existing
        ? prev.map((v) => (v.id === existing.id ? { ...v, filters: current, createdAt: Date.now() } : v))
        : [...prev, { id: `v-${Date.now()}`, name: trimmed, filters: current, createdAt: Date.now() }];
      write(storageKey, next);
      return next;
    });
  }, [active, current, storageKey]);

  const remove = useCallback(
    (id: string) => {
      setViews((prev) => {
        const next = prev.filter((v) => v.id !== id);
        write(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('h-9 gap-1.5', className)} title="Vues enregistrées">
          <Bookmark className={cn('h-4 w-4', active && 'fill-current text-primary')} />
          <span className="max-w-[10rem] truncate">{active ? active.name : 'Vues'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="t-label">Vues enregistrées</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {views.length === 0 && <p className="t-caption px-2 py-1.5">Aucune vue. Enregistrez vos filtres actuels pour les retrouver en un clic.</p>}
        {views.map((v) => (
          <DropdownMenuItem key={v.id} onSelect={() => onApply(v.filters)} className="gap-2">
            <Check className={cn('h-3.5 w-3.5 shrink-0', active?.id === v.id ? 'opacity-100 text-primary' : 'opacity-0')} />
            <span className="min-w-0 flex-1 truncate">{v.name}</span>
            <button
              type="button"
              aria-label={`Supprimer la vue ${v.name}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                remove(v.id);
              }}
              className="rounded-sm p-0.5 text-ink-3 hover:bg-surface-3 hover:text-status-danger-fg"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={save}>
          <BookmarkPlus className="mr-2 h-4 w-4" />
          {active ? 'Mettre à jour cette vue…' : 'Enregistrer la vue actuelle…'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SavedViews;
