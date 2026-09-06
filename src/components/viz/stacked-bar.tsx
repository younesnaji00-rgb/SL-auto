/**
 * One segmented bar (share of a whole) — HTML, not SVG. The judged or
 * baseline segment first, inherent-order buckets never re-sorted; 2 px
 * surface gaps separate segments (dataviz marks rule); legend prints counts.
 * Tones are one hue in steps, the exception tone only when it IS an exception.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { fmtInt } from './scale';
import { Viz, VizTable } from './viz';

export type SegTone = 'accent' | 'accent-2' | 'accent-3' | 'muted' | 'faint' | 'danger' | 'warning';

export interface Segment {
  key: string;
  label: string;
  value: number;
  tone?: SegTone;
}

const TONE: Record<SegTone, string> = {
  accent: 'bg-chart-1',
  'accent-2': 'bg-chart-1/60',
  'accent-3': 'bg-chart-1/30',
  muted: 'bg-ink/25',
  faint: 'bg-ink/10',
  danger: 'bg-status-danger-solid',
  warning: 'bg-status-warning-fg',
};
const DEFAULT_TONES: SegTone[] = ['accent', 'accent-2', 'accent-3', 'muted', 'faint'];

export function StackedBar({ segments, label, className, showPct = true }: { segments: Segment[]; label: string; className?: string; showPct?: boolean }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  const toneOf = (s: Segment, i: number) => TONE[s.tone ?? DEFAULT_TONES[i % DEFAULT_TONES.length]];
  return (
    <Viz
      label={label}
      className={className}
      table={<VizTable caption={label} head={['Segment', 'Nombre', 'Part']} rows={segments.map((s) => [s.label, s.value, `${pct(s.value)} %`])} />}
    >
      <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-sm bg-surface-3" aria-hidden>
        {total > 0 &&
          segments.map((s, i) =>
            s.value > 0 ? (
              <div key={s.key} className={cn('h-full', toneOf(s, i))} style={{ width: `${(s.value / total) * 100}%` }} title={`${s.label} : ${fmtInt(s.value)} (${pct(s.value)} %)`} />
            ) : null,
          )}
      </div>
      <ul className="t-caption mt-2 flex flex-wrap gap-x-4 gap-y-1 tabular-nums" aria-hidden>
        {segments.map((s, i) => (
          <li key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn('inline-block h-2.5 w-2.5 rounded-[2px]', toneOf(s, i))} />
            <span className={cn(s.value === 0 && 'text-ink-4')}>
              {s.label} <span className="font-medium text-ink-2">{fmtInt(s.value)}</span>
              {showPct && total > 0 && s.value > 0 && <span className="text-ink-4"> · {pct(s.value)} %</span>}
            </span>
          </li>
        ))}
      </ul>
    </Viz>
  );
}
