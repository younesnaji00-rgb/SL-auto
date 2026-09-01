import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton — element-specs §15 (NN/g skeleton screens: "mirror the
 * final layout"). Shape = compact header (back button · title · chips), then
 * the record grid: main column = the two-column form card with its footer
 * button, the permissions toggle rows, the dossiers table; side column = the
 * history rows (date block anchor) and the session card.
 */
export function UserRecordSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-14 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-xl border border-hairline bg-card p-6">
            <Skeleton className="mb-6 h-5 w-52" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end border-t border-hairline pt-6">
              <Skeleton className="h-10 w-32" />
            </div>
          </div>
          <div className="rounded-xl border border-hairline bg-card p-6">
            <Skeleton className="mb-4 h-5 w-32" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex h-12 items-center justify-between gap-4 border-b border-hairline last:border-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-hairline bg-card p-6">
            <Skeleton className="mb-4 h-5 w-40" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex h-11 items-center gap-4 border-b border-hairline last:border-0">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-xl border border-hairline bg-card p-6">
            <Skeleton className="mb-4 h-5 w-40" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex h-14 items-center gap-3 border-b border-hairline last:border-0">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-4 rounded-xl border border-hairline bg-card p-6">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return <UserRecordSkeleton />;
}
