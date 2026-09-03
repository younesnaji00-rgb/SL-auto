import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/**
 * Badge = 11 px / 500 pill. Every variant maps to a semantic status pair or
 * the neutral surface step (blueprint §1: semantic colour is separate from
 * the accent and never decorative). Legacy names stay as aliases.
 */
const STATUS_PAIR = {
  success: "border-transparent bg-status-success-bg text-status-success-fg",
  warning: "border-transparent bg-status-warning-bg text-status-warning-fg",
  danger: "border-transparent bg-status-danger-bg text-status-danger-fg",
  info: "border-transparent bg-status-info-bg text-status-info-fg",
  neutral: "border-transparent bg-surface-3 text-ink-2",
} as const

const badgeVariants = cva(
  // Optional 12 px leading icon (Carbon tag: "decorative icons are optional
  // and support the tag title"; element-specs §11). 11 px sits below
  // Butterick's 9 pt lowercase floor → medium weight + a hair of tracking
  // (consultation typography pass 2026-09-03).
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 tracking-[0.01em] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        ...STATUS_PAIR,
        // Filled accent chip — reserve for the one "current" marker.
        default: "border-transparent bg-primary text-primary-foreground",
        // Terracotta = TIME (owner ruling 2026-09-02, Few: every colour owns
        // one meaning): « Aujourd'hui », « Prochain », upcoming markers only.
        // Never a status, never near the amber/red pairs.
        time: "border-transparent bg-tertiary-bg text-tertiary-deep",
        outline: "border-hairline-strong bg-transparent text-ink",
        // Reserved TOP step of an urgency ramp: the only SOLID status fill on
        // a page (terrain research 2026-09-03 — Few: bright/dark = emphasis;
        // Stone/Muth: the ramp must order by lightness, solid last).
        dangerSolid:
          "border-transparent bg-status-danger-solid text-status-danger-solid-fg shadow-rim-filled",
        // Aliases (kept so existing call sites keep working).
        secondary: STATUS_PAIR.neutral,
        destructive: STATUS_PAIR.danger,
        creation: STATUS_PAIR.neutral,
        chiffrage: STATUS_PAIR.info,
        validation: STATUS_PAIR.warning,
        expertise: STATUS_PAIR.success,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
