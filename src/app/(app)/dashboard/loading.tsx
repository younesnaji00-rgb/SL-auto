import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the dashboard anatomy (DESIGN.md §7: a route skeleton mirrors its
 * header + primary blocks): title → featured headline card (hero figure +
 * two stat tiles + period controls) → pie + status list → two activity feeds
 * + compagnie bars. Solid `.paper` frames, no glass on skeletons.
 */
export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-8" aria-busy="true" aria-live="polite">
      {/* Title row */}
      <Skeleton className="h-8 w-56" />

      {/* Featured headline card: one hero figure, two stat tiles, period controls */}
      <div className="paper-featured p-5">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-5 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-3 w-24 bg-on-ink/15" />
                <Skeleton className={i === 0 ? 'h-12 w-24 bg-on-ink/15' : 'h-7 w-16 bg-on-ink/15'} />
                <Skeleton className="h-3 w-32 bg-on-ink/15" />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <Skeleton className="h-9 w-64 bg-on-ink/15" />
            <Skeleton className="h-8 w-36 bg-on-ink/15" />
            <Skeleton className="h-8 w-36 bg-on-ink/15" />
          </div>
        </div>
      </div>

      {/* Primary block: pie + status list */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="paper space-y-4 p-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mx-auto h-[240px] w-[240px] rounded-full" />
          <div className="flex flex-wrap justify-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-24" />
            ))}
          </div>
        </div>
        <div className="paper p-0">
          <div className="flex items-center justify-between p-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-44" />
          </div>
          <div className="divide-y divide-hairline">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex h-11 items-center justify-between px-6">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Secondary: two activity feeds + compagnie bars */}
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="paper space-y-4 p-6">
            <Skeleton className="h-4 w-44" />
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-2 p-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-8 w-full" />
              ))}
            </div>
            <div className="space-y-5">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-start gap-3">
                  <Skeleton className="mt-1 h-3 w-3 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="paper space-y-4 p-6">
          <Skeleton className="h-4 w-44" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-[18px] flex-1 rounded-r" style={{ maxWidth: `${85 - j * 14}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
