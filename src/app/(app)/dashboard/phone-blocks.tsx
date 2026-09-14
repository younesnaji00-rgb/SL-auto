'use client';

/**
 * Phone primitives of the « Pilotage » area (mobile redesign 2026-09-14,
 * Claude Design handoff `Phone.dc.html` — Tableau de bord ll. 381–397,
 * Suivi d'équipe ll. 399–420, shapes ll. 928–936).
 *
 *   PhoneKpiLine   one scrolling line of the role's headline figures:
 *                  « 42 ouverts · 7 en retard · 4,2 j délai moyen · 11 créés / 7 j »
 *                  (13 px, tabular, value 600 ink; the late figure 600 danger-fg).
 *   PhoneBlock     a RECORD_CARD_CLASS card: header 15/600 + count Badge +
 *                  « Voir tout › » link, then 48 px rows (`PhoneBlockRow`:
 *                  mono id · who · time/age · chevron).
 *   PhonePersonRow 44 px row: 28 px initials tile · name · open · late
 *                  (late > 1 in danger-fg) — « Par gestionnaire » / « Par agent ».
 *   PhoneBarRow    label / 10 px track / value — the funnel and the charge bars.
 *
 * No chart from `@/components/viz` is ever mounted here: on a 390 px screen a
 * dense chart is a picture, not a reading (docs/research/mobile-synthesis.md
 * §7 « no charts on phones »); each one is replaced by its headline figure.
 */

import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { RECORD_CARD_CLASS } from '@/components/ui/record-card';
import { useT } from '@/i18n';

export type PhoneTone = 'neutral' | 'danger' | 'time' | 'info' | 'warning' | 'success';

/** French decimal + unit: 4,2 j — never 4.2. */
export const fmtDaysFr = (days: number | null | undefined, digits = 1): string =>
  days == null || !Number.isFinite(days) ? '—' : `${days.toFixed(digits).replace('.', ',')} j`;

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '—';

// ── KPI line ────────────────────────────────────────────────────────────────

export interface PhoneKpi {
  key: string;
  /** Already formatted (« 4,2 j », « 92 % », 42). */
  value: React.ReactNode;
  label: string;
  /** Paint the whole item semibold danger — only when the figure IS an exception (> 0). */
  danger?: boolean;
  href?: string;
}

export function PhoneKpiLine({ items, className }: { items: PhoneKpi[]; className?: string }) {
  return (
    <div
      className={cn(
        // Bleeds through the page's 16 px padding so the line scrolls edge to edge.
        '-mx-4 flex gap-3 overflow-x-auto whitespace-nowrap px-4 pb-1.5 pt-2.5 text-[13px] tabular-nums text-ink-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {items.map((k) => {
        const inner = k.danger ? (
          <span className="font-semibold text-status-danger-fg">
            {k.value} {k.label}
          </span>
        ) : (
          <>
            <b className="font-semibold text-ink">{k.value}</b> {k.label}
          </>
        );
        return k.href ? (
          <Link key={k.key} href={k.href} className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {inner}
          </Link>
        ) : (
          <span key={k.key} className="shrink-0">
            {inner}
          </span>
        );
      })}
    </div>
  );
}

// ── Block ───────────────────────────────────────────────────────────────────

export interface PhoneBlockProps {
  title: string;
  count?: number | null;
  /** Count chip tone: danger for late / relance blocks, time for today's visits. Neutral otherwise. */
  countTone?: PhoneTone;
  /** Second line under the title (12 px ink-3), e.g. « Aucune action depuis plus de 2 j ouvrés ». */
  caption?: React.ReactNode;
  /** Inline column hint in the header row after the title (12 px ink-3), e.g. « ouverts · hors délai ». */
  hint?: React.ReactNode;
  moreHref?: string;
  moreLabel?: string;
  onMore?: () => void;
  /** Printed as a 48 px calm line when there are no rows. */
  emptyText?: string;
  loading?: boolean;
  dataTour?: string;
  className?: string;
  children?: React.ReactNode;
}

const COUNT_VARIANT: Record<PhoneTone, React.ComponentProps<typeof Badge>['variant']> = {
  neutral: 'neutral',
  danger: 'danger',
  time: 'time',
  info: 'info',
  warning: 'warning',
  success: 'success',
};

