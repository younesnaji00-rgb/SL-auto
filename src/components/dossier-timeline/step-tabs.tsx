'use client';

import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';
import { GOTO_STEP_EVENT, type GotoStepDetail } from '@/lib/step-navigation';
import { useTabSlopeMorph } from '@/hooks/use-tab-morph';
import { useIsPhone } from '@/hooks/use-viewport-class';
import { useT } from '@/i18n';

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
  /**
   * Controlled mode — the phone step screen owns the facet so it can mirror it
   * into `?onglet=` and read it for the bottom action bar. When omitted the
   * strip keeps its own state (desktop behaviour, unchanged).
   */
  value?: string;
  onValueChange?: (value: string) => void;
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
 *
 * PHONE (mobile pass 2026-09-06 — research mobile-record-pages.md E5): Material
 * FIXED tabs. Full width, ≤ 3 equal cells, 48 px tall, 13 px label with the
 * state badge on a second 11 px line, icons dropped (the badge carries the
 * meaning), 2 px underline, and no slope morph — the "flying seat" is a
 * hover affordance and there is no hover on touch. The strip NEVER scrolls:
 * a 4th facet becomes a section appended to the 3rd panel, because a
 * scrollable tab bar hides destinations (NN/g "Tabs, Used Right": overflowing
 * tabs become a carousel and "the hidden tabs become less discoverable").
 */

/** Max facets a phone strip shows as tabs; the rest fold into the last panel. */
const PHONE_MAX_TABS = 3;

/** The facet strip, with the flying active-seat morph (symbiote, owner
 *  2026-09-02) attached to the scrollable track. */
function StepTabsList({ children }: { children: React.ReactNode }) {
  const t = useT();
  const ref = React.useRef<HTMLDivElement>(null);
  useTabSlopeMorph(ref);
  return (
    <TabsPrimitive.List
      ref={ref}
      aria-label={t("Sections de l'étape")}
      className="relative isolate -mx-2 flex items-end gap-4 overflow-x-auto border-b border-hairline px-2 scrollbar-thin"
    >
      {children}
    </TabsPrimitive.List>
  );
}

/** Fixed full-width strip — no morph hook, no horizontal scroll (E5). */
function PhoneTabsList({ count, children }: { count: number; children: React.ReactNode }) {
  const t = useT();
  return (
    <TabsPrimitive.List
      aria-label={t("Sections de l'étape")}
      className="grid w-full border-b border-hairline"
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {children}
    </TabsPrimitive.List>
  );
}

function TabBadge({ badge, className }: { badge: NonNullable<StepTab['badge']>; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-1.5 font-medium tabular-nums',
        badge.kind === 'progress' && 'bg-surface-3 text-ink-2',
        badge.kind === 'warn' && 'bg-status-warning-bg text-status-warning-fg',
        badge.kind === 'ok' && 'bg-status-success-bg text-status-success-fg',
        className,
      )}
    >
      {badge.label}
    </span>
  );
}

