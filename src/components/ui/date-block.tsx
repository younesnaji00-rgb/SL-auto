'use client';

/**
 * DateBlock — the time / day tile that anchors a mission or planification
 * card (mobile redesign 2026-09-14, `Phone.dc.html` terrain + dossier
 * planifications; DESIGN.md §9 « the date block is the row's anchor »).
 *
 *   ┌──────┐
 *   │11:00 │  15/600
 *   │mar.16│  10/500
 *   └──────┘
 *
 * Emphasis (terracotta = TIME, owner ruling): `next` = the next visit, solid
 * terracotta + `shadow-rim-filled`; `default` = terracotta tint; `muted` =
 * surface-3 (a late or past visit — urgency is said by the chip, not the tile).
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface DateBlockProps {
  /** « 11:00 » (or a day number when there is no time). */
  time: React.ReactNode;
  /** « mar. 16 » — one short line. */
  day?: React.ReactNode;
  emphasis?: 'next' | 'default' | 'muted';
  /** 52 × 44 (default) or 48 × 40 (`sm`, list cards). */
  size?: 'default' | 'sm';
  className?: string;
}

export function DateBlock({ time, day, emphasis = 'default', size = 'default', className }: DateBlockProps) {
  return (
    <span
      className={cn(
        'flex shrink-0 flex-col items-center justify-center rounded-lg tabular-nums',
        size === 'sm' ? 'h-10 w-12' : 'h-11 w-[52px]',
        emphasis === 'next' && 'bg-tertiary text-tertiary-foreground shadow-rim-filled',
        emphasis === 'default' && 'bg-tertiary-bg text-tertiary-deep shadow-rim',
        emphasis === 'muted' && 'bg-surface-3 text-ink-2 shadow-rim',
        className,
      )}
    >
      <span className={cn('font-semibold leading-none', size === 'sm' ? 'text-[14px]' : 'text-[15px]')}>{time}</span>
      {day && <span className={cn('mt-0.5 text-[10px] font-medium leading-none opacity-90', size === 'sm' ? 'mt-0.5' : 'mt-[3px]')}>{day}</span>}
    </span>
  );
}

export default DateBlock;
