import { Skeleton } from '@/components/ui/skeleton';

/** Shaped like the user record: sticky identity bar, then main sections
 *  (informations, accès, dossiers) and the side column (historique, session). */
export function UserRecordSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="-mx-4 -mt-4 flex min-h-[48px] items-center gap-3 border-b border-hairline px-4 md:-mx-6 md:-mt-6 md:px-6 lg:-mx-8 lg:-mt-8 lg:px-8">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="ml-auto h-8 w-8" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="paper space-y-4 p-6">
            <Skeleton className="h-5 w-40" />
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </div>
          </div>
          <div className="paper space-y-3 p-6">
            <Skeleton className="h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-hairline py-2 last:border-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5 w-9 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="paper space-y-3 p-6">
            <Skeleton className="h-5 w-36" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5 border-b border-hairline py-2 last:border-0">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-48" />
              </div>
            ))}
          </div>
          <div className="paper space-y-3 p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return <UserRecordSkeleton />;
}
