'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeadlineBarProps {
  /** Percent of the deadline consumed (0–100+). */
  percent: number;
  /** True when the deadline has passed. */
  overdue: boolean;
  /** Pre-formatted business-hour lateness (e.g. "02j/14h"), appended after "En retard". */
  lateness?: string;
  /** Text at the left of the track while the clock runs (e.g. "6 h restantes"). Defaults to the percentage. */
  label?: string;
  /** Budget printed at the right of the track. */
  budgetLabel?: string;
  /** When set the meter is replaced by ✓ + this text (the clock is stopped). */
  completedLabel?: string;
  className?: string;
}

/**
 * Deadline meter — the KPI meter contract (element-specs §6: dataviz stat
 * tile ✓ "optional meter on a surface-3 track filled with chart-1; amber /
 * danger only when there IS an exception"; Carbon progress indicator ✓;
 * Few — bright colour only for the exception). Track `surface-3`, fill
 * `chart-1`; the warning pair once ≥ 80 % is consumed (running late), the
 * danger pair once overdue — each exception ships with its text label, never
 * colour alone (§11). A stopped clock is ✓ + "Chiffré le …" in plain ink:
 * "done" is not "good" (§6 must-not: green "good" bars). No pulse.
 */
export function DeadlineBar({
  percent,
  overdue,
  lateness,
  label,
  budgetLabel = '24 h',
  completedLabel,
  className,
}: DeadlineBarProps) {
  if (completedLabel) {
    return (
      <div className={cn('flex items-center gap-1.5 text-sm text-ink', className)}>
        <CheckCircle2 className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
        <span className="truncate">{completedLabel}</span>
      </div>
    );
  }

  const rounded = Math.max(0, Math.round(percent));
  const late = !overdue && rounded >= 80;
  const fill = overdue ? 'bg-status-danger-fg' : late ? 'bg-status-warning-fg' : 'bg-chart-1';
  const text = overdue ? 'text-status-danger-fg' : late ? 'text-status-warning-fg' : 'text-ink-2';
  const caption = overdue ? (lateness ? `En retard ${lateness}` : 'En retard') : (label ?? `${rounded} %`);

  return (
    <div className={cn('flex min-w-[140px] flex-col gap-1', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-[11px] font-semibold tabular-nums', text)}>{caption}</span>
        <span className="t-caption tabular-nums">{budgetLabel}</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(rounded, 100)}
        aria-label={caption}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none', fill)}
          style={{ width: `${Math.min(rounded, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default DeadlineBar;
