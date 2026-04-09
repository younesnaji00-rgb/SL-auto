import { Skeleton } from '@/components/ui/skeleton';

export default function DossierDetailLoading() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top header */}
      <div className="bg-card px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3 w-72" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full ml-auto" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="bg-card border-b px-6 py-2 flex gap-2">
        <Skeleton className="h-8 w-44 rounded-lg" />
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      {/* Tabs */}
      <div className="bg-card border-b px-4 py-0">
        <div className="flex gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-28 rounded-t-lg" />
          ))}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 p-6 space-y-6">
        {/* Info cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded-xl p-5 bg-card space-y-4">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </div>
          <div className="border rounded-xl p-5 bg-card space-y-4">
            <Skeleton className="h-5 w-40" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-36" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
