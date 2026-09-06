'use client';

/**
 * DateField — one typed, masked date input for dates the user ALREADY KNOWS.
 *
 * Research: docs/research/mobile-forms-inputs.md §2.3. Three findings collide
 * and this is where they land:
 *   • NN/g date input — calendars are "for events close to the present time —
 *     within less than a year"; on mobile "Scrolling in a small space is slow
 *     and unproductive; it's better to allow users to type the date directly".
 *   • GOV.UK date input — for "a date they'll already know, or can look up
 *     without using a calendar", `inputmode="numeric"`.
 *   • Baymard — on mobile "avoid splitting single input entities"; their
 *     3-field date "required 11 separate actions".
 * So: ONE field (not GOV.UK's three), numeric keypad, slashes inserted as the
 * user types, `JJ/MM/AAAA` as the format cue placeholder (element-specs §9
 * allows a placeholder ONLY as a format cue), and a 44 px calendar button at
 * the trailing edge for the rare "which Tuesday was that?" case — it opens the
 * same sheet the near-horizon picker uses, never a popover.
 *
 * Validation follows §2.6: nothing while typing, then on blur once the value
 * has reached its full 10 characters (Baymard's "after reaching correct
 * character length" carve-out). A half-typed date is not an error yet.
 *
 * Used for: date sinistre, date requête, mise en circulation, dates de permis
 * — anything that is looked up from paper rather than chosen from a month.
 */

import * as React from 'react';
import { CalendarDays } from 'lucide-react';
import { addDays, addWeeks, format, isValid, parse, startOfDay, startOfWeek } from 'date-fns';

import { cn } from '@/lib/utils';
import { dateFnsLocale, useT } from '@/i18n';
import { Calendar } from '@/components/ui/calendar';
import { BottomSheet } from '@/components/ui/bottom-sheet';

export const DATE_MASK = 'JJ/MM/AAAA';
const PATTERN = 'dd/MM/yyyy';

/** Digits in, `JJ/MM/AAAA` out — no trailing slash, so backspace works. */
export function maskDate(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** `31/02/2020` → null (date-fns `parse` rejects impossible days). */
export function parseDateMask(text: string): Date | null {
  if (text.length !== 10) return null;
  const d = parse(text, PATTERN, new Date());
  if (!isValid(d)) return null;
  // Guard against a 2-digit year silently becoming 0012.
  return format(d, PATTERN) === text ? d : null;
}

/* ------------------------------------------------------------------ */
/* The shared sheet calendar (also used by DatePicker's `near` horizon) */
/* ------------------------------------------------------------------ */

export interface DateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value?: Date | null;
  onSelect: (date: Date) => void;
  disabledDates?: (date: Date) => boolean;
  /** Show « Aujourd'hui · Demain · Lundi prochain » above the grid. */
  quickChips?: boolean;
  /** Offer the typed fallback inside the sheet (« Saisir la date »). */
  allowTyping?: boolean;
}

/**
 * The phone date picker: a `BottomSheet` holding the 44 px-cell calendar,
 * three relative-date chips (NN/g: the near-horizon cases people actually
 * pick) and a typed fallback. Never a popover — a popover anchored to a
 * trigger the keyboard has moved lands off-screen (§2.3).
 */
