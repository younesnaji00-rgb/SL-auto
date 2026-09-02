import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * IconChip — the app's warm anchor (owner ruling 2026-09-02: terracotta is
 * the second voice, "anchors only": date blocks, small icon chips beside
 * section titles, one featured tile per page, one chart series).
 * Sources: NN/g visual hierarchy ("it's not the actual color of an element
 * that creates the hierarchy, but the contrast in value and saturation" — a
 * small saturated anchor beside a quiet title guides the scan), Stripe
 * (accent dots/tinted pills carry colour in non-button places so the single
 * CTA colour keeps its job), blueprint §1 third-colour contract (never on
 * actions, never near status/destructive UI).
 * Anatomy: 28 px rounded-md tinted square + 16 px icon + light rim. The
 * `tertiary` tone is the default; `accent` exists for the rare teal-tinted
 * chip (e.g. beside the page's primary section when terracotta is already
 * spent on this screen). Decorative: always `aria-hidden` unless it carries
 * meaning on its own.
 */
export function IconChip({
  tone = "tertiary",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: "tertiary" | "accent" | "neutral" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md shadow-rim [&_svg]:h-4 [&_svg]:w-4",
        tone === "tertiary" && "bg-tertiary-bg text-tertiary-deep",
        tone === "accent" && "bg-accent text-accent-foreground",
        tone === "neutral" && "bg-surface-3 text-ink-2",
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
