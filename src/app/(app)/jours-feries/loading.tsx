import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton — element-specs §15 (NN/g skeleton screens: "mirror the
 * final layout"). Shape = header line, then the four stacked cards of the
 * page: add-a-date (field + button), image import (one button + hint), list
 * import (textarea + two buttons), the current list (a 3-column pill grid).
 */
export function JoursFeriesSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-4 rounded-xl border border-hairline bg-card p-6">
        <Skeleton className="h-5 w-36" />
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-1">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="space-y-4 rounded-xl border border-hairline bg-card p-6">
        <Skeleton className="h-5 w-52" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      </div>
      <div className="space-y-4 rounded-xl border border-hairline bg-card p-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-28 w-full" />
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-10 w-72 max-w-[60%]" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
      <div className="rounded-xl border border-hairline bg-card p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex h-14 items-center gap-3 rounded-lg border border-hairline px-3">
              <Skeleton className="h-10 w-12 rounded-md" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return <JoursFeriesSkeleton />;
}
