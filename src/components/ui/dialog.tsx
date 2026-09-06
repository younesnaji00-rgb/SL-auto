"use client"

/**
 * Dialog — and the shared phone-overlay anatomy every other overlay reuses
 * (mobile-synthesis §3; research docs/research/mobile-overlays-feedback.md
 * §1, §2, §7).
 *
 * Below `md` (768 — phone shell) a `DialogContent` stops being a centred box:
 *
 *   • default            → the BottomSheet anatomy: 24 px grab zone (32 × 4
 *     pill, 48 px tap target toggling default ↔ tall), 48 px header row
 *     (title left, 44 × 44 « × » right), body = the only scroll region with
 *     `overscroll-contain`, sticky footer in the thumb zone.
 *   • `fullScreen`       → the FullScreenDialog anatomy: 100 dvh, 56 px
 *     header (« × » 44 px at the LEFT — M3/Apple both put dismiss on the
 *     leading edge — `t-title` 17 px truncated, primary as a 44 px TEXT
 *     button at the right), body `px-4 pb-24`, slide in from the right.
 *
 * The GEOMETRY is CSS (`max-md:` / `md:`) so a phone never paints a centred
 * dialog for a frame; only the CHROME (which needs DOM structure) waits for
 * `useIsPhone()`. The header is rendered by the content itself and the first
 * `<DialogTitle>` PORTALS into it, so all 60-odd existing call sites get the
 * phone anatomy without touching a single page.
 *
 * `dirty` + `onDiscard` gate « × » / Escape / scrim / platform back behind
 * « Abandonner les modifications ? » (M3 + Apple: confirm before losing work).
 *
 * md and up is unchanged: centred, `max-w-lg`, the same calm entrance.
 */

import * as React from "react"
import { createPortal } from "react-dom"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { InlineLoader } from "@/components/ui/inline-loader"
import { useIsPhone } from "@/hooks/use-viewport-class"
import { useOverlayHistory } from "@/hooks/use-overlay-history"
import { BottomSheetContext } from "@/components/ui/bottom-sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

/* ------------------------------------------------------------------ */
/* Shared phone-overlay anatomy (imported by sheet.tsx, command.tsx,   */
/* full-screen-dialog.tsx, the palettes)                               */
/* ------------------------------------------------------------------ */

export type OverlayPhoneMode = "none" | "sheet" | "fullscreen"

/** Header primary of a full-screen phone overlay (D §2: never a bottom bar —
 *  the iOS keyboard covers fixed-bottom UI, Radix #2323 / #3078). */
export interface OverlayPrimaryAction {
  label: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  /** When set the header button is `type="submit" form="<id>"`. */
  form?: string
}

interface OverlayChromeValue {
  mode: OverlayPhoneMode
  /** Node the first `<DialogTitle>` portals into (phone only). */
  titleSlot: HTMLElement | null
}

const OverlayChromeContext = React.createContext<OverlayChromeValue>({
  mode: "none",
  titleSlot: null,
})

/** Read by `DialogTitle`/`DialogFooter`, and by the palettes so they can
 *  portal their search input into the 56 px header. */
export function useOverlayChrome(): OverlayChromeValue {
  return React.useContext(OverlayChromeContext)
}

/**
 * ONE context object for every phone overlay: `sheet.tsx` publishes through
 * it so `SheetTitle` portals into the sheet's own header exactly the way
 * `DialogTitle` does, and `SheetFooter` gets the same sticky treatment.
 */
export const OverlayChromeProvider = OverlayChromeContext.Provider

/* --- depth budget (D §7): page → ONE modal → a picker or one alert ---- */

let openPhoneOverlays = 0

/**
 * Dev-only guard: warns when a second modal opens while one is already up on
 * a phone. "If your flow requires two modals back-to-back, you've got a
 * design problem" (digia); Apple: "Display only one sheet at a time".
 */
