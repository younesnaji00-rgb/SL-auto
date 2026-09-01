import { Skeleton, SkeletonRow } from '@/components/ui/skeleton';

/**
 * Route-level loading UI that mirrors the real page anatomy (PageHeader +
 * primary block) so navigation feels instant instead of "frame-only".
 */
export function PageSkeleton({
  variant = 'list',
  filters = true,
  subtitle = true,
  action = true,
}: {
  variant?: 'list' | 'detail' | 'cards' | 'form';
  filters?: boolean;
  subtitle?: boolean;
  action?: boolean;
}) {
  return (
    <div className="space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          {/* t-display line (28 px) + t-caption line */}
          <Skeleton className="h-8 w-48" />
          {subtitle && <Skeleton className="h-4 w-72 max-w-full" />}
        </div>
        {/* one 40 px primary action */}
        {action && <Skeleton className="h-10 w-36" />}
      </div>

      {filters && (variant === 'list' || variant === 'cards') && (
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
      )}

      {variant === 'list' && (
        // Solid paper frame (no glass on skeletons), header on card like Table.
        <div className="overflow-hidden rounded-xl border border-hairline bg-card">
          {/* Header row at the table's 44 px, then 6 rows at 44 px
              (element-specs §15: "table = header row + 6 rows at 44 px"). */}
          <div className="flex h-11 items-center gap-4 border-b border-hairline bg-card px-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {variant === 'cards' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      )}

      {variant === 'detail' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </div>
      )}

      {variant === 'form' && (
        <div className="max-w-3xl space-y-6">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      )}
    </div>
  );
}

export default PageSkeleton;
