"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

// Warm-up defaults (motion-spec §6, NN/g hover-intent 0.3–0.5s + the
// skip-delay pattern): 300ms before the first tooltip, instant re-open
// within 300ms of a previous one closing. Radix's own defaults are 700/300.
const TooltipProvider = ({
  delayDuration = 300,
  skipDelayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) => (
  <TooltipPrimitive.Provider
    delayDuration={delayDuration}
    skipDelayDuration={skipDelayDuration}
    {...props}
  />
)

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      // Ink-solid chip (the one functional dark backdrop besides the lightbox):
      // 12 px, no border, small radius, no shadow.
      // Fade + 2px shift toward the trigger, 150ms decelerate; NO exit
      // animation — a dismissed tooltip vanishes instantly (motion-spec §6).
      "z-50 overflow-hidden rounded-md bg-ink-solid px-2.5 py-1.5 text-xs leading-[1.4] text-on-ink origin-[--radix-tooltip-content-transform-origin] animate-in fade-in-0 duration-150 ease-enter data-[side=bottom]:slide-in-from-top-0.5 data-[side=left]:slide-in-from-right-0.5 data-[side=right]:slide-in-from-left-0.5 data-[side=top]:slide-in-from-bottom-0.5 motion-reduce:animate-none",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