export function usePhoneOverlayDepth(active: boolean, label: string): void {
  React.useEffect(() => {
    if (!active) return undefined
    openPhoneOverlays += 1
    if (process.env.NODE_ENV !== "production" && openPhoneOverlays > 1) {
      console.warn(
        `[overlay] ${openPhoneOverlays} modals stacked on a phone (${label}). ` +
          "Depth budget (docs/research/mobile-overlays-feedback.md §7): page → ONE " +
          "modal → a non-modal picker or ONE AlertDialog. Close the first overlay " +
          "before opening the second.",
      )
    }
    return () => {
      openPhoneOverlays -= 1
    }
  }, [active, label])
}

/* --- swipe to dismiss, handle + header only (never the body) ---------- */

const SWIPE_CLOSE_PX = 96
const SWIPE_CLOSE_VELOCITY = 0.11 // px / ms — Sonner's threshold

export interface SheetSwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchMove: (e: React.TouchEvent) => void
  onTouchEnd: () => void
}

/**
 * Handle-and-header swipe-to-dismiss (D §1): translateY follows the finger,
 * closes past 96 px or 0.11 px/ms, springs back otherwise. The body never
 * drags — NN/g: a vertical swipe on content is ambiguous with the notification
 * drawer and with scrolling.
 */
export function useSheetSwipe(
  contentRef: React.RefObject<HTMLElement | null>,
  { enabled, onClose }: { enabled: boolean; onClose: () => void },
): SheetSwipeHandlers {
  const drag = React.useRef<{ y: number; t: number; dy: number } | null>(null)
  const closeRef = React.useRef(onClose)
  closeRef.current = onClose

  return {
    onTouchStart: (e) => {
      if (!enabled) return
      drag.current = { y: e.touches[0].clientY, t: performance.now(), dy: 0 }
    },
    onTouchMove: (e) => {
      const d = drag.current
      if (!d) return
      const dy = Math.max(0, e.touches[0].clientY - d.y)
      d.dy = dy
      const el = contentRef.current
      if (el) {
        el.style.transition = "none"
        el.style.transform = `translateY(${dy}px)`
      }
    },
    onTouchEnd: () => {
      const d = drag.current
      drag.current = null
      if (!d) return
      const el = contentRef.current
      if (el) {
        el.style.transition = ""
        el.style.transform = ""
      }
      const v = d.dy / Math.max(1, performance.now() - d.t)
      if (d.dy > SWIPE_CLOSE_PX || v > SWIPE_CLOSE_VELOCITY) closeRef.current()
    },
  }
}

function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined>) {
  return (node: T | null) => {
    for (const r of refs) {
      if (typeof r === "function") r(node)
      else if (r && typeof r === "object") (r as React.MutableRefObject<T | null>).current = node
    }
  }
}

/* --- the header bar rendered by every phone overlay ------------------- */

interface PhoneOverlayHeaderProps {
  mode: Exclude<OverlayPhoneMode, "none">
  primary?: OverlayPrimaryAction
  headerActions?: React.ReactNode
  /** Replaces the title in the header (the palettes put their input here). */
  headerContent?: React.ReactNode
  hideClose?: boolean
  hideHandle?: boolean
  tall: boolean
  onToggleTall: () => void
  onRequestClose: () => void
  setTitleSlot: (node: HTMLDivElement | null) => void
  swipe: SheetSwipeHandlers
}

const CLOSE_BTN =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"

function HeaderPrimary({ primary }: { primary: OverlayPrimaryAction }) {
  return (
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
  )
}

