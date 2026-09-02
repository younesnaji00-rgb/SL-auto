'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { GOTO_STEP_EVENT, type GotoStepDetail } from '@/lib/step-navigation';
import { useTabSlopeMorph } from '@/hooks/use-tab-morph';

export interface StepTab {
  value: string;
  label: string;
  icon?: React.ReactNode;
  /** Optional count pill (documents, photos, observations…). */
  count?: number;
  /**
   * Optional state badge so the tab tells what's inside without switching
   * (M3 tab badges): `{ kind: 'progress', label: '3/5' }` or
   * `{ kind: 'warn', label: '2 champs manquants' }`.
   */
  badge?: { kind: 'progress' | 'warn' | 'ok'; label: string };
  content: React.ReactNode;
}

interface StepTabsProps {
  tabs: StepTab[];
  defaultValue?: string;
  /** Persist the selected tab per step (sessionStorage) so a reload lands on the same view. */
  storageKey?: string;
  className?: string;
}

/**
 * Underline tabs used INSIDE a dossier step to switch between its facets
 * (Informations | Documents, Planification | Photos | Observations).
 *
 * Pattern: Material 3 "primary tabs" / Carbon "line tabs" — content
 * switching within one surface, labels always visible, active = ink text +
 * 2 px accent underline (the accent budget's "active state"). Replaces the
 * previous collapsibles whose small chevrons were easy to miss.
 */
/** The facet strip, with the flying active-seat morph (symbiote, owner
 *  2026-09-02) attached to the scrollable track. */
function StepTabsList({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  useTabSlopeMorph(ref);
  return (
    <TabsPrimitive.List
      ref={ref}
      aria-label="Sections de l'étape"
      className="relative isolate -mx-2 flex items-end gap-1 overflow-x-auto border-b border-hairline px-2 scrollbar-thin"
    >
      {children}
    </TabsPrimitive.List>
  );
}

export function StepTabs({ tabs, defaultValue, storageKey, className }: StepTabsProps) {
  const first = tabs[0]?.value;
  const [value, setValue] = React.useState<string>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = window.sessionStorage.getItem(storageKey);
        if (saved && tabs.some((t) => t.value === saved)) return saved;
      } catch {
        /* storage unavailable */
      }
    }
    return defaultValue ?? first;
  });

  const onChange = (v: string) => {
    setValue(v);
    if (storageKey) {
      try {
        window.sessionStorage.setItem(storageKey, v);
      } catch {
        /* ignore */
      }
    }
  };

  // External navigation (`lib/step-navigation.ts` gotoStep): switch to the
  // requested tab when the event targets this step. `tabs` is an inline array
  // on the page, so read it through a ref instead of re-subscribing per render.
  const tabsRef = React.useRef(tabs);
  tabsRef.current = tabs;
  React.useEffect(() => {
    if (!storageKey) return;
    const onGoto = (e: Event) => {
      const { key, tab } = (e as CustomEvent<GotoStepDetail>).detail;
      if (key !== storageKey || !tab) return;
      if (tabsRef.current.some((t) => t.value === tab)) setValue(tab);
    };
    window.addEventListener(GOTO_STEP_EVENT, onGoto);
    return () => window.removeEventListener(GOTO_STEP_EVENT, onGoto);
  }, [storageKey]);

  if (tabs.length === 0) return null;

  return (
    <TabsPrimitive.Root value={value} onValueChange={onChange} className={cn('w-full', className)}>
      <StepTabsList>
        {tabs.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              // Browser-tab shape (owner rulings 2026-09-02 + ter): `.tab-slope`
              // (globals.css) draws the sloped body + outward feet — inactive
              // facets are grey surface-4, the active one card + rim; the 2 px
              // accent underline stays as the second cue.
              'tab-slope relative -mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3.5 text-[13px] font-medium text-ink-3',
              'transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              'data-[state=active]:border-primary data-[state=active]:text-ink',
            )}
          >
            {t.icon && <span className="inline-flex text-ink-3 [&>svg]:h-4 [&>svg]:w-4 group-data-[state=active]:text-ink">{t.icon}</span>}
            {t.label}
            {typeof t.count === 'number' && t.count > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                {t.count}
              </span>
            )}
            {t.badge && (
              <span
                className={cn(
                  'inline-flex h-5 items-center whitespace-nowrap rounded-full px-1.5 text-[11px] font-medium tabular-nums',
                  t.badge.kind === 'progress' && 'bg-surface-3 text-ink-2',
                  t.badge.kind === 'warn' && 'bg-status-warning-bg text-status-warning-fg',
                  t.badge.kind === 'ok' && 'bg-status-success-bg text-status-success-fg',
                )}
              >
                {t.badge.label}
              </span>
            )}
          </TabsPrimitive.Trigger>
        ))}
      </StepTabsList>
      {tabs.map((t) => (
        <TabsPrimitive.Content
          key={t.value}
          value={t.value}
          // Incoming panel only: 150ms fade + 3px rise, decelerate; no exit
          // animation (owner option A1 2026-09-02, motion-spec §7).
          className="pt-5 focus-visible:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-200 data-[state=active]:ease-enter motion-reduce:animate-none"
        >
          {t.content}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  );
}
