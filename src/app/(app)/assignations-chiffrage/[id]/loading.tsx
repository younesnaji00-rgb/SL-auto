import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the chiffrage record: sticky identity bar → assignation pairs → document sockets. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="-mx-4 -mt-4 flex h-12 items-center gap-3 border-b border-hairline px-3 sm:px-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="ml-auto h-8 w-32" />
      </div>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="paper p-6">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </div>
        </div>
        <div className="paper p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[120px] rounded-[10px]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
