'use client';

/**
 * « Sites » of an account — chosen among the accepted areas the admins list on
 * the « Sites » page (owner rulings 2026-10-15: nothing typed here; 2026-10-16:
 * the list is the admins'). The planning's « destination hors de vos sites »
 * warning compares against them.
 */

import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useAcceptedAreas } from '@/hooks/use-accepted-areas';
import { useT } from '@/i18n';
import { samePlace } from '@/lib/moroccan-address';
import { cn } from '@/lib/utils';

/**
 * Stored values → the listed areas, in list order; any other value is dropped.
 * With no list yet (still loading), the values are kept as they are — a save
 * must never wipe them for want of the list.
 */
export function normalizeSites(values: unknown, areas: readonly string[]): string[] {
  const list = Array.isArray(values) ? values.map((v) => String(v ?? '').trim()).filter(Boolean) : [];
  if (areas.length === 0) return list;
  return areas.filter((area) => list.some((v) => samePlace(v, area)));
}

export function SitesPicker({
  value,
  onChange,
  className,
}: {
  value: ReadonlyArray<string> | null | undefined;
  onChange: (sites: string[]) => void;
  className?: string;
}) {
  const t = useT();
  const { areas, loading } = useAcceptedAreas();
  if (loading) return <Skeleton className="h-10 w-48" />;
  const selected = normalizeSites(value, areas);
  return (
    <div role="group" aria-label={t('Sites')} className={cn('flex flex-wrap gap-2', className)} data-testid="sites-picker">
      {areas.map((area) => {
        const on = selected.includes(area);
        return (
          <label
            key={area}
            className={cn(
              'flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors max-md:h-12',
              on ? 'border-primary/50 bg-accent text-ink' : 'border-input bg-card text-ink-2 hover:bg-surface-2',
            )}
          >
            <Checkbox
              checked={on}
              onCheckedChange={(v) => onChange(areas.filter((a) => (a === area ? v === true : selected.includes(a))))}
              aria-label={area}
            />
            {area}
          </label>
        );
      })}
    </div>
  );
}

export default SitesPicker;
