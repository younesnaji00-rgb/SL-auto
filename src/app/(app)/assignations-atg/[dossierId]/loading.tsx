import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the mission page (element-specs §15: NN/g skeleton screens ✓ mirror
 * the final layout): compact header line (back · title + subtitle · chips) →
 * plan facts as label/value pairs → observations bar → the two toggle tiles.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-28 max-w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    </div>
  );
}
