/**
 * Few's bullet graph (elements B2): a zero-based strip, the measure as a
 * thin bar, a target as a 1 px tick, up to three tint bands of ONE hue.
 * No gauge, no colour on the value.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Viz, VizTable } from './viz';

export function Bullet({
  value,
  target,
  bands,
  max = 100,
  label,
  fmt = (v) => `${v}`,
  lowerIsBetter = false,
  className,
}: {
  value: number | null;
  target?: number | null;
  /** Two thresholds [poor→ok, ok→good] on the same scale as `max`. */
  bands?: [number, number];
  max?: number;
  label: string;
  fmt?: (v: number) => string;
  lowerIsBetter?: boolean;
  className?: string;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;
  const tints = lowerIsBetter ? ['bg-ink/[.04]', 'bg-ink/[.08]', 'bg-ink/[.14]'] : ['bg-ink/[.14]', 'bg-ink/[.08]', 'bg-ink/[.04]'];
  const title = `${label} : ${value == null ? '—' : fmt(value)}${target != null ? ` · objectif ${fmt(target)}` : ''}`;
  return (
    <Viz
      label={title}
      className={className}
      table={
        <VizTable
          caption={label}
          head={['Mesure', 'Valeur']}
          rows={[
            ['Réalisé', value == null ? '—' : fmt(value)],
            ['Objectif', target == null ? 'sans objectif' : fmt(target)],
          ]}
        />
      }
    >
      <div className="relative h-3 w-full overflow-hidden rounded-sm bg-surface-3" aria-hidden title={title}>
        {bands && (
          <>
            <div className={cn('absolute inset-y-0 left-0', tints[0])} style={{ width: pct(bands[0]) }} />
            <div className={cn('absolute inset-y-0', tints[1])} style={{ left: pct(bands[0]), width: `calc(${pct(bands[1])} - ${pct(bands[0])})` }} />
            <div className={cn('absolute inset-y-0 right-0', tints[2])} style={{ left: pct(bands[1]) }} />
          </>
        )}
        {value != null && <div className="absolute left-0 top-[4px] h-[4px] rounded-r-[2px] bg-chart-1" style={{ width: pct(value) }} />}
        {target != null && <div className="absolute inset-y-0 w-px bg-ink" style={{ left: pct(target) }} />}
      </div>
    </Viz>
  );
}
