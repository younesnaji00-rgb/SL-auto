import * as React from "react"

import { cn } from "@/lib/utils"

export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  dashed?: boolean
}

const EmptyState = React.forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon, title, description, action, dashed = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Quiet: state + reason + ONE action (NN/g; pass a `tonal` Button).
          // Dashed hairline when it stands alone on the canvas; a flat
          // surface-2 well when framed by a card.
          "flex flex-col items-center justify-center gap-3 rounded-xl px-6 py-10 text-center",
          dashed ? "border border-dashed border-hairline-strong" : "bg-surface-2",
          className
        )}
        {...props}
      >
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-ink-3 [&_svg]:h-5 [&_svg]:w-5">
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
