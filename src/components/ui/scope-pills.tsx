'use client';

/**
 * ScopePills — the horizontally scrolling row of scope / filter pills under
 * the phone top bar (mobile redesign 2026-09-14, `Phone.dc.html` turn 2:
 * « puces de portée, bord bas »).
 *
 *   ( À traiter 42 ) ( Tous 318 ) ( En retard 7 ) ( Chiffrage 11 ) … ( Filtres 2 )
 *
 * 32 px pills, 13/500, count 11 px tabular. Active = filled teal +
 * `shadow-rim-filled`; inactive = card + `shadow-rim`; a `tone` pill paints
 * its status pair (« En retard » on the danger pair); `kind: 'filters'` is
 * the flat surface-3 pill that opens the Filtres sheet. The row scrolls
 * sideways without a scrollbar, never wraps, and — when `sticky` — pins under
 * the bar on the canvas colour with a bottom hairline.
 *
 * The same component paints the Admin area's destination chips in the top
 * bar and the mission phase / rappel segments.
 */

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export type ScopePillTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'time';

export interface ScopePill {
  key: string;
  label: React.ReactNode;
  count?: React.ReactNode;
  active?: boolean;
  /** Status pair of an inactive pill (« En retard » → danger). */
  tone?: ScopePillTone;
  /** `filters` = the flat pill that opens the Filtres sheet (never « active »). */
  kind?: 'scope' | 'filters';
  onClick?: () => void;
  /** Navigates instead (the Admin destination chips). */
  href?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  dataTour?: string;
  ariaLabel?: string;
}

const TONE_CLASS: Record<ScopePillTone, string> = {
  neutral: 'bg-card text-ink-2 shadow-rim',
  info: 'bg-status-info-bg text-status-info-fg shadow-rim',
  warning: 'bg-status-warning-bg text-status-warning-fg shadow-rim',
  success: 'bg-status-success-bg text-status-success-fg shadow-rim',
  danger: 'bg-status-danger-bg text-status-danger-fg shadow-rim',
  time: 'bg-tertiary-bg text-tertiary-deep shadow-rim',
};

export function scopePillClass(p: Pick<ScopePill, 'active' | 'tone' | 'kind' | 'disabled'>): string {
  return cn(
    'inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-medium leading-none transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    p.kind === 'filters'
      ? 'bg-surface-3 text-ink-2 hover:bg-surface-4'
      : p.active
        ? 'bg-primary text-primary-foreground shadow-rim-filled'
        : TONE_CLASS[p.tone ?? 'neutral'],
    p.disabled && 'pointer-events-none opacity-50',
    '[&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0',
  );
}

export function ScopePillButton({ pill }: { pill: ScopePill }) {
  const inner = (
    <>
      {pill.icon}
      <span className="truncate">{pill.label}</span>
      {pill.count !== undefined && pill.count !== null && pill.count !== '' && (
        <span className={cn('text-[11px] tabular-nums', pill.active ? 'opacity-85' : 'opacity-70')}>{pill.count}</span>
      )}
    </>
  );
  const cls = scopePillClass(pill);
  if (pill.href && !pill.disabled) {
    return (
      <Link href={pill.href} onClick={pill.onClick} aria-current={pill.active ? 'page' : undefined} aria-label={pill.ariaLabel} data-tour={pill.dataTour} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={pill.onClick}
      disabled={pill.disabled}
      aria-pressed={pill.kind === 'filters' ? undefined : !!pill.active}
      aria-label={pill.ariaLabel}
      data-tour={pill.dataTour}
      className={cls}
    >
      {inner}
    </button>
  );
}

export interface ScopePillsProps {
  pills: ScopePill[];
  /** Pin under the top bar (inside the page scroller) with a bottom hairline. */
  sticky?: boolean;
  /**
   * Bleed through the page's 16 px padding so the hairline runs edge to edge
   * and the row sits flush under the bar (`-mx-4 -mt-4`). Default true.
   */
  flush?: boolean;
  ariaLabel?: string;
  dataTour?: string;
  className?: string;
}

export function ScopePills({ pills, sticky, flush = true, ariaLabel, dataTour, className }: ScopePillsProps) {
  const ref = React.useRef<HTMLDivElement>(null);

  // Keep the active pill in view when it changes off-screen.
  const activeKey = pills.find((p) => p.active)?.key;
  React.useEffect(() => {
    const row = ref.current;
    if (!row || !activeKey) return;
    const el = row.querySelector<HTMLElement>('[aria-pressed="true"], [aria-current="page"]');
    if (!el) return;
    const left = el.offsetLeft;
    const right = left + el.offsetWidth;
    if (left < row.scrollLeft + 16 || right > row.scrollLeft + row.clientWidth - 16) {
      row.scrollTo({ left: Math.max(0, left - 16), behavior: 'auto' });
    }
  }, [activeKey]);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-tour={dataTour}
      className={cn(
        sticky && 'sticky top-0 z-30 border-b border-hairline bg-background',
        flush && '-mx-4',
        flush && sticky && '-mt-4',
        className,
      )}
    >
      <div
        ref={ref}
        className="flex gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {pills.map((p) => (
          <ScopePillButton key={p.key} pill={p} />
        ))}
      </div>
    </div>
  );
}

export default ScopePills;
