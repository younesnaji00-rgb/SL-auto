'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { dateFnsLocale, useT } from '@/i18n';

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

function DatePickerButton({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const selected = value ? new Date(value) : undefined;

  // The clear-X cannot live inside the trigger Button: nested interactive
  // elements are invalid HTML and Radix opens the Popover on pointerDown,
  // so a click handler on a nested element races the trigger and loses.
  // We render the X as an adjacent sibling — fully separate from the
  // trigger in the DOM, no overlay/stacking trickery required.
  return (
    <div className="inline-flex items-center">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'h-9 justify-start text-left font-normal',
              value ? 'w-[130px] rounded-r-none' : 'w-[150px]',
              !value && 'text-ink-3'
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 text-ink-3" />
            {value ? format(new Date(value), 'dd MMM yyyy', { locale: dateFnsLocale() }) : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) {
                const yyyy = date.getFullYear();
                const mm = String(date.getMonth() + 1).padStart(2, '0');
                const dd = String(date.getDate()).padStart(2, '0');
                onChange(`${yyyy}-${mm}-${dd}`);
              } else {
                onChange('');
              }
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          aria-label={t('Effacer la date')}
          onClick={() => onChange('')}
          className="flex h-9 w-7 shrink-0 items-center justify-center rounded-r-md bg-card text-ink-3 shadow-rim transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/**
 * Mobile pass 2026-09-06 (mobile-synthesis §5): a popover calendar is a
 * fine-pointer control. Below md the same two values are edited with NATIVE
 * `<input type="date">` fields — 48 px, 16 px text, two columns — so the OS
 * picker does the work and nothing opens on top of a bottom sheet.
 */
function NativeDateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="t-label">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-md border border-input bg-card px-3 text-[16px] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}

export function DateRangeFilter({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DateRangeFilterProps) {
  const t = useT();
  return (
    <>
      <div className="flex items-center gap-2 max-md:hidden">
        <span className="t-label whitespace-nowrap">{t('Du')}</span>
        <DatePickerButton value={dateFrom} onChange={onDateFromChange} placeholder={t('Début')} />
        <span className="t-label whitespace-nowrap">{t('Au')}</span>
        <DatePickerButton value={dateTo} onChange={onDateToChange} placeholder={t('Fin')} />
      </div>
      <div className="flex w-full items-end gap-3 md:hidden">
        <NativeDateField label={t('Du')} value={dateFrom} onChange={onDateFromChange} />
        <NativeDateField label={t('Au')} value={dateTo} onChange={onDateToChange} />
      </div>
    </>
  );
}
