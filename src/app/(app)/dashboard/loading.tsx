import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the dashboard anatomy (DESIGN.md §7: frame-only skeletons are
 * spinner-equivalent): title + period filters → KPI row (one featured tile +
 * two tonal tiles) → pie + status list → activity feeds + compagnie split.
 * Also used by the page itself while its listeners warm up.
 */
export function DashboardSkeleton() {
  return (
    <div className="flex-1 space-y-8" aria-busy="true" aria-live="polite">
      {/* Title row + period filters */}
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-64 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="paper-featured space-y-2 p-6">
          <Skeleton className="h-3 w-24 bg-tertiary-foreground/15" />
          <Skeleton className="h-8 w-20 bg-tertiary-foreground/15" />
          <Skeleton className="h-3 w-32 bg-tertiary-foreground/15" />
        </div>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="paper flex items-start gap-4 p-6">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-28" />
            </div>
          </div>
        ))}
      </div>

      {/* Primary block: pie + status list */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="paper">
          <div className="flex h-12 items-center border-b border-hairline px-6">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="p-6">
            <Skeleton className="mx-auto h-[240px] w-[240px] rounded-full" />
          </div>
        </div>
        <div className="paper">
          <div className="flex h-12 items-center justify-between border-b border-hairline px-6">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-8 w-44 rounded-md" />
          </div>
          <ul className="divide-y divide-hairline">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex h-11 items-center justify-between px-6">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-8 rounded-full" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Secondary: activity feeds + compagnie split */}
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="paper">
            <div className="flex h-12 items-center border-b border-hairline px-6">
              <Skeleton className="h-4 w-44" />
            </div>
            <ul className="divide-y divide-hairline px-6">
              {Array.from({ length: 4 }).map((_, j) => (
                <li key={j} className="flex items-start gap-4 py-4">
                  <Skeleton className="h-14 w-14 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
