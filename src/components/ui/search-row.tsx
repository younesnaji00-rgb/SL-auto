'use client';

/**
 * SearchRow — the 48 px sticky search row of a phone list page
 * (mobile-synthesis §4; research docs/research/mobile-lists-tables.md §3–§5).
 *
 * Sits directly under the top bar, sticky inside the page scroller
 * (`#main-content`), SOLID `bg-background` (no glass — it is a control row,
 * not a bar the content scrolls under). Anatomy, left to right:
 *   - search `Input` flex-1, 16 px text (no iOS zoom), leading Search icon,
 *     trailing × clear when non-empty, `enterkeyhint="search"` (Enter blurs
 *     the keyboard), `inputMode="search"`, placeholder = FORMAT cue.
 *   - « Filtres » 44×44 outline icon button (`SlidersHorizontal`) with a
 *     surface-3 count pill, hidden at 0.
 *   - optional « Trier : <current> » ghost — the current order is ALWAYS in
 *     the label (Baymard: "selected sort type visible by default").
 * An optional `below` slot (scope segments) shares the sticky container.
 *
 * Search is client-side as-you-type from the 2nd character with a 150 ms
 * debounce (the snapshot is in memory); clearing applies immediately.
 *
 * Hides on scroll-down / returns on scroll-up (partially persistent header —
 * Baymard sticky filter access vs NN/g sticky-header cost), 250 ms
 * ease-standard translate; never hides while the input is focused.
 *
 * Sticky offset: the app's top bar lives OUTSIDE the `#main-content`
 * scroller, so `top-0` is correct inside it; override with `className`
 * (e.g. `top-11`) if a page mounts another sticky row above it.
 *
 * Exports: SearchRow (forwardRef → SearchRowHandle { focus, blur, element }).
 */

import * as React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

export interface SearchRowHandle {
  focus: () => void;
  blur: () => void;
  element: HTMLInputElement | null;
}

export interface SearchRowProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name of the input. */
  ariaLabel?: string;
  /** Applied attribute-filter count → badge on « Filtres » (hidden at 0). */
  filterCount?: number;
  /** Opens the Filtres sheet. Omit to hide the button. */
  onFilters?: () => void;
  /** Current sort label (« Plus récents »). Rendered as « Trier : <label> ». */
  sortLabel?: string;
  /** Opens the Trier sheet. Omit to hide the button. */
  onSort?: () => void;
  /** Row rendered under the input row inside the same sticky container (scope segments). */
  below?: React.ReactNode;
  /** Hide on scroll-down / show on scroll-up (default true). */
  hideOnScroll?: boolean;
  /** Debounce for `onChange` while typing (default 150 ms). */
  debounceMs?: number;
  /** Id of the page scroller to observe (default `main-content`). */
  scrollerId?: string;
  dataTour?: string;
  filterDataTour?: string;
  sortDataTour?: string;
  className?: string;
}

const HIDE_AFTER_PX = 64;
const DELTA_PX = 6;

export const SearchRow = React.forwardRef<SearchRowHandle, SearchRowProps>(function SearchRow(
  {
    value,
    onChange,
    placeholder,
    ariaLabel,
    filterCount = 0,
    onFilters,
    sortLabel,
    onSort,
    below,
    hideOnScroll = true,
    debounceMs = 150,
    scrollerId = 'main-content',
    dataTour,
    filterDataTour,
    sortDataTour,
    className,
  },
  ref,
) {
  const t = useT();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [focused, setFocused] = React.useState(false);
  const [hidden, setHidden] = React.useState(false);

  React.useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        setHidden(false);
        inputRef.current?.focus();
      },
      blur: () => inputRef.current?.blur(),
      get element() {
        return inputRef.current;
      },
    }),
    [],
  );

  // Local echo + debounce (clear is immediate).
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => setLocal(value), [value]);
  const onChangeRef = React.useRef(onChange);
  onChangeRef.current = onChange;
  const timer = React.useRef<number | null>(null);
  const push = (next: string, immediate = false) => {
    setLocal(next);
    if (timer.current) window.clearTimeout(timer.current);
    if (immediate || next.length < 2) {
      onChangeRef.current(next);
      return;
    }
    timer.current = window.setTimeout(() => onChangeRef.current(next), debounceMs);
  };
  React.useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  // Scroll-direction listener on the page scroller.
  const focusedRef = React.useRef(false);
  focusedRef.current = focused;
  React.useEffect(() => {
    if (!hideOnScroll) return;
    const el = document.getElementById(scrollerId);
    if (!el) return;
    let last = el.scrollTop;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        const y = el.scrollTop;
        const dy = y - last;
        if (Math.abs(dy) < DELTA_PX) return;
        last = y;
        if (focusedRef.current) {
          setHidden(false);
          return;
        }
        if (dy > 0 && y > HIDE_AFTER_PX) setHidden(true);
        else if (dy < 0) setHidden(false);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [hideOnScroll, scrollerId]);

  const showBadge = filterCount > 0;

  return (
    <div
      role="search"
      data-tour={dataTour}
      data-hidden={hidden ? 'true' : undefined}
      className={cn(
        'sticky top-0 z-20 -mx-4 bg-background px-4',
        'transition-transform duration-[250ms] ease-standard motion-reduce:transition-none',
        hidden && !focused && '-translate-y-full',
        className,
      )}
    >
      <div className="flex h-12 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            value={local}
            placeholder={placeholder}
            aria-label={ariaLabel ?? placeholder}
            onChange={(e) => push(e.target.value)}
            onFocus={() => {
              setFocused(true);
              setHidden(false);
            }}
            onBlur={() => setFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                push(local, true);
                inputRef.current?.blur();
              } else if (e.key === 'Escape' && local) {
                e.stopPropagation();
                push('', true);
              }
            }}
            className={cn('h-11 pl-9 text-[16px] [&::-webkit-search-cancel-button]:hidden', local && 'pr-10')}
          />
          {local && (
            <button
              type="button"
              aria-label={t('Effacer la recherche')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                push('', true);
                inputRef.current?.focus();
              }}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {onFilters && (
          <button
            type="button"
            onClick={onFilters}
            aria-label={showBadge ? `${t('Filtres')} (${filterCount})` : t('Filtres')}
            data-tour={filterDataTour}
            className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-card text-ink shadow-rim transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SlidersHorizontal className="h-5 w-5" aria-hidden />
            {showBadge && (
              <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium tabular-nums text-primary-foreground shadow-rim-filled">
                {filterCount}
              </span>
            )}
          </button>
        )}

        {onSort && sortLabel && (
          <button
            type="button"
            onClick={onSort}
            data-tour={sortDataTour}
            className="inline-flex h-11 max-w-[42vw] shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[13px] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowUpDown className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">
              <span className="text-ink-3">{t('Trier')} : </span>
              <span className="font-medium text-ink">{sortLabel}</span>
            </span>
          </button>
        )}
      </div>
      {below && <div className="pb-2">{below}</div>}
    </div>
  );
});

export default SearchRow;
