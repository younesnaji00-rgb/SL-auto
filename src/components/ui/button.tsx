import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Accent budget (DESIGN.md §10): only `default` carries teal. Outline /
  // secondary / ghost hover on neutral surface steps, never on the accent tint.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow,transform] duration-150 motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-rim-filled hover:brightness-[1.06] active:brightness-[0.94]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-rim-filled hover:brightness-[1.06] active:brightness-[0.94]",
        outline:
          "bg-card text-ink shadow-rim hover:bg-surface-2 hover:text-ink",
        secondary:
          "bg-surface-2 text-ink shadow-rim hover:bg-surface-3",
        // Material 3 "filled tonal": the strongest control inside a section
        // that is not THE page primary (accent tint, dark-teal text).
        // Hover/press via brightness like the filled variants (element-specs
        // §8) — an `/80` alpha would let the page background bleed through
        // and change the tint per surface.
        tonal: "bg-accent text-accent-foreground shadow-rim hover:brightness-[1.06] active:brightness-[0.94]",
        ghost: "text-ink-2 shadow-rim hover:bg-surface-3 hover:text-ink",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Touch targets (mobile pass 2026-09-06): a finger pad is ~9 mm, so
        // nothing tappable is under 44 px on a phone (Apple 44 pt, WCAG 2.5.5,
        // web.dev 48 dp). Desktop sizes are unchanged — only the phone floor
        // is raised, via `max-md:`.
        default: "h-10 px-4 py-2 max-md:min-h-11",
        sm: "h-9 rounded-md px-3 max-md:min-h-11",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10 max-md:h-11 max-md:w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : null}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
