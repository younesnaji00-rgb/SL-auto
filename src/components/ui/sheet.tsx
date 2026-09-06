"use client"

/**
 * Sheet — side and bottom panels. Below `md` it takes the phone anatomy of
 * `dialog.tsx` (research docs/research/mobile-overlays-feedback.md §1, §2):
 *
 *   side="left" | "right"  → FullScreenDialog anatomy: 100 dvh, 56 px header
 *                            with « × » on the leading edge, the title
 *                            truncated at 17 px and an optional TEXT primary
 *                            at the right, body `px-4 pb-24`.
 *   side="bottom"          → BottomSheet anatomy: 24 px grab zone (tap to
 *                            toggle the `detent`), 48 px header row, one
 *                            scroll region, sticky footer.
 *
 * 768–1023 (tablet): side sheets are 420 px wide. From `lg` nothing changed.
 */

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsPhone } from "@/hooks/use-viewport-class"
import { useOverlayHistory } from "@/hooks/use-overlay-history"
import {
  overlayBodyClass,
  OverlayChromeProvider,
  usePhoneOverlayDepth,
  useOverlayChrome,
  useSheetSwipe,
  type OverlayPhoneMode,
  type OverlayPrimaryAction,
} from "@/components/ui/dialog"
import { InlineLoader } from "@/components/ui/inline-loader"

const Sheet = SheetPrimitive.Root

const SheetTrigger = SheetPrimitive.Trigger

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      // No blur below md (D-Q1): a phone scrim covers the whole viewport.
      "fixed inset-0 z-50 bg-[color:var(--scrim)] md:backdrop-blur-[6px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200 data-[state=closed]:duration-150 motion-reduce:animate-none",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  // Enter 300ms decelerate; exit 200ms on the STANDARD curve, not the exit
  // curve — a sheet is recallable, and standard easing "suggests readiness
  // for recall" (Carbon; motion-spec §1.6). The old stray `transition
  // ease-in-out` is gone: the slide is keyframe-driven.
  "glass-strong fixed z-50 gap-4 text-card-foreground p-6 overscroll-contain data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-300 data-[state=open]:ease-enter data-[state=closed]:duration-200 data-[state=closed]:ease-standard motion-reduce:animate-none",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        // Bottom: the BottomSheet anatomy below md, the old panel from md up.
        bottom:
          "inset-x-0 bottom-0 rounded-t-xl border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom md:max-h-[calc(92dvh/var(--app-zoom))] md:overflow-y-auto md:pb-[max(1.5rem,env(safe-area-inset-bottom))] max-md:flex max-md:flex-col max-md:gap-0 max-md:overflow-hidden max-md:rounded-t-2xl max-md:p-0",
        // Side sheets: full-screen dialog below md, 420 px on tablets,
        // unchanged from lg (M3: multi-field tasks go full screen on compact).
        left: "inset-y-0 left-0 h-full w-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left max-md:flex max-md:h-[100dvh] max-md:max-w-none max-md:flex-col max-md:gap-0 max-md:overflow-hidden max-md:p-0 md:w-[420px] md:max-w-none lg:w-3/4 lg:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right max-md:flex max-md:h-[100dvh] max-md:max-w-none max-md:flex-col max-md:gap-0 max-md:overflow-hidden max-md:p-0 md:w-[420px] md:max-w-none lg:w-3/4 lg:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Header primary of the phone full-screen form (« Enregistrer »). */
  primary?: OverlayPrimaryAction
  /** `side="bottom"` only: opening height on a phone (60 dvh vs 92 dvh). */
  detent?: "default" | "tall"
  /** Extra controls in the phone header, before the primary / « × ». */
  headerActions?: React.ReactNode
  /** Extra classes for the phone body (scroll region). */
  bodyClassName?: string
  hideCloseButton?: boolean
  /**
   * Opt out of the phone header/body anatomy for a sheet that paints its own
   * chrome (a navigation drawer). Geometry still follows the breakpoint.
   */
  phoneChrome?: boolean
}

