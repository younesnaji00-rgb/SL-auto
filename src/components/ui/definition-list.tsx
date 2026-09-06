'use client';

/**
 * DefinitionList — the read-only record on a phone.
 *
 * Research: docs/research/mobile-forms-inputs.md §2.9, on top of the locked
 * summary-list spec (element-specs §10, GOV.UK "a list of key facts… key,
 * value, optional actions"; Refactoring UI "labels are the last thing to
 * emphasise").
 *
 * The rule this component exists to enforce: **never a 2-column `dl` at
 * 390 px.** Two columns of key/value pairs on a phone is the multi-column
 * failure Baymard measured on forms — the eye pairs a label with the wrong
 * value across the gutter. So one column, key `t-label` 12 px above its value
 * 15/600, 12 px between pairs, values that WRAP (a `title` tooltip on a
 * truncated value is dead on touch).
 *
 * A value that is reachable is rendered as the action: a téléphone dials
 * (`tel:`), an email composes (`mailto:`), an adresse opens the maps app —
 * Smashing "leverage device features"; the field agent standing next to the
 * car should not have to copy a number out. A plate is `t-mono` because that
 * is how it is compared (plate-match.ts). Empty is « — » in `ink-3`, never a
 * fabricated value (element-specs §10).
 *
 *     <DefinitionList
 *       items={[
 *         { label: 'Assuré',       value: 'Nom Prénom' },
 *         { label: 'Téléphone',    value: '+212 6 12 34 56 78', action: 'tel' },
 *         { label: 'Immatriculation', value: '1234-A-56', mono: true },
 *       ]}
 *     />
 */

import * as React from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';

import { cn } from '@/lib/utils';

export type DefinitionAction = 'tel' | 'email' | 'map';

export interface DefinitionItem {
  label: string;
  /** A string renders as text (or as its action); a node renders as given. */
  value?: React.ReactNode;
  /** Turn the value into a dial / compose / map action. */
  action?: DefinitionAction;
  /** Plates, VIN, references — `t-mono`. */
  mono?: boolean;
  /** Dossier dot-path, for the change-replay highlight at the call site. */
  path?: string;
  /** Wrapper classes (the replay highlight / prefill flash go here). */
  className?: string;
  /** Trailing control on the label row (a « Modifier » link, a badge). */
  trailing?: React.ReactNode;
}

export interface DefinitionListProps {
  items: DefinitionItem[];
  /**
   * Columns from `md` up. The phone is ALWAYS one column — this only says
   * what the same list does when there is room. Default 1.
   */
  mdColumns?: 1 | 2 | 3 | 4;
  /** Hide pairs whose value is empty instead of showing « — ». */
  hideEmpty?: boolean;
  className?: string;
}

const MD_GRID: Record<1 | 2 | 3 | 4, string> = {
  1: '',
  2: 'md:grid md:grid-cols-2 md:gap-x-6',
  3: 'md:grid md:grid-cols-2 md:gap-x-6 lg:grid-cols-3',
  4: 'md:grid md:grid-cols-2 md:gap-x-6 lg:grid-cols-4',
};

/** `+212 6 12 34 56 78` → `+212612345678` (tel: wants no spaces). */
function telHref(value: string): string {
  return `tel:${value.replace(/[^\d+]/g, '')}`;
}

function ActionValue({
  action,
  text,
  mono,
}: {
  action: DefinitionAction;
  text: string;
  mono?: boolean;
}) {
  const href =
    action === 'tel'
      ? telHref(text)
      : action === 'email'
        ? `mailto:${text.trim()}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(text)}`;
  const Icon = action === 'tel' ? Phone : action === 'email' ? Mail : MapPin;

  return (
    <a
      href={href}
      {...(action === 'map' ? { target: '_blank', rel: 'noreferrer' } : {})}
      // 44 px minimum row so the whole value is the target, not just the icon.
      className={cn(
        'inline-flex min-h-11 items-center gap-2 break-words text-[15px] font-semibold text-ink underline decoration-hairline-strong underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        mono && 't-mono',
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
      <span className="min-w-0 break-words">{text}</span>
    </a>
  );
}

export function DefinitionList({ items, mdColumns = 1, hideEmpty, className }: DefinitionListProps) {
  const shown = hideEmpty ? items.filter((i) => !isEmpty(i.value)) : items;
  if (shown.length === 0) return null;

  return (
    <dl className={cn('flex flex-col gap-3', MD_GRID[mdColumns], className)}>
      {shown.map((item, i) => {
        const empty = isEmpty(item.value);
        const text = typeof item.value === 'string' || typeof item.value === 'number' ? String(item.value) : null;
        return (
          <div key={`${item.label}-${i}`} className={cn('min-w-0', item.className)}>
            <dt className="t-label flex items-center gap-1">
              <span className="min-w-0 break-words">{item.label}</span>
              {item.trailing && <span className="ml-auto shrink-0">{item.trailing}</span>}
            </dt>
            <dd className="mt-0.5 min-w-0">
              {empty ? (
                <span className="text-[15px] text-ink-4">—</span>
              ) : item.action && text ? (
                <ActionValue action={item.action} text={text} mono={item.mono} />
              ) : (
                <span
                  className={cn(
                    // Values wrap; they are never truncated (a `title`
                    // tooltip cannot be revealed on touch — WCAG 1.4.13).
                    'block break-words text-[15px] font-semibold leading-snug text-ink',
                    item.mono && 't-mono',
                  )}
                >
                  {item.value}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function isEmpty(value: React.ReactNode): boolean {
  return value === null || value === undefined || value === '' || value === false;
}

export default DefinitionList;
