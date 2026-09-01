import { Skeleton } from '@/components/ui/skeleton';

/** Shaped like Profil: header, identity row, then the preference sections. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" aria-busy="true" aria-live="polite">
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="paper flex items-center gap-4 p-6">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="paper p-6">
          <Skeleton className="mb-4 h-5 w-28" />
          <div className="flex items-center justify-between gap-4 py-2">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-9 w-40 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
