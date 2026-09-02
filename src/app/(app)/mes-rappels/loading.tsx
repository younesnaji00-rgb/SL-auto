import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';

/**
 * Loading skeleton (element-specs §15: NN/g skeleton screens — mirror the
 * final layout; Carbon data table — skeleton instead of a spinner). Same
 * anatomy as the page at 3d5629a: title line, tab track, then one table frame
 * with a header row and six 44 px rows. Pulse only. Tab strip mirrors the
 * raised-tab-on-track idiom (addendum 2026-09-02 §2), not the old underline.
 */
export default function Loading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        {/* t-display line (30/700 ≈ 36 px), then the recessed 40 px tab track */}
        <Skeleton className="h-9 w-40" />
        <div className="inline-flex h-10 items-center gap-1 rounded-lg border border-hairline bg-surface-2 p-1">
          <Skeleton className="h-8 w-20 rounded-md bg-card shadow-rim" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-hairline bg-card">
        <div className="flex h-10 items-center gap-4 border-b border-hairline px-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
