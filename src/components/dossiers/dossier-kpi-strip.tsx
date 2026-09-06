'use client';

/**
 * KPI strip above the dossiers table (owner-approved 2026-09-03; element-specs
 * §6 stat-tile contract — label sentence case, value 24 px Inter 600
 * proportional, whole tile clickable when it applies a filter; exception
 * colour ONLY when there is an exception; no Tremor dependency — the strip
 * is built on the repo's Card/rim tokens so it obeys the glass rules).
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface KpiTile {
  key: string;
  label: string;
  value: number;
  /** One-line caption under the value (real scope, e.g. « statut non envoyé »). */
  caption?: string;
  /** Paint the value with the danger pair — only when the count IS an exception. */
  danger?: boolean;
  /** Marks the tile whose filter is currently applied. */
  active?: boolean;
  onClick: () => void;
}

export function DossierKpiStrip({
  tiles,
  loading,
  dataTour,
}: {
  tiles: KpiTile[];
  loading?: boolean;
  /** Guided-tour anchor (the strip is shared by several list pages). */
  dataTour?: string;
}) {
  return (
    // Phones: 2-up with a 12 px gutter and a 36 px figure (mobile-synthesis
    // §7 — headline count tiles are the page's triage answer, so they get the
    // hero size; ≥ md the strip keeps its 24 px desktop figure).
    <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4" data-tour={dataTour}>
      {tiles.map((t) => (
        <Card
          key={t.key}
          className={cn(
            'p-0 transition-colors',
            t.active && 'ring-1 ring-primary/40',
          )}
        >
          <button
            type="button"
            onClick={t.onClick}
            className="block w-full rounded-[inherit] p-4 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-pressed={t.active || undefined}
          >
            <span className="t-label block">{t.label}</span>
            {loading ? (
              <Skeleton className="mt-1 h-9 w-16 md:h-7 md:w-14" />
            ) : (
              <span
                className={cn(
                  'mt-0.5 block text-[36px] leading-none md:text-2xl md:leading-tight',
                  'font-semibold tabular-nums',
                  t.danger && t.value > 0 ? 'text-status-danger-fg' : 'text-ink',
                )}
              >
                {t.value}
              </span>
            )}
            {t.caption && <span className="t-caption mt-0.5 block">{t.caption}</span>}
          </button>
        </Card>
      ))}
    </div>
  );
}

export default DossierKpiStrip;
