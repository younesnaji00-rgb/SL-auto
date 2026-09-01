import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

export interface PageLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode
}

const PageLoader = React.forwardRef<HTMLDivElement, PageLoaderProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex min-h-[calc(60vh/var(--app-zoom))] w-full flex-col items-center justify-center gap-3 text-muted-foreground",
          className
        )}
        aria-live="polite"
        aria-busy="true"
        {...props}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        {label ? <p className="text-sm">{label}</p> : null}
      </div>
    )
  }
)
PageLoader.displayName = "PageLoader"

export { PageLoader }
