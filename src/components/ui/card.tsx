import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Card variants (DESIGN.md §10):
 *  - `tonal`    (default) a glass pane (`.glass`, Markazi): translucent card
 *               with a 1px light edge and inset top highlight. Never add a
 *               Tailwind `shadow-*` — it wipes the highlight. Inside another
 *               glass surface it flattens to solid card automatically.
 *  - `outline`  hairline only, no shadow — for cards nested inside a paper
 *               surface (inner radius = outer − padding).
 *  - `flat`     surface-2 fill, no border, no shadow — grouping boxes, wells.
 *  - `featured` the ONE navy surface a page may use (30 % colour role).
 */
export type CardVariant = 'tonal' | 'outline' | 'flat' | 'featured'

const CARD_VARIANT: Record<CardVariant, string> = {
  tonal: 'glass rounded-xl text-card-foreground',
  outline: 'rounded-lg border border-hairline bg-card text-card-foreground',
  flat: 'rounded-lg bg-surface-2 text-card-foreground',
  featured: 'rounded-xl bg-tertiary text-tertiary-foreground shadow-raised',
}

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { variant?: CardVariant }
>(({ className, variant = 'tonal', ...props }, ref) => (
  <div
    ref={ref}
    data-variant={variant}
    className={cn(CARD_VARIANT[variant], className)}
    {...props}
  />
))
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "text-[15px] font-semibold leading-snug tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
