'use client';

/**
 * The « ‹ › » page button for a horizontal rail (see `hooks/use-edge-scroll`).
 * Quiet ghost square: it must never compete with the tabs or cards it scrolls
 * (element-specs §8 — row/utility controls are `ghost`). Dimmed, not removed,
 * at the end of its travel so the rail's width never jumps mid-scroll.
 *
 * `aria-hidden` + `tabIndex={-1}` on purpose: the rail's own keyboard model
 * (tablist arrows, or tabbing through the cards) already reaches everything
 * these buttons scroll to, so exposing them would add two dead stops for
 * keyboard and screen-reader users.
 */

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function EdgeArrow({
  dir,
  disabled,
  onClick,
  className,
}: {
  dir: 'left' | 'right';
  disabled: boolean;
  onClick: () => void;
  className?: string;
}) {
  const Icon = dir === 'left' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-hidden
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 w-7 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors',
        'hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:text-ink-4/60',
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
