'use client';

/**
 * Segmented — one of 2–5 exclusive options, all visible, no popover.
 *
 * Why it exists as a form control: LukeW "dropdowns should be the UI of last
 * resort"; NN/g avoid dropdowns "for data that is highly familiar"; Material 3
 * segmented button "2 to 5 options… more than 5, use chips". On a phone a
 * Radix popover Select over 3 options costs a modal layer and a keyboard-
 * covered list for nothing — `PhoneSelect` therefore renders THIS in place of
 * the trigger whenever a touch select has ≤ 5 options
 * (docs/research/mobile-forms-inputs.md §2.2 tier a).
 *
 * Anatomy (element-specs §7 + density §7): equal-width segments in a
 * `surface-2` track; selection is ONE sliding surface (`SlidingThumb`, the
 * app's shared selection-travel primitive) painted `bg-card shadow-rim`, with
 * the active label above it. 36 px on a mouse, **44 px on touch** — the
 * research spec for the form tier. Labels ≤ 2 words; a set whose labels do
 * not fit wraps to two rows rather than truncating (a `title` tooltip is dead
 * on touch).
 *
 * It is a radio group, not a tab list: `role="radiogroup"` + `aria-checked`,
 * arrow keys move the selection (Radix's roving-focus convention).
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { SlidingThumb } from '@/components/ui/sliding-thumb';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  /** Plain text for assistive tech when `label` is a node. */
  labelText?: string;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T | undefined;
  onValueChange: (value: T) => void;
  /** Names the group for screen readers (the field's label). */
  'aria-label'?: string;
  /** Points at the visible `<Label>` instead. */
  'aria-labelledby'?: string;
  disabled?: boolean;
  /** 44 px (touch, the default in forms) or 36 px (dense desk toolbars). */
  size?: 'default' | 'sm';
  id?: string;
  className?: string;
}

export function Segmented<T extends string = string>({
  options,
  value,
  onValueChange,
  disabled,
  size = 'default',
  id,
  className,
  ...aria
}: SegmentedProps<T>) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const move = (from: number, dir: 1 | -1) => {
    const n = options.length;
    for (let step = 1; step <= n; step += 1) {
      const i = (from + dir * step + n * step) % n;
      const opt = options[i];
      if (opt && !opt.disabled) {
        onValueChange(opt.value);
        refs.current[i]?.focus();
        return;
      }
    }
  };

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={aria['aria-label']}
      aria-labelledby={aria['aria-labelledby']}
      className={cn(
        'relative isolate flex w-full flex-wrap gap-0.5 rounded-lg bg-surface-2 p-0.5',
        disabled && 'pointer-events-none opacity-50',
        className,
      )}
    >
      <SlidingThumb className="rounded-md bg-card shadow-rim" deps={[value, options.length]} />
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(n) => {
              refs.current[i] = n;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.labelText}
            data-seg-active={active || undefined}
            disabled={disabled || opt.disabled}
            tabIndex={active || (!value && i === 0) ? 0 : -1}
            onClick={() => onValueChange(opt.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(i, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(i, -1);
              }
            }}
            className={cn(
              // The thumb IS the selection paint — the active button never
              // draws its own background (motion-spec: one surface travels).
              'relative z-[1] min-w-0 flex-1 basis-0 rounded-md px-2 text-center font-medium leading-tight transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
              size === 'sm' ? 'min-h-9 py-1.5 text-[13px]' : 'min-h-11 py-2 text-[14px] max-md:text-[15px]',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
              opt.disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default Segmented;
