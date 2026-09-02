"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

/**
 * Tabs = a raised tab on a visible track (owner ruling 2026-09-02, replacing
 * the underline idiom the owner found invisible at a glance).
 * Sources: NN/g "Flat design" (quiet text-only controls get missed by new
 * users; backgrounds/borders/shadows restore clickability), NN/g "Tabs, Used
 * Right" ("use at least two selection indicators"), Apple HIG segmented
 * controls (a recessed track holds the options; the selected one is a raised
 * light card).
 * Anatomy: the list is a recessed `surface-2` track (hairline, 4 px inner
 * padding) — visibly a control, not text; the active tab is a raised card
 * (`bg-card` + light rim) with a 2 px accent bar under its label (indicator
 * two); inactive tabs are quiet ink-2 with a surface-3 hover.
 */
const Tabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      // Recessed track; tabs anchor to its bottom edge like browser tabs.
      // px-2 (8px) keeps the tabs' 7px outward feet inside the track.
      "inline-flex h-10 items-end gap-1 rounded-lg border border-hairline bg-surface-2 px-2 pt-1 text-ink-2",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // Browser-tab shape (owner rulings 2026-09-02 + ter): `.tab-slope`
      // (globals.css) draws the sloped body + outward feet — inactive tabs
      // are grey surface-4 on the track, active gets the card fill + rim.
      // ::after is reserved for the feet, so the accent bar is a <span>.
      "tab-slope group inline-flex h-[34px] items-center justify-center gap-2 whitespace-nowrap px-3.5 text-[13px] font-medium text-ink-2 ring-offset-background transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:font-semibold data-[state=active]:text-ink",
      "[&_svg]:size-4 [&_svg]:shrink-0",
      className
    )}
    {...props}
  >
    {children}
    {/* Accent bar under the label (second indicator, NN/g) — a real element
        because ::after now draws the tab feet. */}
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-3 bottom-[3px] h-0.5 rounded-full bg-primary opacity-0 transition-opacity group-data-[state=active]:opacity-100"
    />
  </TabsPrimitive.Trigger>
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-4 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
