import * as React from "react"

import { cn } from "@/lib/utils"

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode
  /** What the state IS (« Aucun dossier pour ces filtres »). */
  title: React.ReactNode
  /**
   * The REASON line — why the list is empty and what would change it. NN/g
   * empty states: state + reason + a direct pathway; every filtered-empty in
   * the app names the filters and offers « Réinitialiser les filtres ».
   */
  description?: React.ReactNode
  /** ONE action — the pathway out of the state (Polaris: a single primary). */
  action?: React.ReactNode
  /**
   * Dashed hairline frame — reserved for DROP TARGETS (element-specs §12 / §21:
   * "dashed is the drop-here cue"). Leave it off for a plain empty list.
   */
  dashed?: boolean
}

/**
 * Empty state = icon + one line + one action (NN/g empty states: state +
 * reason + a direct pathway; Polaris: verb-led heading, one primary action).
 * Default is a quiet `surface-2` well (no border) so it sits inside a card
 * or on the canvas without reading as a drop zone; callers may pass
 * `className="bg-transparent"` when the parent already frames it.
 */
const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, dashed = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // 16 px side padding on phones (density §7 page margin).
          "flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-10 text-center max-md:px-4",
          dashed ? "border border-dashed border-hairline-strong" : "bg-surface-2",
          className
        )}
        {...props}
      >
        {icon ? (
          // 40 px disc one surface step above its well so it stays visible
          // (surface-3 on the surface-2 well; surface-2 on a transparent frame).
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full text-ink-3 [&_svg]:h-5 [&_svg]:w-5",
              dashed ? "bg-surface-2" : "bg-surface-3"
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="flex max-w-[48ch] flex-col gap-1">
          <p className="t-heading">{title}</p>
          {description ? (
            <p className="t-caption">{description}</p>
          ) : null}
        </div>
        {/* The pathway is a 48 px target on a phone (density §7). */}
        {action ? <div className="mt-1 max-md:[&_a]:h-12 max-md:[&_button]:h-12">{action}</div> : null}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
