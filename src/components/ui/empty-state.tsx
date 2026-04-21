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
          "flex flex-col items-center justify-center gap-3 rounded-lg border bg-card/40 px-6 py-10 text-center",
          dashed && "border-dashed",
          className
        )}
        {...props}
      >
        {icon ? (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:h-6 [&_svg]:w-6">
            {icon}
          </div>
        ) : null}
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="mt-2">{action}</div> : null}
      </div>
    )
  }
)
EmptyState.displayName = "EmptyState"

export { EmptyState }
