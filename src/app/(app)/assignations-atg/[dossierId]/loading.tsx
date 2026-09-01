import { Skeleton } from '@/components/ui/skeleton';

/** Mirrors the mission page: sticky identity bar → mission rows → Photos | Documents facets. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="-mx-4 -mt-4 flex h-12 items-center gap-3 border-b border-hairline px-3 sm:px-5 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="ml-auto h-8 w-40" />
      </div>
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-12 w-full md:hidden" />
        <div className="paper overflow-hidden">
          <div className="flex h-12 items-center border-b border-hairline px-6">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-start gap-4 p-6">
            <Skeleton className="h-14 w-14 shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3.5 w-72 max-w-full" />
            </div>
          </div>
        </div>
        <div className="paper overflow-hidden">
          <div className="flex gap-2 border-b border-hairline px-6">
            <Skeleton className="my-2 h-8 w-24" />
            <Skeleton className="my-2 h-8 w-28" />
          </div>
          <div className="grid grid-cols-3 gap-3 p-6 sm:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-[10px]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
