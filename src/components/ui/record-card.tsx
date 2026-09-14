'use client';

/**
 * RecordCard — the phone form of a list record (mobile redesign 2026-09-14,
 * Claude Design handoff `Phone.dc.html`, turn 3 « cartes partout »).
 *
 * Every phone list — dossiers, rappels, chiffrage, missions, planifications,
 * administration — is a column of soft-border cards with 8 px between them:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │ [leading]  SL-25-0412            12 j        │  ← `id` mono 12/600 ink-3 · `trailing` column
 *   │            Karim Benjelloun      [statut]    │  ← `title` 15/600, WRAPS (never « … »)
 *   │            Wafa Assurance · [obs chip]    ⌄  │  ← `meta` 12 ink-3 with chips · optional toggle
 *   ├──────────────────────────────────────────────┤
 *   │ <RecordCardFields> 2-column dl  (expanded)   │
 *   │ <RecordCardActions> buttons row              │
 *   └──────────────────────────────────────────────┘
 *
 * Card: `bg-card`, 1 px hairline, 12 px radius, 1 px shadow. The header is
 * ONE tap target (link or button); the chevron is a separate 40 px toggle so
 * expanding never navigates. The reference is stacked ABOVE the name so the
 * name keeps the full width and never truncates (owner ruling in the design).
 *
 * Exports: RecordCardList, RecordCard, RecordCardFields, RecordCardActions,
 * RecordCardSkeleton, RecordCardListSkeleton.
 */

import * as React from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useDelayedFlag } from '@/components/ui/record-row';

/* ------------------------------------------------------------------ */
/* RecordCardList                                                      */
/* ------------------------------------------------------------------ */

export interface RecordCardListProps extends React.HTMLAttributes<HTMLUListElement> {
  ariaLabel?: string;
  dataTour?: string;
  children: React.ReactNode;
}

export const RecordCardList = React.forwardRef<HTMLUListElement, RecordCardListProps>(
  ({ ariaLabel, dataTour, className, children, ...props }, ref) => (
    <ul
      ref={ref}
      aria-label={ariaLabel}
      data-tour={dataTour}
      className={cn('m-0 flex list-none flex-col gap-2 p-0 [overflow-anchor:auto]', className)}
      {...props}
    >
      {children}
    </ul>
  ),
);
RecordCardList.displayName = 'RecordCardList';

/* ------------------------------------------------------------------ */
/* RecordCard                                                          */
/* ------------------------------------------------------------------ */

export const RECORD_CARD_CLASS =
  'overflow-hidden rounded-xl border border-hairline bg-card text-card-foreground shadow-[0_1px_2px_hsl(var(--shadow-color)/0.05)]';

export interface RecordCardProps {
  /** Line 1 — the identifier (réf, plate…), mono 12/600 ink-3. */
  id?: React.ReactNode;
  /** Line 2 — the human name, 15/600, wraps. */
  title: React.ReactNode;
  /** Line 3 — meta text and chips (12 px ink-3, wraps). */
  meta?: React.ReactNode;
  /** Right column, end-aligned, stacked (age, status chip, amount…). */
  trailing?: React.ReactNode;
  /** Left slot before the text (a <DateBlock>, an avatar tile). */
  leading?: React.ReactNode;
  /** Navigates as a real link. */
  href?: string;
  /** Tap on the header (with `href` it runs before navigation). */
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  /** Show the 40 px chevron toggle; `expanded` content renders under the header. */
  expandable?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  /** Content shown while `expanded` (a <RecordCardFields>, a <RecordCardActions>…). */
  children?: React.ReactNode;
  /** Always-visible row under the header (the rappel card's two buttons). */
  footer?: React.ReactNode;
  /** Unread → soft teal border (Mes rappels). */
  unread?: boolean;
  /** Current record → accent tint. */
  current?: boolean;
  /** Highlight for 1.5 s after a return from the record (list-scroll-restore). */
  returned?: boolean;
  /** Stable record id — `data-record-id` for scroll restore / tours. */
  recordId?: string;
  dataTour?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
}

const HEADER_BTN =
  'flex min-w-0 flex-1 items-start gap-2.5 rounded-lg text-left text-inherit outline-none transition-colors duration-100 ' +
  'focus-visible:ring-2 focus-visible:ring-ring active:bg-surface-2/60';

