'use client';

/**
 * MultiSelect — cmdk combobox on a mouse, a checkbox sheet on a coarse pointer.
 *
 * Touch shape (docs/research/mobile-forms-inputs.md §2.2, last paragraph):
 * "Multi-select → same sheet with checkboxes and a footer « Valider (n) »,
 * chips under the trigger." The desk version's affordances — type-to-filter
 * in the chip well, Backspace to remove the last chip — are keyboard idioms
 * with no touch equivalent, and the inline popover list under a field the
 * keyboard has just pushed up is the failure mode §2.2 is about.
 *
 * The batch footer is deliberate: a multi-select is a set, and applying each
 * tap immediately means the sheet closes-or-not on ambiguous intent. « Valider
 * (n) » (the FilterSheet's rule, B §4) commits the whole set; « × » discards.
 *
 * The API is unchanged (`options` / `selected` / `onChange`), so both call
 * sites (utilisateurs) keep working untouched.
 */

import * as React from 'react';
import { Check, ChevronDown, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Command as CommandPrimitive } from 'cmdk';
import { BottomSheet, BottomSheetFooter, useInBottomSheet } from '@/components/ui/bottom-sheet';
import { Button } from '@/components/ui/button';
import { useIsCoarsePointer } from '@/hooks/use-viewport-class';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

type Option = Record<'value' | 'label', string>;

export interface MultiSelectProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  /** Names the sheet and the trigger. */
  'aria-label'?: string;
  placeholder?: string;
  [key: string]: any;
}

/* ------------------------------------------------------------------ */
/* Touch: trigger + chips + a checkbox sheet with a « Valider (n) »     */
/* ------------------------------------------------------------------ */

function TouchMultiSelect({
  options,
  selected,
  onChange,
  className,
  label,
  placeholder,
  insideSheet,
}: {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  label: string;
  placeholder: string;
  insideSheet: boolean;
}) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string[]>(selected);

  React.useEffect(() => {
    if (open) setPending(selected);
  }, [open, selected]);

  const toggle = (value: string) =>
    setPending((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const labelOf = (value: string) => options.find((o) => o.value === value)?.label ?? value;

  // Depth budget: never a sheet on a sheet. Inside one, the list is inline —
  // a multi-select has no single-tap-and-close moment to lose.
  if (insideSheet) {
    return (
      <div className={cn('rounded-md border border-input bg-card', className)} role="group" aria-label={label}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <label
              key={o.value}
              className="flex min-h-12 cursor-pointer items-center gap-3 border-b border-hairline px-3 last:border-b-0"
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? selected.filter((v) => v !== o.value) : [...selected, o.value])}
                className="h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
              />
              <span className="t-body min-w-0 flex-1 break-words">{o.label}</span>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className="flex h-12 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-left text-base text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={cn('min-w-0 flex-1 truncate', selected.length === 0 && 'text-ink-3')}>
          {selected.length === 0
            ? placeholder
            : `${selected.length} ${selected.length > 1 ? t('sélectionnés') : t('sélectionné')}`}
        </span>
        <ChevronDown aria-hidden className="h-4 w-4 shrink-0 text-ink-3" />
      </button>

      {/* Chips UNDER the trigger (§2.2): each one removable at 24 px min. */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <Badge key={value} variant="neutral" data-filter-chip="">
              {labelOf(value)}
              <button
                type="button"
                aria-label={`${t('Retirer')} ${labelOf(value)}`}
                onClick={() => onChange(selected.filter((v) => v !== value))}
                className="ml-1 inline-flex items-center justify-center rounded-full text-ink-3 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <BottomSheet
        open={open}
        onOpenChange={setOpen}
        title={label}
        detent={options.length > 6 ? 'tall' : 'default'}
        flush
        footer={
          <BottomSheetFooter>
            <Button
              type="button"
              onClick={() => {
                onChange(pending);
                setOpen(false);
              }}
            >
              {t('Valider')} ({pending.length})
            </Button>
          </BottomSheetFooter>
        }
      >
        <div role="listbox" aria-multiselectable aria-label={label}>
          {options.map((o) => {
            const on = pending.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => toggle(o.value)}
                className={cn(
                  'flex min-h-12 w-full items-center gap-3 border-b border-hairline px-4 py-2 text-left last:border-b-0',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  on ? 'bg-accent text-accent-foreground' : 'hover:bg-surface-2',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border',
                    on ? 'border-primary bg-primary text-primary-foreground' : 'border-hairline-strong',
                  )}
                >
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
                </span>
                <span className="t-body min-w-0 flex-1 break-words">{o.label}</span>
              </button>
            );
          })}
          {options.length === 0 && (
            <p className="t-caption px-4 py-6 text-center">{t('Aucune option disponible')}</p>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  ...props
}: MultiSelectProps) {
  const t = useT();
  const coarse = useIsCoarsePointer();
  const insideSheet = useInBottomSheet();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const handleUnselect = React.useCallback(
    (optionValue: string) => {
      onChange(selected.filter(s => s !== optionValue));
    },
    [onChange, selected]
  );

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (input) {
        if (e.key === 'Delete' || e.key === 'Backspace') {
          if (input.value === '' && selected.length > 0) {
            const newSelected = [...selected];
            newSelected.pop();
            onChange(newSelected);
          }
        }
        if (e.key === 'Escape') {
          input.blur();
        }
      }
    },
    [onChange, selected]
  );

  const selectables = options.filter(
    option => !selected.includes(option.value)
  );

  const placeholder = (props.placeholder as string) || t('Sélectionner…');

  if (coarse) {
    return (
      <TouchMultiSelect
        options={options}
        selected={selected}
        onChange={onChange}
        className={className}
        label={(props['aria-label'] as string) || placeholder}
        placeholder={placeholder}
        insideSheet={insideSheet}
      />
    );
  }

  return (
    <Command
      onKeyDown={handleKeyDown}
      className={cn('overflow-visible bg-transparent', className)}
    >
      {/* Flat field like Input (solid card, hairline, no rim). */}
      <div className="group min-h-10 rounded-md border border-input bg-card px-3 py-2 text-sm text-ink ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <div className="flex flex-wrap gap-1">
          {selected.map(value => {
            const option = options.find(o => o.value === value);
            return (
              <Badge key={value} variant="neutral">
                {option?.label}
                <button
                  type="button"
                  aria-label={`${t('Retirer')} ${option?.label ?? value}`}
                  className="ml-1 rounded-full outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleUnselect(value);
                    }
                  }}
                  onMouseDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={() => handleUnselect(value)}
                >
                  <X className="h-3 w-3 text-ink-3 hover:text-ink" />
                </button>
              </Badge>
            );
          })}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setOpen(false)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-ink-3"
            {...props}
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && selectables.length > 0 ? (
          <div className="absolute top-0 z-10 w-full glass-strong rounded-md text-popover-foreground outline-none animate-in fade-in-0 duration-150 ease-enter motion-reduce:animate-none">
            <CommandList>
              <CommandGroup className="h-full max-h-60 overflow-auto">
                {selectables.map(option => {
                  return (
                    <CommandItem
                      key={option.value}
                      onMouseDown={e => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onSelect={() => {
                        setInputValue('');
                        onChange([...selected, option.value]);
                      }}
                      className={'cursor-pointer'}
                    >
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </div>
        ) : null}
      </div>
    </Command>
  );
}
