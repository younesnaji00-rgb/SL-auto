'use client';

/**
 * LoadMore + useRenderCap — phone paging (mobile-synthesis §4; research
 * docs/research/mobile-lists-tables.md §7). Phone lists render a client-side
 * cap of 25 rows (Baymard 15–30), then ONE full-width 44 px rim button
 * « Afficher 25 de plus · 25 sur 312 » (mobile redesign 2026-09-14, design
 * Phone.dc.html 112/183; the visible total — addendum ter A — sits inside the
 * button). No rows-per-page, no page numbers, no infinite scroll
 * (goal-directed queue — NN/g). The cap counts RENDERED rows, not documents,
 * so live inserts above the fold appear immediately; it resets whenever the
 * filter signature changes and can be restored by list-scroll-restore.
 *
 * Usage:
 *   const cap = useRenderCap(rows, 25, { signature });
 *   …cap.rows.map(…)
 *   <LoadMore shown={cap.rows.length} total={cap.total} step={25} hasMore={cap.hasMore} onMore={cap.showMore} />
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

export interface RenderCapOptions {
  /** Any string that changes when the filters/sort change → cap resets to `step`. */
  signature?: string;
  /** Initial cap (a restored one); defaults to `step`. */
  initial?: number;
}

export interface RenderCap<T> {
  rows: T[];
  cap: number;
  total: number;
  hasMore: boolean;
  remaining: number;
  showMore: () => void;
  reset: () => void;
  setCap: (n: number) => void;
}

export function useRenderCap<T>(items: T[], step = 25, opts: RenderCapOptions = {}): RenderCap<T> {
  const { signature = '', initial } = opts;
  const [cap, setCapState] = React.useState(() => Math.max(step, initial ?? step));
  const firstSig = React.useRef(signature);
  React.useEffect(() => {
    if (firstSig.current === signature) return;
    firstSig.current = signature;
    setCapState(step);
  }, [signature, step]);

  const total = items.length;
  const rows = React.useMemo(() => (total > cap ? items.slice(0, cap) : items), [items, cap, total]);
  const showMore = React.useCallback(() => setCapState((c) => c + step), [step]);
  const reset = React.useCallback(() => setCapState(step), [step]);
  const setCap = React.useCallback((n: number) => setCapState(Math.max(step, Math.ceil(n / step) * step)), [step]);

  return {
    rows,
    cap,
    total,
    hasMore: total > cap,
    remaining: Math.max(0, total - cap),
    showMore,
    reset,
    setCap,
  };
}

export interface LoadMoreProps {
  /** Rows currently rendered. */
  shown: number;
  /** Rows in the filtered list. */
  total: number;
  step?: number;
  hasMore?: boolean;
  onMore: () => void;
  /** Singular / plural noun (default « dossier » / « dossiers »). */
  noun?: string;
  nounPlural?: string;
  /** Extra caption after the count (a date range…). */
  suffix?: React.ReactNode;
  dataTour?: string;
  className?: string;
}

export function LoadMore({ shown, total, step = 25, hasMore, onMore, noun, nounPlural, suffix, dataTour, className }: LoadMoreProps) {
  const t = useT();
  const more = hasMore ?? shown < total;
  const one = noun ?? t('dossier');
  const many = nounPlural ?? t('dossiers');
  const nextStep = Math.min(step, Math.max(0, total - shown));
  // Design (Phone.dc.html 112/183): ONE 44 px rim button « Afficher 25 de
  // plus · 8 sur 42 », the count inside it in ink-3/400. The caption line
  // only remains when there is nothing more to show (the visible total) or
  // when a caller passes a `suffix` (a date range) — never a second count.
  const showCaption = !more || !!suffix;
  return (
    <div className={cn('flex flex-col items-stretch gap-2 py-3', className)} data-tour={dataTour}>
      {showCaption && (
        <p className="t-caption text-center tabular-nums" aria-live="polite">
          {total} {total > 1 ? many : one}
          {suffix}
        </p>
      )}
      {more && (
        <Button type="button" variant="outline" className="h-11 w-full text-[14px] font-medium" onClick={onMore}>
          {`${t('Afficher')} ${nextStep} ${t('de plus')}`}
          <span className="font-normal tabular-nums text-ink-3">{` · ${shown} ${t('sur')} ${total}`}</span>
        </Button>
      )}
    </div>
  );
}

export default LoadMore;
