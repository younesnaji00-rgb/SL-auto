import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Fields are flat (blueprint §3: the light rim is for buttons, not
          // inputs): solid card, hairline `input` border, 40 px, 14 px text
          // (16 px below md so iOS doesn't zoom), accent focus ring.
          "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-ink shadow-none md:text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive",
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
