"use client";

import React, { useEffect, useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatFr, parseFr } from '@/lib/devis-schema';

export interface CellNumberInputProps {
  value: number | null | undefined;
  onChange: (v: number | null) => void;
  disabled?: boolean;
  align?: 'left' | 'center' | 'right';
  suffix?: string;
  decimals?: number;
  /**
   * When true, an empty input emits `null` (blank cell — main d'oeuvre has no qte/tva/vetuste).
   * When false, an empty input emits 0 (legacy default, used for puHT / Total).
   */
  allowNull?: boolean;
  /** Step amount for the optional ▲/▼ stepper buttons. Default 1. */
  step?: number;
  /** Lower clamp bound applied to stepper output and to typed/blurred values. */
  min?: number;
  /** Upper clamp bound applied to stepper output and to typed/blurred values. */
  max?: number;
  /** Show ▲/▼ chevrons inside the cell. Default false. */
  showSteppers?: boolean;
}

const clamp = (n: number, lo: number | undefined, hi: number | undefined) => {
  let r = n;
  if (typeof lo === 'number') r = Math.max(r, lo);
  if (typeof hi === 'number') r = Math.min(r, hi);
  return r;
};

export function CellNumberInput({
  value,
  onChange,
  disabled,
  align = 'left',
  suffix,
  decimals = 2,
  allowNull = false,
  step = 1,
  min,
  max,
  showSteppers = false,
}: CellNumberInputProps) {
  const displayFor = (v: number | null | undefined) =>
    v === null || v === undefined ? '' : formatFr(v, decimals);

  const [text, setText] = useState<string>(displayFor(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(displayFor(value));
  }, [value, decimals, focused]);

  const hasBounds = typeof min === 'number' || typeof max === 'number';

  const stepUp = () => {
    if (disabled) return;
    const cur = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    const next = clamp(Math.floor(cur / step) * step + step, min, max);
    // Steppers fire while the input is focused (mousedown is prevented to keep
    // focus). The value-syncing useEffect bails when focused, so push the new
    // formatted text directly here so the displayed number tracks the click.
    setText(formatFr(next, decimals));
    onChange(next);
  };

  const stepDown = () => {
    if (disabled) return;
    const cur = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    const next = clamp(Math.ceil(cur / step) * step - step, min, max);
    setText(formatFr(next, decimals));
    onChange(next);
  };

  return (
    <div className="relative">
      <input
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          if (next.trim() === '') {
            onChange(allowNull ? null : 0);
          } else {
            onChange(parseFr(next));
          }
        }}
        onFocus={(e) => { setFocused(true); e.currentTarget.select(); }}
        onBlur={() => {
          setFocused(false);
          if (text.trim() === '') {
            setText('');
            onChange(allowNull ? null : 0);
          } else {
            const parsed = parseFr(text);
            const finalVal = hasBounds ? clamp(parsed, min, max) : parsed;
            setText(formatFr(finalVal, decimals));
            if (finalVal !== parsed) onChange(finalVal);
          }
        }}
        disabled={disabled}
        inputMode="decimal"
        className={cn(
          "w-full h-7 px-1.5 text-xs bg-transparent outline-none rounded border border-transparent",
          "focus:border-primary/50 focus:bg-background disabled:cursor-not-allowed",
          align === 'center' && 'text-center',
          align === 'right' && 'text-right',
          suffix && 'pr-5',
          showSteppers && 'pr-6',
        )}
      />
      {suffix && (
        <span className={cn(
          "absolute top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none",
          showSteppers ? 'right-5' : 'right-1.5',
        )}>
          {suffix}
        </span>
      )}
      {showSteppers && (
        <div className="absolute right-0.5 top-1/2 -translate-y-1/2 flex flex-col">
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={stepUp}
            aria-label="Augmenter"
            className={cn(
              "flex items-center justify-center h-3 w-4 text-muted-foreground hover:text-foreground",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={stepDown}
            aria-label="Diminuer"
            className={cn(
              "flex items-center justify-center h-3 w-4 text-muted-foreground hover:text-foreground",
              "disabled:opacity-40 disabled:cursor-not-allowed",
            )}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

export default CellNumberInput;
