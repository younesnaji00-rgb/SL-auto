import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the chiffrage detail: compact header → tonal file cards. */
export default function ChiffrageLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <div className="grid gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="paper flex items-start gap-4 p-5">
            <Skeleton className="h-28 w-28 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
