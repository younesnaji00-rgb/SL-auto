import * as React from 'react';
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

/**
 * Applied-filter chip — element-specs §2 (Polaris filters: applied filters as
 * chips with a remove ×): `Badge neutral` + ghost ×, no red hover. ONE
 * spelling app-wide; the dossiers/consultation page-local versions were
 * retired 2026-09-02.
 */
export function FilterChip({
  label,
  onRemove,
  ariaLabel,
}: {
  label: React.ReactNode;
  onRemove: () => void;
  ariaLabel: string;
}) {
  return (
    <Badge variant="neutral" className="gap-1 pr-1">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 text-ink-3 hover:bg-surface-4 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={ariaLabel}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

export default FilterChip;
