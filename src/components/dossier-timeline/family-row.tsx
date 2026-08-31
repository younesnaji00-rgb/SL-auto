'use client';

import React from 'react';
import {
  SlotCard,
  type ExtraSlotKind,
  type TypedDoc,
} from './slot-card';
import type { DocFamily } from '@/lib/doc-family';
import { parseAccordDocType } from '@/lib/docType-accorde';

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
  onPreview: (d: TypedDoc) => void;
  /**
   * Optional action rendered inline at the right end of the family header
   * row (next to the name + count pill). Used on the chiffreur side for the
   * "Éditer web" button.
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
}

/**
 * Renders a single family (one garage + its accord/proposition variants) as
 * a header row (name · count pill · optional `topAction`) followed by a
 * responsive grid of slot cards. No outer box: families are separated by a
 * hairline + vertical spacing when they follow another section.
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
}: FamilyRowProps) {
  const visibleSlots = cardinalFilter === 'all'
    ? group.slots
    : group.slots.filter((s) => {
        const parsed = parseAccordDocType(s);
        if (cardinalFilter === '1-only') return parsed == null || parsed.ordinal === 1;
        // '2-plus'
        return parsed != null && parsed.ordinal >= 2;
      });

  if (visibleSlots.length === 0) return null;

  const totalDocs = visibleSlots.reduce(
    (acc, s) => acc + (docsByType[s]?.length || 0),
    0,
  );

  return (
    <section
      className="space-y-3 border-t border-border/70 pt-5 first:border-t-0 first:pt-0"
      aria-label={group.parent}
    >
      <div className="flex min-h-8 items-center gap-2">
        <h3 className="min-w-0 truncate text-[13px] font-semibold text-foreground" title={group.parent}>
          {group.parent}
        </h3>
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium leading-4 text-muted-foreground tabular-nums">
          {totalDocs} document{totalDocs > 1 ? 's' : ''}
        </span>
        {topAction && (
          <div className="ml-auto flex shrink-0 items-center">
            {topAction}
          </div>
        )}
      </div>
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
          />
        ))}
      </div>
    </section>
  );
}
