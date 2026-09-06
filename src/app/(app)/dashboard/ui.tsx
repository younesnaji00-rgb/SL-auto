'use client';

/**
 * Shared dashboard elements — one anatomy per job on all four dashboards
 * (Few pitfall #6: the same element for the same job everywhere).
 * Specs: docs/research/dashboard-elements.md Part B (2026-09-06) inside the
 * locked Cream & Ink rules (element-specs §6 stat tile, §4 list rows).
 *
 *  • StatTile   — label · 36 px value (24 px detail) · comparison line; colour
 *                 on the GAP only when there is an exception (B1, C4-b).
 *  • Block      — a paper card with heading · count pill · « Voir tout → ».
 *  • WorkRow    — 44 px worklist row: [badge] identifier · who · since/deadline
 *                 · action; the whole row is the link (B4).
 *  • Meter      — 100 % stacked strip, judged segment on the baseline (B3).
 *  • BarList    — one-hue horizontal bars with the count at the tip.
 *  • CompareStrip — person vs team median with the interquartile band (B6).
 *  • DoneLine   — the calm completion state of an empty exception list (B4).
 */

import * as React from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useT, dateFnsLocale } from '@/i18n';
import { formatBusinessHours } from '../monitoring/metrics';

// ── Formatting ──────────────────────────────────────────────────────────────

/** "18 h" under a day, "2,5 j" beyond (business days of 24 h). */
export const fmtHours = (h: number | null | undefined): string => {
  if (h == null) return '—';
  if (h < 1) return '< 1 h';
  return formatBusinessHours(h);
};

/** Small-n rule (B1): under 10 the delta is the raw change, never a percentage. */
export function deltaText(cur: number, prev: number): { text: string; dir: 'up' | 'down' | 'flat' } {
  const diff = cur - prev;
  const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  if (prev < 10 || cur < 10) {
    return { text: `${diff > 0 ? '+' : ''}${diff} (${prev} → ${cur})`, dir };
  }
  const pct = Math.round((diff / prev) * 100);
  return { text: `${pct > 0 ? '+' : ''}${pct} % (${prev} → ${cur})`, dir };
}

export function clockLabel(d: Date | null): string {
  if (!d) return '';
  return format(d, 'HH:mm', { locale: dateFnsLocale() });
}

// ── StatTile ────────────────────────────────────────────────────────────────

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  /** One line under the value: the real period and/or the comparison. */
  caption?: React.ReactNode;
  /** Paint the VALUE with the danger pair — only when the count is an exception. */
  danger?: boolean;
  /** 36 px headline (default) or the single ≥ 48 px hero of the view. */
  size?: 'headline' | 'hero' | 'detail';
  href?: string;
  loading?: boolean;
  title?: string;
  dataTour?: string;
  className?: string;
  children?: React.ReactNode;
}

export function StatTile({ label, value, caption, danger, size = 'headline', href, loading, title, dataTour, className, children }: StatTileProps) {
  const valueClass = cn(
    'mt-1 font-semibold leading-none',
    size === 'hero' ? 'text-[48px]' : size === 'detail' ? 'text-2xl' : 'text-[36px]',
    danger ? 'text-status-danger-fg' : 'text-ink',
  );
  const body = (
    <>
      <p className="t-label">{label}</p>
      {loading ? <Skeleton className={cn('mt-2 w-16', size === 'detail' ? 'h-7' : 'h-9')} /> : <p className={valueClass}>{value}</p>}
      {caption && <div className="t-caption mt-2 flex flex-wrap items-center gap-x-1">{caption}</div>}
      {children}
    </>
  );
  if (href) {
    return (
      <Card className={cn('min-w-0 p-0', className)} title={title} data-tour={dataTour}>
        <Link href={href} className="block rounded-[inherit] p-4 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {body}
        </Link>
      </Card>
    );
  }
  return (
    <Card className={cn('min-w-0 p-4', className)} title={title} data-tour={dataTour}>
      {body}
    </Card>
  );
}

