/**
 * Small trend: columns for counts, a line for rates/durations
 * (docs/research/dashboard-charts.md B2). Zero baseline, hairline grid,
 * previous period as a ghost (outline bars / grey line), optional target
 * line with an end label, the incomplete last period hatched, last value
 * labelled directly. Native <title> on every hit target = the hover layer.
 * Never animated (motion-spec F0).
 */

import React from 'react';
import { linear, nice } from './scale';
import { Viz, VizTable } from './viz';

export interface TrendPoint {
  label: string;
  value: number | null;
  ghost?: number | null;
}

export interface TrendChartProps {
  points: TrendPoint[];
  kind: 'bar' | 'line';
  label: string;
  /** Formats a value for labels, tooltips and the table. */
  fmt?: (v: number) => string;
  target?: number | null;
  targetLabel?: string;
  /** The last point is the current, incomplete period. */
  incompleteLast?: boolean;
  /** Fixed axis top (e.g. 100 for a percentage). */
  max?: number;
  ghostLabel?: string;
  className?: string;
  height?: number;
}

export function TrendChart({
  points,
  kind,
  label,
  fmt = (v) => String(v),
  target,
  targetLabel,
  incompleteLast = true,
  max,
  ghostLabel = 'Période précédente',
  className,
  height = 120,
}: TrendChartProps) {
  const w = 320;
  const h = height;
  const ml = 34;
  const mr = 44;
  const mt = 12;
  const mb = 18;
  const n = points.length;
  const hatchId = React.useId().replace(/:/g, '');
  if (n === 0) return null;
  const vals = points.map((p) => p.value ?? 0);
  const ghosts = points.map((p) => p.ghost ?? 0);
  const top = max ?? nice(Math.max(...vals, ...ghosts, target ?? 0, 1));
  const x = linear(0, Math.max(n - 1, 1), ml, w - mr);
  const y = linear(0, top, h - mb, mt);
  const slot = (w - ml - mr) / Math.max(n - 1, 1);
  const bw = Math.min(16, Math.max(4, slot * 0.55));
  const last = n - 1;
  const hasGhost = points.some((p) => p.ghost != null);
  const lastVal = points[last].value;

  const linePath = (key: 'value' | 'ghost', upto: number) =>
    points
      .slice(0, upto + 1)
      .map((p, i) => ({ v: p[key], i }))
      .filter((d) => d.v != null)
      .map((d, k) => `${k ? 'L' : 'M'}${x(d.i).toFixed(1)},${y(d.v as number).toFixed(1)}`)
      .join(' ');

  const tip = (p: TrendPoint) =>
    `${p.label} : ${p.value == null ? '—' : fmt(p.value)}${p.ghost != null ? ` · ${ghostLabel.toLowerCase()} ${fmt(p.ghost)}` : ''}`;

  return (
    <Viz
      label={label}
      className={className}
      table={
        <VizTable
          caption={label}
          head={hasGhost ? ['Période', 'Valeur', ghostLabel] : ['Période', 'Valeur']}
          rows={points.map((p) =>
            hasGhost
              ? [p.label, p.value == null ? '—' : fmt(p.value), p.ghost == null ? '—' : fmt(p.ghost)]
              : [p.label, p.value == null ? '—' : fmt(p.value)],
          )}
        />
      }
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" style={{ aspectRatio: `${w}/${h}` }} aria-hidden>
        <defs>
          <pattern id={hatchId} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="2" height="4" className="fill-chart-1/60" />
          </pattern>
        </defs>
        {/* Gridlines: hairline, solid, recessive; the zero line one step stronger. */}
        {[0.5, 1].map((f) => (
          <line key={f} x1={ml} x2={w - mr} y1={y(top * f)} y2={y(top * f)} className="stroke-hairline" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={ml} x2={w - mr} y1={y(0)} y2={y(0)} className="stroke-hairline-strong" vectorEffect="non-scaling-stroke" />
        <text x={ml - 6} y={y(top) + 4} textAnchor="end" className="fill-ink-3 text-[11px] tabular-nums">
          {fmt(top)}
        </text>
        <text x={ml - 6} y={y(0) + 4} textAnchor="end" className="fill-ink-3 text-[11px] tabular-nums">
          0
        </text>

        {kind === 'bar' &&
          points.map((p, i) => {
            const v = p.value ?? 0;
            const isLast = incompleteLast && i === last;
            return (
              <g key={p.label}>
                {p.ghost != null && (
                  <rect
                    x={x(i) - bw / 2 - 1.5}
                    y={y(p.ghost)}
                    width={bw + 3}
                    height={Math.max(0, y(0) - y(p.ghost))}
                    fill="none"
                    className="stroke-ink/30"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
                {v > 0 && (
                  <rect
                    x={x(i) - bw / 2}
                    y={y(v)}
                    width={bw}
                    height={Math.max(0, y(0) - y(v))}
                    fill={isLast ? `url(#${hatchId})` : undefined}
                    className={isLast ? undefined : 'fill-chart-1'}
                  />
                )}
                {/* Hit target wider than the mark; the browser tooltip carries the exact values. */}
                <rect x={x(i) - slot / 2} y={mt} width={slot} height={h - mt - mb} fill="transparent" className="hover:fill-ink/[.04]">
                  <title>{tip(p)}</title>
                </rect>
              </g>
            );
          })}

        {kind === 'line' && (
          <>
            {hasGhost && (
              <path d={linePath('ghost', last)} fill="none" className="stroke-ink/30" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            )}
            <path
              d={linePath('value', incompleteLast ? Math.max(last - 1, 0) : last)}
              fill="none"
              className="stroke-chart-1"
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {incompleteLast && last > 0 && points[last - 1].value != null && lastVal != null && (
              <line
                x1={x(last - 1)}
                y1={y(points[last - 1].value as number)}
                x2={x(last)}
                y2={y(lastVal)}
                className="stroke-chart-1"
                strokeWidth={2}
                strokeDasharray="3 3"
                vectorEffect="non-scaling-stroke"
              />
            )}
            {lastVal != null && <circle cx={x(last)} cy={y(lastVal)} r={3.5} className="fill-chart-1 stroke-card" strokeWidth={2} />}
            {points.map((p, i) => (
              <rect key={p.label} x={x(i) - slot / 2} y={mt} width={slot} height={h - mt - mb} fill="transparent" className="hover:fill-ink/[.04]">
                <title>{tip(p)}</title>
              </rect>
            ))}
          </>
        )}

        {target != null && (
          <>
            <line x1={ml} x2={w - mr} y1={y(target)} y2={y(target)} className="stroke-ink-2" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
            <text x={w - mr + 4} y={y(target) + 4} className="fill-ink-2 text-[11px] tabular-nums">
              {targetLabel ?? `obj. ${fmt(target)}`}
            </text>
          </>
        )}
        {lastVal != null && (
          <text x={x(last) + 6} y={Math.max(mt + 8, y(lastVal) - 6)} className="fill-ink text-[11px] font-semibold tabular-nums">
            {fmt(lastVal)}
          </text>
        )}
        <text x={ml} y={h - 4} className="fill-ink-3 text-[11px]">
          {points[0].label}
        </text>
        <text x={w - mr} y={h - 4} textAnchor="end" className="fill-ink-3 text-[11px]">
          {points[last].label}
          {incompleteLast ? ' (en cours)' : ''}
        </text>
      </svg>
    </Viz>
  );
}

/** Two counts per period as paired columns (arrivals vs departures — the CFD replacement, charts B1). */
export function PairedColumns({
  points,
  label,
  aLabel,
  bLabel,
  className,
  height = 120,
}: {
  points: Array<{ label: string; a: number; b: number }>;
  label: string;
  aLabel: string;
  bLabel: string;
  className?: string;
  height?: number;
}) {
  const w = 320;
  const h = height;
  const ml = 34;
  const mr = 12;
  const mt = 12;
  const mb = 18;
  const n = points.length;
  if (n === 0) return null;
  const top = nice(Math.max(...points.map((p) => Math.max(p.a, p.b)), 1));
  const slot = (w - ml - mr) / n;
  const bw = Math.min(10, Math.max(3, slot * 0.3));
  const y = linear(0, top, h - mb, mt);
  const cx = (i: number) => ml + slot * (i + 0.5);
  const last = n - 1;
  return (
    <Viz label={label} className={className} table={<VizTable caption={label} head={['Période', aLabel, bLabel]} rows={points.map((p) => [p.label, p.a, p.b])} />}>
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" style={{ aspectRatio: `${w}/${h}` }} aria-hidden>
        {[0.5, 1].map((f) => (
          <line key={f} x1={ml} x2={w - mr} y1={y(top * f)} y2={y(top * f)} className="stroke-hairline" vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={ml} x2={w - mr} y1={y(0)} y2={y(0)} className="stroke-hairline-strong" vectorEffect="non-scaling-stroke" />
        <text x={ml - 6} y={y(top) + 4} textAnchor="end" className="fill-ink-3 text-[11px] tabular-nums">
          {top}
        </text>
        <text x={ml - 6} y={y(0) + 4} textAnchor="end" className="fill-ink-3 text-[11px] tabular-nums">
          0
        </text>
        {points.map((p, i) => (
          <g key={p.label}>
            {p.a > 0 && <rect x={cx(i) - bw - 1} y={y(p.a)} width={bw} height={y(0) - y(p.a)} className="fill-ink/25" />}
            {p.b > 0 && <rect x={cx(i) + 1} y={y(p.b)} width={bw} height={y(0) - y(p.b)} className={i === last ? 'fill-chart-1/50' : 'fill-chart-1'} />}
            <rect x={cx(i) - slot / 2} y={mt} width={slot} height={h - mt - mb} fill="transparent" className="hover:fill-ink/[.04]">
              <title>{`${p.label} : ${p.a} ${aLabel.toLowerCase()} · ${p.b} ${bLabel.toLowerCase()}`}</title>
            </rect>
          </g>
        ))}
        <text x={ml} y={h - 4} className="fill-ink-3 text-[11px]">
          {points[0].label}
        </text>
        <text x={w - mr} y={h - 4} textAnchor="end" className="fill-ink-3 text-[11px]">
          {points[last].label} (en cours)
        </text>
      </svg>
      {/* Legend: two series → always present (dataviz rule). */}
      <p className="t-caption mt-1 flex items-center gap-4" aria-hidden>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-ink/25" /> {aLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-chart-1" /> {bLabel}
        </span>
      </p>
    </Viz>
  );
}
