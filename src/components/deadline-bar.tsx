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
 * Semantic three-color deadline bar:
 *  0–50%  → teal  (plenty of time)
 *  50–80% → amber (attention)
 *  80–100%→ red   (urgent)
 *  overdue → solid destructive
 */
export function DeadlineBar({ percent, overdue, lateness, className }: DeadlineBarProps) {
  const label = '24h';
  const rounded = Math.max(0, Math.round(percent));

  const getBarColor = (p: number) => {
    if (p <= 50) return 'bg-primary';
    if (p <= 80) return 'bg-amber-500';
    return 'bg-destructive';
  };

  const getTextColor = (p: number) => {
    if (p <= 50) return 'text-primary';
    if (p <= 80) return 'text-amber-600 dark:text-amber-400';
    return 'text-destructive';
  };

  return (
    <div className={cn('flex flex-col gap-1 min-w-[120px]', className)}>
      <div className="flex items-center justify-between">
        <span className={cn('text-[11px] font-semibold tabular-nums', overdue ? 'text-destructive' : getTextColor(rounded))}>
          {overdue ? (lateness ? `En retard ${lateness}` : 'En retard') : `${rounded}%`}
        </span>
        <span className="text-[11px] text-muted-foreground font-medium tabular-nums">{label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            overdue ? 'bg-destructive animate-pulse' : getBarColor(rounded)
          )}
          style={{ width: `${Math.min(rounded, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default DeadlineBar;