/** Comparison line « ▲ +2 (3 → 5) vs 7 j préc. » — arrows in plain ink (C4-b). */
export function Delta({ cur, prev, suffix }: { cur: number; prev: number; suffix: string }) {
  const { text, dir } = deltaText(cur, prev);
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  return (
    <span className="inline-flex items-center gap-1 text-ink-2">
      <Icon className="h-3 w-3" aria-hidden />
      <span className="tabular-nums">{text}</span>
      <span className="text-ink-3">{suffix}</span>
    </span>
  );
}

// ── Block ───────────────────────────────────────────────────────────────────

export interface BlockProps {
  title: string;
  count?: number | null;
  /** Colour the count pill with the danger pair — only when the count IS an exception. */
  countDanger?: boolean;
  caption?: React.ReactNode;
  moreHref?: string;
  moreLabel?: string;
  dataTour?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function Block({ title, count, countDanger, caption, moreHref, moreLabel, dataTour, className, bodyClassName, children }: BlockProps) {
  const t = useT();
  return (
    <Card className={cn('min-w-0 overflow-hidden', className)} data-tour={dataTour}>
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <h2 className="t-heading flex items-center gap-2">
            <span className="truncate">{title}</span>
            {count != null && (
              <span
                className={cn(
                  'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums',
                  countDanger && count > 0 ? 'bg-status-danger-bg text-status-danger-fg' : 'bg-surface-3 text-ink-2',
                )}
              >
                {count}
              </span>
            )}
          </h2>
          {caption && <p className="t-caption mt-0.5">{caption}</p>}
        </div>
        {moreHref && (
          <Link href={moreHref} className="t-body-sm inline-flex shrink-0 items-center gap-0.5 font-medium text-primary hover:underline">
            {moreLabel ?? t('Voir tout')}
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        )}
      </div>
      <div className={cn('pb-2', bodyClassName)}>{children}</div>
    </Card>
  );
}

/** Band header inside a worklist: « Dépassées (3) » — the band carries the urgency once. */
export function BandHeader({ label, count, danger, time }: { label: string; count: number; danger?: boolean; time?: boolean }) {
  return (
    <div className="flex items-center gap-2 px-5 pb-1 pt-3 first:pt-0">
      <span className="t-label">{label}</span>
      <span
        className={cn(
          'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums',
          danger ? 'bg-status-danger-bg text-status-danger-fg' : time ? 'bg-tertiary-bg text-tertiary-deep' : 'bg-surface-3 text-ink-2',
        )}
      >
        {count}
      </span>
    </div>
  );
}

// ── WorkRow ─────────────────────────────────────────────────────────────────

export interface WorkRowProps {
  href: string;
  /** Leading identifier (mono, the row's only bold cell). */
  id: string;
  /** The one name the role needs (assuré, garage, assignee…). */
  who?: string;
  /** What to do / what is waited for. */
  label?: string;
  /** Trailing time text: « dépassée depuis 2 h » / « sans mouvement depuis 3 j ». */
  time?: string;
  /** Time text tone: danger (breached), time (terracotta, < 24 h / today), neutral. */
  timeTone?: 'danger' | 'time' | 'neutral';
  badge?: React.ReactNode;
  dataTour?: string;
  /** ≥ 48 px rows for the phone (B7). */
  tall?: boolean;
}

export function WorkRow({ href, id, who, label, time, timeTone = 'neutral', badge, dataTour, tall }: WorkRowProps) {
  return (
    <Link
      href={href}
      data-tour={dataTour}
      className={cn(
        'group flex items-center gap-3 border-t border-hairline px-5 text-sm transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2',
        tall ? 'min-h-[56px] py-2' : 'min-h-[44px] py-1.5',
      )}
    >
      <span className="t-mono shrink-0 font-semibold">{id}</span>
      <span className="min-w-0 flex-1 truncate">
        {who && <span className="text-ink">{who}</span>}
        {who && label && <span className="text-ink-4"> · </span>}
        {label && <span className="text-ink-2">{label}</span>}
      </span>
      {badge}
      {time && (
        <span
          className={cn(
            'shrink-0 whitespace-nowrap text-xs tabular-nums',
            timeTone === 'danger' ? 'font-medium text-status-danger-fg' : timeTone === 'time' ? 'font-medium text-tertiary-deep' : 'text-ink-3',
          )}
        >
          {time}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

/** Calm completion state (Intuit / B4): one line, the card keeps its height. */
export function DoneLine({ title, detail }: { title: string; detail?: React.ReactNode }) {
  return (
    <div className="border-t border-hairline px-5 py-5">
      <p className="t-body font-medium text-ink">{title}</p>
      {detail && <p className="t-caption mt-1">{detail}</p>}
    </div>
  );
}

// ── Meter (stacked strip) ───────────────────────────────────────────────────

export interface MeterSegment {
  key: string;
  label: string;
  value: number;
  /** The judged segment: coloured with the danger pair only when > 0. */
  judged?: boolean;
  /** Terracotta = time (today). */
  time?: boolean;
}

/** 100 % stacked strip; the judged segment sits on the baseline (left). Legend prints counts. */
export function Meter({ segments, totalLabel, className }: { segments: MeterSegment[]; totalLabel?: string; className?: string }) {
  const total = segments.reduce((n, s) => n + s.value, 0);
  const fills = ['bg-ink/20', 'bg-ink/12', 'bg-ink/8', 'bg-ink/5'];
  let plain = 0;
  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-sm bg-surface-3" role="img" aria-label={segments.map((s) => `${s.value} ${s.label}`).join(' · ')}>
        {total > 0 &&
          segments.map((s) => {
            if (s.value === 0) return null;
            let cls: string;
            if (s.judged) cls = 'bg-status-danger-fg';
            else if (s.time) cls = 'bg-tertiary';
            else cls = fills[Math.min(plain++, fills.length - 1)];
            return <span key={s.key} className={cls} style={{ width: `${(s.value / total) * 100}%` }} />;
          })}
      </div>
      <p className="t-caption mt-2 tabular-nums">
        {segments.map((s, i) => (
          <React.Fragment key={s.key}>
            {i > 0 && <span className="text-ink-4"> · </span>}
            <span className={cn(s.judged && s.value > 0 && 'font-medium text-status-danger-fg')}>
              {s.value} {s.label}
            </span>
          </React.Fragment>
        ))}
        {totalLabel && (
          <>
            <span className="text-ink-4"> · </span>
            {total} {totalLabel}
          </>
        )}
      </p>
    </div>
  );
}

// ── BarList ─────────────────────────────────────────────────────────────────

export interface BarRow {
  key: string;
  label: string;
  value: number;
  /** Exception part of the value (printed with the danger pair when > 0). */
  late?: number;
  onClick?: () => void;
  href?: string;
  selected?: boolean;
}

/** One hue for magnitude (identity lives on the label); the count at the bar tip. */
export function BarList({ rows, labelWidth = 'w-40', dataTour }: { rows: BarRow[]; labelWidth?: string; dataTour?: string }) {
  const t = useT();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-0.5 px-3" data-tour={dataTour}>
      {rows.map((r) => {
        const frac = r.value / max;
        const inner = (
          <>
            <span className={cn('shrink-0 truncate text-xs', labelWidth, r.selected ? 'font-semibold text-ink' : 'text-ink-2')} title={r.label}>
              {r.label}
            </span>
            <span className="relative block h-6 min-w-0 flex-1">
              <span className="absolute inset-y-[7px] left-0 right-12 rounded-full bg-surface-3/70" aria-hidden />
              {r.value > 0 && (
                <span
                  className={cn('absolute inset-y-[7px] left-0 rounded-full', r.selected ? 'bg-primary' : 'bg-chart-1')}
                  style={{ width: `calc((100% - 3rem) * ${frac})` }}
                  aria-hidden
                />
              )}
              <span
                className={cn('absolute inset-y-0 flex items-center gap-1 pl-2 text-xs font-semibold tabular-nums', r.value === 0 ? 'text-ink-4' : 'text-ink')}
                style={{ left: `calc((100% - 3rem) * ${frac})` }}
              >
                {r.value}
                {!!r.late && r.late > 0 && (
                  <span className="font-medium text-status-danger-fg" title={t('en retard')}>
                    · {r.late}
                  </span>
                )}
              </span>
            </span>
          </>
        );
        const cls = 'flex w-full items-center gap-3 rounded-md px-2 py-1 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
        if (r.href) {
          return (
            <Link key={r.key} href={r.href} className={cls}>
              {inner}
            </Link>
          );
        }
        if (r.onClick) {
          return (
            <button key={r.key} type="button" onClick={r.onClick} className={cls} aria-pressed={r.selected || undefined}>
              {inner}
            </button>
          );
        }
        return (
          <div key={r.key} className="flex w-full items-center gap-3 px-2 py-1">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

// ── CompareStrip (person vs team) ───────────────────────────────────────────

export interface CompareStripProps {
  label: string;
  value: number | null;
  /** Team quartiles on the same scale. */
  stats: { q1: number; med: number; q3: number } | null;
  /** Fixed scale max (e.g. 100 for %); otherwise max of the data. */
  max?: number;
  unit?: string;
  /** Lower is better (délais, retards) — affects the goodness word only. */
  lowerIsBetter?: boolean;
}

/**
 * Bullet-style strip: light band = team Q1–Q3, 1 px tick = team median, bar =
 * the person. Never a rank (B6). The goodness word is plain ink unless the
 * person sits outside the band on the wrong side.
 */
export function CompareStrip({ label, value, stats, max, unit = '', lowerIsBetter }: CompareStripProps) {
  const t = useT();
  const scaleMax = Math.max(1, max ?? Math.max(value ?? 0, stats?.q3 ?? 0) * 1.25);
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / scaleMax) * 100))}%`;
  let verdict = '';
  let bad = false;
  if (value != null && stats) {
    const diff = value - stats.med;
    const worse = lowerIsBetter ? diff > 0 : diff < 0;
    const outside = lowerIsBetter ? value > stats.q3 : value < stats.q1;
    bad = worse && outside;
    verdict = `${t('médiane équipe')} ${stats.med}${unit} · ${t('écart')} ${diff > 0 ? '+' : ''}${Math.round(diff * 10) / 10}${unit}`;
  } else if (value == null) {
    verdict = t('aucune donnée sur la période');
  } else {
    verdict = t('équipe sans donnée comparable');
  }
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-x-4 gap-y-1">
      <span className="t-label truncate">{label}</span>
      <span className={cn('text-sm font-semibold tabular-nums', bad ? 'text-status-danger-fg' : 'text-ink')}>
        {value == null ? '—' : `${value}${unit}`}
      </span>
      <div className="col-span-2 relative h-5 rounded-sm bg-surface-2">
        {stats && (
          <span className="absolute inset-y-0 rounded-sm bg-ink/8" style={{ left: pct(stats.q1), width: `calc(${pct(stats.q3)} - ${pct(stats.q1)})` }} aria-hidden />
        )}
        {value != null && <span className="absolute inset-y-[6px] left-0 rounded-sm bg-chart-1" style={{ width: pct(value) }} aria-hidden />}
        {stats && <span className="absolute inset-y-0 w-px bg-ink" style={{ left: pct(stats.med) }} aria-hidden />}
      </div>
      <span className={cn('col-span-2 t-caption', bad && 'text-status-danger-fg')}>{verdict}</span>
    </div>
  );
}

// ── Freshness stamp ─────────────────────────────────────────────────────────

export function Freshness({ at }: { at: Date | null }) {
  const t = useT();
  if (!at) return null;
  return (
    <span className="t-caption inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="h-1.5 w-1.5 rounded-full bg-status-success-fg" aria-hidden />
      {t('En direct')} · {clockLabel(at)}
    </span>
  );
}
