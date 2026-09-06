'use client';

/**
 * PhoneSelect — what a `<Select>` becomes on a coarse pointer.
 *
 * Research: docs/research/mobile-forms-inputs.md §2.2, resolved in
 * mobile-synthesis §5 and element-specs addendum 2026-09-06 bis « Forms (C) ».
 * The short version of why the Radix popover dies on touch: GOV.UK measured
 * users "unable to close the select", "attempts to type into the select",
 * "pinch zoom difficulties on smaller devices"; LukeW "dropdowns should be the
 * UI of last resort"; a popover anchored to a trigger that the on-screen
 * keyboard has just pushed off-screen opens over nothing. So the CONTENT never
 * pops over — it takes one of four shapes, chosen from the option count:
 *
 *   tier « segmented » 2–5 options  → a 44 px segmented control replaces the
 *                                     trigger; every option is visible, zero
 *                                     taps to see them (M3: 2–5 segments).
 *   tier « sheet »     6–12 options → the trigger opens a BottomSheet list:
 *                                     48 px rows, radio dot left, selected
 *                                     `bg-accent`, closes on tap.
 *   tier « search »    > 12         → the same sheet plus a 48 px search field
 *                                     pinned at the top (NOT autofocused — a
 *                                     keyboard on open hides half the list)
 *                                     and up to 3 recent choices.
 *   tier « native »    inside an open BottomSheet → a native `<select>` at
 *                                     48 px. The depth budget forbids
 *                                     sheet-on-sheet, and the OS control is
 *                                     the one substitute HN practitioners
 *                                     actually endorse ("I know how it works
 *                                     and that it is reliable").
 *
 * Recents are stored per FIELD (`localStorage`, keyed by the accessible name
 * of the trigger), never per user profile — the compagnie a gestionnaire picks
 * all morning should be one tap away in the afternoon.
 *
 * The trigger keeps field anatomy at every tier: 48 px, hairline `input`
 * border, solid card, value or the placeholder in `ink-3`, chevron at the end.
 */

import * as React from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Segmented, type SegmentedOption } from '@/components/ui/segmented';
import { INPUT_SEARCH } from '@/lib/input-attrs';

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

export interface PhoneSelectOption {
  value: string;
  /** What the row renders (may carry a status dot, a workload caption…). */
  label: React.ReactNode;
  /** Plain text: the native `<option>`, the search index, the trigger value. */
  labelText: string;
  disabled?: boolean;
}

export type PhoneSelectTier = 'segmented' | 'sheet' | 'search' | 'native';

/** Longest single label a 390 px segmented row can carry without truncating. */
const SEGMENT_LABEL_MAX = 14;
/** Total label budget across the segments (M3 « 2 to 5 options », ≤ 2 words). */
const SEGMENT_TOTAL_MAX = 34;

/**
 * The tier decision, exported so a call site can assert it in a test and so
 * `select.tsx` and `multi-select.tsx` agree on one rule.
 *
 * The segmented tier additionally requires labels that FIT: Material's "2 to 5
 * options" assumes ≤ 2 words per segment, and the density spec forbids a chip
 * that would need « … » (a `title` tooltip is dead on touch). Five French
 * statuses like « En attente de pièces » therefore fall through to the sheet.
 */
export function phoneSelectTier(
  options: PhoneSelectOption[],
  { insideSheet, allowSegmented = true }: { insideSheet?: boolean; allowSegmented?: boolean } = {},
): PhoneSelectTier {
  if (insideSheet) return 'native';
  const n = options.length;
  if (n > 12) return 'search';
  if (n >= 2 && n <= 5 && allowSegmented) {
    const longest = Math.max(...options.map((o) => o.labelText.length));
    const total = options.reduce((s, o) => s + o.labelText.length, 0);
    if (longest <= SEGMENT_LABEL_MAX && total <= SEGMENT_TOTAL_MAX) return 'segmented';
  }
  return 'sheet';
}

/* ------------------------------------------------------------------ */
/* Recents                                                             */
/* ------------------------------------------------------------------ */

const RECENTS_PREFIX = 'sl-auto:select-recents:';
const RECENTS_MAX = 3;

function readRecents(key: string): string[] {
  if (!key || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_PREFIX + key);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string').slice(0, RECENTS_MAX) : [];
  } catch {
    return [];
  }
}

