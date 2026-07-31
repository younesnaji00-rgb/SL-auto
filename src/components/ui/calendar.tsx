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
  format,
  addDays,
  addMonths,
  subMonths,
} from "date-fns"
import { dateFnsLocale, useLocale } from "@/i18n"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  initialFocus?: boolean
  className?: string
  disabled?: (date: Date) => boolean
}

function Calendar({
  selected,
  onSelect,
  className,
  disabled,
}: CalendarProps) {
  const { locale } = useLocale()
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
    <div className={cn("p-4 w-[280px]", className)}>
      {/* Header: navigation + month label */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={handlePrevMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground transition-colors"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold capitalize">
          {format(currentMonth, "MMMM yyyy", { locale: dateFnsLocale() })}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className={cn(
            buttonVariants({ variant: "outline" }),
            "h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground transition-colors"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground uppercase tracking-wide py-2"
          >
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

          return (
            <div key={day.toISOString()} className="p-0.5">
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={isDisabled}
                className={cn(
                  "h-9 w-full rounded-md text-sm font-normal transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !isCurrentMonth && "text-muted-foreground/40",
                  isCurrentMonth && "text-foreground",
                  isDayToday && !isSelected && "bg-accent text-accent-foreground font-semibold border border-primary/30",
                  isSelected && "bg-primary text-primary-foreground font-semibold hover:bg-primary/90 hover:text-primary-foreground shadow-sm",
                  isDisabled && "opacity-40 cursor-not-allowed hover:bg-transparent"
                )}
              >
                {format(day, "d")}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
