import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the chiffrage record (element-specs §15: NN/g skeleton screens ✓
 * mirror the final layout): compact header line (back button · title +
 * subtitle · action pill) → pipeline section (title, column-label row, two
 * family bands: identity rail + aligned version cells) → documents filter
 * panel block → observations collapsible bar last (spec B4 order).
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        {/* Pipeline grid: rail column + three version columns (lg shape). */}
        <div className="hidden gap-4 lg:grid" style={{ gridTemplateColumns: '9.5rem repeat(3, minmax(0, 1fr))' }}>
          <div />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <div className="space-y-2 py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-40 rounded-[10px]" />
          <Skeleton className="h-40 rounded-[10px]" />
          <Skeleton className="h-40 rounded-[10px]" />
          <div className="space-y-2 py-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-40 rounded-[10px]" />
          <Skeleton className="h-40 rounded-[10px]" />
          <div />
        </div>
        {/* Stacked fallback shape below lg. */}
        <div className="space-y-3 lg:hidden">
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Skeleton className="h-40 rounded-[10px]" />
            <Skeleton className="h-40 rounded-[10px]" />
          </div>
        </div>
      </div>
      {/* Documents filter panel block. */}
      <Skeleton className="h-64 w-full rounded-xl" />
      {/* Observations collapsible bar (last — spec B4). */}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
