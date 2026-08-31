'use client';

/**
 * One dossier slot (Firestore `type` label) rendered as a `SlotRow` with its
 * `TypedDoc` files — the behavioural port of the retired `SlotCard`:
 *
 *  - accord / proposition / réforme / rapport slots never accept manual
 *    uploads (the chiffreur / report generator produces them);
 *  - gestionnaire-created extra garage slots are capped at 1 document and
 *    carry a "Renommer" action (⋯ menu);
 *  - placeholder docs (no `url`) stay hidden — they are cardinal-slot
 *    bookkeeping, not files;
 *  - pending accord slots can surface an "Éditer" action (chiffreur side);
 *  - the whole row is a drop target for image / PDF files;
 *  - session-replay tinting via `useReplayHighlight` (inert on live pages).
 */

import React, { useRef } from 'react';
import { MoreHorizontal, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { parseAccordDocType } from '@/lib/docType-accorde';
import { useReplayHighlight, highlightClass, ChangeBadge } from '@/components/dossier-timeline/replay-highlight';
import { SlotRow, DocumentItem, type SlotStatus } from './document-list';
import {
  docDisplayName,
  docMetaLine,
  downloadFileFromUrl,
  type ExtraSlotKind,
  type TypedDoc,
} from './typed-doc';

export interface TypedSlotRowProps {
  /** Firestore `type` label — the slot / grouping key. */
  slot: string;
  /** Display label (defaults to `slot`; families pass "1er accord"…). */
  label?: string;
  /** t-caption under the label (raw type, "obligatoire"…). */
  hint?: string;
  docs: TypedDoc[];
  canEdit: boolean;
  canDeleteDoc: (d: TypedDoc) => boolean;
  isUploading: boolean;
  deletingId: string | null;
  extraSlotKind?: ExtraSlotKind;
  canManageExtraSlots: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (d: TypedDoc) => void;
  onRenameExtraSlot?: () => void;
  onPreview: (d: TypedDoc) => void;
  /** Chiffreur side — "Éditer" on a pending accord/proposition slot. */
  onEdit?: () => void;
  /** Keeps the "Déposer" affordance always visible while the slot is empty. */
  required?: boolean;
  /** Chip override for an empty, uploadable slot ('missing' by default). */
  emptyStatus?: SlotStatus;
  id?: string;
}

export function TypedSlotRow({
  slot,
  label,
  hint,
  docs,
  canEdit,
  canDeleteDoc,
  isUploading,
  deletingId,
  extraSlotKind,
  canManageExtraSlots,
  onUpload,
  onDelete,
  onRenameExtraSlot,
  onPreview,
  onEdit,
  required,
  emptyStatus,
  id,
}: TypedSlotRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hl = useReplayHighlight();

  const parsedAccord = parseAccordDocType(slot);
  const isReformeSlot = slot === 'Réforme technique' || slot === 'Réforme économique';
  const isRapportSlot = slot.startsWith('Rapport ') || slot === 'Rapport final';
  // Cardinal accord/proposition rows never accept manual uploads — the
  // chiffreur produces them via the editor save flow. Same for réforme and
  // rapport slots (report-generator outputs).
  const hideUploadForAccord = !!parsedAccord || isReformeSlot || isRapportSlot;
  // Hide placeholder docs (no url) — cardinal bookkeeping, not files.
  const visibleDocs = docs.filter((d) => !!d.url);
  const hasDocs = visibleDocs.length > 0;
  // Extra garage slots are capped at 1 document.
  const isFilledExtraSlot = !!extraSlotKind && docs.length >= 1;
  const uploadAllowed = canEdit && !hideUploadForAccord && !isFilledExtraSlot;
  const showRename = !!extraSlotKind && canManageExtraSlots && !!onRenameExtraSlot;

  const status: SlotStatus = hasDocs
    ? 'received'
    : hideUploadForAccord
      ? 'pending'
      : (emptyStatus ?? 'missing');

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) onUpload(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const showEdit = !!onEdit && !!parsedAccord && !hasDocs;

  return (
    <SlotRow
      id={id}
      label={label ?? slot}
      hint={hint}
      title={slot}
      status={status}
      emptyText={
        parsedAccord || isReformeSlot
          ? 'En attente de chiffrage'
          : 'Aucun document'
      }
      onAdd={uploadAllowed ? () => inputRef.current?.click() : undefined}
      addLabel={hasDocs ? 'Ajouter' : 'Déposer'}
      addVisible={!hasDocs && required ? 'always' : 'reveal'}
      adding={isUploading}
      onFilesDropped={uploadAllowed ? onUpload : undefined}
      actions={
        <>
          {uploadAllowed && (
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={handlePick}
              tabIndex={-1}
              aria-hidden
            />
          )}
          {showEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs"
              onClick={onEdit}
            >
              <Pencil className="h-3 w-3" />
              Éditer
            </Button>
          )}
          {showRename && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-ink-3 hover:text-ink"
                  title="Actions du slot"
                  aria-label={`Actions — ${label ?? slot}`}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={onRenameExtraSlot}>
                  <Pencil className="h-3.5 w-3.5" />
                  Renommer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </>
      }
    >
      {visibleDocs.map((d) => {
        const name = docDisplayName(d);
        const replayStatus = hl.statusForEntry('documents', d.id);
        // Chiffreur attribution — only on true chiffrage outputs.
        const chiffreurName =
          parsedAccord && typeof d.uploadedByName === 'string' ? d.uploadedByName.trim() : '';
        return (
          <DocumentItem
            key={d.id}
            name={name}
            url={d.url}
            pending={!!d.pendingUpload}
            meta={docMetaLine(d)}
            note={
              chiffreurName ? (
                <p className="t-caption truncate" title={`Chiffré par ${chiffreurName}`}>
                  Chiffré par {chiffreurName}
                </p>
              ) : undefined
            }
            badge={<ChangeBadge status={replayStatus} className="shrink-0" />}
            className={highlightClass(replayStatus)}
            onOpen={() => onPreview(d)}
            onDownload={
              d.url ? () => downloadFileFromUrl(d.url!, name) : undefined
            }
            onDelete={canDeleteDoc(d) ? () => onDelete(d) : undefined}
            deleting={deletingId === d.id}
          />
        );
      })}
    </SlotRow>
  );
}
