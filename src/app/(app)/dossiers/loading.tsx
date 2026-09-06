import { Skeleton } from '@/components/ui/skeleton';
import { RecordRowSkeleton } from '@/components/ui/record-row';

const HEAD_WIDTHS = ['w-20', 'w-32', 'w-28', 'w-24', 'w-20', 'w-24', 'w-20', 'w-28', 'w-24', 'w-20'];
const CELL_WIDTHS = ['w-16', 'w-28', 'w-24', 'w-20', 'w-16', 'w-20', 'w-16', 'w-24', 'w-20', 'w-16'];

/**
 * Mirrors the dossiers list.
 * ≥ md: title + two actions → one filter row → table paper → pagination footer.
 * < md (mobile pass 2026-09-06, research §11): the phone anatomy — 2-up KPI
 * tiles, the 48 px search row, then six 3-line record rows. A route skeleton
 * paints before hydration, so the split is CSS-only (`max-md:` / `md:`).
 */
export default function DossiersLoading() {
  return (
    <div className="space-y-6 max-md:space-y-4" aria-busy="true" aria-live="polite">
      {/* Title + subtitle, outline + primary action (the phone bar paints its own) */}
      <div className="hidden flex-wrap items-start justify-between gap-4 md:flex">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
      </div>

      {/* PHONE — KPI tiles 2-up + the sticky search row */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="paper space-y-2 p-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex h-12 items-center gap-2">
          <Skeleton className="h-11 flex-1 rounded-md" />
          <Skeleton className="h-11 w-11 rounded-md" />
          <Skeleton className="h-11 w-28 rounded-md" />
        </div>
        <Skeleton className="mt-2 h-9 w-full rounded-md" />
        <ul className="mt-3 divide-y divide-hairline border-y border-hairline -mx-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <RecordRowSkeleton key={i} lines={3} />
          ))}
        </ul>
      </div>

      {/* Filter toolbar: search (widest) → views → date presets → range → sort */}
      <div className="flex flex-wrap items-center gap-4 max-md:hidden">
        <Skeleton className="h-10 w-full min-w-[240px] max-w-md flex-1 rounded-md" />
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-64 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-10 w-48 rounded-md" />
      </div>

      {/* Table paper: header row + 10 body rows, hairlines only */}
      <div className="paper overflow-hidden max-md:hidden">
        <div className="flex h-10 items-center gap-6 border-b border-hairline px-3">
          {HEAD_WIDTHS.map((w, i) => (
            <Skeleton key={i} className={`h-3 shrink-0 ${w}`} />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex h-11 items-center gap-6 border-b border-hairline px-3 last:border-0">
            {CELL_WIDTHS.map((w, j) => (
              <Skeleton key={j} className={`h-4 shrink-0 ${w} ${j === 7 ? 'rounded-full' : ''}`} />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination footer */}
      <div className="flex items-center justify-between px-2 max-md:hidden">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-[70px] rounded-md" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
    </div>
  );
}
