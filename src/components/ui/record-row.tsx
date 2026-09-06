'use client';

/**
 * RecordRow / RecordList — the phone form of a record `<Table>` row
 * (mobile-synthesis §4; research docs/research/mobile-lists-tables.md §1, §11).
 *
 * Below md every list of homogeneous records renders a real `<ul>` of
 * full-bleed rows (NN/g cards: "for homogeneous content use a standard
 * vertical list"; M3 lists: "extend edge-to-edge in compact windows"; Roselli:
 * real list markup, never `display:block` tables). Hairline dividers only —
 * no card frame, no gaps, no chevron, no per-row « ⋯ ».
 *
 * Anatomy (desktop column order collapsed to lines — first-three-columns rule):
 *   line 1  `id` identifier t-mono 14/600 (left) + `figure` decision figure (right)
 *   line 2  `primary` name t-body 14/400 ink · `secondary` « · compagnie » ink-2
 *   line 3  `line3` status chip + observation badge (optional)
 *
 * Heights: 2-line 64 px, 3-line 84 px; 16 px sides / 10 px top-bottom;
 * vertically centred. Emphasis budget = 2 bold cells (identifier + figure).
 * The whole row is ONE tap target (a `<Link>` or `<button>` filling the
 * `<li>`). Selection mode adds a 24 px `leading` checkbox at the 16 px inset
 * and shifts the text right; selected / current rows tint `bg-accent/40`.
 * `unread` paints the teal 3 px bar at `left-0` (Mes rappels).
 *
 * Skeleton = the same anatomy × N, mounted only after 200 ms (NN/g: nothing
 * under 1 s deserves a spinner; a flash under 200 ms reads as a glitch),
 * pulse only.
 *
 * Exports: RecordList, RecordRow, RecordRowSkeleton, RecordListSkeleton,
 * useDelayedFlag.
 */

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/* ------------------------------------------------------------------ */
/* useDelayedFlag                                                      */
/* ------------------------------------------------------------------ */

/**
 * `true` only after `flag` has been true for `delayMs` — the skeleton gate.
 * Resets immediately when `flag` drops.
 */
export function useDelayedFlag(flag: boolean, delayMs = 200): boolean {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => {
    if (!flag) {
      setOn(false);
      return;
    }
    const id = window.setTimeout(() => setOn(true), delayMs);
    return () => window.clearTimeout(id);
  }, [flag, delayMs]);
  return on;
}

/* ------------------------------------------------------------------ */
/* RecordList                                                          */
/* ------------------------------------------------------------------ */

export interface RecordListProps extends React.HTMLAttributes<HTMLUListElement> {
  /** Accessible name of the list (« Liste des dossiers »). */
  ariaLabel?: string;
  /** Tour anchor on the `<ul>`. */
  dataTour?: string;
  /**
   * Full-bleed inside the page's 16 px padding so the hairlines run edge to
   * edge (default). Pass `false` when the list already sits flush.
   */
  bleed?: boolean;
  children: React.ReactNode;
}

export const RecordList = React.forwardRef<HTMLUListElement, RecordListProps>(
  ({ ariaLabel, dataTour, bleed = true, className, children, ...props }, ref) => (
    <ul
      ref={ref}
      aria-label={ariaLabel}
      data-tour={dataTour}
      className={cn(
        // Scroll anchoring so a live insert above the viewport never jumps
        // the reader (research §7); hairlines between rows, one at the ends.
        'divide-y divide-hairline border-y border-hairline [overflow-anchor:auto]',
        bleed && '-mx-4',
        className,
      )}
      {...props}
    >
      {children}
    </ul>
  ),
);
RecordList.displayName = 'RecordList';

/* ------------------------------------------------------------------ */
/* RecordRow                                                           */
/* ------------------------------------------------------------------ */