export function DateSheet({
  open,
  onOpenChange,
  title,
  value,
  onSelect,
  disabledDates,
  quickChips = true,
  allowTyping = true,
}: DateSheetProps) {
  const t = useT();
  const [typing, setTyping] = React.useState(false);
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setTyping(false);
      setError(null);
      return;
    }
    setText(value ? format(value, PATTERN) : '');
  }, [open, value]);

  const today = startOfDay(new Date());
  const chips: { label: string; date: Date }[] = [
    { label: t("Aujourd'hui"), date: today },
    { label: t('Demain'), date: addDays(today, 1) },
    { label: t('Lundi prochain'), date: startOfWeek(addWeeks(today, 1), { weekStartsOn: 1 }) },
  ];

  const commit = (d: Date) => {
    onSelect(d);
    onOpenChange(false);
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} detent="tall">
      {quickChips && !typing && (
        <div className="flex flex-wrap gap-2 pb-3 pt-1">
          {chips.map((c) => (
            <button
              key={c.label}
              type="button"
              disabled={disabledDates?.(c.date)}
              onClick={() => commit(c.date)}
              className="inline-flex min-h-11 items-center rounded-full border border-hairline-strong bg-card px-4 text-[14px] font-medium text-ink shadow-rim transition-colors hover:bg-surface-2 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {typing ? (
        <div className="space-y-2 py-2">
          <label htmlFor="date-sheet-typed" className="t-label block">
            {t('Date')} ({DATE_MASK})
          </label>
          <input
            id="date-sheet-typed"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
            placeholder={DATE_MASK}
            value={text}
            aria-invalid={!!error}
            onChange={(e) => {
              setText(maskDate(e.target.value));
              if (error) setError(null);
            }}
            className="h-12 w-full rounded-md border border-input bg-card px-3 text-base tabular-nums text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[invalid=true]:border-destructive"
          />
          {error && <p className="text-[13px] text-status-danger-fg">{error}</p>}
          <button
            type="button"
            onClick={() => {
              const d = parseDateMask(text);
              if (!d) {
                setError(text.length < 10 ? t('Date incomplète.') : t('Date invalide.'));
                return;
              }
              commit(d);
            }}
            className="min-h-12 w-full rounded-md bg-primary text-[15px] font-semibold text-primary-foreground shadow-rim-filled"
          >
            {t('Valider')}
          </button>
        </div>
      ) : (
        <div className="flex justify-center pb-2">
          <Calendar size="touch" selected={value ?? undefined} onSelect={(d) => d && commit(d)} disabled={disabledDates} />
        </div>
      )}

      {allowTyping && (
        <button
          type="button"
          onClick={() => setTyping((v) => !v)}
          className="mb-2 min-h-11 w-full rounded-md text-[14px] font-semibold text-primary hover:bg-surface-2"
        >
          {typing ? t('Choisir dans le calendrier') : t('Saisir la date')}
        </button>
      )}
    </BottomSheet>
  );
}

/* ------------------------------------------------------------------ */
/* DateField                                                           */
/* ------------------------------------------------------------------ */

export interface DateFieldProps {
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  disabled?: boolean;
  disabledDates?: (date: Date) => boolean;
  /** Names the field for the sheet title and assistive tech. */
  label?: string;
  id?: string;
  className?: string;
  /** Extra attributes forwarded to the input (data-tour, aria-describedby…). */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

export function DateField({
  value,
  onChange,
  disabled,
  disabledDates,
  label,
  id,
  className,
  inputProps,
}: DateFieldProps) {
  const t = useT();
  const [text, setText] = React.useState(() => (value ? format(value, PATTERN) : ''));
  const [error, setError] = React.useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const lastPushed = React.useRef<string>(value ? format(value, PATTERN) : '');

  // Re-sync when the value changes from outside (draft restore, AI pre-fill,
  // the sheet) — but never while the user is mid-keystroke on the same value.
  React.useEffect(() => {
    const next = value ? format(value, PATTERN) : '';
    if (next !== lastPushed.current) {
      lastPushed.current = next;
      setText(next);
      setError(null);
    }
  }, [value]);

  const push = (d: Date | null) => {
    lastPushed.current = d ? format(d, PATTERN) : '';
    onChange?.(d);
  };

  const title = label ?? t('Choisir une date');

  return (
    <div className={cn('relative', className)}>
      <input
        {...inputProps}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={inputProps?.['aria-label'] ?? label}
        aria-invalid={!!error || undefined}
        aria-describedby={error && id ? `${id}-error` : inputProps?.['aria-describedby']}
        disabled={disabled}
        placeholder={DATE_MASK}
        value={text}
        onChange={(e) => {
          const next = maskDate(e.target.value);
          setText(next);
          if (error) setError(null);
          // Clearing the field clears the value; a complete date commits as
          // soon as it parses (rewarding early — Vitaly Friedman).
          if (next === '') push(null);
          else {
            const d = parseDateMask(next);
            if (d && !(disabledDates?.(d) ?? false)) push(d);
          }
        }}
        onBlur={(e) => {
          inputProps?.onBlur?.(e);
          // §2.6: format fields validate on blur, once the value is plausible
          // (10 characters). A half-typed date is not an error yet.
          if (text.length === 0) {
            setError(null);
            return;
          }
          if (text.length < 10) {
            setError(t('Date incomplète — format JJ/MM/AAAA.'));
            return;
          }
          const d = parseDateMask(text);
          if (!d) {
            setError(t('Date invalide — format JJ/MM/AAAA.'));
            return;
          }
          if (disabledDates?.(d)) {
            setError(t('Date non autorisée.'));
            return;
          }
          setError(null);
          push(d);
        }}
        className={cn(
          // Same field anatomy as Input, plus room for the trailing button.
          'flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 pr-12 text-base tabular-nums text-ink shadow-none ring-offset-background placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'max-md:h-12',
          error && 'border-destructive focus-visible:ring-destructive',
        )}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => setSheetOpen(true)}
        aria-label={`${t('Ouvrir le calendrier')} — ${title}`}
        className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-md text-ink-3 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
      >
        <CalendarDays className="h-4 w-4" aria-hidden />
      </button>

      {error && (
        <p id={id ? `${id}-error` : undefined} className="mt-1 text-[13px] text-status-danger-fg">
          {error}
        </p>
      )}

      <DateSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={title}
        value={value}
        disabledDates={disabledDates}
        quickChips={false}
        allowTyping={false}
        onSelect={(d) => {
          setText(format(d, PATTERN, { locale: dateFnsLocale() }));
          setError(null);
          push(d);
        }}
      />
    </div>
  );
}

export default DateField;
