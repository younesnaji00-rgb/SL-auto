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
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          {subtitle && <Skeleton className="h-4 w-72 max-w-full" />}
        </div>
        {action && <Skeleton className="h-9 w-36 rounded-lg" />}
      </div>

      {filters && (variant === 'list' || variant === 'cards') && (
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
      )}

      {variant === 'list' && (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center gap-4 border-b bg-muted/30 px-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {variant === 'cards' && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      )}

      {variant === 'detail' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-40 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-40 rounded-lg" />
          </div>
        </div>
      )}

      {variant === 'form' && (
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      )}
    </div>
  );
}

export default PageSkeleton;
