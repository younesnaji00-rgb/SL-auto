'use client';

/**
 * FilterSheet / FilterSection / FilterSelect / FilterToggle / AppliedChips —
 * the phone filter surface (mobile-synthesis §4; research
 * docs/research/mobile-lists-tables.md §4).
 *
 * FilterSheet is a `BottomSheet tall` holding a PENDING copy of the page's
 * filter object: sections edit the pending copy, the filled footer button
 * « Afficher N dossiers » (live count from `countFor(pending)` — Baymard)
 * applies it in one batch, « Réinitialiser » (ghost, above it, disabled when
 * nothing is set) restores `defaults`, and × / scrim / back DISCARD the
 * pending changes. The list behind the sheet never live-filters.
 *
 * Controls inside the sheet are native (`<select>`, `<input type="date">`)
 * — never a nested custom sheet (NN/g: don't stack sheets). Every section
 * carries its own selection marker (« 1 » pill) so an applied value is
 * visible at the section level too (Pencil & Paper layers 1–2).
 *
 * AppliedChips is the 36 px horizontally scrolling chip row under the search
 * row: one `FilterChip` per applied filter, « Tout effacer » when ≥ 2. KPI
 * tile filters (scope, lateOnly, preset) are filters too and MUST appear here.
 *
 * Usage:
 *   <FilterSheet open onOpenChange value={filters} defaults={filterDefaults}
 *     onApply={(next) => setFilters(next)} countFor={(p) => count(p)} noun="dossiers"
 *     isSet={(p) => …}>
 *     {(pending, set) => (
 *       <FilterSection label="Statut" set={pending.status !== 'Tous'}>
 *         <FilterSelect value={pending.status} onChange={(v) => set({ status: v })} options={[…]} />
 *       </FilterSection>
 *     )}
 *   </FilterSheet>
 */

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { BottomSheet, BottomSheetFooter } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/ui/filter-chip';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

/* ------------------------------------------------------------------ */
/* FilterSheet                                                         */
/* ------------------------------------------------------------------ */

export interface FilterSheetProps<T extends Record<string, any>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  /** The page's applied filters (the pending copy is reseeded from it on open). */
  value: T;
  /** What « Réinitialiser » restores — usually the page's filter defaults. */
  defaults: T;
  /** Batch apply (only on the filled button). */
  onApply: (next: T) => void;
  /** Live row count for a pending state → « Afficher N dossiers ». */
  countFor?: (pending: T) => number;
  /** Singular / plural noun for the count button (default « dossier(s) »). */
  noun?: string;
  nounPlural?: string;
  /** True when anything differs from `defaults` (enables « Réinitialiser »). Defaults to a JSON compare. */
  isSet?: (pending: T) => boolean;
  /** Full height on phones (`h-[calc(100dvh-56px)]`) for long filter sets (/dossiers). */
  full?: boolean;
  className?: string;
  children: (pending: T, set: (patch: Partial<T> | ((prev: T) => T)) => void) => React.ReactNode;
}

