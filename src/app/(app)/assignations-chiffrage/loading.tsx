import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the chiffrage queue: title + count → filter toolbar → hairline rows with a date block. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-8 rounded-full" />
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
        <ul className="divide-y divide-hairline">
          {Array.from({ length: 6 }).map((_, i) => (
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
