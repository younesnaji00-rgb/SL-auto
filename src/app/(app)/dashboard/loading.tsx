import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the dashboard anatomy: title → featured headline strip → pie + status list → feeds. */
export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-8" aria-busy="true" aria-live="polite">
      {/* Title row */}
      <Skeleton className="h-8 w-56" />

      {/* Featured headline strip */}
      <div className="paper-featured p-5">
        <div className="grid gap-6 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-3 w-24 bg-on-ink/15" />
              <Skeleton className="h-8 w-20 bg-on-ink/15" />
              <Skeleton className="h-3 w-32 bg-on-ink/15" />
            </div>
          ))}
        </div>
      </div>

      {/* Primary block: pie + status list */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="paper space-y-4 p-5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mx-auto h-[240px] w-[240px] rounded-full" />
        </div>
        <div className="paper space-y-3 p-5">
          <Skeleton className="h-4 w-40" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>

      {/* Secondary: activity feeds + compagnie split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="paper space-y-4 p-5">
            <Skeleton className="h-4 w-44" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <Skeleton className="h-3 w-3 rounded-full" />
                  <Skeleton className="h-3 flex-1" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
