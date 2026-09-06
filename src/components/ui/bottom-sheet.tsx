'use client';

/**
 * BottomSheet — the phone form of every short modal (mobile-synthesis §3;
 * research docs/research/mobile-overlays-feedback.md §1).
 *
 * Anatomy, top to bottom:
 *   1. handle zone 24 px (pill 32×4) — the whole zone is a 48 px tap target
 *      that toggles default ↔ tall (Material "tap the handle to cycle
 *      heights"); no drag-to-resize.
 *   2. header 48 px — `t-title` left, 44×44 « × » right (NN/g: never
 *      handle-only dismissal).
 *   3. body — the only scroll region, `overscroll-contain`.
 *   4. sticky footer — primary 48 px full width at the bottom (thumb zone),
 *      optional ghost above it; safe-area padding.
 *
 * Detents: `default` = content height capped at 60 dvh; `tall` = 92 dvh.
 * Dismiss: ×, scrim tap, platform back (useOverlayHistory), swipe down on the
 * handle + header only (Δy > 96 px or velocity > 0.11 px/ms — Sonner's
 * threshold); the body never drags. Scrim is colour-only below md (no blur:
 * a phone scrim is 100 % of the viewport). Enter 300 ms ease-enter, exit
 * 200 ms ease-standard (a sheet is recallable — motion-spec §1.6).
 *
 * On md and up it renders as a centred dialog of the same content, so callers
 * can use it unconditionally.
 */

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOverlayHistory } from '@/hooks/use-overlay-history';

export type SheetDetent = 'default' | 'tall';

/**
 * True for anything rendered INSIDE a bottom-sheet body. Read it to make the
 * choices a sheet forces: a picker must not open a second sheet on top of
 * this one (depth budget, docs/research/mobile-overlays-feedback.md §7), so
 * a Select falls back to the native control here, and a calendar field
 * promotes its whole task to a FullScreenDialog instead of popping over a
 * 60 dvh panel. dialog.tsx publishes the same flag for a phone Dialog,
 * which IS a bottom sheet below md.
 */
export const BottomSheetContext = React.createContext<boolean>(false);

/** True when the calling component sits inside a bottom-sheet body. */
export function useInBottomSheet(): boolean {
  return React.useContext(BottomSheetContext);
}

export interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** Plain-text title for assistive tech when `title` is not a string. */
  titleText?: string;
  description?: React.ReactNode;
  detent?: SheetDetent;
  /** Sticky footer (primary action at the bottom). */
  footer?: React.ReactNode;
  /** Extra header controls (e.g. « Tout marquer comme lu »), placed before ×. */
  headerActions?: React.ReactNode;
  hideHandle?: boolean;
  /** Remove the body's 16 px side padding (lists that want full-bleed rows). */
  flush?: boolean;
  /** Scrim tap / swipe do not dismiss (destructive confirmations). */
  preventDismiss?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

const SWIPE_CLOSE_PX = 96;
const SWIPE_CLOSE_VELOCITY = 0.11; // px / ms

