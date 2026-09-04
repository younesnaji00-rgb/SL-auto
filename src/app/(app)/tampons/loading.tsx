import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton — element-specs §15 (NN/g skeleton screens: "mirror the
 * final layout"). Shape = header line, then the three stacked cards of the
 * page: import (one button), registered stamps (rows with a 64 px thumbnail),
 * assignment by chiffreur (rows with a 40 px preview + a 288 px select).
 */
export function TamponsSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-4 rounded-xl border border-hairline bg-card p-6">
        <Skeleton className="h-5 w-44" />
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="rounded-xl border border-hairline bg-card p-6">
        <Skeleton className="mb-4 h-5 w-44" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-hairline py-3 last:border-0">
            <Skeleton className="h-16 w-16 rounded-[10px]" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="h-6 w-11 rounded-full" />
            <Skeleton className="h-8 w-8" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-hairline bg-card p-6">
        <Skeleton className="mb-4 h-5 w-52" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-wrap items-center gap-3 border-b border-hairline py-3 last:border-0">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="flex-1 basis-40 space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-full sm:w-72" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Loading() {
  return <TamponsSkeleton />;
}