export function PhoneBlock({ title, count, countTone = 'neutral', caption, hint, moreHref, moreLabel, onMore, emptyText, loading, dataTour, className, children }: PhoneBlockProps) {
  const t = useT();
  const hasRows = React.Children.toArray(children).some(Boolean);
  const more = moreLabel ?? t('Voir tout');
  const moreCls = 'ml-auto inline-flex h-10 shrink-0 items-center gap-0.5 text-[13px] font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded';
  return (
    <section className={cn(RECORD_CARD_CLASS, className)} data-tour={dataTour}>
      {/* Design header: 12 px top · 8 px bottom (the « Voir tout » hit area is 40 px tall). */}
      <div className="flex items-center gap-2 px-3.5 pb-2 pt-3">
        <h2 className="min-w-0 text-[15px] font-semibold leading-5 text-ink [text-wrap:pretty]">{title}</h2>
        {count != null && (
          <Badge variant={countTone === 'danger' && count === 0 ? 'neutral' : COUNT_VARIANT[countTone]} className="h-5 min-w-[20px] justify-center px-1.5">
            {count}
          </Badge>
        )}
        {hint && <span className="min-w-0 truncate text-[12px] leading-4 text-ink-3">{hint}</span>}
        {moreHref ? (
          <Link href={moreHref} className={moreCls}>
            {more}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : onMore ? (
          <button type="button" onClick={onMore} className={moreCls}>
            {more}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {caption && <p className="px-3.5 pb-2 text-[12px] leading-4 text-ink-3">{caption}</p>}
      {loading ? (
        <ul className="m-0 list-none p-0" aria-busy="true">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="flex min-h-[48px] items-center gap-2.5 border-t border-hairline px-3.5">
              <span className="h-3 w-20 animate-pulse rounded bg-surface-2" />
              <span className="h-3 flex-1 animate-pulse rounded bg-surface-2" />
              <span className="h-3 w-8 animate-pulse rounded bg-surface-2" />
            </li>
          ))}
        </ul>
      ) : hasRows ? (
        <ul className="m-0 list-none p-0">{children}</ul>
      ) : (
        <p className="flex min-h-[48px] items-center border-t border-hairline px-3.5 text-[14px] text-ink-2">{emptyText ?? t('Rien à signaler')}</p>
      )}
    </section>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────

export interface PhoneBlockRowProps {
  /** Mono 14/600 — the réf. */
  id: React.ReactNode;
  /** One line, ink-2, truncates (the name never carries the urgency). */
  who?: React.ReactNode;
  /** Trailing time / age text (12 px tabular). */
  time?: React.ReactNode;
  /** danger = late (semibold danger-fg) · time = today's hour (semibold tertiary-deep) · neutral = ink-3. */
  timeTone?: 'danger' | 'time' | 'neutral';
  /** Optional chip between `who` and `time` (« Révision », the mission type). */
  chip?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  dataTour?: string;
}

const ROW_CLASS =
  'flex min-h-[48px] w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-[14px] text-ink transition-colors active:bg-surface-2/60 focus-visible:outline-none focus-visible:bg-surface-2';

export function PhoneBlockRow({ id, who, time, timeTone = 'neutral', chip, href, onClick, ariaLabel, dataTour }: PhoneBlockRowProps) {
  const body = (
    <>
      <span className="shrink-0 font-mono text-[14px] font-semibold tabular-nums">{id}</span>
      <span className="min-w-0 flex-1 truncate text-ink-2">{who}</span>
      {chip}
      {time != null && time !== '' && (
        <span
          className={cn(
            'shrink-0 whitespace-nowrap text-[12px] tabular-nums',
            timeTone === 'danger' ? 'font-semibold text-status-danger-fg' : timeTone === 'time' ? 'font-semibold text-tertiary-deep' : 'text-ink-3',
          )}
        >
          {time}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" aria-hidden />
    </>
  );
  return (
    <li className="border-t border-hairline" data-tour={dataTour}>
      {href ? (
        <Link href={href} onClick={onClick} aria-label={ariaLabel} className={ROW_CLASS}>
          {body}
        </Link>
      ) : (
        <button type="button" onClick={onClick} aria-label={ariaLabel} className={ROW_CLASS}>
          {body}
        </button>
      )}
    </li>
  );
}

// ── Person row (« Par gestionnaire », « Par agent ») ────────────────────────

export interface PhonePersonRowProps {
  name: string;
  open: number;
  late: number;
  /** Danger threshold on `late` (design: > 1). */
  lateDangerFrom?: number;
  onClick?: () => void;
  ariaLabel?: string;
}

export function PhonePersonRow({ name, open, late, lateDangerFrom = 2, onClick, ariaLabel }: PhonePersonRowProps) {
  const inner = (
    <>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface-3 text-[11px] font-semibold text-ink-2" aria-hidden>
        {initialsOf(name)}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{name}</span>
      <span className="min-w-[28px] text-right text-[13px] font-semibold tabular-nums text-ink">{open}</span>
      <span className={cn('min-w-[28px] text-right text-[13px] font-semibold tabular-nums', late >= lateDangerFrom ? 'text-status-danger-fg' : late > 0 ? 'text-ink-2' : 'text-ink-4')}>
        {late}
      </span>
    </>
  );
  const cls = 'flex min-h-[44px] w-full items-center gap-2.5 px-3.5 py-1 text-left';
  return (
    <li className="border-t border-hairline">
      {onClick ? (
        <button type="button" onClick={onClick} aria-label={ariaLabel} className={cn(cls, 'transition-colors active:bg-surface-2/60 focus-visible:outline-none focus-visible:bg-surface-2')}>
          {inner}
        </button>
      ) : (
        <div className={cls}>{inner}</div>
      )}
    </li>
  );
}

// ── Bar row (funnel, charge) ────────────────────────────────────────────────

export interface PhoneBarRowProps {
  label: string;
  value: number;
  /** 0–1 share of the reference (the first funnel step, the busiest person). */
  frac: number;
  /**
   * Late part. Without `lateFrac` it is printed as a second figure after the
   * value (danger-fg, « 12 · 3 »). With `lateFrac` the value column keeps ONE
   * figure and the late part becomes a danger-tinted segment of the bar
   * (funnel rows — the count then belongs in `ariaLabel`).
   */
  late?: number;
  /** 0–1 share of the same reference painted danger right after the primary segment. */
  lateFrac?: number;
  onClick?: () => void;
  ariaLabel?: string;
  /** Label column width (design: 104 px). */
  labelWidth?: string;
}

const pct = (f: number) => Math.max(0, Math.min(100, Math.round(f * 100)));

/**
 * Design rows are 30 px; tappable rows are lifted to 40 px so the finger has
 * a target (brief: touch targets ≥ 40 px). Static rows keep 30 px.
 */
export function PhoneBarRow({ label, value, frac, late, lateFrac, onClick, ariaLabel, labelWidth = 'w-[104px]' }: PhoneBarRowProps) {
  const segment = lateFrac !== undefined;
  const mainPct = value > 0 ? pct(frac) : 0;
  const latePct = segment && !!late && late > 0 ? Math.min(100 - mainPct, pct(lateFrac)) : 0;
  const inner = (
    <>
      <span className={cn('shrink-0 truncate text-[12px] text-ink-2', labelWidth)}>{label}</span>
      <span className="relative block h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-3" aria-hidden>
        {mainPct > 0 && <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${mainPct}%` }} />}
        {latePct > 0 && (
          <span
            className={cn('absolute inset-y-0 bg-status-danger-solid', mainPct === 0 ? 'rounded-full' : 'rounded-r-full')}
            style={{ left: `${mainPct}%`, width: `${latePct}%` }}
          />
        )}
      </span>
      <span className={cn('min-w-[36px] shrink-0 text-right text-[13px] font-semibold tabular-nums', value === 0 ? 'text-ink-4' : 'text-ink')}>
        {value}
        {!segment && !!late && late > 0 && <span className="text-status-danger-fg"> · {late}</span>}
      </span>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel} className="flex min-h-[40px] w-full items-center gap-2 rounded-md text-left transition-colors active:bg-surface-2/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {inner}
      </button>
    );
  }
  return <div className="flex h-[30px] items-center gap-2">{inner}</div>;
}

/** Card wrapper for bar lists (padding 12/14 like the design's « Funnel des étapes »). */
export function PhoneBarCard({ title, caption, children, className, dataTour }: { title: string; caption?: React.ReactNode; children: React.ReactNode; className?: string; dataTour?: string }) {
  return (
    <section className={cn(RECORD_CARD_CLASS, 'px-3.5 py-3', className)} data-tour={dataTour}>
      <h2 className="text-[15px] font-semibold leading-5 text-ink">{title}</h2>
      {caption && <p className="mb-2.5 mt-0.5 text-[12px] leading-4 text-ink-3">{caption}</p>}
      {!caption && <div className="h-2" />}
      {children}
    </section>
  );
}