export function FilterSheet<T extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  value,
  defaults,
  onApply,
  countFor,
  noun,
  nounPlural,
  isSet,
  full,
  className,
  children,
}: FilterSheetProps<T>) {
  const t = useT();
  const [pending, setPending] = React.useState<T>(value);
  // Reseed from the applied state every time the sheet opens (× discards).
  React.useEffect(() => {
    if (open) setPending(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = React.useCallback((patch: Partial<T> | ((prev: T) => T)) => {
    setPending((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const anySet = isSet ? isSet(pending) : JSON.stringify(pending) !== JSON.stringify(defaults);
  const count = countFor ? countFor(pending) : null;
  const one = noun ?? t('dossier');
  const many = nounPlural ?? t('dossiers');

  return (
    <BottomSheet
      open={open}
      onOpenChange={onOpenChange}
      title={title ?? t('Filtres')}
      detent="tall"
      className={cn(full && 'max-md:h-[calc(100dvh-56px)]', className)}
      bodyClassName="py-2"
      footer={
        <BottomSheetFooter>
          <Button type="button" variant="ghost" disabled={!anySet} onClick={() => setPending(defaults)}>
            {t('Réinitialiser')}
          </Button>
          <Button
            type="button"
            className="font-semibold"
            onClick={() => {
              onApply(pending);
              onOpenChange(false);
            }}
          >
            {count === null
              ? t('Appliquer')
              : `${t('Afficher')} ${count} ${count === 1 ? one : many}`}
          </Button>
        </BottomSheetFooter>
      }
    >
      <div className="flex flex-col divide-y divide-hairline">{children(pending, set)}</div>
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* FilterSection                                                       */
/* ------------------------------------------------------------------ */

export interface FilterSectionProps {
  label: React.ReactNode;
  /** Selection marker: `true` → « 1 » pill; a number → that count. */
  set?: boolean | number;
  /** Optional trailing control in the label row (a « Gérer » link…). */
  trailing?: React.ReactNode;
  dataTour?: string;
  className?: string;
  children: React.ReactNode;
}

export function FilterSection({ label, set, trailing, dataTour, className, children }: FilterSectionProps) {
  const marker = typeof set === 'number' ? (set > 0 ? set : 0) : set ? 1 : 0;
  return (
    <section className={cn('py-3', className)} data-tour={dataTour}>
      <div className="mb-2 flex min-h-[24px] items-center gap-2">
        <span className="t-label flex-1">{label}</span>
        {marker > 0 && (
          <span
            aria-label={`${marker} ${marker > 1 ? 'filtres appliqués' : 'filtre appliqué'}`}
            className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium tabular-nums text-primary-foreground"
          >
            {marker}
          </span>
        )}
        {trailing}
      </div>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* FilterSelect — native select styled to the field contract           */
/* ------------------------------------------------------------------ */

export interface FilterSelectOption {
  value: string;
  label: string;
  /** Faceted count appended « (12) ». */
  count?: number;
  disabled?: boolean;
}

export interface FilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: FilterSelectOption[];
  ariaLabel?: string;
  id?: string;
  className?: string;
}

/**
 * 48 px native `<select>` (family C: native pickers on touch), 16 px text,
 * card surface + input hairline, chevron drawn by us so it matches the app.
 */
export function FilterSelect({ value, onChange, options, ariaLabel, id, className }: FilterSelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        id={id}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full appearance-none rounded-md border border-input bg-card pl-3 pr-10 text-[16px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.count !== undefined ? `${o.label} (${o.count})` : o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FilterToggle — a 48 px switch row                                   */
/* ------------------------------------------------------------------ */

export interface FilterToggleProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
  className?: string;
}

export function FilterToggle({ label, hint, checked, onChange, id, className }: FilterToggleProps) {
  const reactId = React.useId();
  const switchId = id ?? `ft-${reactId}`;
  return (
    <label htmlFor={switchId} className={cn('flex min-h-[48px] cursor-pointer items-center gap-3', className)}>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-tight text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] leading-tight text-ink-3">{hint}</span>}
      </span>
      <Switch id={switchId} checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* FilterChoiceChips — single-select chip set (date presets…)          */
/* ------------------------------------------------------------------ */

export interface FilterChoiceChipsProps {
  value: string | null;
  onChange: (value: string | null) => void;
  options: { value: string; label: string }[];
  /** Tapping the active chip clears it (default true). */
  clearable?: boolean;
  ariaLabel?: string;
  className?: string;
}

/** 36 px single-select chips (M3 filter chips), tonal when selected. */
export function FilterChoiceChips({ value, onChange, options, clearable = true, ariaLabel, className }: FilterChoiceChipsProps) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active && clearable ? null : o.value)}
            className={cn(
              'inline-flex h-9 items-center rounded-full px-3.5 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-accent text-accent-foreground shadow-rim' : 'bg-card text-ink shadow-rim hover:bg-surface-2',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AppliedChips                                                        */
/* ------------------------------------------------------------------ */

export interface AppliedChip {
  key: string;
  label: React.ReactNode;
  onRemove: () => void;
  /** Accessible name of the × (defaults to « Retirer le filtre <label> »). */
  ariaLabel?: string;
  dataTour?: string;
}

export interface AppliedChipsProps {
  chips: AppliedChip[];
  /** « Tout effacer » — shown when ≥ 2 chips (or `alwaysClearAll`). */
  onClearAll?: () => void;
  alwaysClearAll?: boolean;
  ariaLabel?: string;
  /** Full-bleed inside the page padding (default true). */
  bleed?: boolean;
  className?: string;
}

export function AppliedChips({ chips, onClearAll, alwaysClearAll, ariaLabel, bleed = true, className }: AppliedChipsProps) {
  const t = useT();
  if (chips.length === 0) return null;
  const showClear = !!onClearAll && (alwaysClearAll || chips.length >= 2);
  return (
    <div
      aria-label={ariaLabel ?? t('Filtres actifs')}
      className={cn(
        'flex h-9 items-center gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        bleed && '-mx-4 px-4',
        className,
      )}
    >
      {chips.map((c) => (
        <span key={c.key} className="inline-flex shrink-0" data-tour={c.dataTour}>
          <FilterChip
            size="md"
            label={c.label}
            onRemove={c.onRemove}
            ariaLabel={c.ariaLabel ?? `${t('Retirer le filtre')} ${typeof c.label === 'string' ? c.label : ''}`.trim()}
          />
        </span>
      ))}
      {showClear && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex h-8 shrink-0 items-center rounded-md px-2 text-[13px] text-ink-3 hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('Tout effacer')}
        </button>
      )}
    </div>
  );
}

export default FilterSheet;
