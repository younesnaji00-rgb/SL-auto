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
          "flex min-h-[calc(60vh/var(--app-zoom))] w-full flex-col items-center justify-center gap-3 text-ink-3",
          className
        )}
        aria-live="polite"
        aria-busy="true"
        {...props}
      >
        <Loader2 className="h-6 w-6 animate-spin text-ink-3 motion-reduce:animate-none" />
        {label ? <p className="t-caption">{label}</p> : null}
      </div>
    )
  }
)
PageLoader.displayName = "PageLoader"

export { PageLoader }
