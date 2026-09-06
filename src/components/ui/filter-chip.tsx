import * as React from 'react';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Applied-filter chip — element-specs §2 (Polaris filters: applied filters as
 * chips with a remove ×): `Badge neutral` + ghost ×, no red hover. ONE
 * spelling app-wide; the dossiers/consultation page-local versions were
 * retired 2026-09-02.
 *
 * Mobile pass (2026-09-06): `size="md"` is the touch size — a 32 px chip whose
 * × is a real 24 × 24 target (WCAG 2.5.8 minimum; the 16 px × of the desktop
 * chip is not tappable). Phone chip rows always pass `size="md"`.
 */
export function FilterChip({
  label,
  onRemove,
  ariaLabel,
  size = 'sm',
}: {
  label: React.ReactNode;
  onRemove: () => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
}) {
  const md = size === 'md';
  return (
    <Badge variant="neutral" className={cn('gap-1 pr-1', md && 'h-8 gap-1.5 pl-3 pr-1 text-xs')} data-filter-chip>
      {label}
      <button
        type="button"
        onClick={onRemove}
        className={cn(
          'ml-0.5 rounded-full text-ink-3 hover:bg-surface-4 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          md ? 'grid h-6 w-6 shrink-0 place-items-center' : 'p-0.5',
        )}
        aria-label={ariaLabel}
      >
        <X className={md ? 'h-3.5 w-3.5' : 'h-3 w-3'} />
      </button>
    </Badge>
  );
}

export default FilterChip;
