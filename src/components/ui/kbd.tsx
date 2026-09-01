import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Keyboard-key chip used in tooltips, menus and the shortcuts sheet:
 * surface-2 keycap, 11 px mono ink-2, a hairline bottom edge as the key's lip.
 */
export function Kbd({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-[1.25rem] select-none items-center justify-center rounded-[4px] border-b border-hairline-strong bg-surface-2 px-1.5 font-mono text-[11px] font-medium tabular-nums text-ink-2',
        className,
      )}
      {...props}
    />
  );
}

/** Renders a `keys` spec ("mod+k", "g d") as a row of <Kbd> chips. */
export function KbdKeys({ parts, className }: { parts: string[]; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-[11px] text-ink-3">puis</span>}
          <Kbd>{p}</Kbd>
        </React.Fragment>
      ))}
    </span>
  );
}
