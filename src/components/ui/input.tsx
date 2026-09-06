import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Input — the one text field of the app.
 *
 * Sizing (mobile pass, docs/research/mobile-forms-inputs.md §2.1, density
 * §7): 40 px from `md` up, **48 px on phones** (`max-md:h-12`). 48 is the
 * Material/WCAG target floor and what the section edit sheets are laid out
 * for; the old per-call-site `h-8` / `h-9` overrides are gone.
 *
 * The 16 px TEXT below `lg` is NOT set here — `src/app/mobile.css` sets it
 * globally on `input, select, textarea` so a bare `<input>` gets it too.
 *
 * Keyboard / autofill attributes are not guessed here either: spread one of
 * the presets from `@/lib/input-attrs` (`INPUT_TEL`, `INPUT_NUMERIC`, …).
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Fields are flat (blueprint §3: the light rim is for buttons, not
          // inputs): solid card, hairline `input` border, accent focus ring.
          "flex h-10 max-md:h-12 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-ink shadow-none md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