function PhoneOverlayHeader({
  mode,
  primary,
  headerActions,
  headerContent,
  hideClose,
  hideHandle,
  tall,
  onToggleTall,
  onRequestClose,
  setTitleSlot,
  swipe,
}: PhoneOverlayHeaderProps) {
  // The title slot is `flex-1`; when a caller supplies `headerContent` the
  // title still portals (screen-reader name) but takes no room.
  const slot = headerContent ? (
    <>
      <div ref={setTitleSlot} className="sr-only" />
      <div className="min-w-0 flex-1">{headerContent}</div>
    </>
  ) : (
    <div
      ref={setTitleSlot}
      tabIndex={-1}
      data-overlay-heading=""
      className="min-w-0 flex-1 outline-none"
    />
  )

  if (mode === "fullscreen") {
    // 56 px bar, « × » on the LEADING edge (M3 "the close X should be the only
    // navigation option in the app bar"; Apple: Cancel leading, Done trailing).
    return (
      <div className="flex h-14 shrink-0 items-center gap-1 border-b border-hairline px-1 md:hidden">
        {!hideClose && (
          <button type="button" onClick={onRequestClose} aria-label="Fermer" className={CLOSE_BTN}>
            <X className="h-5 w-5" />
          </button>
        )}
        {slot}
        {headerActions}
        {primary && <HeaderPrimary primary={primary} />}
      </div>
    )
  }

  return (
    <div
      onTouchStart={swipe.onTouchStart}
      onTouchMove={swipe.onTouchMove}
      onTouchEnd={swipe.onTouchEnd}
      className="shrink-0 select-none md:hidden"
    >
      {!hideHandle && (
        <button
          type="button"
          aria-label={tall ? "Réduire le panneau" : "Agrandir le panneau"}
          onClick={onToggleTall}
          className="flex h-6 w-full items-start justify-center pt-2 focus:outline-none"
        >
          <span className="block h-1 w-8 rounded-full bg-surface-4" />
        </button>
      )}
      <div className="flex min-h-[48px] items-center gap-2 pl-4 pr-1">
        {slot}
        {headerActions}
        {!hideClose && (
          <button type="button" onClick={onRequestClose} aria-label="Fermer" className={CLOSE_BTN}>
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Body classes shared by dialog and sheet: the ONE scroll region, always
 * `overscroll-contain` (MDN: "prevent background scrolling while a dialog or
 * overlay is open").
 */
export function overlayBodyClass(mode: OverlayPhoneMode, extra?: string): string {
  if (mode === "none") return cn("contents", extra)
  return cn(
    "flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4",
    mode === "sheet"
      ? "pb-[max(16px,env(safe-area-inset-bottom))] pt-1"
      : "pb-24 pt-3",
    extra,
  )
}

/** Phone geometry of a bottom sheet / full-screen dialog (CSS only). */
export function overlayPhoneClass(fullScreen: boolean | undefined, tall: boolean): string {
  if (fullScreen) {
    return cn(
      "max-md:inset-0 max-md:flex max-md:h-[100dvh] max-md:max-h-none max-md:max-w-none max-md:flex-col max-md:gap-0 max-md:rounded-none max-md:border-0 max-md:p-0",
      // A page-like push from the right: it reads as navigation, not as a card.
      "max-md:duration-300 max-md:ease-enter max-md:data-[state=closed]:duration-200 max-md:data-[state=closed]:ease-standard",
      "max-md:data-[state=open]:slide-in-from-right max-md:data-[state=closed]:slide-out-to-right",
    )
  }
  return cn(
    "max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:flex max-md:max-w-none max-md:flex-col max-md:gap-0 max-md:rounded-t-2xl max-md:border-t max-md:border-hairline max-md:p-0",
    // Two detents only (Apple medium/large, M3 50 %): tap the handle to swap.
    tall ? "max-md:h-[calc(92dvh/var(--app-zoom))]" : "max-md:max-h-[calc(60dvh/var(--app-zoom))]",
    "max-md:duration-300 max-md:ease-enter max-md:data-[state=closed]:duration-200 max-md:data-[state=closed]:ease-standard",
    "max-md:data-[state=open]:slide-in-from-bottom max-md:data-[state=closed]:slide-out-to-bottom",
  )
}

/* ------------------------------------------------------------------ */
/* Dialog                                                              */
/* ------------------------------------------------------------------ */

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
      // No blur below md (D-Q1): a phone scrim is 100 % of the viewport and
      // blur cost = area × radius; the 0.35 ink scrim separates on its own.
      "fixed inset-0 z-50 bg-[color:var(--scrim)] md:backdrop-blur-[6px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200 data-[state=closed]:duration-150 motion-reduce:animate-none",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

export interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
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
   */
  calm?: boolean
  /**
   * Below md, take the FULL-SCREEN anatomy instead of the bottom sheet.
   * Use it for every multi-field task (D §2 / synthesis §5: > 3 controls,
   * a Select, a Calendar or a textarea) — a form inside a 92 dvh sheet with
   * popover pickers is the double-scroll trap.
   */
  fullScreen?: boolean
  /** Header primary of the full-screen form (« Enregistrer », « Envoyer »). */
  primary?: OverlayPrimaryAction
  /** Unsaved edits: « × » / Escape / scrim / back ask before closing. */
  dirty?: boolean
  /** Called when the user confirms « Abandonner ». */
  onDiscard?: () => void
  /** Extra controls in the phone header, before the primary / « × ». */
  headerActions?: React.ReactNode
  /** Replaces the title in the phone header (palette search input). */
  headerContent?: React.ReactNode
  /** Extra classes for the phone body (scroll region). */
  bodyClassName?: string
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(
  (
    {
      className,
      children,
      hideCloseButton,
      calm,
      fullScreen,
      primary,
      dirty,
      onDiscard,
      headerActions,
      headerContent,
      bodyClassName,
      onOpenAutoFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      onInteractOutside,
      ...props
    },
    ref
  ) => {
    const isPhone = useIsPhone()
    const mode: OverlayPhoneMode = isPhone ? (fullScreen ? "fullscreen" : "sheet") : "none"
    const [titleSlot, setTitleSlot] = React.useState<HTMLElement | null>(null)
    const [tall, setTall] = React.useState(false)
    const [confirmOpen, setConfirmOpen] = React.useState(false)
    const closeRef = React.useRef<HTMLButtonElement>(null)
    const contentRef = React.useRef<HTMLDivElement>(null)
    const headingRef = React.useRef<HTMLDivElement | null>(null)
    const composedRef = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, contentRef), [ref])

    usePhoneOverlayDepth(isPhone, "Dialog")

    const close = React.useCallback(() => closeRef.current?.click(), [])
    const requestClose = React.useCallback(() => {
      if (dirty) {
        setConfirmOpen(true)
        return
      }
      close()
    }, [dirty, close])

    // The content only mounts while open, so "mounted" == "open".
    useOverlayHistory(isPhone, requestClose)

    const swipe = useSheetSwipe(contentRef, { enabled: mode === "sheet", onClose: requestClose })

    const captureSlot = React.useCallback((node: HTMLDivElement | null) => {
      headingRef.current = node
      setTitleSlot(node)
    }, [])

    const chrome = React.useMemo<OverlayChromeValue>(() => ({ mode, titleSlot }), [mode, titleSlot])

    return (
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
          ref={composedRef}
          onOpenAutoFocus={(e) => {
            onOpenAutoFocus?.(e)
            if (e.defaultPrevented) return
            // Long forms: focus the HEADING, never the first field (Roselli).
            if (mode === "fullscreen" && headingRef.current) {
              e.preventDefault()
              const node = headingRef.current
              requestAnimationFrame(() => node.focus())
            }
          }}
          onEscapeKeyDown={(e) => {
            onEscapeKeyDown?.(e)
            if (e.defaultPrevented) return
            if (dirty) {
              e.preventDefault()
              setConfirmOpen(true)
            }
          }}
          onPointerDownOutside={(e) => {
            onPointerDownOutside?.(e)
            if (e.defaultPrevented) return
            // No scrim dismissal of a dirty form (NN/g accidental dismissal).
            if (dirty) {
              e.preventDefault()
              setConfirmOpen(true)
            }
          }}
          onInteractOutside={(e) => {
            onInteractOutside?.(e)
            if (e.defaultPrevented) return
            if (dirty) e.preventDefault()
          }}
          className={cn(
            // Shared. Enter 200ms on the decelerate curve; exit 150ms fade-only
            // on the accelerate curve — exits run ~3/4 of the enter and carry no
            // zoom (the user has already decided to leave; motion-spec §2, §6).
            "fixed z-50 grid w-full glass-strong gap-4 text-card-foreground p-6 duration-200 ease-enter data-[state=closed]:duration-150 data-[state=closed]:ease-exit overscroll-contain data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none",
            // Phones (< md): sheet or full screen — CSS, so nothing flashes.
            overlayPhoneClass(fullScreen, tall),
            // md and up: centred modal (tablet gets the desktop dialog).
            "md:left-[50%] md:top-[50%] md:max-w-lg md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-xl",
            // Exits are pure fades: the slide-out-to-*-1/2 pair only RE-SUPPLIES
            // the static centring inside the exit keyframe (same gotcha as the
            // enter side) — the box does not move or zoom on the way out.
            calm
              ? "md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-1/2 md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-1/2"
              : "md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-[48%] md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-1/2",
            className
          )}
          {...props}
        >
          <OverlayChromeContext.Provider value={chrome}>
            {mode !== "none" && (
              <PhoneOverlayHeader
                mode={mode}
                primary={primary}
                headerActions={headerActions}
                headerContent={headerContent}
                hideClose={hideCloseButton}
                hideHandle={mode === "sheet" && !!headerContent}
                tall={tall}
                onToggleTall={() => setTall((v) => !v)}
                onRequestClose={requestClose}
                setTitleSlot={captureSlot}
                swipe={swipe}
              />
            )}
            <div className={overlayBodyClass(mode, mode === "none" ? undefined : bodyClassName)}>
              {/* A phone Dialog IS a bottom sheet: fields inside it must pick
                  the native control rather than open a second sheet (D §7). */}
              <BottomSheetContext.Provider value={mode === "sheet"}>
                {children}
              </BottomSheetContext.Provider>
            </div>
          </OverlayChromeContext.Provider>

          {/* Programmatic close: lets « × », the discard alert and the back
              gesture all go through the same Radix close path. */}
          <DialogPrimitive.Close ref={closeRef} className="hidden" tabIndex={-1} aria-hidden="true" />

          {mode === "none" && !hideCloseButton && (
            <DialogPrimitive.Close
              onClick={(e) => {
                if (dirty) {
                  e.preventDefault()
                  setConfirmOpen(true)
                }
              }}
              className="absolute right-4 top-4 rounded-sm text-ink-3 ring-offset-background transition-colors hover:text-ink focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-surface-3 data-[state=open]:text-ink-3"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fermer</span>
            </DialogPrimitive.Close>
          )}

          {(dirty || onDiscard || confirmOpen) && (
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Abandonner les modifications ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Les informations saisies ne seront pas enregistrées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continuer la saisie</AlertDialogCancel>
                <AlertDialogAction
                  className={cn(buttonVariants({ variant: "destructive" }))}
                  onClick={() => {
                    onDiscard?.()
                    close()
                  }}
                >
                  Abandonner
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    )
  }
)
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    // Left-aligned on every breakpoint (D §1: a centred sheet header reads as
    // an alert). `empty:hidden` collapses the wrapper on phones, where the
    // title has portalled into the header bar and nothing else is left.
    className={cn("flex flex-col space-y-1.5 text-left empty:hidden", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { mode } = useOverlayChrome()
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        // Phones: stacked, full width, 48 px, PRIMARY LAST = at the bottom,
        // in the thumb zone (Hoober / Smashing; D §1).
        "max-md:flex-col max-md:gap-2 max-md:space-x-0 max-md:[&>*]:min-h-[48px] max-md:[&>*]:w-full",
        // In a bottom sheet the footer is sticky so the primary never scrolls
        // out of reach; in a full-screen form it just ends the body.
        mode === "sheet" &&
          "max-md:sticky max-md:bottom-0 max-md:z-10 max-md:-mx-4 max-md:mt-2 max-md:border-t max-md:border-hairline max-md:bg-card max-md:px-4 max-md:pb-[max(16px,env(safe-area-inset-bottom))] max-md:pt-3",
        className
      )}
      {...props}
    />
  )
}
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => {
  const { mode, titleSlot } = useOverlayChrome()
  const el = (
    <DialogPrimitive.Title
      ref={ref}
      // Headline = t-title (20/600 Outfit); one-line description = t-caption
      // (element-specs §13; Material 3 dialogs: headline "brief, clear").
      // In a phone header bar it drops to 17 px and truncates to one line.
      className={cn("t-title", mode !== "none" && "truncate text-[17px] leading-tight", className)}
      {...props}
    />
  )
  return mode !== "none" && titleSlot ? createPortal(el, titleSlot) : el
})
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
