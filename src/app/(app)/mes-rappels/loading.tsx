import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the inbox anatomy of /mes-rappels (title, tab strip, one paper of
 * hairline rows with a date block and three lines) so the route feels
 * instant instead of frame-only (DESIGN.md §7).
 */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-48 rounded-md" />
      </div>
      <div className="paper p-6">
        <ul className="divide-y divide-hairline">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <Skeleton className="h-[60px] w-14 rounded-md" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-32" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
