import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton (element-specs §15: NN/g — mirror the final layout). Same
 * anatomy as the compagnies grid at 3d5629a: title + subtitle, then cards with
 * a coloured left edge, a logo tile + chevron row, the name, a one-line
 * description and the affordance pill. Solid paper, pulse only.
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
          <div key={i} className="rounded-xl border border-hairline border-l-4 border-l-surface-4 bg-card p-6">
            <div className="flex items-center justify-between">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <Skeleton className="h-5 w-5" />
            </div>
            <Skeleton className="mt-4 h-6 w-40" />
            <Skeleton className="mt-2 h-3 w-44" />
            <Skeleton className="mt-4 h-7 w-36 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
