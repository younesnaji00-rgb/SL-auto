"use client"

/**
 * DatePicker — popover calendar on a mouse, one of two touch controls chosen
 * by the date's HORIZON.
 *
 * docs/research/mobile-forms-inputs.md §2.3 resolves NN/g ("calendars for
 * events close to the present time — within less than a year"; on mobile
 * "it's better to allow users to type the date directly"), GOV.UK (typed
 * numeric input for "a date they'll already know") and Baymard ("avoid
 * splitting single input entities") into two controls, not one:
 *
 *   horizon="near"  RDV, relance, échéance — within ±1 year, and the user is
 *                   CHOOSING it. Coarse pointer → a `DateSheet`: 44 px cells,
 *                   month spelled, today ringed, chips « Aujourd'hui ·
 *                   Demain · Lundi prochain ».
 *   horizon="far"   (default) date sinistre, date requête, mise en
 *                   circulation, permis — already known, often years old, and
 *                   the user is COPYING it off a paper mission. Coarse
 *                   pointer → a `DateField`: one masked JJ/MM/AAAA input with
 *                   a numeric keypad and a 44 px calendar button.
 *
 * Fine pointers are unchanged at either horizon: the popover calendar a mouse
 * aims at is fine, and nobody types a date faster than they click one when the
 * grid is already open.
 */

import * as React from "react"
import { format } from "date-fns"
import { dateFnsLocale, useT } from "@/i18n"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { DateField, DateSheet } from "@/components/ui/date-field"
import { useIsCoarsePointer } from "@/hooks/use-viewport-class"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export type DateHorizon = "near" | "far"

interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  disabledDates?: (date: Date) => boolean
  className?: string
  /**
   * How far from today this date usually is. `near` = a date being chosen
   * (RDV, relance, échéance) → sheet calendar on touch. `far` = a date being
   * copied from a document → typed masked field on touch. Default `far`.
   */
  horizon?: DateHorizon
  /** Names the field for the sheet title and assistive tech. */
  label?: string
  id?: string
  /** Forwarded to the trigger / input (data-tour, aria-describedby…). */
  triggerProps?: Record<string, unknown>
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Choisir une date",
  disabled = false,
  disabledDates,
  className,
  horizon = "far",
  label,
  id,
  triggerProps,
}: DatePickerProps) {
  const t = useT()
  const [open, setOpen] = React.useState(false)
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const coarse = useIsCoarsePointer()

  const title = label ?? t(placeholder)

  // ── Touch, far horizon: type it. ────────────────────────────────────
  if (coarse && horizon === "far") {
    return (
      <DateField
        value={value}
        onChange={onChange}
        disabled={disabled}
        disabledDates={disabledDates}
        label={title}
        id={id}
        className={className}
        inputProps={triggerProps as React.InputHTMLAttributes<HTMLInputElement>}
      />
    )
  }

  // ── Touch, near horizon: pick it in a sheet. ────────────────────────
  if (coarse && horizon === "near") {
    return (
      <>
        <button
          type="button"
          id={id}
          {...(triggerProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          aria-label={title}
          onClick={() => setSheetOpen(true)}
          className={cn(
            "flex h-12 w-full min-w-0 items-center gap-2 rounded-md border border-input bg-card px-3 text-left text-base text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-ink-3",
            className,
          )}
        >
          <CalendarIcon className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
          <span className="truncate">
            {value ? format(value, "dd MMMM yyyy", { locale: dateFnsLocale() }) : t(placeholder)}
          </span>
        </button>
        <DateSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={title}
          value={value}
          disabledDates={disabledDates}
          onSelect={(d) => onChange?.(d)}
        />
      </>
    )
  }

  // ── Mouse: unchanged popover calendar. ──────────────────────────────
  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          id={id}
          disabled={disabled}
          {...(triggerProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}
          className={cn(
            // Reads as a field, not a button (element-specs §9 / §17): 40 px,
            // flat, hairline `input` border, solid card, no rim, no hover tint.
            "h-10 max-md:h-12 w-full min-w-0 justify-start border border-input bg-card px-3 text-left font-normal shadow-none hover:bg-card",
            !value && "text-ink-3",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-ink-3" />
          <span className="truncate">
            {value
              ? format(value, "dd MMMM yyyy", { locale: dateFnsLocale() })
              : t(placeholder)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        // PopoverContent already is `glass-strong` — no extra border/shadow.
        className="z-[9999] w-auto p-0"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Calendar
          selected={value || undefined}
          onSelect={(date) => {
            onChange?.(date || null)
            setOpen(false)
          }}
          disabled={disabledDates}
        />
      </PopoverContent>
    </Popover>
  )
}
