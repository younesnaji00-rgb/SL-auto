import { Skeleton } from '@/components/ui/skeleton';

/** Shaped like the jours fériés page: header + primary, calendar rows
 *  (date block · label), import column at ≥ xl. */
export function JoursFeriesSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-10 w-48 rounded-md" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="paper p-6">
          <Skeleton className="mb-4 h-5 w-32" />
          {Array.from({ length: 2 }).map((_, g) => (
            <div key={g} className="border-t border-hairline py-4 first:border-t-0 first:pt-0">
              <Skeleton className="mb-3 h-3 w-28" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 border-b border-hairline py-2.5 last:border-0">
                  <Skeleton className="h-12 w-14 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="paper space-y-4 p-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-10 w-40 rounded-md" />
          <Skeleton className="h-28 w-full rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return <JoursFeriesSkeleton />;
}
