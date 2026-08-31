import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';

/** Mirrors the dossiers list: title + action → filters row → tonal table paper. */
export default function DossiersLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      {/* Title + actions */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-64 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Table (tonal paper, no border) */}
      <div className="paper overflow-hidden">
        <div className="flex items-center gap-4 border-b border-hairline bg-surface-2 px-4 py-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <SkeletonRow key={i} className="border-hairline" />
        ))}
      </div>
    </div>
  );
}
