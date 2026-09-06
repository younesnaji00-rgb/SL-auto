'use client';

/**
 * ActionSheet — the touch form of a row menu / dropdown / overflow (mobile-
 * synthesis §3; docs/research/mobile-overlays-feedback.md §3). A `BottomSheet`
 * whose body is a list of 52 px rows: 20 px icon in ink-2, 15 px label,
 * hairline dividers, destructive rows LAST and separated, ≤ 6 rows (no
 * scrolling), no « Annuler » row — the handle, scrim, × and platform back
 * close it. Choosing a row closes the sheet first, then runs the action
 * (Apple: close before presenting anything else).
 */

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { BottomSheet } from './bottom-sheet';

export interface ActionItem {
  key?: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  /** Secondary line under the label (13 px, ink-3). */
  hint?: React.ReactNode;
  onSelect?: () => void;
  /** Rendered as a link (tel:, wa.me, maps, in-app route). */
  href?: string;
  external?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  /** Hidden rows are removed entirely (Apple: hide unavailable items). */
  hidden?: boolean;
  /** Trailing element (a check for the current choice, a count…). */
  trailing?: React.ReactNode;
}

export interface ActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  items: ActionItem[];
  /** Force the tall detent (long pickers). */
  detent?: 'default' | 'tall';
}

export function ActionSheet({ open, onOpenChange, title, description, items, detent }: ActionSheetProps) {
  const visible = items.filter((i) => !i.hidden);
  const regular = visible.filter((i) => !i.destructive);
  const destructive = visible.filter((i) => i.destructive);

  const run = (item: ActionItem) => {
    onOpenChange(false);
    if (item.onSelect) {
      // Let the sheet's exit start before the action opens anything else.
      window.setTimeout(item.onSelect, 0);
    }
  };

  const Row = ({ item }: { item: ActionItem }) => {
    const inner = (
      <>
        {item.icon && <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-ink-2 [&>svg]:h-5 [&>svg]:w-5">{item.icon}</span>}
        <span className="min-w-0 flex-1">
          <span className={cn('block truncate text-[15px] leading-tight', item.destructive ? 'text-status-danger-fg' : 'text-ink')}>{item.label}</span>
          {item.hint && <span className="mt-0.5 block truncate text-[13px] leading-tight text-ink-3">{item.hint}</span>}
        </span>
        {item.trailing}
      </>
    );
    const cls = cn(
      'flex min-h-[52px] w-full items-center gap-3 px-4 text-left transition-colors',
      'hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2',
      item.disabled && 'pointer-events-none opacity-50',
    );
    if (item.href && !item.disabled) {
      return item.external ? (
        <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls} onClick={() => onOpenChange(false)}>
          {inner}
        </a>
      ) : (
        <Link href={item.href} className={cls} onClick={() => onOpenChange(false)}>
          {inner}
        </Link>
      );
    }
    return (
      <button type="button" className={cls} disabled={item.disabled} onClick={() => run(item)}>
        {inner}
      </button>
    );
  };

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title ?? 'Actions'} description={description} detent={detent} flush hideHandle={!title}>
      <ul className="divide-y divide-hairline">
        {regular.map((item, i) => (
          <li key={item.key ?? i}>
            <Row item={item} />
          </li>
        ))}
      </ul>
      {destructive.length > 0 && (
        <ul className="mt-2 divide-y divide-hairline border-t border-hairline">
          {destructive.map((item, i) => (
            <li key={item.key ?? `d${i}`}>
              <Row item={item} />
            </li>
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}

export default ActionSheet;
