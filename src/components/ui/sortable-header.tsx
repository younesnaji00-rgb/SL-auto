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
        'inline-flex items-center gap-1 hover:text-foreground transition-colors',
        sort ? 'text-foreground font-semibold' : 'text-muted-foreground',
        className,
      )}
    >
      {label}
      <Icon className="h-3.5 w-3.5 opacity-70" />
    </button>
  );
}
