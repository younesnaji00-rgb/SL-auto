"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      // Phones: bottom of the screen, inside the thumb zone, ABOVE the 60 px
      // bottom bar and never over it (M3 snackbar: "placed at the bottom…
      // avoid placing snackbars in front of navigation components"; a top
      // toast on a phone sits under the notch and out of thumb reach).
      // `--bottom-bar` is published by the nav / bottom action bar.
      "fixed z-[100] flex max-h-screen flex-col gap-2 left-4 right-4 top-auto w-auto",
      // `--bottom-bar` ALREADY includes the safe-area inset (the app layout
      // publishes the bar's full height), so the inset must not be added
      // again here or a toast floats a thumb's width too high on a notched
      // phone. The 60 px fallback is for pages outside the app shell.
      "bottom-[calc(var(--bottom-bar,60px)+12px)]",
      // md and up: the familiar bottom-right stack.
      "md:bottom-0 md:left-auto md:right-0 md:w-full md:max-w-[420px] md:gap-0 md:p-4",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  // Frosted panel (`glass-strong`, same layer as menus/dialogs), 10 px radius.
  // Status variants lay a semantic pair over the glass with a 30 % fg
  // hairline; only transform/opacity animate.
  // Ambient element: enter 300ms on plain `ease` (Sonner's deliberate
  // exception to the sub-300 rule — a toast doesn't block anything and the
  // softer curve reads more refined); exit 200ms accelerate (motion-spec §6).
  // Swipe axis follows the position (Sonner: "swipe based on position"), so
  // the translate vars are split by breakpoint — a phone toast lives at the
  // bottom and is swiped DOWN (`swipeDirection` is set in toaster.tsx), a
  // desktop toast is still swiped right.
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden glass-strong rounded-[10px] p-4 pr-8 transition-[transform,opacity] data-[swipe=cancel]:translate-x-0 data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-full data-[state=open]:duration-300 data-[state=open]:ease-soft data-[state=closed]:duration-200 data-[state=closed]:ease-exit motion-reduce:animate-none " +
    "max-md:data-[swipe=end]:translate-y-[var(--radix-toast-swipe-end-y)] max-md:data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y)] max-md:data-[state=closed]:slide-out-to-bottom-full " +
    "md:data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] md:data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] md:data-[state=closed]:slide-out-to-right-full",
  {
    variants: {
      variant: {
        default: "text-ink",
        destructive:
          "destructive group border-status-danger-fg/30 bg-status-danger-bg text-status-danger-fg",
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

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      // 44 px tall on a phone (D §5: the action is the whole point of an undo
      // toast and it has ~8 s to be hit with a thumb).
      "inline-flex h-8 max-md:h-11 max-md:px-4 max-md:text-[15px] shrink-0 items-center justify-center rounded-md bg-card px-3 text-[13px] font-medium text-ink shadow-rim ring-offset-background transition-colors hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:text-status-danger-fg group-[.destructive]:hover:bg-status-danger-fg group-[.destructive]:hover:text-status-danger-bg group-[.destructive]:focus:ring-status-danger-fg",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      // Always visible (Carbon notification: toasts auto-dismiss AND carry a
      // close button — a hover-only close is invisible on touch; §14).
      "absolute right-2 top-2 rounded-md p-1 max-md:right-1 max-md:top-1 max-md:p-2.5 text-ink-3 transition-colors hover:bg-surface-3 hover:text-ink focus:outline-none focus:ring-2 focus:ring-ring group-[.destructive]:text-current group-[.destructive]:hover:text-current group-[.destructive]:focus:ring-status-danger-fg",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-[13px] leading-[1.45]", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
