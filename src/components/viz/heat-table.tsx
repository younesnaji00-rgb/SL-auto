/**
 * Weekday × hour intake heat table (charts B5): working hours only, one
 * sequential hue in 5 steps, the count printed in every cell, hairline cell
 * borders so neighbours stay distinct. A staffing question, so it lives on
 * review views only.
 */

import React from 'react';
import { cn } from '@/lib/utils';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const STEPS = ['bg-transparent', 'bg-chart-1/15', 'bg-chart-1/30', 'bg-chart-1/50', 'bg-chart-1/75'];

export function HeatTable({
  cells,
  max,
  label,
  hours = [8, 19],
  days = 6,
}: {
  cells: Array<{ weekday: number; hour: number; count: number }>;
  max: number;
  label: string;
  hours?: [number, number];
  days?: number;
}) {
  const map = new Map<string, number>();
  for (const c of cells) map.set(`${c.weekday}-${c.hour}`, c.count);
  const hourList = Array.from({ length: hours[1] - hours[0] + 1 }, (_, i) => hours[0] + i);
  // Scale on what is actually drawn, so a hidden day never dims the visible grid.
  const shown = Math.max(0, ...cells.filter((c) => c.weekday < days && c.hour >= hours[0] && c.hour <= hours[1]).map((c) => c.count));
  const top = Math.min(max, shown) || max;
  const step = (v: number) => (v <= 0 || top <= 0 ? 0 : Math.min(4, Math.ceil((v / top) * 4)));
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[11px] tabular-nums" aria-label={label}>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-10 py-1 text-left font-normal text-ink-3" />
            {hourList.map((h) => (
              <th key={h} scope="col" className="py-1 text-center font-normal text-ink-3">
                {h}h
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.slice(0, days).map((d, wd) => (
            <tr key={d}>
              <th scope="row" className="py-0.5 pr-2 text-left font-normal text-ink-3">
                {d}
              </th>
              {hourList.map((h) => {
                const v = map.get(`${wd}-${h}`) ?? 0;
                return (
                  <td key={h} className={cn('h-7 border border-hairline text-center', step(v) >= 4 ? 'text-on-ink' : 'text-ink-2', STEPS[step(v)])} title={`${d} ${h}h : ${v}`}>
                    {v > 0 ? v : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
