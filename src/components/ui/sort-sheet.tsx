'use client';

/**
 * SortSheet — the phone sort control (mobile-synthesis §4; research
 * docs/research/mobile-lists-tables.md §5). A `BottomSheet` titled « Trier
 * par » with a single-select radio list: 48 px rows, trailing check on the
 * current order, applies on tap and closes (one choice = per-control apply,
 * no footer). Options are named as ORDERS (« Plus récents »), not columns.
 *
 * Usage:
 *   <SortSheet open onOpenChange value={sort} onChange={setSort}
 *     options={[{ value: 'recent', label: 'Plus récents' }, …]} />
 */

import * as React from 'react';
import { Check } from 'lucide-react';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

export interface SortOption<V extends string = string> {
  value: V;
  label: React.ReactNode;
  /** Secondary line (13 px ink-3). */
  hint?: React.ReactNode;
  disabled?: boolean;
}

export interface SortSheetProps<V extends string = string> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  value: V | null;
  options: SortOption<V>[];
  onChange: (value: V) => void;
}

export function SortSheet<V extends string = string>({ open, onOpenChange, title, value, options, onChange }: SortSheetProps<V>) {
  const t = useT();
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title ?? t('Trier par')} flush>
      <ul role="radiogroup" aria-label={typeof title === 'string' ? title : t('Trier par')} className="divide-y divide-hairline">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <li key={o.value}>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                disabled={o.disabled}
                onClick={() => {
                  onOpenChange(false);
                  if (!active) window.setTimeout(() => onChange(o.value), 0);
                }}
                className={cn(
                  'flex min-h-[48px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2',
                  o.disabled && 'pointer-events-none opacity-50',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[15px] leading-tight', active ? 'font-medium text-ink' : 'text-ink')}>{o.label}</span>
                  {o.hint && <span className="mt-0.5 block truncate text-[13px] leading-tight text-ink-3">{o.hint}</span>}
                </span>
                <Check className={cn('h-5 w-5 shrink-0 text-primary transition-opacity', active ? 'opacity-100' : 'opacity-0')} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
    </BottomSheet>
  );
}

export default SortSheet;
