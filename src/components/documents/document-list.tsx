'use client';

/**
 * Structured document list — the ONE list pattern shared by the step-1
 * documents browser, the accord slot board (steps 6 / 11) and the chiffreur's
 * family rows.
 *
 * Pattern sources: IBM Carbon structured list, GOV.UK task list (row = task,
 * status tag on the left), Linear issue rows, Material 3 lists.
 *
 * Anatomy:
 *   <DocumentList>                 one Card variant="outline" (we always sit
 *     <DocumentGroup …>            inside the step's paper — never tonal in
 *       <SlotRow …>                tonal), groups separated by hairlines
 *         <DocumentItem …/>        rows hairline-separated inside a group
 *       </SlotRow>
 *     </DocumentGroup>
 *   </DocumentList>
 */

import React, { useRef, useState } from 'react';
import { Check, Clock, Download, Eye, FileText, Loader2, Trash2, Upload, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PdfThumbnail } from '@/components/common/pdf-thumbnail';
import { cn } from '@/lib/utils';
import { isImage, isPdf } from './typed-doc';

// ── Status marker (tick / cross — no chips) ──────────────────────────────────

export type SlotStatus = 'received' | 'pending' | 'missing' | 'optional';

const STATUS_MARKER: Record<SlotStatus, { label: string; className: string; Icon: typeof Check }> = {
  received: { label: 'Reçu', className: 'text-status-success-fg', Icon: Check },
  pending: { label: 'En attente', className: 'text-status-warning-fg', Icon: Clock },
  missing: { label: 'Manquant', className: 'text-status-danger-fg', Icon: X },
  optional: { label: 'Manquant (optionnel)', className: 'text-ink-4', Icon: X },
};

export function SlotStatusIcon({ status, className }: { status: SlotStatus; className?: string }) {
  const m = STATUS_MARKER[status];
  return (
    <span
      role="img"
      aria-label={m.label}
      title={m.label}
      className={cn('inline-flex h-5 w-5 shrink-0 items-center justify-center', m.className, className)}
    >
      <m.Icon className="h-4 w-4" strokeWidth={2.5} aria-hidden />
    </span>
  );
}

// ── List shell ───────────────────────────────────────────────────────────────

export function DocumentList({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Card variant="outline" className={cn('divide-y divide-hairline overflow-hidden', className)} {...rest}>
      {children}
    </Card>
  );
}

// ── Group ────────────────────────────────────────────────────────────────────

