'use client';

/**
 * « Sites » of an account — Casablanca and Fès, nothing else, nothing typed
 * (owner ruling 2026-10-15). The firm works in these two cities only
 * (moroccan-address.ts FIRM_CITIES, owner ruling 2026-10-05); the planning's
 * « hors de Casablanca / hors de Fès » warning compares against them. The
 * list used to come from the editable `options_sites` collection behind a
 * search field.
 */

import { Checkbox } from '@/components/ui/checkbox';
import { useT } from '@/i18n';
import { FIRM_CITIES, samePlace, type FirmCity } from '@/lib/moroccan-address';
import { cn } from '@/lib/utils';

/** Stored values → the firm's cities, in list order; any other value is dropped. */
export function normalizeSites(values: unknown): FirmCity[] {
  const list = Array.isArray(values) ? values.map((v) => String(v ?? '')) : [];
  return FIRM_CITIES.filter((city) => list.some((v) => samePlace(v, city)));
}

export function SitesPicker({
  value,
  onChange,
  className,
}: {
  value: ReadonlyArray<string> | null | undefined;
  onChange: (sites: FirmCity[]) => void;
  className?: string;
}) {
  const t = useT();
  const selected = normalizeSites(value);
  return (
    <div role="group" aria-label={t('Sites')} className={cn('flex flex-wrap gap-2', className)} data-testid="sites-picker">
      {FIRM_CITIES.map((city) => {
        const on = selected.includes(city);
        return (
          <label
            key={city}
            className={cn(
              'flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm transition-colors max-md:h-12',
              on ? 'border-primary/50 bg-accent text-ink' : 'border-input bg-card text-ink-2 hover:bg-surface-2',
            )}
          >
            <Checkbox
              checked={on}
              onCheckedChange={(v) => onChange(FIRM_CITIES.filter((c) => (c === city ? v === true : selected.includes(c))))}
              aria-label={city}
            />
            {city}
          </label>
        );
      })}
    </div>
  );
}

export default SitesPicker;
