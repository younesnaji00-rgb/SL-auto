import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';

/**
 * Loading skeleton — element-specs §15 (NN/g skeleton screens: "mirror the
 * final layout"; Carbon data table: skeleton instead of a spinner).
 * Shape = header line, then the page's two-column grid: the inline form card
 * (7 label+field pairs, full-width submit) and the « Gérer » card (toolbar +
 * header row + 6 rows at 44 px).
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-hairline bg-card p-6 md:col-span-1">
          <Skeleton className="h-5 w-44" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="overflow-hidden rounded-xl border border-hairline bg-card md:col-span-2">
          <div className="space-y-4 p-6 pb-4">
            <Skeleton className="h-5 w-44" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 flex-1 basis-56" />
              <Skeleton className="h-10 w-48" />
            </div>
          </div>
          <div className="flex h-10 items-center gap-4 border-y border-hairline px-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-14" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
