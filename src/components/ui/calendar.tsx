"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  isWeekend,
  format,
  addDays,
  addMonths,
  subMonths,
} from "date-fns"
import { dateFnsLocale, useLocale, useT } from "@/i18n"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  initialFocus?: boolean
  className?: string
  disabled?: (date: Date) => boolean
  /**
   * `touch` = the sheet calendar of a phone (docs/research/
   * mobile-forms-inputs.md §2.3): 7 × 44 px cells in a 320–360 px grid, so a
   * thumb hits the right day. `default` keeps the 280 px / 40 px popover grid
   * a mouse aims at.
   */
  size?: "default" | "touch"
}

function Calendar({
  selected,
  onSelect,
  className,
  disabled,
  size = "default",
}: CalendarProps) {
  const touch = size === "touch"
  const { locale } = useLocale()
  const t = useT()
  const weekdays = React.useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    return Array.from({ length: 7 }, (_, i) =>
      format(addDays(weekStart, i), "EEEEEE", { locale: dateFnsLocale() })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale])
  const [currentMonth, setCurrentMonth] = React.useState(
    selected ? startOfMonth(selected) : startOfMonth(new Date())
  )

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const handlePrevMonth = () => setCurrentMonth(prev => subMonths(prev, 1))
  const handleNextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))

  const handleDayClick = (day: Date) => {
    if (disabled?.(day)) return
    onSelect?.(day)
  }

  return (
    // 7 × 40 px cells (element-specs §17 / Material 3 date picker: 40–48 dp
    // day cells; NN/g date input: show today, spell the month out).
    <div className={cn(touch ? "w-full max-w-[360px] p-3" : "w-[280px] p-4", className)}>
      {/* Header: month spelled out (t-heading) at the left, ‹ › ghost icon
          buttons at the right end. */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="t-heading capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: dateFnsLocale() })}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label={t("Mois précédent")}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), touch ? "h-11 w-11" : "h-8 w-8")}
          >
            <ChevronLeft className={touch ? "h-5 w-5" : "h-4 w-4"} />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            aria-label={t("Mois suivant")}
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }), touch ? "h-11 w-11" : "h-8 w-8")}
          >
            <ChevronRight className={touch ? "h-5 w-5" : "h-4 w-4"} />
          </button>
        </div>
      </div>

      {/* Weekday headers — t-label, sentence case (never uppercase).
          Labels come from the active date-fns locale (EN/FR). */}
      <div className="mb-1 grid grid-cols-7">
        {weekdays.map((day) => (
          <div key={day} className="t-label py-2 text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const isSelected = selected ? isSameDay(day, selected) : false
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isDayToday = isToday(day)
          const isDisabled = disabled?.(day) ?? false
          const isWeekendDay = isWeekend(day)

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => handleDayClick(day)}
              disabled={isDisabled}
              className={cn(
                // Day cell 40 px, t-body-sm tabular; today = 1 px primary
                // ring; selected = accent pair (the one accent use);
                // weekends ink-3, other-month days ink-4; hover on the
                // surface ladder. No palette colours, no terracotta.
                touch
                  ? "h-11 w-full rounded-md text-[15px] font-normal tabular-nums transition-colors"
                  : "h-10 w-full rounded-md text-[13px] font-normal tabular-nums transition-colors",
                "hover:bg-surface-3 hover:text-ink",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !isCurrentMonth && "text-ink-4",
                isCurrentMonth && (isWeekendDay ? "text-ink-3" : "text-ink"),
                isDayToday && !isSelected && "font-semibold ring-1 ring-inset ring-primary",
                isSelected && "bg-accent font-semibold text-accent-foreground shadow-rim hover:bg-accent hover:text-accent-foreground",
                isDisabled && "cursor-not-allowed opacity-40 hover:bg-transparent"
              )}
            >
              {format(day, "d")}
            </button>
          )
        })}
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
