'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import {
  SlotCard,
  type ExtraSlotKind,
  type TypedDoc,
} from './slot-card';
import type { DocFamily } from '@/lib/doc-family';
import { parseAccordDocType } from '@/lib/docType-accorde';
import { cn } from '@/lib/utils';
import type { DocDragPayload } from '@/components/documents/typed-doc';

interface FamilyRowProps {
  /** The family group (parent + ordered slot labels) to render as a row. */
  group: DocFamily;
  docsByType: Record<string, TypedDoc[]>;
  canEdit: boolean;
  canDeleteDoc: (d: TypedDoc) => boolean;
  userRole?: string;
  canManageExtraSlots: boolean;
  isUploading: (slot: string) => boolean;
  deletingId: string | null;
  extraSlotKindForSlot: (slot: string) => ExtraSlotKind | undefined;
  onUpload: (slot: string, files: File[]) => void;
  onDelete: (d: TypedDoc) => void;
  onCreateNextCardinal: (slot: string) => void;
  onCreateExtraSlot: (kind: ExtraSlotKind, files: File[]) => void;
  onRenameExtraSlot: (slot: string) => void;
  /** Lightbox open; `pages` (upload order) lets the host enable paging across the slot's files. */
  onPreview: (d: TypedDoc, pages?: TypedDoc[]) => void;
  /**
   * Optional action rendered inline at the right end of the family header
   * band (next to the name + pill). Used on the chiffreur side for the
   * "Éditer web" button. Lives OUTSIDE the collapse toggle button.
   */
  topAction?: React.ReactNode;
  /**
   * When true, the cardinal `+` pimple button on accord/proposition slots is
   * not rendered. Forwarded to each `SlotCard` in the row.
   */
  hideCardinalPlus?: boolean;
  /**
   * When true, the extra-slot `+` pimple (spawns Devis/Facture Garage 2, 3 …)
   * is not rendered. Forwarded to each `SlotCard` in the row.
   */
  hideExtraSlotPlus?: boolean;
  /**
   * Filter the row's slots by parsed cardinal ordinal. `'1-only'` keeps the
   * parent base + ordinal===1 slots; `'2-plus'` keeps only ordinal>=2 slots
   * (used by step 11 to show 2ème, 3ème, … cardinals exclusively).
   */
  cardinalFilter?: 'all' | '1-only' | '2-plus';
  /**
   * Round 9 item 004 — when set, each pending accord/proposition slot
   * (empty `docs`) renders an "Éditer" button that calls this callback
   * with the slot label. Used on assignations-chiffrage to route to the
   * structured editor scoped to that specific slot.
   */
  onEditSlot?: (slot: string) => void;
  /** Scopes the per-family collapse persistence (sessionStorage). */
  dossierId?: string;
  /**
   * Socket-to-socket drag (reclassify): called with the target slot and the
   * dragged document payload. Forwarded to each uploadable `SlotCard`.
   */
  onDocDrop?: (slot: string, payload: DocDragPayload) => void;
}

/**
 * Renders a single family (one garage + its accord/proposition variants) as
 * a collapsible navy header band (chevron · name · ordinal medallion for
 * extra garages · "n/m reçus" pill · optional `topAction`) followed by a
 * responsive grid of inventory slot sockets. Collapsing hides the grid and
 * keeps the band; the state persists per `dossier:family` in sessionStorage
 * (default expanded).
 */
export function FamilyRow({
  group,
  docsByType,
  canEdit,
  canDeleteDoc,
  userRole,
  canManageExtraSlots,
  isUploading,
  deletingId,
  extraSlotKindForSlot,
  onUpload,
  onDelete,
  onCreateNextCardinal,
  onCreateExtraSlot,
  onRenameExtraSlot,
  onPreview,
  topAction,
  hideCardinalPlus,
  hideExtraSlotPlus,
  cardinalFilter = 'all',
  onEditSlot,
  dossierId,
  onDocDrop,
}: FamilyRowProps) {
  const storageKey = `docfam-collapsed:${dossierId ?? 'dossier'}:${group.parent}`;
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try { return window.sessionStorage.getItem(storageKey) === 'true'; } catch { return false; }
  });
  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try { window.sessionStorage.setItem(storageKey, String(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };

  const visibleSlots = cardinalFilter === 'all'
    ? group.slots
    : group.slots.filter((s) => {
        const parsed = parseAccordDocType(s);
        if (cardinalFilter === '1-only') return parsed == null || parsed.ordinal === 1;
        // '2-plus'
        return parsed != null && parsed.ordinal >= 2;
      });

  if (visibleSlots.length === 0) return null;

  // "n/m reçus" — filled sockets over total sockets in this family.
  const receivedCount = visibleSlots.filter((s) =>
    (docsByType[s] || []).some((d) => !!d.url && !d.pendingUpload),
  ).length;

  return (
    <section
      className="space-y-3 border-t border-hairline pt-5 first:border-t-0 first:pt-0"
      aria-label={group.parent}
    >
      {/* Navy header band — the page's third colour. Whole band toggles the
          collapse; `topAction` sits outside the toggle button. */}
      <div className="flex min-h-10 items-center gap-2 rounded-lg bg-surface-2 pr-2 text-ink">
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Développer' : 'Réduire'} ${group.parent}`}
          className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-ink-3 transition-transform duration-150',
              collapsed && '-rotate-90',
            )}
            aria-hidden
          />
          <h3 className="min-w-0 truncate text-[13px] font-semibold text-ink" title={group.parent}>
            {group.parent}
          </h3>
          {/* Ordinal medallion — extra garages carry their round number. */}
          {group.parentOrdinal >= 2 && (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tertiary-bg text-[11px] font-semibold tabular-nums text-tertiary-deep"
              title={`Garage ${group.parentOrdinal}`}
              aria-label={`Garage numéro ${group.parentOrdinal}`}
            >
              {group.parentOrdinal}
            </span>
          )}
          <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium leading-4 tabular-nums text-ink-2">
            {receivedCount}/{visibleSlots.length} reçu{receivedCount > 1 ? 's' : ''}
          </span>
        </button>
        {topAction && (
          <div
            className="ml-auto flex shrink-0 items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {topAction}
          </div>
        )}
      </div>
      {!collapsed && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visibleSlots.map((slot) => (
            <SlotCard
              key={slot}
              slot={slot}
              docs={docsByType[slot] || []}
              canEdit={canEdit}
              canDeleteDoc={canDeleteDoc}
              userRole={userRole}
              isUploading={isUploading(slot)}
              deletingId={deletingId}
              extraSlotKind={extraSlotKindForSlot(slot)}
              canManageExtraSlots={canManageExtraSlots}
              onUpload={(files) => onUpload(slot, files)}
              onDelete={onDelete}
              onCreateNextCardinal={() => onCreateNextCardinal(slot)}
              onCreateExtraSlot={onCreateExtraSlot}
              onRenameExtraSlot={() => onRenameExtraSlot(slot)}
              onPreview={onPreview}
              hideCardinalPlus={hideCardinalPlus}
              hideExtraSlotPlus={hideExtraSlotPlus}
              onEdit={onEditSlot ? () => onEditSlot(slot) : undefined}
              onDocDrop={onDocDrop ? (payload) => onDocDrop(slot, payload) : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
