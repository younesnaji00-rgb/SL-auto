import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the chiffrage record (element-specs §15: NN/g skeleton screens ✓
 * mirror the final layout): compact header line (back button · title +
 * subtitle · action pill) → observations collapsible bar → section title +
 * two family rows.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Skeleton className="h-12 w-full rounded-xl" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    </div>
  );
}
