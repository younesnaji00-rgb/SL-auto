import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the role-dashboard anatomy (DESIGN.md §7): title → four stat
 * tiles → a worklist beside two context blocks. Solid `.paper` frames, no
 * glass on skeletons. The phone layout (Agent de Terrain) is one column, and
 * this frame collapses to it below lg.
 */
export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-3 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="paper space-y-3 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="paper space-y-3 p-5 lg:col-span-2">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="paper space-y-3 p-5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
          <div className="paper space-y-3 p-5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
