'use client';

/**
 * Toggletip — the touch-safe replacement for an explanatory tooltip (Heydon
 * Pickering, Inclusive Components "Tooltips & Toggletips"; NN/g: use tap-
 * triggered "popup tips" on touch; research docs/research/
 * mobile-overlays-feedback.md §4).
 *
 * A tooltip LABELS a control and appears on hover; a toggletip EXPLAINS
 * something and appears on click, at every breakpoint. Anatomy: a 24 px ghost
 * « i » button → `Popover` capped at 280 px with 13 px text, dismissed by an
 * outside tap, Escape or a second tap on the button. The content is ALSO
 * written into a `role="status"` live region so a screen reader hears it when
 * it opens — a `Popover` alone announces nothing on iOS VoiceOver.
 *
 * Rules that come with it (Heydon): never put a close button, a confirmation
 * or a link inside; never make a toggletip the only carrier of information a
 * user needs to finish the task.
 *
 *   <Toggletip label="Comment le délai est calculé">
 *     Le délai court à partir de la date d’assignation…
 *   </Toggletip>
 */

import * as React from 'react';
import { Info } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ToggletipProps {
  /** Accessible name of the « i » button — say what it explains. */
  label?: string;
  /** The explanation. Plain text or short inline markup, never a link. */
  children: React.ReactNode;
  side?: React.ComponentPropsWithoutRef<typeof PopoverContent>['side'];
  align?: React.ComponentPropsWithoutRef<typeof PopoverContent>['align'];
  className?: string;
  contentClassName?: string;
}

export function Toggletip({
  label = 'Plus d’informations',
  children,
  side = 'top',
  align = 'center',
  className,
  contentClassName,
}: ToggletipProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <span className="inline-flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={label}
            aria-expanded={open}
            className={cn(
              // 24 px visual, 44 px touch target via the negative-margin pad
              // (element-specs: never a 32 px control on touch).
              'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors',
              'hover:bg-surface-2 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'max-md:h-11 max-md:w-11 max-md:-my-2.5',
              className,
            )}
          >
            <Info className="h-4 w-4" aria-hidden="true" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side={side}
          align={align}
          className={cn(
            'w-auto max-w-[280px] p-3 text-[13px] leading-[1.45] text-ink',
            contentClassName,
          )}
        >
          {children}
        </PopoverContent>
      </Popover>
      {/* Live region: present in the DOM at all times, filled on open — the
          only way the explanation is announced (Heydon's toggletip). */}
      <span role="status" className="sr-only">
        {open ? children : null}
      </span>
    </span>
  );
}

export default Toggletip;