export interface RecordRowProps {
  /** Line 1 left — the identifier (réf, plate…), rendered t-mono 14/600. */
  id: React.ReactNode;
  /** Line 1 right — the decision figure (age chip, délai, short date). */
  figure?: React.ReactNode;
  /** Line 2 — the human name. */
  primary?: React.ReactNode;
  /** Line 2 trailing — « · compagnie » in ink-2. */
  secondary?: React.ReactNode;
  /** Line 3 — status chip + observation badge. Omit for a 2-line row. */
  line3?: React.ReactNode;
  /** Selection-mode slot (a 24 px checkbox); the text shifts right when present. */
  leading?: React.ReactNode;
  /** Navigates as a real link (rendered with next/link). */
  href?: string;
  /** Tap handler; with `href` it runs before navigation (open a tab, save scroll). */
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  /** Selected in selection mode → `bg-accent/40` + `data-state=selected`. */
  selected?: boolean;
  /** Current row (`aria-current="true"`) — same tint as selected. */
  current?: boolean;
  /** Teal 3 px bar at left-0 (unread). */
  unread?: boolean;
  /** Highlight for 1.5 s after a return from the record (list-scroll-restore). */
  returned?: boolean;
  /** Stable record id — written to `data-record-id` for scroll restore / tours. */
  recordId?: string;
  dataTour?: string;
  /** Accessible name override (defaults to the DOM text). */
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

const ROW_BASE =
  'relative flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors duration-100 ' +
  '[@media(hover:hover)]:hover:bg-surface-2 active:bg-surface-2 focus-visible:bg-surface-2 ' +
  'data-[state=selected]:bg-accent/40 aria-[current=true]:bg-accent/40 data-[returned=true]:bg-accent/40';

export const RecordRow = React.forwardRef<HTMLLIElement, RecordRowProps>(
  (
    {
      id,
      figure,
      primary,
      secondary,
      line3,
      leading,
      href,
      onClick,
      selected,
      current,
      unread,
      returned,
      recordId,
      dataTour,
      ariaLabel,
      disabled,
      className,
    },
    ref,
  ) => {
    const threeLines = line3 !== undefined && line3 !== null && line3 !== false;

    const body = (
      <>
        {unread && <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-primary" />}
        {leading && <span className="flex h-6 w-6 shrink-0 items-center justify-center">{leading}</span>}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {/* Line 1 — identifier + figure. */}
          <span className="flex items-center justify-between gap-3">
            <span className="t-mono min-w-0 truncate text-[14px] font-semibold leading-5">{id}</span>
            {figure !== undefined && figure !== null && (
              <span className="flex shrink-0 items-center text-[13px] leading-5 text-ink-2 tabular-nums">{figure}</span>
            )}
          </span>
          {/* Line 2 — name · compagnie. */}
          {(primary || secondary) && (
            <span className="flex min-w-0 items-baseline gap-1 text-[14px] leading-5">
              {primary ? <span className="min-w-0 truncate text-ink">{primary}</span> : null}
              {secondary ? (
                <span className="min-w-0 shrink-[2] truncate text-ink-2">
                  {primary ? <span aria-hidden> · </span> : null}
                  {secondary}
                </span>
              ) : null}
            </span>
          )}
          {/* Line 3 — chips. */}
          {threeLines && <span className="flex min-w-0 items-center gap-1.5 pt-0.5 [&>*]:min-w-0">{line3}</span>}
        </span>
      </>
    );

    const cls = cn(ROW_BASE, threeLines ? 'min-h-[84px]' : 'min-h-[64px]', disabled && 'pointer-events-none opacity-50', className);
    const state = selected ? 'selected' : undefined;

    return (
      <li
        ref={ref}
        data-record-id={recordId}
        data-tour={dataTour}
        data-state={state}
        data-returned={returned ? 'true' : undefined}
        aria-selected={selected}
        className="list-none"
      >
        {href && !disabled ? (
          <Link
            href={href}
            onClick={onClick}
            aria-label={ariaLabel}
            aria-current={current ? 'true' : undefined}
            data-state={state}
            data-returned={returned ? 'true' : undefined}
            className={cls}
          >
            {body}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-current={current ? 'true' : undefined}
            aria-pressed={selected !== undefined && leading ? selected : undefined}
            data-state={state}
            data-returned={returned ? 'true' : undefined}
            className={cls}
          >
            {body}
          </button>
        )}
      </li>
    );
  },
);
RecordRow.displayName = 'RecordRow';

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

export interface RecordRowSkeletonProps {
  /** 2-line (64 px) or 3-line (84 px) anatomy. */
  lines?: 2 | 3;
  className?: string;
}

/** One row of bars at the real line positions (element-specs §15). */
export function RecordRowSkeleton({ lines = 3, className }: RecordRowSkeletonProps) {
  return (
    <li className={cn('flex list-none items-center px-4 py-2.5', lines === 3 ? 'min-h-[84px]' : 'min-h-[64px]', className)} aria-hidden>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-4 w-10 rounded-full" />
        </span>
        <Skeleton className="h-3.5 w-3/4" />
        {lines === 3 && (
          <span className="flex items-center gap-1.5">
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-4 w-32 rounded-full" />
          </span>
        )}
      </span>
    </li>
  );
}

export interface RecordListSkeletonProps extends RecordRowSkeletonProps {
  count?: number;
  /** Mount only after this many ms (default 200). `0` = immediately. */
  delayMs?: number;
  bleed?: boolean;
  ariaLabel?: string;
}

/** The row anatomy × `count`, gated by the 200 ms delay. */
export function RecordListSkeleton({ count = 6, lines = 3, delayMs = 200, bleed = true, ariaLabel, className }: RecordListSkeletonProps) {
  const show = useDelayedFlag(true, delayMs);
  if (!show) return null;
  return (
    <ul
      aria-busy="true"
      aria-label={ariaLabel}
      className={cn('divide-y divide-hairline border-y border-hairline', bleed && '-mx-4', className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <RecordRowSkeleton key={i} lines={lines} />
      ))}
    </ul>
  );
}

export default RecordRow;
