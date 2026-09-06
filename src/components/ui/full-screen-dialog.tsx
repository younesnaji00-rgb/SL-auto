'use client';

/**
 * FullScreenDialog — the phone form of every multi-field task (research
 * docs/research/mobile-overlays-feedback.md §2; mobile-synthesis §3, §5).
 * Below `md`: 100 dvh, 56 px sticky header (« × » 44 px at the LEFT, `t-title`
 * 17 px truncated, the primary as a 44 px TEXT button at the RIGHT), body
 * `px-4 pb-24` single column, slide in from the right 300 ms / out 200 ms,
 * focus on the heading, platform back = « × ». On md and up it falls back to
 * the ordinary centred dialog at `max-w-2xl`, where the primary moves to a
 * right-aligned footer.
 *
 * Why the primary lives in the header and not in a bottom bar: every one of
 * these forms opens the keyboard, and a fixed-bottom bar under the iOS
 * keyboard is unreliable (Radix #2323 / #3078). On phones the primary is ALSO
 * repeated as a 48 px full-width button at the END of the body for the reader
 * who scrolled — both submit the same `form`.
 *
 * Anatomy, dirty guard and history binding all live in `DialogContent`
 * (`fullScreen`), so a page can equally opt in by adding `fullScreen` to a
 * dialog it already has. This wrapper is the shorthand for new call sites.
 *
 *   <FullScreenDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="Nouvelle planification"
 *     primary={{ label: 'Enregistrer', form: 'planif-form', loading: saving }}
 *     dirty={isDirty}
 *     onDiscard={reset}
 *   >
 *     <form id="planif-form" …>…</form>
 *   </FullScreenDialog>
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  type OverlayPrimaryAction,
} from '@/components/ui/dialog';

export type { OverlayPrimaryAction };

export interface FullScreenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** Plain-text title for assistive tech when `title` is not a string. */
  titleText?: string;
  primary?: OverlayPrimaryAction;
  /** Unsaved edits: « × » / Escape / scrim / back ask before closing. */
  dirty?: boolean;
  onDiscard?: () => void;
  /** Extra controls in the phone header, before the primary. */
  headerActions?: React.ReactNode;
  /** One-line subtitle under the title (also the a11y description). */
  description?: React.ReactNode;
  /** Replaces the title in the phone header (a search input, say). */
  headerContent?: React.ReactNode;
  /** Repeat the primary as a full-width button at the end of the body. */
  repeatPrimary?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}

export function FullScreenDialog({
  open,
  onOpenChange,
  title,
  titleText,
  primary,
  dirty,
  onDiscard,
  headerActions,
  description,
  headerContent,
  repeatPrimary = true,
  className,
  bodyClassName,
  children,
}: FullScreenDialogProps) {
  const label = titleText ?? (typeof title === 'string' ? title : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        fullScreen
        primary={primary}
        dirty={dirty}
        onDiscard={onDiscard}
        headerActions={headerActions}
        headerContent={headerContent}
        bodyClassName={bodyClassName}
        aria-label={label}
        className={cn('md:max-w-2xl', className)}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* Radix wants a description on every dialog; when the caller has no
              subtitle it is the title, announced once and painted never. */}
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{label ?? ''}</DialogDescription>
          )}
        </DialogHeader>

        {children}

        {primary && repeatPrimary && (
          // Phones: the primary again at the end of the body (synthesis §5)
          // for the reader who scrolled past the header.
          <div className="mt-2 md:hidden">
            <Button
              type={primary.form ? 'submit' : 'button'}
              form={primary.form}
              onClick={primary.onClick}
              disabled={primary.disabled}
              loading={primary.loading}
              className="h-12 w-full text-[15px] font-semibold"
            >
              {primary.label}
            </Button>
          </div>
        )}

        {primary && (
          // md and up: the centred dialog keeps a conventional footer action.
          <div className="hidden justify-end md:flex">
            <Button
              type={primary.form ? 'submit' : 'button'}
              form={primary.form}
              onClick={primary.onClick}
              disabled={primary.disabled}
              loading={primary.loading}
            >
              {primary.label}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FullScreenDialog;
