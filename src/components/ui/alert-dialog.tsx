"use client"

/**
 * AlertDialog — the ONE overlay that stays centred on a phone (research
 * docs/research/mobile-overlays-feedback.md §6; Apple Alerts, M3 dialogs: an
 * alert is a decision about one act, not a sheet). Phone form:
 * `calc(100% − 32px)` wide, max 360, 20 px padding, title 17 px, body 15 px,
 * buttons STACKED and full width at 48 px with the primary/destructive on TOP
 * and « Annuler » below (Apple: the likely choice at the top of a stack, Cancel
 * at the bottom).
 *
 * Two behaviours come free from Radix and are load-bearing here — do not
 * "simplify" them away by passing your own handlers:
 *   • `onPointerDownOutside` / `onInteractOutside` are prevented INSIDE
 *     `AlertDialogPrimitive.Content` (after the prop spread, so a caller
 *     cannot re-enable them): a scrim tap never dismisses a destructive
 *     confirmation at any width (NN/g, accidental overlay dismissal).
 *   • `onOpenAutoFocus` sends initial focus to `AlertDialogCancel` — the
 *     least destructive action (web.dev "building a dialog", Roselli).
 */

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const AlertDialog = AlertDialogPrimitive.Root

const AlertDialogTrigger = AlertDialogPrimitive.Trigger

const AlertDialogPortal = AlertDialogPrimitive.Portal

const AlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      // Colour-only scrim below md (D-Q1): blur cost = area × radius and a
      // phone scrim covers 100 % of the viewport.
      "fixed inset-0 z-50 bg-[color:var(--scrim)] md:backdrop-blur-[6px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200 data-[state=closed]:duration-150 motion-reduce:animate-none",
      className
    )}
    {...props}
    ref={ref}
  />
))
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName

const AlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <AlertDialogPortal>
    <AlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        // Enter 200ms decelerate; exit 150ms fade-only accelerate (the
        // slide-out-to-*-1/2 pair just re-supplies the static centring
        // inside the exit keyframe — see the gotcha note in dialog.tsx).
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] glass-strong gap-4 p-6 text-card-foreground duration-200 ease-enter data-[state=closed]:duration-150 data-[state=closed]:ease-exit data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-1/2 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] motion-reduce:animate-none sm:rounded-lg",
        // Phones: still centred, but sized to the hand (§6).
        "max-md:w-[calc(100%-32px)] max-md:max-w-[360px] max-md:gap-3 max-md:rounded-2xl max-md:p-5",
        className
      )}
      {...props}
    />
  </AlertDialogPortal>
))
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName

const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-left",
      className
    )}
    {...props}
  />
)
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      // Phones: stacked, full width, 48 px. `flex-col-reverse` puts the LAST
      // child (the Action) on TOP and « Annuler » below it — Apple's stack
      // order for alerts, the mirror image of a sheet's footer.
      "max-md:flex-col-reverse max-md:gap-2 max-md:space-x-0 max-md:[&>*]:mt-0 max-md:[&>*]:min-h-[48px] max-md:[&>*]:w-full",
      className
    )}
    {...props}
  />
)
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight text-ink max-md:text-[17px] max-md:leading-tight",
      className
    )}
    {...props}
  />
))
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName

const AlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-ink-3 max-md:text-[15px] max-md:leading-[1.45]", className)}
    {...props}
  />
))
AlertDialogDescription.displayName =
  AlertDialogPrimitive.Description.displayName

const AlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
))
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName

const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      // One solid action (AlertDialogAction = `default`), cancel is ghost.
      buttonVariants({ variant: "ghost" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
))
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
