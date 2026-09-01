import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the editor's anatomy (DESIGN.md §7): one glass identity/tool bar,
 * the dark functional canvas, and the status strip — no spinner-equivalent
 * frame. `h-screen` is the zoom-compensated core utility.
 */
export default function EditorLoading() {
  return (
    <div className="flex h-screen flex-col bg-background" aria-busy="true" aria-live="polite">
      {/* Identity / tool bar (record-bar pattern) */}
      <div className="glass-bar border-b border-hairline">
        <div className="flex min-h-[48px] items-center gap-2 px-3 sm:px-5">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="flex h-10 items-center gap-2 border-t border-hairline px-3 sm:px-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-7 rounded-md" />
          ))}
          <div className="h-5 w-px bg-hairline" />
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-7 w-20 rounded-md" />
          <div className="flex-1" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
      </div>

      {/* Canvas — dark functional backdrop (lightbox rule), page as paper */}
      <div className="flex flex-1 items-start justify-center overflow-hidden bg-ink-solid p-8">
        <Skeleton className="h-[calc(70vh/var(--app-zoom))] w-full max-w-3xl rounded-sm bg-card/80" />
      </div>

      {/* Status strip */}
      <div className="flex h-8 items-center justify-between glass-bar border-t border-hairline px-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  );
}
