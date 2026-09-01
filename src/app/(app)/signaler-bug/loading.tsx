import { Skeleton } from '@/components/ui/skeleton';

/** Shaped like the bug-report thread: header, message list, compose bar. */
export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="paper overflow-hidden">
        <div className="space-y-4 p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={i % 2 ? 'flex flex-row-reverse gap-3' : 'flex gap-3'}>
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-12 w-64 max-w-full rounded-2xl" />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t border-hairline p-4">
          <Skeleton className="h-20 w-full rounded-md" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
