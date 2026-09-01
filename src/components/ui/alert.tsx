import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  // Semantic status pairs (blueprint §1): tinted bg + deep fg, a hairline in
  // the fg colour at 30 %, 10 px radius. No coloured left borders.
  "relative w-full rounded-[10px] border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "border-hairline bg-card text-ink [&>svg]:text-ink-3",
        destructive: "border-status-danger-fg/30 bg-status-danger-bg text-status-danger-fg",
        danger: "border-status-danger-fg/30 bg-status-danger-bg text-status-danger-fg",
        success: "border-status-success-fg/30 bg-status-success-bg text-status-success-fg",
        warning: "border-status-warning-fg/30 bg-status-warning-bg text-status-warning-fg",
        info: "border-status-info-fg/30 bg-status-info-bg text-status-info-fg",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 text-sm font-semibold leading-none", className)}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-[13px] leading-[1.45] [&_p]:leading-relaxed", className)}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
