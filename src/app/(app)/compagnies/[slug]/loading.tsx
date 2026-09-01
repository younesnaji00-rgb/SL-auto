import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';

/**
 * Loading skeleton (element-specs §15: NN/g — mirror the final layout). Same
 * anatomy as the per-compagnie dashboard at 3d5629a: header band closed by a
 * hairline (112 px logo tile, compact title, two actions), four stat tiles
 * (label + 36 px figure + caption), then the portfolio card with its header
 * row and six 44 px table rows.
 */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex items-start gap-4 border-b border-hairline pb-6">
        <Skeleton className="h-28 w-28 shrink-0 rounded-lg" />
        <div className="flex min-w-0 flex-1 flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-9 rounded-md" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-36 rounded-md" />
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-hairline bg-card p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-9 w-16" />
            <Skeleton className="mt-2 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-hairline bg-card">
        <div className="flex min-h-[48px] items-center justify-between gap-4 border-b border-hairline px-6 py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-56" />
          </div>
          <Skeleton className="h-9 w-72 max-w-full rounded-md" />
        </div>
        <div className="flex h-10 items-center gap-4 border-b border-hairline px-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
