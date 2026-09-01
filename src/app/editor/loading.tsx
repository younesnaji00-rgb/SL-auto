import { Skeleton } from '@/components/ui/skeleton';

export default function EditorLoading() {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b bg-card px-3 py-2 flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-4 w-px bg-border" />
        <Skeleton className="h-7 w-[180px] rounded" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-24 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
        <Skeleton className="h-8 w-20 rounded" />
      </div>

      {/* Tool options bar */}
      <div className="border-b bg-card/50 px-3 py-1.5 flex items-center gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-7 rounded" />
        ))}
        <Skeleton className="h-4 w-px bg-border" />
        <Skeleton className="h-7 w-20 rounded" />
        <Skeleton className="h-7 w-24 rounded" />
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center bg-slate-200 dark:bg-slate-800 p-8">
        <div className="space-y-6 w-full max-w-3xl">
          <Skeleton className="h-[calc(70vh/var(--app-zoom))] w-full rounded-lg bg-white dark:bg-slate-700 shadow-lg" />
        </div>
      </div>
    </div>
  );
}