export interface DocumentGroupProps {
  /** t-heading title — "1er accord", "Devis Garage", "Pièces requises"… */
  title: string;
  /** Optional t-caption next to the title (hidden below sm). */
  subtitle?: string;
  /** Summary pill "3/4 reçus". Omit both to hide the pill. */
  received?: number;
  total?: number;
  /** Free-form pill text override (wins over received/total). */
  summary?: string;
  /** Header actions (cardinal "+ Ajouter un accord", rename, …). */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function DocumentGroup({ title, subtitle, received, total, summary, actions, children, className }: DocumentGroupProps) {
  const pillText =
    summary ?? (typeof received === 'number' && typeof total === 'number'
      ? `${received}/${total} reçu${received > 1 ? 's' : ''}`
      : null);
  return (
    <section aria-label={title} className={className}>
      {/* Navy band — the page's third colour lives on the group headers. */}
      <header className="flex min-h-10 items-center gap-3 bg-ink-solid px-4 py-1.5">
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h4 className="t-heading truncate text-on-ink" title={title}>{title}</h4>
          {subtitle && <span className="t-caption hidden truncate text-on-ink/70 sm:inline">{subtitle}</span>}
        </div>
        {pillText && (
          <span className="inline-flex h-5 shrink-0 items-center whitespace-nowrap rounded-full bg-on-ink/15 px-2 text-[11px] font-medium tabular-nums text-on-ink">
            {pillText}
          </span>
        )}
        {actions && <div className="flex shrink-0 items-center gap-1 text-on-ink/70">{actions}</div>}
      </header>
      <ul role="list" className="divide-y divide-hairline">
        {children}
      </ul>
    </section>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

const DEFAULT_ACCEPT = (f: File) => f.type.startsWith('image/') || /\.pdf$/i.test(f.name);

export interface SlotRowProps {
  /** Slot label — "Carte grise", "1er accord"… */
  label: string;
  /** t-caption under the label ("obligatoire", the raw Firestore type…). */
  hint?: string;
  status: SlotStatus;
  /** Native tooltip on the label (defaults to `label`). */
  title?: string;
  /** DocumentItem children; the row grows when several stack. */
  children?: React.ReactNode;
  /** Quiet inline text when the row holds no document. */
  emptyText?: string;
  /** Upload affordance — ghost "Déposer / Ajouter" button with Upload icon. */
  onAdd?: () => void;
  addLabel?: string;
  /** 'always' for an empty required slot; 'reveal' (hover/focus) otherwise. */
  addVisible?: 'always' | 'reveal';
  adding?: boolean;
  /** Extra action-zone nodes ("Éditer", ⋯ menu…). */
  actions?: React.ReactNode;
  /** Enables the file drop target. */
  onFilesDropped?: (files: File[]) => void;
  acceptFile?: (f: File) => boolean;
  /** Enter/Space on the row itself. Defaults to `onAdd` when the row is empty. */
  onActivate?: () => void;
  id?: string;
  className?: string;
  ariaLabel?: string;
}

export function SlotRow({
  label,
  hint,
  status,
  title,
  children,
  emptyText,
  onAdd,
  addLabel,
  addVisible = 'reveal',
  adding,
  actions,
  onFilesDropped,
  acceptFile = DEFAULT_ACCEPT,
  onActivate,
  id,
  className,
  ariaLabel,
}: SlotRowProps) {
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);
  const items = React.Children.toArray(children).filter(Boolean);
  const hasItems = items.length > 0;
  const dropEnabled = !!onFilesDropped;

  const handleDragEnter = (e: React.DragEvent<HTMLLIElement>) => {
    if (!dropEnabled || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setDragOver(true);
  };
  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    if (!dropEnabled || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };
  const handleDragLeave = (e: React.DragEvent<HTMLLIElement>) => {
    if (!dropEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLLIElement>) => {
    if (!dropEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []).filter(acceptFile);
    if (files.length > 0) onFilesDropped!(files);
  };

  const activate = onActivate ?? (!hasItems && onAdd ? onAdd : undefined);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
    if (e.target !== e.currentTarget || !activate) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  };

  const showAddButton = !!onAdd;
  const addAlways = addVisible === 'always';

  return (
    <li
      id={id}
      tabIndex={0}
      aria-label={ariaLabel ?? `${label} — ${STATUS_MARKER[status].label}`}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'group/row relative flex min-h-11 flex-col gap-1.5 px-4 py-2 transition-colors',
        '[[data-density=compact]_&]:min-h-9 [[data-density=compact]_&]:py-1',
        'sm:flex-row sm:items-start sm:gap-4',
        'hover:bg-surface-2',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
        dragOver && 'bg-accent/30 ring-1 ring-inset ring-primary/40',
        className,
      )}
    >
      {/* Status + label column */}
      <div className="flex min-w-0 items-center gap-3 pr-24 sm:w-[16rem] sm:shrink-0 sm:self-center sm:pr-0">
        <SlotStatusIcon status={status} />
        <div className="min-w-0">
          <p className="t-body-sm truncate font-medium leading-tight" title={title ?? label}>{label}</p>
          {hint && <p className="t-caption truncate" title={hint}>{hint}</p>}
        </div>
      </div>

      {/* Documents of the slot (stack vertically; the row grows) */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pl-8 sm:self-center sm:pl-0">
        {hasItems ? items : (
          emptyText ? <p className="t-caption flex min-h-7 items-center">{emptyText}</p> : null
        )}
      </div>

      {/* Action zone */}
      {(showAddButton || actions) && (
        <div className="absolute right-3 top-1.5 flex shrink-0 items-center gap-1 sm:static sm:ml-auto sm:self-center">
          {actions}
          {showAddButton && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 gap-1.5 px-2 text-ink-2',
                !addAlways && !adding &&
                  '[@media(hover:hover)]:opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100',
              )}
              onClick={onAdd}
              disabled={adding}
              aria-label={`${addLabel ?? 'Ajouter'} — ${label}`}
            >
              {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {adding ? 'Envoi…' : (addLabel ?? 'Ajouter')}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

// ── Quiet trailing row (e.g. "Autre type…") ─────────────────────────────────

export function QuietRow({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex h-10 w-full items-center gap-2 px-4 text-left text-[13px] text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [[data-density=compact]_&]:h-9"
      >
        {icon}
        {label}
      </button>
    </li>
  );
}

// ── One file inside a row ────────────────────────────────────────────────────

export interface DocumentItemProps {
  name: string;
  url?: string | null;
  /** `137 Ko · 10/06/2026 · younes` */
  meta?: string;
  /** Secondary caption node ("Chiffré par X", "En attente…"). */
  note?: React.ReactNode;
  /** Inline badge next to the name (session-replay ChangeBadge). */
  badge?: React.ReactNode;
  pending?: boolean;
  onOpen?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  className?: string;
}

const ITEM_ACTION_CLASS =
  'h-7 w-7 shrink-0 text-ink-3 hover:text-ink';
const ITEM_ACTIONS_REVEAL =
  '[@media(hover:hover)]:opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100';

export function DocumentItem({
  name,
  url,
  meta,
  note,
  badge,
  pending,
  onOpen,
  onDownload,
  onDelete,
  deleting,
  selectable,
  selected,
  onToggleSelect,
  className,
}: DocumentItemProps) {
  const openable = !!url && !pending && !!onOpen;
  const actionable = !!url && !pending;
  const thumb = !!url && isImage(name);
  return (
    <div className={cn('-mx-1.5 flex min-h-10 items-center gap-2.5 rounded-md px-1.5 py-0.5', className)}>
      {selectable && (
        <Checkbox
          checked={!!selected}
          onCheckedChange={onToggleSelect}
          disabled={!actionable}
          aria-label={`Sélectionner ${name}`}
          className="shrink-0"
        />
      )}
      {thumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url!} alt="" loading="lazy" decoding="async" className="h-9 w-9 shrink-0 rounded-md bg-surface-2 object-cover" />
      ) : url && !pending && isPdf(name) ? (
        <PdfThumbnail url={url} width={72} className="h-9 w-9 shrink-0 overflow-hidden rounded-md bg-surface-2" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-3" aria-hidden>
          <FileText className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13px] leading-5">
          {openable ? (
            <button
              type="button"
              onClick={onOpen}
              title={name}
              className="min-w-0 truncate text-left text-ink underline-offset-2 hover:underline focus-visible:underline focus-visible:outline-none"
            >
              {name}
            </button>
          ) : (
            <span className="min-w-0 truncate text-ink" title={name}>{name}</span>
          )}
          {badge}
        </p>
        {pending && <p className="t-caption text-status-warning-fg">En attente d&apos;envoi…</p>}
        {meta && <p className="t-caption truncate tabular-nums" title={meta}>{meta}</p>}
        {note}
      </div>
      <div className={cn('flex shrink-0 items-center gap-0.5', ITEM_ACTIONS_REVEAL, deleting && 'opacity-100')}>
        {onOpen && (
          <Button type="button" variant="ghost" size="icon" className={ITEM_ACTION_CLASS} onClick={onOpen} disabled={!actionable} title="Aperçu" aria-label={`Aperçu — ${name}`}>
            <Eye className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDownload && (
          <Button type="button" variant="ghost" size="icon" className={ITEM_ACTION_CLASS} onClick={onDownload} disabled={!actionable} title="Télécharger" aria-label={`Télécharger — ${name}`}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
        {onDelete && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(ITEM_ACTION_CLASS, 'hover:text-status-danger-fg')}
            onClick={onDelete}
            disabled={deleting || pending}
            title="Supprimer"
            aria-label={`Supprimer — ${name}`}
          >
            {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          </Button>
        )}
      </div>
    </div>
  );
}
