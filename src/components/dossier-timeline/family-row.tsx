'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  SlotCard,
  type ExtraSlotKind,
  type TypedDoc,
} from './slot-card';
import type { DocFamily } from '@/lib/doc-family';

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
   * Optional action rendered as a floating element absolutely positioned at
   * the top-right of the family row, overlapping (bleeding into) the slot
   * cards below. Used on the chiffreur side for the "Éditer web" button.
   */
  topAction?: React.ReactNode;
}

/**
 * Renders a single family (one garage + its accord/proposition variants) as
 * a horizontal row with `overflow-x-auto` so children scroll when they
 * outgrow the container.
 *
 * `topAction`, if provided, is rendered as an absolutely-positioned floating
 * element at the top-right of the row container, overlapping the slot cards.
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
}: FamilyRowProps) {
  const totalDocs = group.slots.reduce(
    (acc, s) => acc + (docsByType[s]?.length || 0),
    0,
  );

  return (
    <div className="relative border rounded-lg bg-muted/10 p-2">
      {topAction && (
        <div className="absolute top-3 right-3 z-30 drop-shadow-md">
          {topAction}
        </div>
      )}
      <div className="flex items-center justify-between px-1 pb-2 pr-32">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {group.parent}
        </h3>
        <span className="text-[10px] text-muted-foreground font-medium">
          {totalDocs} doc{totalDocs === 1 ? '' : 's'}
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto scroll-smooth pb-1 snap-x snap-mandatory">
        {group.slots.map((slot) => (
          <div
            key={slot}
            className={cn(
              'min-w-[300px] w-[300px] shrink-0 snap-start',
            )}
          >
            <SlotCard
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
            />
          </div>
        ))}
      </div>
    </div>
  );
}
