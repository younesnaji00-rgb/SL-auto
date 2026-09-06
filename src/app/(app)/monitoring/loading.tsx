import { Skeleton } from '@/components/ui/skeleton';
import { RecordRowSkeleton } from '@/components/ui/record-row';

/**
 * Route skeleton mirroring the real page anatomy (DESIGN.md §7): PageHeader +
 * filters + tab strip, then the Global tab — headline row (4 stat tiles), the
 * 10 step tiles, the volume chart and the two lower cards (À traiter / Délais).
 *
 * Mobile pass 2026-09-06: below md the title block is not painted (the phone
 * top bar carries it), the tiles are 2-up with a 12 px gutter, and the two
 * wide tables are represented by six record rows under a search-row bar. A
 * route skeleton paints before hydration, so the split is CSS-only.
 */
export default function Loading() {
  return (
    <div className="space-y-8 max-md:space-y-4" aria-busy="true" aria-live="polite">
      <div className="space-y-2 max-md:hidden">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2 max-md:hidden">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-44" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-10 w-80 max-w-full rounded-md" />

      {/* PHONE — 2-up tiles, then the row list under a search-row bar. */}
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
        </div>
        <ul className="-mx-4 mt-3 divide-y divide-hairline border-y border-hairline">
          {Array.from({ length: 6 }).map((_, i) => (
            <RecordRowSkeleton key={i} lines={2} />
          ))}
        </ul>
      </div>

      <div className="space-y-6 max-md:hidden">
        {/* Headline row */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="paper space-y-3 p-5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-14" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
        {/* Step tiles */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="paper space-y-3 p-5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
        {/* Volume par étape */}
        <div className="paper p-5">
          <Skeleton className="mb-4 h-4 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
        {/* À traiter aujourd'hui + Délais par étape */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="paper p-5 lg:col-span-2">
            <Skeleton className="mb-4 h-4 w-44" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-14 rounded-lg" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
          <div className="paper p-5">
            <Skeleton className="mb-4 h-4 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-10" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
