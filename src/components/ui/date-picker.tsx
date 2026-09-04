"use client"

import * as React from "react"
import { format } from "date-fns"
import { dateFnsLocale, useT } from "@/i18n"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: Date | null
  onChange?: (date: Date | null) => void
  placeholder?: string
  disabled?: boolean
  disabledDates?: (date: Date) => boolean
  className?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Choisir une date",
  disabled = false,
  disabledDates,
  className,
}: DatePickerProps) {
  const t = useT()
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen} modal={true}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            // Reads as a field, not a button (element-specs §9 / §17): 40 px,
            // flat, hairline `input` border, solid card, no rim, no hover tint.
            "h-10 w-full min-w-0 justify-start border border-input bg-card px-3 text-left font-normal shadow-none hover:bg-card",
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