export const RecordCard = React.forwardRef<HTMLLIElement, RecordCardProps>(
  (
    {
      id,
      title,
      meta,
      trailing,
      leading,
      href,
      onClick,
      expandable,
      expanded,
      onToggle,
      children,
      footer,
      unread,
      current,
      returned,
      recordId,
      dataTour,
      ariaLabel,
      disabled,
      className,
    },
    ref,
  ) => {
    const body = (
      <>
        {leading && <span className="flex shrink-0 items-start">{leading}</span>}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {id !== undefined && id !== null && (
            <span className="font-mono text-[12px] font-semibold leading-4 tabular-nums text-ink-3">{id}</span>
          )}
          <span className="text-[15px] font-semibold leading-[1.3] text-ink [text-wrap:pretty]">{title}</span>
          {meta && (
            <span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[12px] leading-4 text-ink-3 [&>*]:min-w-0">
              {meta}
            </span>
          )}
        </span>
        {trailing && (
          <span className="flex shrink-0 flex-col items-end gap-1 pt-0.5 text-right [&>*]:max-w-[150px]">{trailing}</span>
        )}
      </>
    );

    const interactive = !disabled && (!!href || !!onClick);
    const header = href && !disabled ? (
      <Link href={href} onClick={onClick} aria-label={ariaLabel} aria-current={current ? 'true' : undefined} className={HEADER_BTN}>
        {body}
      </Link>
    ) : interactive ? (
      <button type="button" onClick={onClick} aria-label={ariaLabel} aria-current={current ? 'true' : undefined} className={HEADER_BTN}>
        {body}
      </button>
    ) : (
      <div className={cn(HEADER_BTN, 'active:bg-transparent')}>{body}</div>
    );

    return (
      <li
        ref={ref}
        data-record-id={recordId}
        data-tour={dataTour}
        data-returned={returned ? 'true' : undefined}
        className={cn(
          RECORD_CARD_CLASS,
          'list-none transition-colors',
          unread && 'border-[hsl(178_40%_74%)]',
          (current || returned) && 'bg-accent/30',
          disabled && 'opacity-50',
          className,
        )}
      >
        <div className={cn('flex items-start gap-1.5 py-2.5 pl-3.5', expandable ? 'pr-1.5' : 'pr-3.5')}>
          {header}
          {expandable && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={!!expanded}
              aria-label="Détails"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronDown
                className={cn('h-5 w-5 transition-transform duration-200 ease-standard motion-reduce:transition-none', expanded && 'rotate-180')}
                aria-hidden
              />
            </button>
          )}
        </div>
        {expandable && expanded && <div className="animate-in fade-in-0 duration-200 motion-reduce:animate-none">{children}</div>}
        {!expandable && children}
        {footer}
      </li>
    );
  },
);
RecordCard.displayName = 'RecordCard';

/* ------------------------------------------------------------------ */
/* RecordCardFields — the expanded 2-column definition grid            */
/* ------------------------------------------------------------------ */

export interface RecordCardField {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Takes the full width (statut, observation). */
  full?: boolean;
  /** Mono value (plate, ref). */
  mono?: boolean;
}

export function RecordCardFields({ fields, className }: { fields: RecordCardField[]; className?: string }) {
  return (
    <dl className={cn('m-0 grid grid-cols-2 gap-x-3 gap-y-2.5 border-t border-hairline px-3.5 pb-3 pt-2.5', className)}>
      {fields.map((f, i) => {
        const empty = f.value === null || f.value === undefined || f.value === '' || f.value === '—';
        return (
          <div key={i} className={cn('min-w-0', f.full && 'col-span-2')}>
            <dt className="text-[11px] leading-4 text-ink-3">{f.label}</dt>
            <dd
              className={cn(
                'm-0 mt-0.5 truncate text-[13px] leading-[1.35]',
                empty ? 'font-normal text-ink-4' : 'font-medium text-ink',
                f.mono && 'font-mono tabular-nums',
                f.full && 'whitespace-normal [overflow-wrap:anywhere]',
              )}
            >
              {empty ? '—' : f.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* RecordCardActions — buttons row inside the card                     */
/* ------------------------------------------------------------------ */

/**
 * `flex gap-2 px-3.5 pb-2.5`; children are 36 px controls — a `flex-1` filled
 * primary and 36 × 36 rim icon buttons (design: « Ouvrir le dossier » · ☏ · 🔔).
 */
export function RecordCardActions({ children, className, bordered }: { children: React.ReactNode; className?: string; bordered?: boolean }) {
  return (
    <div className={cn('flex items-center gap-2 px-3.5 pb-2.5 [&>*]:h-9', bordered && 'border-t border-hairline pt-2.5', className)}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons                                                           */
/* ------------------------------------------------------------------ */

export function RecordCardSkeleton({ className }: { className?: string }) {
  return (
    <li className={cn(RECORD_CARD_CLASS, 'flex list-none items-start gap-3 px-3.5 py-3')} aria-hidden>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </span>
      <span className="flex flex-col items-end gap-2">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </span>
      <span className={className} />
    </li>
  );
}

export function RecordCardListSkeleton({ count = 6, delayMs = 200, ariaLabel, className }: { count?: number; delayMs?: number; ariaLabel?: string; className?: string }) {
  const show = useDelayedFlag(true, delayMs);
  if (!show) return null;
  return (
    <ul aria-busy="true" aria-label={ariaLabel} className={cn('m-0 flex list-none flex-col gap-2 p-0', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <RecordCardSkeleton key={i} />
      ))}
    </ul>
  );
}

export default RecordCard;
