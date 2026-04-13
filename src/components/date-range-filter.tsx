'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
}

function DatePickerButton({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = React.useState(false);
  const selected = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[150px] h-9 justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5" />
          {value ? format(new Date(value), 'dd MMM yyyy', { locale: fr }) : <span>{placeholder}</span>}
          {value && (
            <X
              className="ml-auto h-3.5 w-3.5 opacity-50 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
            />
          )}
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
  );
}

export function DateRangeFilter({ dateFrom, dateTo, onDateFromChange, onDateToChange }: DateRangeFilterProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground whitespace-nowrap">Du</span>
      <DatePickerButton value={dateFrom} onChange={onDateFromChange} placeholder="Début" />
      <span className="text-sm text-muted-foreground whitespace-nowrap">Au</span>
      <DatePickerButton value={dateTo} onChange={onDateToChange} placeholder="Fin" />
    </div>
  );
}
