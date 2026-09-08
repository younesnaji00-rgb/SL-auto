'use client';

/**
 * Pie + donut, for the dashboard only (owner rulings 2026-09-08).
 *
 * These live HERE and not in `@/components/viz` on purpose: `docs/element-specs.md`
 * §874 bans pies, donuts and gauges app-wide, and the shared library is the
 * governed surface. The owner asked for them on the Direction and Gestionnaire
 * dashboards specifically, so the exception is scoped to this folder rather
 * than offered to every screen.
 *
 * Both forms carry the `Viz`/`VizTable` pair every other chart primitive uses:
 * ARIA inside SVG is unreliable, a table never is. And both take the muted
 * `--slice-1..9` tokens (globals.css) rather than the accent, so a chart never
 * competes with the teal that marks an action or the terracotta that marks a
 * warning.
 */

import React from 'react';
import { Viz, VizTable } from '@/components/viz';

export interface PieDatum {
  key: string;
  label: string;
  value: number;
  /** Optional second figure shown after the count in the legend (« 6 · 2 »). */
  late?: number;
  /** Optional muted line under the label (« le plus ancien 1,8 j »). */
  detail?: React.ReactNode;
  /** Colour the detail line with the danger pair. */
  detailDanger?: boolean;
  /**
   * Explicit fill, overriding the categorical `--slice-*` ramp. Use it only
   * where the categories carry MEANING a reader already knows — the queue's
   * urgency bands run late → warning → today → later, and inventing new hues
   * for those would fight the colours the queue page itself uses.
   */
  color?: string;
}

export interface Slice extends PieDatum {
  from: number;
  to: number;
  share: number;
  color: string;
}

/** Muted categorical token, cycling past nine. */
export const sliceColor = (i: number): string => `hsl(var(--slice-${(i % 9) + 1}))`;

/**
 * One slice, starting at 12 o'clock and running clockwise. `from`/`to` in
 * radians. A full turn is drawn as a <circle> by the caller — an arc whose two
 * ends coincide collapses to nothing.
 */
export function arcPath(cx: number, cy: number, r: number, from: number, to: number): string {
  const at = (a: number): [number, number] => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = at(from);
  const [x1, y1] = at(to);
  const large = to - from > Math.PI ? 1 : 0;
  return `M ${cx} ${cy} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
}

/** Drops empties, keeps the caller's order, and lays the angles end to end. */
export function toSlices(data: PieDatum[]): { slices: Slice[]; total: number } {
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((s, d) => s + d.value, 0);
  let cursor = 0;
  const slices = rows.map((d, i) => {
    const from = cursor;
    cursor += total > 0 ? (d.value / total) * Math.PI * 2 : 0;
    return { ...d, from, to: cursor, share: total > 0 ? (d.value / total) * 100 : 0, color: d.color ?? sliceColor(i) };
  });
  return { slices, total };
}

const pct = (v: number): string => `${Math.round(v)} %`;

/** Shared accessible table for both forms. */
function sliceTable(caption: string, slices: Slice[], countHead: string) {
  return (
    <VizTable
      caption={caption}
      head={[countHead, 'n', '%']}
      rows={slices.map((s) => [s.label, s.value, pct(s.share)])}
    />
  );
}

export function Pie({
  data,
  label,
  caption,
  size = 148,
}: {
  data: PieDatum[];
  /** Short description for assistive tech. */
  label: string;
  /** Caption of the fallback table. */
  caption: string;
  size?: number;
}) {
  const { slices } = toSlices(data);
  if (slices.length === 0) return null;
  return (
    <Viz className="m-0 shrink-0" label={label} table={sliceTable(caption, slices, 'Part')}>
      <svg viewBox="0 0 200 200" style={{ width: size, height: size }} className="block" aria-hidden>
        {slices.length === 1 ? (
          <circle cx="100" cy="100" r="96" fill={slices[0].color} />
        ) : (
          slices.map((s) => (
            <path
              key={s.key}
              d={arcPath(100, 100, 96, s.from, s.to)}
              fill={s.color}
              className="stroke-card"
              strokeWidth={2}
            />
          ))
        )}
      </svg>
    </Viz>
  );
}

export function Donut({
  data,
  label,
  caption,
  centerValue,
  centerLabel,
  size = 116,
}: {
  data: PieDatum[];
  label: string;
  caption: string;
  centerValue: React.ReactNode;
  centerLabel: string;
  size?: number;
}) {
  const { slices } = toSlices(data);
  const R = 28;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <Viz className="m-0 shrink-0" label={label} table={sliceTable(caption, slices, 'Partie')}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" style={{ width: size, height: size }} className="block -rotate-90" aria-hidden>
          <circle cx="40" cy="40" r={R} fill="none" strokeWidth="13" className="stroke-surface-2" />
          {slices.map((s) => {
            const len = (s.share / 100) * C;
            const dash = `${len.toFixed(2)} ${(C - len).toFixed(2)}`;
            const el = (
              <circle
                key={s.key}
                cx="40"
                cy="40"
                r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="13"
                strokeDasharray={dash}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
          <span className="text-[26px] font-semibold leading-none tabular-nums text-ink">{centerValue}</span>
          <span className="t-caption text-[11px]">{centerLabel}</span>
        </div>
      </div>
    </Viz>
  );
}

/** The legend both forms share: swatch · label (+ detail) · count (+ late). */
export function SliceLegend({ slices, className }: { slices: Slice[]; className?: string }) {
  return (
    <ul className={className ?? 'min-w-0 flex-1 space-y-2'}>
      {slices.map((s) => (
        <li key={s.key} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-2.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: s.color }}
            aria-hidden
          />
          <span className="min-w-0">
            <span className="block truncate text-[13px] text-ink" title={s.label}>
              {s.label}
            </span>
            {s.detail != null && (
              <span
                className={
                  s.detailDanger
                    ? 'block text-[11px] font-medium tabular-nums text-status-danger-fg'
                    : 'block text-[11px] tabular-nums text-ink-3'
                }
              >
                {s.detail}
              </span>
            )}
          </span>
          <span className="whitespace-nowrap text-[13px] font-semibold tabular-nums text-ink">
            {s.value}
            {s.late != null && s.late > 0 && (
              <span className="font-medium text-status-danger-fg"> · {s.late}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
