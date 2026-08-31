import * as React from "react"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface ErrorStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode
  description?: React.ReactNode
  onRetry?: () => void
  retryLabel?: string
}

const ErrorState = React.forwardRef<HTMLDivElement, ErrorStateProps>(
  (
    {
      className,
      title = "Une erreur est survenue",
      description,
      onRetry,
      retryLabel = "Réessayer",
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-lg bg-status-danger-bg px-6 py-10 text-center",
          className
        )}
        {...props}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card/70 text-status-danger-fg">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <div className="flex max-w-[48ch] flex-col gap-1">
          <p className="t-heading text-status-danger-fg">{title}</p>
          {description ? (
            <p className="t-caption text-ink-2">{description}</p>
          ) : null}
        </div>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    )
  }
)
ErrorState.displayName = "ErrorState"

export { ErrorState }
