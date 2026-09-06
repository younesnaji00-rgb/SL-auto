'use client';

/**
 * BottomActionBar — the contextual primary action of a record / mission /
 * editor page on a phone (mobile-synthesis §2 A6; research
 * docs/research/mobile-record-pages.md E4). 56 px + safe area, ONE filled
 * button (full width, or ≥ 50 % at the right when icon actions are present)
 * and at most two 48 px icon actions at the left. It REPLACES the navigation
 * bar on that page (Material: never two bottom bars; Apple: detail views may
 * cover the tab bar) — publishing `hideBottomNav` through the chrome registry
 * — and hides while the on-screen keyboard is open so it never floats
 * mid-screen. Renders nothing from md up (the desktop keeps its record bar).
 *
 * Usage:
 *   <BottomActionBar
 *     primary={{ label: 'Enregistrer', onClick, loading, disabled, variant: 'amber' }}
 *     secondary={[{ label: 'Appeler', icon: <Phone />, href: 'tel:…' }]}
 *   />
 */

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InlineLoader } from '@/components/ui/inline-loader';
import { cn } from '@/lib/utils';
import { usePhoneChrome } from './page-chrome';
import { useKeyboardOpen } from '@/hooks/use-viewport-class';

export const BOTTOM_ACTION_BAR_HEIGHT = 56;

export interface BottomActionBarPrimary {
  label: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  /** `amber` = the rappel-session « Sauvegarder » (element-specs: the amber save). */
  variant?: 'default' | 'amber' | 'destructive';
  dataTour?: string;
}

export interface BottomActionBarSecondary {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  external?: boolean;
  disabled?: boolean;
  dataTour?: string;
}

export interface BottomActionBarProps {
  primary?: BottomActionBarPrimary | null;
  secondary?: BottomActionBarSecondary[];
  /** Extra content above the buttons (a one-line status, a progress meter). */
  caption?: React.ReactNode;
  className?: string;
}

export function BottomActionBar({ primary, secondary = [], caption, className }: BottomActionBarProps) {
  const keyboardOpen = useKeyboardOpen();
  const chrome = React.useMemo(() => ({ hideBottomNav: true }), []);
  usePhoneChrome(chrome);

  if (!primary && secondary.length === 0) return null;
  const icons = secondary.slice(0, 2);

  const primaryCls = cn(
    'h-12 min-w-0 flex-1 gap-2 text-[15px] font-semibold',
    primary?.variant === 'amber' && 'bg-status-warning-fg text-status-warning-bg hover:bg-status-warning-fg/90',
  );

  return (
    <div
      role="toolbar"
      aria-label="Actions"
      data-bottom-action-bar
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 glass-bar border-t border-hairline md:hidden',
        'pb-[max(8px,env(safe-area-inset-bottom))]',
        keyboardOpen && 'hidden',
        className,
      )}
    >
      {caption && <div className="px-4 pt-2 text-[12px] leading-tight text-ink-3">{caption}</div>}
      <div className="flex h-14 items-center gap-2 px-4">
        {icons.map((s, i) => {
          const inner = (
            <>
              <span className="[&>svg]:h-5 [&>svg]:w-5">{s.icon}</span>
              <span className="sr-only">{s.label}</span>
            </>
          );
          const cls = 'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-ink-2 shadow-rim transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
          if (s.href && !s.disabled) {
            return s.external ? (
              <a key={i} href={s.href} target="_blank" rel="noopener noreferrer" className={cls} aria-label={s.label} title={s.label} data-tour={s.dataTour}>
                {inner}
              </a>
            ) : (
              <Link key={i} href={s.href} className={cls} aria-label={s.label} title={s.label} data-tour={s.dataTour}>
                {inner}
              </Link>
            );
          }
          return (
            <button key={i} type="button" className={cls} onClick={s.onClick} disabled={s.disabled} aria-label={s.label} title={s.label} data-tour={s.dataTour}>
              {inner}
            </button>
          );
        })}
        {primary &&
          (primary.href && !primary.disabled ? (
            <Button asChild variant={primary.variant === 'destructive' ? 'destructive' : 'default'} className={primaryCls} data-tour={primary.dataTour}>
              <Link href={primary.href}>
                {primary.icon}
                {primary.label}
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant={primary.variant === 'destructive' ? 'destructive' : 'default'}
              className={primaryCls}
              onClick={primary.onClick}
              disabled={primary.disabled || primary.loading}
              aria-busy={primary.loading || undefined}
              data-tour={primary.dataTour}
            >
              {primary.loading ? <InlineLoader /> : primary.icon}
              {primary.label}
            </Button>
          ))}
      </div>
    </div>
  );
}

export default BottomActionBar;
