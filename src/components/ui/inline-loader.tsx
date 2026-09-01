import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

export interface InlineLoaderProps extends React.HTMLAttributes<HTMLSpanElement> {
  label?: React.ReactNode
  size?: "xs" | "sm" | "md"
}

const sizeClasses = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
}

const InlineLoader = React.forwardRef<HTMLSpanElement, InlineLoaderProps>(
  ({ className, label, size = "sm", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn("inline-flex items-center gap-2 text-ink-3", className)}
        aria-live="polite"
        aria-busy="true"
        {...props}
      >
        <Loader2 className={cn("animate-spin motion-reduce:animate-none", sizeClasses[size])} />
        {label ? <span className="text-[13px]">{label}</span> : null}
      </span>
    )
  }
)
InlineLoader.displayName = "InlineLoader"

export { InlineLoader }
