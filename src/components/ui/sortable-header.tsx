'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc' | null;

interface SortableHeaderProps {
  label: string;
  sort: SortDirection;
  onChange: (next: SortDirection) => void;
  className?: string;
}

/** Clickable table header that cycles null → asc → desc → null. */
export function SortableHeader({ label, sort, onChange, className }: SortableHeaderProps) {
  const next: SortDirection = sort === null ? 'asc' : sort === 'asc' ? 'desc' : null;
  const Icon = sort === 'asc' ? ArrowUp : sort === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      className={cn(
        // Inherits the `t-label` column head; the sorted column reads in ink.
        'inline-flex items-center gap-1 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm',
        sort ? 'font-medium text-ink' : 'text-ink-3',
        className,
      )}
      aria-sort={sort === 'asc' ? 'ascending' : sort === 'desc' ? 'descending' : undefined}
    >
      {label}
      <Icon className={cn('h-3.5 w-3.5', sort ? 'text-ink-2' : 'text-ink-4')} />
    </button>
  );
}
