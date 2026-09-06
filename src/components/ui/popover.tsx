"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

const Popover = PopoverPrimitive.Root

const PopoverTrigger = PopoverPrimitive.Trigger

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, collisionPadding = 16, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      // 16 px away from every edge: a 288 px popover on a 360 px phone must
      // never be pushed half off-screen (D §7 — level-2 pickers stay inside
      // the viewport, they are the only overlay allowed above a modal).
      collisionPadding={collisionPadding}
      className={cn(
        // Grows FROM its trigger (origin-aware, motion-spec §6): enter 150ms
        // decelerate, exit 100ms fade-only.
        "z-50 glass-strong w-72 max-w-[calc(100vw-32px)] rounded-md p-4 text-popover-foreground outline-none origin-[--radix-popover-content-transform-origin] duration-150 ease-enter data-[state=closed]:duration-100 data-[state=closed]:ease-exit data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent }
