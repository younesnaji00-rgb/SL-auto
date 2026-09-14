'use client';

/**
 * Phone rendering of the Administration lists (mobile redesign 2026-09-14 —
 * Claude Design handoff `Phone.dc.html` lines 571–583, JS 963–969; turn 3
 * « création en Admin »). Shared by /utilisateurs, /compagnies, /tampons and
 * /jours-feries, phone only (the callers gate with `useIsPhone()`).
 *
 *   ┌ + Nouvel utilisateur ───────────────────────┐  ← PhoneCreateButton: 44 px dashed,
 *   └──────────────────────────────────────────────┘    repeats the bar's « + »
 *   ┌──────────────────────────────────────────────┐
 *   │ (SE)  Salma El Fassi              [Actif]  › │  ← PhoneAdminCard over RecordCard:
 *   │       Gestionnaire · Casablanca              │    32 px avatar (round initials for
 *   └──────────────────────────────────────────────┘    users, 8 px tile otherwise) ·
 *                                                       name · meta 12 ink-3 · chip · chevron
 *
 * PhoneCreateHost re-parents the page's EXISTING creation card(s) into a
 * `FullScreenDialog` on phones (the design's « Nouveau » sheet) and renders
 * them inline everywhere else — no second form is built.
 */

import * as React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { RecordCard, type RecordCardProps } from '@/components/ui/record-card';
import { FullScreenDialog } from '@/components/ui/full-screen-dialog';
import type { PhoneChipTone } from '@/components/layout/page-chrome';

/* ------------------------------------------------------------------ */
/* PhoneCreateButton                                                   */
/* ------------------------------------------------------------------ */

export interface PhoneCreateButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  dataTour?: string;
}

/** 44 px dashed « + Nouveau … » button at the top of an admin list (design 571). */
export const PhoneCreateButton = React.forwardRef<HTMLButtonElement, PhoneCreateButtonProps>(
  ({ label, dataTour, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      data-tour={dataTour}
      className={cn(
        'flex h-11 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-hairline-strong bg-transparent text-[14px] font-semibold text-primary',
        'transition-colors duration-200 ease-standard hover:bg-accent/40 active:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none',
        className,
      )}
      {...props}
    >
      <Plus className="h-5 w-5" aria-hidden />
      {label}
    </button>
  ),
);
PhoneCreateButton.displayName = 'PhoneCreateButton';

/* ------------------------------------------------------------------ */
/* Avatar tile                                                         */
/* ------------------------------------------------------------------ */

/** First letters of the first two words (« Salma El Fassi » → « SE »). */
export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

export function PhoneAdminAvatar({
  name,
  round,
  children,
  className,
}: {
  name: string;
  /** Round (users) instead of the 8 px tile (every other object). */
  round?: boolean;
  /** Replaces the initials (a logo, a stamp image, a <DateBlock>). */
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden bg-surface-3 text-[11px] font-semibold text-ink-2',
        round ? 'rounded-full' : 'rounded-lg',
        className,
      )}
    >
      {children ?? initialsOf(name)}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* PhoneAdminCard                                                      */
/* ------------------------------------------------------------------ */

export interface PhoneAdminChip {
  label: React.ReactNode;
  tone?: PhoneChipTone;
}

export interface PhoneAdminCardProps
  extends Pick<RecordCardProps, 'href' | 'onClick' | 'recordId' | 'dataTour' | 'ariaLabel' | 'disabled' | 'className' | 'returned'> {
  /** The record's name — 14/600 (design), wraps (never « … »). */
  name: string;
  /** Second line, 12 px ink-3 (« Gestionnaire · Casablanca »). */
  meta?: React.ReactNode;
  /** Trailing chip (Actif · Inactif · a count · « Par défaut »). `null` hides it. */
  chip?: PhoneAdminChip | null;
  /** Round avatar (users). */
  round?: boolean;
  /** Custom avatar content (logo, stamp image, day number); defaults to the initials. */
  avatar?: React.ReactNode;
  /** Extra classes on the avatar tile (a time tint for the next holiday). */
  avatarClassName?: string;
  /** Hide the chevron (a card that opens nothing). */
  noChevron?: boolean;
}

export function PhoneAdminCard({ name, meta, chip, round, avatar, avatarClassName, noChevron, href, onClick, ...rest }: PhoneAdminCardProps) {
  const interactive = !rest.disabled && (!!href || !!onClick);
  return (
    <RecordCard
      // Admin cards title at 14/600 (design 571–583), a step under the
      // RecordCard default 15 — the size is the only override, so it is a
      // wrapper span rather than a new RecordCard prop.
      title={<span className="text-[14px]">{name}</span>}
      meta={meta}
      leading={<PhoneAdminAvatar name={name} round={round} className={avatarClassName}>{avatar}</PhoneAdminAvatar>}
      trailing={
        <span className="flex items-center gap-1.5">
          {chip && <Badge variant={chip.tone ?? 'neutral'}>{chip.label}</Badge>}
          {interactive && !noChevron && <ChevronRight className="h-5 w-5 text-ink-3" aria-hidden />}
        </span>
      }
      href={href}
      onClick={onClick}
      {...rest}
    />
  );
}

/* ------------------------------------------------------------------ */
/* PhoneCreateHost                                                     */
/* ------------------------------------------------------------------ */

export interface PhoneCreateHostProps {
  isPhone: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sheet title on phones (« Nouvel utilisateur »). */
  title: string;
  /**
   * Classes of the inline wrapper on tablet/desktop. `contents` keeps the
   * children in their parent grid; pass the parent's own `space-y-*` when
   * the children are stacked siblings so the rhythm stays identical.
   * `max-md:hidden` is always added so a phone never flashes the inline
   * form before `useIsPhone()` resolves.
   */
  inlineClassName?: string;
  children: React.ReactNode;
}

/**
 * On a phone the page's existing creation card(s) live in a full-screen
 * sheet opened by the bar's « + » / the dashed button; elsewhere they render
 * where they always did.
 */
export function PhoneCreateHost({ isPhone, open, onOpenChange, title, inlineClassName = 'contents', children }: PhoneCreateHostProps) {
  if (!isPhone) return <div className={cn(inlineClassName, 'max-md:hidden')}>{children}</div>;
  return (
    <FullScreenDialog open={open} onOpenChange={onOpenChange} title={title} bodyClassName="space-y-6">
      {children}
    </FullScreenDialog>
  );
}
