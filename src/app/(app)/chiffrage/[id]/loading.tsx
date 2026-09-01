import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the chiffrage detail: sticky identity bar → file sockets grid. */
export default function ChiffrageLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="-mx-4 -mt-4 flex h-12 items-center gap-3 border-b border-hairline px-3 sm:px-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="ml-auto h-5 w-20 rounded-full" />
      </div>
      <div className="mx-auto max-w-5xl">
        <div className="paper p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-[10px]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