export function BottomSheet({
  open,
  onOpenChange,
  title,
  titleText,
  description,
  detent = 'default',
  footer,
  headerActions,
  hideHandle,
  flush,
  preventDismiss,
  className,
  bodyClassName,
  children,
}: BottomSheetProps) {
  const [tall, setTall] = React.useState(detent === 'tall');
  React.useEffect(() => {
    if (open) setTall(detent === 'tall');
  }, [open, detent]);

  useOverlayHistory(open, () => onOpenChange(false));

  // Swipe-to-dismiss on the grab zone only.
  const contentRef = React.useRef<HTMLDivElement>(null);
  const drag = React.useRef<{ y: number; t: number; dy: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (preventDismiss) return;
    drag.current = { y: e.touches[0].clientY, t: performance.now(), dy: 0 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag.current) return;
    const dy = Math.max(0, e.touches[0].clientY - drag.current.y);
    drag.current.dy = dy;
    const el = contentRef.current;
    if (el) {
      el.style.transition = 'none';
      el.style.transform = `translateY(${dy}px)`;
    }
  };
  const onTouchEnd = () => {
    const d = drag.current;
    drag.current = null;
    const el = contentRef.current;
    if (!d) return;
    const dt = Math.max(1, performance.now() - d.t);
    const v = d.dy / dt;
    if (el) {
      el.style.transition = '';
      el.style.transform = '';
    }
    if (d.dy > SWIPE_CLOSE_PX || v > SWIPE_CLOSE_VELOCITY) onOpenChange(false);
  };

  const label = titleText ?? (typeof title === 'string' ? title : undefined);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-[color:var(--scrim)] md:backdrop-blur-[6px]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200 data-[state=closed]:duration-150 motion-reduce:animate-none',
          )}
        />
        <DialogPrimitive.Content
          ref={contentRef}
          aria-label={label}
          onPointerDownOutside={(e) => {
            if (preventDismiss) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (preventDismiss) e.preventDefault();
          }}
          className={cn(
            'fixed z-50 flex flex-col glass-strong text-card-foreground outline-none overscroll-contain',
            // Phone: bottom sheet.
            'max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-2xl max-md:border-t max-md:border-hairline',
            tall ? 'max-md:h-[92dvh]' : 'max-md:max-h-[60dvh]',
            'max-md:duration-300 max-md:ease-enter max-md:data-[state=closed]:duration-200 max-md:data-[state=closed]:ease-standard',
            'max-md:data-[state=open]:animate-in max-md:data-[state=closed]:animate-out max-md:data-[state=open]:slide-in-from-bottom max-md:data-[state=closed]:slide-out-to-bottom',
            // Tablet / desktop: centred dialog.
            'md:left-1/2 md:top-1/2 md:w-full md:max-w-lg md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:max-h-[85dvh]',
            'md:duration-200 md:ease-enter md:data-[state=closed]:duration-150 md:data-[state=closed]:ease-exit',
            'md:data-[state=open]:animate-in md:data-[state=closed]:animate-out md:data-[state=open]:fade-in-0 md:data-[state=closed]:fade-out-0 md:data-[state=open]:zoom-in-95 md:data-[state=open]:slide-in-from-left-1/2 md:data-[state=open]:slide-in-from-top-1/2 md:data-[state=closed]:slide-out-to-left-1/2 md:data-[state=closed]:slide-out-to-top-1/2',
            'motion-reduce:animate-none',
            className,
          )}
        >
          {/* Grab zone + header share the swipe handlers. */}
          <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="shrink-0 select-none">
            {!hideHandle && (
              <button
                type="button"
                aria-label={tall ? 'Réduire le panneau' : 'Agrandir le panneau'}
                onClick={() => setTall((v) => !v)}
                className="flex h-6 w-full items-start justify-center pt-2 focus-visible:outline-none md:hidden"
              >
                <span className="block h-1 w-8 rounded-full bg-surface-4" />
              </button>
            )}
            <div className={cn('flex min-h-[48px] items-center gap-2 pl-4 pr-1', hideHandle && 'pt-1', 'md:pl-6 md:pr-3 md:pt-4')}>
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="t-title truncate text-[17px] leading-tight">{title}</DialogPrimitive.Title>
                {description ? (
                  <DialogPrimitive.Description className="t-caption mt-0.5 truncate">{description}</DialogPrimitive.Description>
                ) : (
                  <DialogPrimitive.Description className="sr-only">{label}</DialogPrimitive.Description>
                )}
              </div>
              {headerActions}
              <DialogPrimitive.Close
                aria-label="Fermer"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </div>
          </div>

          <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', flush ? '' : 'px-4 md:px-6', footer ? 'pb-2' : 'pb-[max(16px,env(safe-area-inset-bottom))] md:pb-6', bodyClassName)}>
            <BottomSheetContext.Provider value={true}>{children}</BottomSheetContext.Provider>
          </div>

          {footer && (
            <div className="shrink-0 border-t border-hairline px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] md:px-6 md:pb-6">
              {footer}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Footer helper: primary at the bottom (thumb zone), optional ghost above it
 * — the stack order Apple/M3 both give a sheet.
 */
export function BottomSheetFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-2 [&>*]:min-h-[48px] [&>*]:w-full', className)}>{children}</div>;
}

export default BottomSheet;
