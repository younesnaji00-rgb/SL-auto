import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the chiffrage files page (element-specs §15: NN/g skeleton screens ✓
 * mirror the final layout): compact header line → one caption → three
 * horizontal file rows (28 px thumbnail · name + chip · one button).
 */
export default function ChiffrageLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="grid gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-start gap-4 rounded-xl border border-hairline bg-card p-6">
            <Skeleton className="h-28 w-28 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
