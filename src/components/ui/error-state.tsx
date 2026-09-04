"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useT } from "@/i18n"

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
    const t = useT()
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(
          // Same quiet surface-2 well as EmptyState (element-specs §12); the
          // danger pair is spent on the icon chip only (blueprint §1:
          // semantic colour is never decorative).
          "flex flex-col items-center justify-center gap-3 rounded-xl bg-surface-2 px-6 py-10 text-center",
          className
        )}
        {...props}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-status-danger-bg text-status-danger-fg">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex max-w-[48ch] flex-col gap-1">
          <p className="t-heading">{typeof title === "string" ? t(title) : title}</p>
          {description ? (
            <p className="t-caption">{description}</p>
          ) : null}
        </div>
        {onRetry ? (
          <Button variant="tonal" onClick={onRetry} className="mt-1">
            {t(retryLabel)}
          </Button>
        ) : null}
      </div>
    )
  }
)
ErrorState.displayName = "ErrorState"

export { ErrorState }