function pushRecent(key: string, value: string): void {
  if (!key || !value || typeof window === 'undefined') return;
  try {
    const next = [value, ...readRecents(key).filter((v) => v !== value)].slice(0, RECENTS_MAX);
    window.localStorage.setItem(RECENTS_PREFIX + key, JSON.stringify(next));
  } catch {
    /* private mode / quota — recents are a convenience, never a requirement */
  }
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export interface PhoneSelectProps {
  options: PhoneSelectOption[];
  value?: string;
  onValueChange: (value: string) => void;
  /** Shown in the trigger (and as the sheet's empty value) when unset. */
  placeholder?: string;
  /** Sheet title + recents key + the segmented group's accessible name. */
  label: string;
  disabled?: boolean;
  /** Force a tier (the adapter passes `native` inside a sheet). */
  tier?: PhoneSelectTier;
  /** Extra classes for the trigger / segmented track. */
  className?: string;
  /** Everything the call site put on `<SelectTrigger>` (id, data-tour, aria). */
  triggerProps?: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>;
  /** Rendered under the list (« Aucune option » helper, an add-option link). */
  sheetFooter?: React.ReactNode;
}

const TRIGGER_CLASS =
  'flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-base text-ink ring-offset-background focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive';

export function PhoneSelect({
  options,
  value,
  onValueChange,
  placeholder,
  label,
  disabled,
  tier,
  className,
  triggerProps,
  sheetFooter,
}: PhoneSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [recents, setRecents] = React.useState<string[]>([]);

  const resolved = tier ?? phoneSelectTier(options);
  const selected = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (open && resolved === 'search') setRecents(readRecents(label));
    if (!open) setQuery('');
  }, [open, resolved, label]);

  const commit = (next: string) => {
    onValueChange(next);
    if (resolved === 'search') pushRecent(label, next);
    setOpen(false);
  };

  /* --- tier: native (inside a sheet — never sheet-on-sheet) ---------- */
  if (resolved === 'native') {
    return (
      <div className={cn('relative', className)}>
        <select
          {...(triggerProps as unknown as React.SelectHTMLAttributes<HTMLSelectElement>)}
          aria-label={triggerProps?.['aria-label'] ? String(triggerProps['aria-label']) : label}
          value={value ?? ''}
          disabled={disabled}
          onChange={(e) => onValueChange(e.target.value)}
          className={cn(TRIGGER_CLASS, 'appearance-none pr-9', !value && 'text-ink-3')}
        >
          {!value && <option value="">{placeholder ?? 'Choisir'}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value} disabled={o.disabled}>
              {o.labelText}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
      </div>
    );
  }

  /* --- tier: segmented (2–5, every option visible) ------------------- */
  if (resolved === 'segmented') {
    // The trigger's own classes come along EXCEPT its height (`h-8`, `h-10`,
    // `max-md:h-12`): a segmented control sizes itself from its 44 px rows,
    // and a 32 px trigger height would crush them.
    const triggerClass = (triggerProps?.className ?? '')
      .split(/\s+/)
      .filter((c) => c && !/^(max-md:|md:|lg:)?h-/.test(c))
      .join(' ');
    const segments: SegmentedOption[] = options.map((o) => ({
      value: o.value,
      label: o.label,
      labelText: o.labelText,
      disabled: o.disabled,
    }));
    return (
      <Segmented
        options={segments}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        aria-label={triggerProps?.['aria-label'] ? String(triggerProps['aria-label']) : label}
        id={triggerProps?.id}
        className={cn(triggerClass, className)}
        {...(triggerProps?.['data-tour'] ? { 'data-tour': triggerProps['data-tour'] } : {})}
      />
    );
  }

  /* --- tiers: sheet / search ---------------------------------------- */
  const q = query.trim().toLowerCase();
  const filtered = q.length >= 1 ? options.filter((o) => o.labelText.toLowerCase().includes(q)) : options;
  const recentOptions =
    resolved === 'search' && !q
      ? recents.map((v) => options.find((o) => o.value === v)).filter((o): o is PhoneSelectOption => !!o)
      : [];

  const row = (o: PhoneSelectOption, keyPrefix = '') => {
    const active = o.value === value;
    return (
      <button
        key={keyPrefix + o.value}
        type="button"
        role="option"
        aria-selected={active}
        disabled={o.disabled}
        onClick={() => commit(o.value)}
        className={cn(
          // 48 px rows, radio dot at the left, selected on `accent` — the one
          // accent use (element-specs §11); hairline between rows only.
          'flex min-h-12 w-full items-center gap-3 border-b border-hairline px-4 py-2 text-left last:border-b-0',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          active ? 'bg-accent text-accent-foreground' : 'hover:bg-surface-2',
          o.disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
            active ? 'border-primary bg-primary text-primary-foreground' : 'border-hairline-strong',
          )}
        >
          {active && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
        </span>
        <span className="t-body min-w-0 flex-1 break-words">{o.label}</span>
      </button>
    );
  };

  return (
    <>
      <button
        type="button"
        {...triggerProps}
        // The Radix trigger's a11y name came from the `<FormControl>` /
        // `<Label htmlFor>` binding around it; that wrapper does not render on
        // this path, so the field's own name is set here explicitly.
        aria-label={triggerProps?.['aria-label'] ? String(triggerProps['aria-label']) : label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(TRIGGER_CLASS, className, triggerProps?.className)}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-ink-3')}>
          {selected ? selected.label : (placeholder ?? 'Choisir')}
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-ink-3" />
      </button>

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={label}
        detent={options.length > 6 ? 'tall' : 'default'}
        flush
        bodyClassName="pb-[max(16px,env(safe-area-inset-bottom))]"
      >
        {resolved === 'search' && (
          // Pinned, never autofocused: an on-screen keyboard on open hides
          // half the list before the user has read a single option (§2.2).
          <div className="sticky top-0 z-10 border-b border-hairline bg-popover px-4 py-2">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" />
              <input
                {...INPUT_SEARCH}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher"
                aria-label={`Rechercher — ${label}`}
                className="h-12 w-full rounded-md border border-input bg-card pl-9 pr-10 text-base text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Effacer la recherche"
                  className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}

        <div role="listbox" aria-label={label}>
          {recentOptions.length > 0 && (
            <>
              <p className="t-label px-4 pb-1 pt-3">Récents</p>
              {recentOptions.map((o) => row(o, 'recent-'))}
              <p className="t-label px-4 pb-1 pt-3">Toutes les options</p>
            </>
          )}
          {filtered.length === 0 ? (
            <p className="t-caption px-4 py-6 text-center">Aucun résultat pour « {query} »</p>
          ) : (
            filtered.map((o) => row(o))
          )}
        </div>
        {sheetFooter && <div className="px-4 py-3">{sheetFooter}</div>}
      </BottomSheet>
    </>
  );
}

export default PhoneSelect;
