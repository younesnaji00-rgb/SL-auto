'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface DeadlineBarProps {
  /** Percent of deadline consumed (0-100+) */
  percent: number;
  /** True when the deadline has passed */
  overdue: boolean;
  /** Optional pre-formatted business-hour lateness (e.g. "02j/14h"). Appended after "En retard" when overdue. */
  lateness?: string;
  className?: string;
}

/**
 * Deadline bar on the semantic status pairs (blueprint §1 — no hand-picked
 * amber/red):
 *  0–50%   → success (plenty of time)
 *  50–80%  → warning (attention)
 *  80–100% → danger  (urgent)
 *  overdue → danger, pulsing
 */
export function DeadlineBar({ percent, overdue, lateness, className }: DeadlineBarProps) {
  const label = '24h';
  const rounded = Math.max(0, Math.round(percent));

  const getBarColor = (p: number) => {
    if (p <= 50) return 'bg-status-success-fg';
    if (p <= 80) return 'bg-status-warning-fg';
    return 'bg-status-danger-fg';
  };

  const getTextColor = (p: number) => {
    if (p <= 50) return 'text-status-success-fg';
    if (p <= 80) return 'text-status-warning-fg';
    return 'text-status-danger-fg';
  };

  return (
    <div className={cn('flex min-w-[120px] flex-col gap-1', className)}>
      <div className="flex items-center justify-between">
        <span className={cn('text-[11px] font-semibold tabular-nums', overdue ? 'text-status-danger-fg' : getTextColor(rounded))}>
          {overdue ? (lateness ? `En retard ${lateness}` : 'En retard') : `${rounded}%`}
        </span>
        <span className="text-[11px] font-medium tabular-nums text-ink-3">{label}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-300 ease-standard motion-reduce:transition-none',
            overdue ? 'animate-pulse bg-status-danger-fg motion-reduce:animate-none' : getBarColor(rounded)
          )}
          style={{ width: `${Math.min(rounded, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default DeadlineBar;