const CLOSE_BTN =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(
  (
    {
      side = "right",
      className,
      children,
      primary,
      detent = "default",
      headerActions,
      bodyClassName,
      hideCloseButton,
      phoneChrome,
      onOpenAutoFocus,
      ...props
    },
    ref
  ) => {
    const isPhone = useIsPhone()
    // `components/ui/sidebar.tsx` uses a Sheet as its mobile navigation drawer
    // and paints its own header inside `data-sidebar="sidebar"`. A drawer is
    // not a task overlay, so it keeps its chrome; everything else gets the
    // phone anatomy. Any other caller can opt out with `phoneChrome={false}`.
    const chromeAllowed =
      phoneChrome !== false &&
      (props as Record<string, unknown>)["data-sidebar"] !== "sidebar"
    const mode: OverlayPhoneMode =
      !isPhone || !chromeAllowed
        ? "none"
        : side === "bottom"
          ? "sheet"
          : side === "top"
            ? "none"
            : "fullscreen"

    const [titleSlot, setTitleSlot] = React.useState<HTMLElement | null>(null)
    const [tall, setTall] = React.useState(detent === "tall")
    const closeRef = React.useRef<HTMLButtonElement>(null)
    const contentRef = React.useRef<HTMLDivElement>(null)
    const headingRef = React.useRef<HTMLDivElement | null>(null)

    React.useEffect(() => setTall(detent === "tall"), [detent])

    usePhoneOverlayDepth(isPhone, `Sheet side="${side}"`)

    const requestClose = React.useCallback(() => closeRef.current?.click(), [])
    useOverlayHistory(isPhone, requestClose)

    const swipe = useSheetSwipe(contentRef, { enabled: mode === "sheet", onClose: requestClose })

    const composedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        contentRef.current = node
        if (typeof ref === "function") ref(node)
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
      },
      [ref]
    )

    const captureSlot = React.useCallback((node: HTMLDivElement | null) => {
      headingRef.current = node
      setTitleSlot(node)
    }, [])

    const chrome = React.useMemo(() => ({ mode, titleSlot }), [mode, titleSlot])

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={composedRef}
          onOpenAutoFocus={(e) => {
            onOpenAutoFocus?.(e)
            if (e.defaultPrevented) return
            if (mode === "fullscreen" && headingRef.current) {
              e.preventDefault()
              const node = headingRef.current
              requestAnimationFrame(() => node.focus())
            }
          }}
          className={cn(
            sheetVariants({ side }),
            mode === "sheet" &&
              (tall
                ? "max-md:h-[calc(92dvh/var(--app-zoom))]"
                : "max-md:max-h-[calc(60dvh/var(--app-zoom))]"),
            className
          )}
          {...props}
        >
          <OverlayChromeProvider value={chrome}>
            {mode === "fullscreen" && (
              <div className="flex h-14 shrink-0 items-center gap-1 border-b border-hairline px-1 md:hidden">
                {!hideCloseButton && (
                  <button type="button" onClick={requestClose} aria-label="Fermer" className={CLOSE_BTN}>
                    <X className="h-5 w-5" />
                  </button>
                )}
                <div ref={captureSlot} tabIndex={-1} className="min-w-0 flex-1 outline-none" />
                {headerActions}
                {primary && (
                  <button
                    type={primary.form ? "submit" : "button"}
                    form={primary.form}
                    onClick={primary.onClick}
                    disabled={primary.disabled || primary.loading}
                    aria-busy={primary.loading || undefined}
                    className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-[15px] font-semibold text-accent-foreground transition-colors hover:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  >
                    {primary.loading && <InlineLoader size="xs" />}
                    {primary.label}
                  </button>
                )}
              </div>
            )}

            {mode === "sheet" && (
              <div
                onTouchStart={swipe.onTouchStart}
                onTouchMove={swipe.onTouchMove}
                onTouchEnd={swipe.onTouchEnd}
                className="shrink-0 select-none md:hidden"
              >
                <button
                  type="button"
                  aria-label={tall ? "Réduire le panneau" : "Agrandir le panneau"}
                  onClick={() => setTall((v) => !v)}
                  className="flex h-6 w-full items-start justify-center pt-2 focus:outline-none"
                >
                  <span className="block h-1 w-8 rounded-full bg-surface-4" />
                </button>
                <div className="flex min-h-[48px] items-center gap-2 pl-4 pr-1">
                  <div ref={captureSlot} tabIndex={-1} className="min-w-0 flex-1 outline-none" />
                  {headerActions}
                  {!hideCloseButton && (
                    <button type="button" onClick={requestClose} aria-label="Fermer" className={CLOSE_BTN}>
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className={overlayBodyClass(mode, mode === "none" ? undefined : bodyClassName)}>
              {children}
            </div>
          </OverlayChromeProvider>

          <SheetPrimitive.Close ref={closeRef} className="hidden" tabIndex={-1} aria-hidden="true" />

          {mode === "none" && !hideCloseButton && (
            <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm text-ink-3 ring-offset-background transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-surface-3">
              <X className="h-4 w-4" />
              <span className="sr-only">Fermer</span>
            </SheetPrimitive.Close>
          )}
        </SheetPrimitive.Content>
      </SheetPortal>
    )
  }
)
SheetContent.displayName = SheetPrimitive.Content.displayName

// `SheetTitle` / `SheetFooter` read the SAME chrome context the dialog
// publishes (`OverlayChromeProvider` above), so the title portals into the
// sheet's own phone header and the footer gets the sticky thumb-zone form.
const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-2 text-left empty:hidden", className)}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { mode } = useOverlayChrome()
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        "max-md:flex-col max-md:gap-2 max-md:space-x-0 max-md:[&>*]:min-h-[48px] max-md:[&>*]:w-full",
        mode === "sheet" &&
          "max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-4 max-md:mt-2 max-md:border-t max-md:border-hairline max-md:bg-card max-md:px-4 max-md:pb-[max(16px,env(safe-area-inset-bottom))] max-md:pt-3",
        className
      )}
      {...props}
    />
  )
}
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => {
  const { mode, titleSlot } = useOverlayChrome()
  const el = (
    <SheetPrimitive.Title
      ref={ref}
      // Same header type as Dialog (element-specs §13): t-title / t-caption.
      className={cn("t-title", mode !== "none" && "truncate text-[17px] leading-tight", className)}
      {...props}
    />
  )
  return mode !== "none" && titleSlot ? createPortal(el, titleSlot) : el
})
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("t-caption", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
}
