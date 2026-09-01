import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';

/**
 * Loading skeleton (element-specs §15: NN/g skeleton screens — mirror the
 * final layout; Carbon data table — skeleton instead of a spinner). Same
 * anatomy as the page at 3d5629a: title line, underline tab strip, then one
 * table frame with a header row and six 44 px rows. Pulse only.
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        {/* t-display line, then the 40 px tab strip on its hairline */}
        <Skeleton className="h-8 w-40" />
        <div className="flex h-10 items-end gap-4 border-b border-hairline">
          <Skeleton className="mb-2 h-4 w-16" />
          <Skeleton className="mb-2 h-4 w-20" />
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