export function StepTabs({ tabs, defaultValue, storageKey, value: controlled, onValueChange, className }: StepTabsProps) {
  const isPhone = useIsPhone();
  const first = tabs[0]?.value;
  const [internal, setInternal] = React.useState<string>(() => {
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

  const isControlled = controlled != null;
  // A controlled value that no longer exists (a facet removed by a prop
  // change) falls back to the first tab rather than blanking the panel.
  const value = isControlled && tabs.some((t) => t.value === controlled) ? controlled! : isControlled ? first : internal;

  const onChange = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
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
  // Controlled hosts (the phone step screen) route this through the URL and
  // never see the event, so the listener stays uncontrolled-only.
  const tabsRef = React.useRef(tabs);
  tabsRef.current = tabs;
  React.useEffect(() => {
    if (!storageKey || isControlled) return;
    const onGoto = (e: Event) => {
      const { key, tab } = (e as CustomEvent<GotoStepDetail>).detail;
      if (key !== storageKey || !tab) return;
      if (tabsRef.current.some((t) => t.value === tab)) setInternal(tab);
    };
    window.addEventListener(GOTO_STEP_EVENT, onGoto);
    return () => window.removeEventListener(GOTO_STEP_EVENT, onGoto);
  }, [storageKey, isControlled]);

  if (tabs.length === 0) return null;

  // ── Phone: fixed full-width tabs, ≤ 3, overflow appended to the last panel ──
  if (isPhone) {
    const shown = tabs.slice(0, PHONE_MAX_TABS);
    const overflow = tabs.slice(PHONE_MAX_TABS);
    const lastShown = shown[shown.length - 1]?.value;
    const phoneValue = shown.some((t) => t.value === value) ? value : shown[0]?.value;
    return (
      <TabsPrimitive.Root value={phoneValue} onValueChange={onChange} className={cn('w-full', className)}>
        <PhoneTabsList count={shown.length}>
          {shown.map((tab) => (
            <TabsPrimitive.Trigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'group relative flex min-h-[48px] flex-col items-center justify-center gap-0.5 px-1 text-[13px] font-medium leading-tight text-ink-3',
                'transition-colors data-[state=active]:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              )}
            >
              <span className="max-w-full truncate">{tab.label}</span>
              {tab.badge && <TabBadge badge={tab.badge} className="max-w-full truncate text-[11px] leading-4" />}
              {typeof tab.count === 'number' && tab.count > 0 && !tab.badge && (
                <span className="text-[11px] leading-4 tabular-nums text-ink-3">{tab.count}</span>
              )}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary opacity-0 transition-opacity group-data-[state=active]:opacity-100"
              />
            </TabsPrimitive.Trigger>
          ))}
        </PhoneTabsList>
        {shown.map((tab) => (
          <TabsPrimitive.Content
            key={tab.value}
            value={tab.value}
            className="pt-4 focus-visible:outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:duration-200 data-[state=active]:ease-enter motion-reduce:animate-none"
          >
            {tab.content}
            {/* A 4th facet is never a hidden tab (E5): it becomes a section at
                the end of the last visible panel. */}
            {tab.value === lastShown &&
              overflow.map((extra) => (
                <section key={extra.value} className="mt-6 border-t border-hairline pt-5">
                  <h3 className="t-heading mb-3 flex items-center gap-2">
                    {extra.label}
                    {extra.badge && <TabBadge badge={extra.badge} className="h-5 text-[11px]" />}
                  </h3>
                  {extra.content}
                </section>
              ))}
          </TabsPrimitive.Content>
        ))}
      </TabsPrimitive.Root>
    );
  }

  return (
    <TabsPrimitive.Root value={value} onValueChange={onChange} className={cn('w-full', className)}>
      <StepTabsList>
        {tabs.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className={cn(
              // Browser-tab shape (owner rulings 2026-09-02 + ter): `.tab-slope`
              // (globals.css) draws the sloped body + outward feet. The accent
              // underline is a SPAN, never border-b-2 — a bottom border lifts
              // the padding box the absolutely-positioned feet anchor to, so
              // the arcs hung 2px above the separation line (owner 2026-09-03).
              'tab-slope group relative -mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-[13px] font-medium text-ink-3',
              'transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
              'data-[state=active]:text-ink',
            )}
          >
            {t.icon && <span className="inline-flex text-ink-3 [&>svg]:h-4 [&>svg]:w-4 group-data-[state=active]:text-ink">{t.icon}</span>}
            {t.label}
            {typeof t.count === 'number' && t.count > 0 && (
              <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
                {t.count}
              </span>
            )}
            {t.badge && <TabBadge badge={t.badge} className="h-5 text-[11px]" />}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary opacity-0 transition-opacity group-data-[state=active]:opacity-100"
            />
            <span className="tab-feet" aria-hidden />
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
