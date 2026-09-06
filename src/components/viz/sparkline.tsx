/**
 * Word-sized trend beside a number (Tufte; elements A4): no axes, zero
 * baseline, previous points in ink, the last point in the data hue.
 * Width ≥ 3 × height so slopes stay readable. Never animated.
 */

import React from 'react';
import { linear } from './scale';
import { Viz, VizTable } from './viz';

export function Sparkline({ values, labels, label, className }: { values: number[]; labels?: string[]; label: string; className?: string }) {
  const w = 96;
  const h = 28;
  const pad = 3;
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const x = linear(0, values.length - 1, pad, w - pad);
  const y = linear(0, max, h - pad, pad);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const last = values.length - 1;
  return (
    <Viz
      label={label}
      className={className ?? 'm-0 inline-block align-middle'}
      table={<VizTable caption={label} head={['Période', 'Valeur']} rows={values.map((v, i) => [labels?.[i] ?? `−${last - i}`, v])} />}
    >
      <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-24" aria-hidden>
        <path d={d} fill="none" className="stroke-ink-3" strokeWidth={1.5} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(last)} cy={y(values[last])} r={2.5} className="fill-chart-1" />
      </svg>
    </Viz>
  );
}
