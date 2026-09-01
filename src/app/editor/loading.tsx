import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading skeleton — element-specs §15 (NN/g skeleton screens: "mirror the
 * final layout so users build a mental model"; Carbon: skeleton instead of a
 * spinner). Mirrors the editor's restored anatomy (3d5629a): bar 1 (back ·
 * selects · actions), bar 2 (tools · ink · zoom), the dark functional canvas
 * with one page, the status strip. Pulse only; `h-screen` is the
 * zoom-compensated utility.
 */
export default function EditorLoading() {
  return (
    <div className="flex h-screen flex-col bg-background" aria-busy="true" aria-live="polite">
      {/* Bar 1 — navigation · file · actions (≤ 48 px) */}
      <div className="flex min-h-[48px] shrink-0 items-center gap-2 glass-bar border-b border-hairline px-4 sm:px-6">
        <Skeleton className="h-8 w-20 rounded-md" />
        <div className="h-6 w-px bg-hairline" />
        <Skeleton className="h-9 w-[150px] rounded-md" />
        <Skeleton className="h-9 w-[220px] rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Bar 2 — tools · ink · trailing view controls (≤ 40 px) */}
      <div className="flex min-h-[40px] shrink-0 items-center gap-2 glass-bar border-b border-hairline px-4 sm:px-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-md" />
        ))}
        <div className="h-6 w-px bg-hairline" />
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-5 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>

      {/* Canvas — dark functional backdrop (sanctioned), page as paper */}
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
