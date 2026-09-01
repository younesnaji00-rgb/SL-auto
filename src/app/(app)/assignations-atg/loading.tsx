import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the missions list: title + primary → mission tabs → filter toolbar → grouped hairline rows. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-6 w-8 rounded-full" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="flex gap-2 border-b border-hairline">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="mb-2 h-8 w-24" />
          ))}
        </div>
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-9 w-44" />
            </div>
          ))}
        </div>
      </div>
      <div className="paper overflow-hidden">
        <div className="flex h-12 items-center gap-3 border-b border-hairline px-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-5 w-8 rounded-full" />
          <Skeleton className="ml-auto h-8 w-20" />
        </div>
        <ul className="divide-y divide-hairline">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-start gap-4 px-6 py-4">
              <Skeleton className="h-14 w-14 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-72 max-w-full" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
              <Skeleton className="h-5 w-24 rounded-full" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
