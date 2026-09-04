import * as React from "react"

import { cn } from "@/lib/utils"

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
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
          "flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-10 text-center",
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
        {action ? <div className="mt-1">{action}</div> : null}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
