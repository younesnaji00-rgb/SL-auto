/**
 * Distribution as dots on one axis with median and P90 lines
 * (docs/research/dashboard-charts.md B3): "each dot is one dossier" is the
 * whole explanation. Deterministic jitter so server and client markup agree.
 * Optional reference line (SLA, external norm) in the terracotta deep tone.
 */

import React from 'react';
import { linear, nice } from './scale';
import { Viz, VizTable } from './viz';

export function DotStrip({
  values,
  label,
  fmt,
  p50,
  p90,
  reference,
  referenceLabel,
  className,
  max,
}: {
  values: number[];
  label: string;
  fmt: (v: number) => string;
  p50: number | null;
  p90: number | null;
  reference?: number | null;
  referenceLabel?: string;
  className?: string;
  max?: number;
}) {
  const w = 320;
  const h = 40;
  const ml = 8;
  const mr = 8;
  const top = max ?? nice(Math.max(...values, reference ?? 0, p90 ?? 0, 1));
  const x = (v: number) => linear(0, top, ml, w - mr)(Math.min(v, top));
  const jitter = (i: number) => ((i * 7) % 5) * 3 - 6;
  const shown = values.slice(0, 400);
  const refRow: Array<Array<string | number>> = reference != null ? [[referenceLabel ?? 'Référence', fmt(reference)]] : [];
  return (
    <Viz
      label={`${label} — médiane ${p50 == null ? '—' : fmt(p50)}, P90 ${p90 == null ? '—' : fmt(p90)}, n = ${values.length}`}
      className={className}
      table={
        <VizTable
          caption={label}
          head={['Statistique', 'Valeur']}
          rows={[
            ['Médiane', p50 == null ? '—' : fmt(p50)],
            ['90e percentile', p90 == null ? '—' : fmt(p90)],
            ['Maximum', values.length ? fmt(Math.max(...values)) : '—'],
            ['Effectif', values.length],
            ...refRow,
          ]}
        />
      }
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full" style={{ aspectRatio: `${w}/${h}` }} aria-hidden>
        <line x1={ml} x2={w - mr} y1={h / 2} y2={h / 2} className="stroke-hairline" vectorEffect="non-scaling-stroke" />
        {shown.map((v, i) => (
          <circle key={i} cx={x(v)} cy={h / 2 + jitter(i)} r={3} className="fill-ink/30 stroke-card" strokeWidth={1}>
            <title>{fmt(v)}</title>
          </circle>
        ))}
        {reference != null && <line x1={x(reference)} x2={x(reference)} y1={2} y2={h - 2} className="stroke-tertiary-deep" vectorEffect="non-scaling-stroke" />}
        {p90 != null && <line x1={x(p90)} x2={x(p90)} y1={6} y2={h - 6} className="stroke-ink-3" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />}
        {p50 != null && <line x1={x(p50)} x2={x(p50)} y1={4} y2={h - 4} className="stroke-ink" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />}
      </svg>
      <p className="t-caption mt-1 flex flex-wrap gap-x-3 tabular-nums" aria-hidden>
        <span>
          méd. <span className="font-medium text-ink-2">{p50 == null ? '—' : fmt(p50)}</span>
        </span>
        <span>
          P90 <span className="font-medium text-ink-2">{p90 == null ? '—' : fmt(p90)}</span>
        </span>
        <span>n = {values.length}</span>
        {reference != null && (
          <span className="text-tertiary-deep">
            {referenceLabel ?? 'réf.'} {fmt(reference)}
          </span>
        )}
      </p>
    </Viz>
  );
}
