'use client';

import * as React from 'react';

import {cn} from '@/lib/utils';

/**
 * Textarea — auto-growing, 2 rows → 6 rows.
 *
 * docs/research/mobile-forms-inputs.md §2.7: "textarea 2 → 6 rows
 * (`field-sizing: content` + JS fallback)". A fixed 80 px box on a phone
 * either wastes a third of the screen (empty observation) or hides what the
 * user typed (long one). It starts at `minRows` and grows with the content up
 * to `maxRows`, then scrolls.
 *
 * `field-sizing: content` is only in Chromium 123+, so the JS path is the
 * real implementation: measure `scrollHeight` on every change (and on the
 * value changing from outside, e.g. a preset chip filling the field) and set
 * an explicit height clamped between the two row bounds. The measurement
 * resets `height` to `auto` first, otherwise `scrollHeight` never shrinks.
 *
 * `autoGrow={false}` opts out (a resizable desk-only editor pane).
 */

export interface TextareaProps extends React.ComponentProps<'textarea'> {
  /** Grow with the content between `minRows` and `maxRows` (default true). */
  autoGrow?: boolean;
  /** Height at rest. Default 2 (the phone spec). */
  minRows?: number;
  /** Height at which it stops growing and starts scrolling. Default 6. */
  maxRows?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({className, autoGrow = true, minRows = 2, maxRows = 6, rows, onChange, style, ...props}, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const setRefs = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      },
      [ref],
    );

    const resize = React.useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoGrow) return;
      const cs = window.getComputedStyle(el);
      const line = parseFloat(cs.lineHeight) || 20;
      const pad =
        parseFloat(cs.paddingTop) +
        parseFloat(cs.paddingBottom) +
        parseFloat(cs.borderTopWidth) +
        parseFloat(cs.borderBottomWidth);
      const min = line * minRows + pad;
      const max = line * maxRows + pad;
      el.style.height = 'auto';
      const next = Math.min(max, Math.max(min, el.scrollHeight));
      el.style.height = `${next}px`;
      el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
    }, [autoGrow, minRows, maxRows]);

    // Re-measure when the value changes from outside (reset, preset chip,
    // draft restore) as well as on every keystroke.
    React.useLayoutEffect(resize, [resize, props.value, props.defaultValue]);

    return (
      <textarea
        className={cn(
          // Flat field like Input: solid card, hairline border, no rim.
          'flex w-full rounded-md border border-input bg-card px-3 py-2 text-base text-ink shadow-none ring-offset-background placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive',
          // Chromium 123+ does this natively; the JS below covers everyone
          // else and simply agrees with it.
          autoGrow ? '[field-sizing:content] resize-none' : 'min-h-[80px]',
          className,
        )}
        rows={rows ?? (autoGrow ? minRows : undefined)}
        onChange={(e) => {
          onChange?.(e);
          resize();
        }}
        ref={setRefs}
        {...props}
        style={autoGrow ? {minHeight: `calc(${minRows} * 1.5em + 1rem)`, ...style} : style}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export {Textarea};
