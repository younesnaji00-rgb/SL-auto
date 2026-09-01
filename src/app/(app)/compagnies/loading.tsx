import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the compagnies grid: title + subtitle, then glass panes with a logo
 * tile, a name and two label/value pairs (DESIGN.md §7).
 */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="paper p-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-10" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
