import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';

/**
 * Loading skeleton (element-specs §15: NN/g skeleton screens — mirror the
 * final layout; Carbon data table — skeleton instead of a spinner). Anatomy
 * of the master-detail queue (addendum 2026-09-03 bis): title line, tab
 * track, segment control, then the table frame (6 × 44 px rows) beside the
 * detail-pane card on xl+. Pulse only.
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
      <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] xl:items-start">
        <div className="min-w-0 space-y-4">
          {/* « À traiter / Traités » segment track */}
          <div className="inline-flex h-9 items-center gap-0.5 rounded-md bg-surface-2 p-0.5">
            <Skeleton className="h-8 w-24 rounded-md bg-card shadow-rim" />
            <Skeleton className="h-8 w-20 rounded-md" />
          </div>
          <div className="overflow-hidden rounded-xl border border-hairline bg-card">
            <div className="flex h-10 items-center gap-4 border-b border-hairline px-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
        {/* Detail pane card (xl+ only) */}
        <div className="hidden rounded-xl border border-hairline bg-card p-6 xl:block">
          <div className="space-y-4">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-16 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-36 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
