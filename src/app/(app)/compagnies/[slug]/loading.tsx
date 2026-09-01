import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the per-compagnie dashboard: logo tile + compact title with one
 * primary action, four stat panes, then the portfolio table.
 */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-md" />
          <Skeleton className="h-10 w-40 rounded-md" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="paper overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-48 rounded-md" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-hairline px-4 py-3 last:border-b-0">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
