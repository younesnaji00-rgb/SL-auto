"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // The blur itself never animates (motion-spec §4.2) — only the scrim's
      // opacity fades. 200 in / 150 out (exits faster, motion-spec §2).
      "fixed inset-0 z-50 bg-[color:var(--scrim)] backdrop-blur-[6px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200 data-[state=closed]:duration-150 motion-reduce:animate-none",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    hideCloseButton?: boolean
    /**
     * Calm entrance (owner ruling 2026-09-02: the default entrance reads
     * "cartoonish" on media viewers): fade + zoom from the CENTRE, nothing
     * else. GOTCHA the first version hit: the animate-in keyframes REPLACE
     * the element's transform, so the static translate(-50%,-50%) centring
     * must be re-supplied INSIDE the animation via slide-in-from-left-1/2 +
     * slide-in-from-top-1/2 — omit those and the box animates from an
     * off-centre position (appears to come from the right) then snaps to
     * the centre when the animation ends. The default variant's top-[48%]
     * is its deliberate downward drift; calm uses exactly 1/2 = no drift.
     * Opt-in for lightboxes and full-screen viewers; every other dialog
     * keeps the default entrance. Below lg the bottom sheet keeps its slide.
     */
    calm?: boolean
  }
>(({ className, children, hideCloseButton, calm, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Shared. Enter 200ms on the decelerate curve; exit 150ms fade-only
        // on the accelerate curve — exits run ~3/4 of the enter and carry no
        // zoom (the user has already decided to leave; motion-spec §2, §6).
        "fixed z-50 grid w-full glass-strong gap-4 text-card-foreground p-6 duration-200 ease-enter data-[state=closed]:duration-150 data-[state=closed]:ease-exit overscroll-contain data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none",
        // Below lg: bottom sheet — primary action lands in the thumb zone
        "max-lg:inset-x-0 max-lg:bottom-0 max-lg:top-auto max-lg:max-h-[calc(92dvh/var(--app-zoom))] max-lg:max-w-none max-lg:overflow-y-auto max-lg:rounded-t-xl max-lg:border-b-0 max-lg:pb-[max(1.5rem,env(safe-area-inset-bottom))] max-lg:data-[state=closed]:slide-out-to-bottom max-lg:data-[state=open]:slide-in-from-bottom",
        // lg and up: centred modal
        "lg:left-[50%] lg:top-[50%] lg:max-w-lg lg:translate-x-[-50%] lg:translate-y-[-50%] lg:rounded-xl",
        // Exits are pure fades: the slide-out-to-*-1/2 pair only RE-SUPPLIES
        // the static centring inside the exit keyframe (same gotcha as the
        // enter side) — the box does not move or zoom on the way out.
        calm
          ? "lg:data-[state=open]:zoom-in-95 lg:data-[state=open]:slide-in-from-left-1/2 lg:data-[state=open]:slide-in-from-top-1/2 lg:data-[state=closed]:slide-out-to-left-1/2 lg:data-[state=closed]:slide-out-to-top-1/2"
          : "lg:data-[state=open]:zoom-in-95 lg:data-[state=open]:slide-in-from-left-1/2 lg:data-[state=open]:slide-in-from-top-[48%] lg:data-[state=closed]:slide-out-to-left-1/2 lg:data-[state=closed]:slide-out-to-top-1/2",
        className
      )}
      {...props}
    >
      {children}
      {!hideCloseButton && (
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm text-ink-3 ring-offset-background transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-surface-3 data-[state=open]:text-ink-3">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      )}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    // Headline = t-title (20/600 Outfit); one-line description = t-caption
    // (element-specs §13; Material 3 dialogs: headline "brief, clear").
    className={cn("t-title", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("t-caption", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
