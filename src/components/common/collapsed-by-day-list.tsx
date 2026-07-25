'use client';

import React, { useMemo, useState } from 'react';
import { format as dateFormat, startOfDay } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { dateFnsLocale, useT } from '@/i18n';

export interface CollapsedByDayListProps<T> {
  items: T[];
  /** Extract the Date or millisecond timestamp for grouping. If the function returns null/undefined, item lands in an "undated" bucket at the bottom. */
  getDate: (item: T) => Date | number | null | undefined;
  /** Render one item when a day is expanded. */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Custom row label. Defaults to `${dateLabel} — ${count} ${count === 1 ? "élément" : "éléments"}`. */
  groupLabel?: (dayStart: Date, count: number) => string;
  /** Default expansion state. */
  defaultExpanded?: boolean;
  /** Optional key extractor for React keys. Defaults to index. */
  keyOf?: (item: T, index: number) => string;
  /** Optional className on the outer container. */
  className?: string;
  /** When true, renders each day's items in a grid (for photos). Default false = vertical list. */
  gridItems?: boolean;
}

const UNDATED_KEY = 'undated';

interface Group<T> {
  key: string;
  dayStart: Date | null;
  items: Array<{ item: T; index: number }>;
}

export function CollapsedByDayList<T>({
  items,
  getDate,
  renderItem,
  groupLabel,
  defaultExpanded = false,
  keyOf,
  className,
  gridItems = false,
}: CollapsedByDayListProps<T>) {
  const t = useT();
  const groups = useMemo<Group<T>[]>(() => {
    const map = new Map<string, Group<T>>();

    items.forEach((item, index) => {
      const raw = getDate(item);
      let key: string;
      let dayStart: Date | null;

      if (raw === null || raw === undefined) {
        key = UNDATED_KEY;
        dayStart = null;
      } else {
        const date = typeof raw === 'number' ? new Date(raw) : raw;
        if (isNaN(date.getTime())) {
          key = UNDATED_KEY;
          dayStart = null;
        } else {
          dayStart = startOfDay(date);
          key = String(dayStart.getTime());
        }
      }

      let group = map.get(key);
      if (!group) {
        group = { key, dayStart, items: [] };
        map.set(key, group);
      }
      group.items.push({ item, index });
    });

    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      if (a.key === UNDATED_KEY) return 1;
      if (b.key === UNDATED_KEY) return -1;
      const aTime = a.dayStart ? a.dayStart.getTime() : 0;
      const bTime = b.dayStart ? b.dayStart.getTime() : 0;
      return bTime - aTime;
    });

    return arr;
  }, [items, getDate]);

  const [expanded, setExpanded] = useState<Map<string, boolean>>(new Map());

  if (items.length === 0) {
    return null;
  }

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Map(prev);
      const current = next.has(key) ? next.get(key)! : defaultExpanded;
      next.set(key, !current);
      return next;
    });
  };

  const isExpanded = (key: string): boolean => {
    return expanded.has(key) ? expanded.get(key)! : defaultExpanded;
  };

  return (
    <div className={className}>
      {groups.map((group) => {
        const count = group.items.length;
        const open = isExpanded(group.key);

        let label: string;
        if (group.dayStart) {
          if (groupLabel) {
            label = groupLabel(group.dayStart, count);
          } else {
            const dateLabel = dateFormat(group.dayStart, 'dd MMMM yyyy', { locale: dateFnsLocale() });
            label = `${dateLabel} — ${count} ${count === 1 ? t('élément') : t('éléments')}`;
          }
        } else {
          label = `${t('Sans date')} — ${count} ${count === 1 ? t('élément') : t('éléments')}`;
        }

        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent text-left"
            >
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
              <span className="font-medium">{label}</span>
            </button>
            {open && (
              <div
                className={
                  gridItems
                    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3'
                    : 'divide-y py-1'
                }
              >
                {group.items.map(({ item, index }) => {
                  const reactKey = keyOf ? keyOf(item, index) : String(index);
                  return (
                    <React.Fragment key={reactKey}>
                      {renderItem(item, index)}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
