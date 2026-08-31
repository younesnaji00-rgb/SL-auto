'use client';

/**
 * One Devis/Facture family (a garage source + its accord / proposition
 * variants) rendered as a `DocumentGroup` of `SlotRow`s — GOV.UK-task-list
 * style, replacing the former slot-card grid.
 *
 * Header: family name · "n/m reçus" pill · header actions (extra-garage "+",
 * cardinal "Ajouter un accord", optional `topAction`). Rows: the source slot
 * first, then accords / propositions interleaved by ordinal (1er accord,
 * 1ère proposition, 2ème accord, …) so revision rounds read top → bottom.
 */

import React, { useRef } from 'react';
import { Plus } from 'lucide-react';
import type { DocFamily } from '@/lib/doc-family';
import { parseAccordDocType, type ParsedAccordDocType } from '@/lib/docType-accorde';
import { toOrdinalFr } from '@/lib/devis-schema';
import { DocumentGroup, DocumentList } from '@/components/documents/document-list';
import { TypedSlotRow } from '@/components/documents/typed-slot-row';
import { accordRowLabel, type ExtraSlotKind, type TypedDoc } from '@/components/documents/typed-doc';

interface FamilyRowProps {
  /** The family group (parent + ordered slot labels) to render. */
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
  /** Optional action rendered in the group header (chiffreur "Éditer web"). */
  topAction?: React.ReactNode;
  /** When true, the cardinal "Ajouter un accord" header action is hidden. */
  hideCardinalPlus?: boolean;
  /** When true, the extra-garage "+" header action is hidden. */
  hideExtraSlotPlus?: boolean;
  /** Filter the row's slots by parsed cardinal ordinal (see step 11). */
  cardinalFilter?: 'all' | '1-only' | '2-plus';
  /** Chiffreur side — "Éditer" on each pending accord/proposition row. */
  onEditSlot?: (slot: string) => void;
  /**
   * When true (default), the group is wrapped in its own `DocumentList`
   * outline card — for standalone hosts (assignations-chiffrage). The
   * dossier slot board passes `false` and stacks groups in one list.
   */
  standalone?: boolean;
}

// Ghost header action as a plain <button> so the native `title` tooltip shows
// even while disabled (shadcn's Button kills pointer events when disabled).
const HEADER_ACTION_CLASS =
  'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-ink-2 transition-colors ' +
  'hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:cursor-not-allowed disabled:text-ink-4 disabled:hover:bg-transparent';

const isFilled = (docs: TypedDoc[] | undefined) =>
  (docs || []).some((d) => !!d.url && !d.pendingUpload);

export function FamilyRow({
  group,
  docsByType,
  canEdit,
  canDeleteDoc,
  userRole: _userRole,
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
  standalone = true,
}: FamilyRowProps) {
  const extraSlotInputRef = useRef<HTMLInputElement>(null);

  const visibleSlots = cardinalFilter === 'all'
    ? group.slots
    : group.slots.filter((s) => {
        const parsed = parseAccordDocType(s);
        if (cardinalFilter === '1-only') return parsed == null || parsed.ordinal === 1;
        // '2-plus'
        return parsed != null && parsed.ordinal >= 2;
      });

  if (visibleSlots.length === 0) return null;

  // Source slot(s) first, then accords / propositions interleaved by ordinal
  // (accord before proposition within a round) so revisions read as rounds.
  const sourceSlots = visibleSlots.filter((s) => !parseAccordDocType(s));
  const accordSlots = visibleSlots
    .filter((s) => !!parseAccordDocType(s))
    .sort((a, b) => {
      const pa = parseAccordDocType(a)!;
      const pb = parseAccordDocType(b)!;
      if (pa.ordinal !== pb.ordinal) return pa.ordinal - pb.ordinal;
      if (pa.kind === pb.kind) return 0;
      return pa.kind === 'accord' ? -1 : 1;
    });
  const orderedSlots = [...sourceSlots, ...accordSlots];

  const receivedCount = orderedSlots.filter((s) => isFilled(docsByType[s])).length;

  // ── Cardinal "+" (group-level): create the next accord + proposition round.
  // Enabled once the LAST existing round holds a chiffreur-filled document —
  // the same chain rule the per-slot pimple enforced.
  const familyAccordParsed = group.slots
    .map((s) => ({ slot: s, parsed: parseAccordDocType(s) }))
    .filter((x): x is { slot: string; parsed: ParsedAccordDocType } => !!x.parsed);
  const maxOrdinal = familyAccordParsed.reduce((m, x) => Math.max(m, x.parsed.ordinal), 0);
  const lastRound = familyAccordParsed.filter((x) => x.parsed.ordinal === maxOrdinal);
  const lastRoundFilled = lastRound.some((x) => isFilled(docsByType[x.slot]));
  const cardinalSourceSlot =
    lastRound.find((x) => x.parsed.kind === 'accord')?.slot ?? lastRound[0]?.slot;
  const showCardinalPlus =
    canEdit && !hideCardinalPlus && !!cardinalSourceSlot &&
    accordSlots.length > 0;

  // ── Extra-garage "+" (base families only): spawn "Devis Garage 2 / 3…"
  // atomically with the first upload.
  const extraKind: ExtraSlotKind | null =
    group.parentOrdinal === 1
      ? group.sourceDocType === 'Devis Garage' ? 'devis' : 'facture'
      : null;
  const showExtraSlotPlus = !!extraKind && canManageExtraSlots && !hideExtraSlotPlus;

  const handleExtraSlotPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0 && extraKind) onCreateExtraSlot(extraKind, files);
    if (extraSlotInputRef.current) extraSlotInputRef.current.value = '';
  };

  const groupNode = (
    <DocumentGroup
      title={group.parent}
      subtitle={group.parentOrdinal >= 2 ? 'garage supplémentaire' : undefined}
      received={receivedCount}
      total={orderedSlots.length}
      actions={
        (topAction || showCardinalPlus || showExtraSlotPlus) ? (
          <>
            {topAction}
            {showExtraSlotPlus && extraKind && (
              <>
                <input
                  ref={extraSlotInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  className="hidden"
                  onChange={handleExtraSlotPick}
                  tabIndex={-1}
                  aria-hidden
                />
                <button
                  type="button"
                  className={HEADER_ACTION_CLASS}
                  onClick={() => extraSlotInputRef.current?.click()}
                  title={extraKind === 'devis'
                    ? 'Créer un slot « Devis Garage 2, 3… » (autre garage) avec le fichier choisi'
                    : 'Créer un slot « Facture Garage 2, 3… » (autre garage) avec le fichier choisi'}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {extraKind === 'devis' ? 'Nouveau devis' : 'Nouvelle facture'}
                </button>
              </>
            )}
            {showCardinalPlus && (
              <button
                type="button"
                className={HEADER_ACTION_CLASS}
                onClick={() => onCreateNextCardinal(cardinalSourceSlot!)}
                disabled={!lastRoundFilled}
                title={
                  lastRoundFilled
                    ? `Créer le ${toOrdinalFr(maxOrdinal + 1)} accord et sa proposition`
                    : 'En attente de chiffrage : remplissez le dernier accord avant de créer le suivant.'
                }
                aria-label="Ajouter un accord"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter un accord
              </button>
            )}
          </>
        ) : undefined
      }
    >
      {orderedSlots.map((slot) => {
        const parsed = parseAccordDocType(slot);
        const label = parsed ? accordRowLabel(parsed) : slot;
        const hint = parsed ? slot : 'document source';
        return (
          <TypedSlotRow
            key={slot}
            slot={slot}
            label={label}
            hint={hint}
            docs={docsByType[slot] || []}
            canEdit={canEdit}
            canDeleteDoc={canDeleteDoc}
            isUploading={isUploading(slot)}
            deletingId={deletingId}
            extraSlotKind={extraSlotKindForSlot(slot)}
            canManageExtraSlots={canManageExtraSlots}
            onUpload={(files) => onUpload(slot, files)}
            onDelete={onDelete}
            onRenameExtraSlot={() => onRenameExtraSlot(slot)}
            onPreview={onPreview}
            onEdit={onEditSlot ? () => onEditSlot(slot) : undefined}
          />
        );
      })}
    </DocumentGroup>
  );

  if (!standalone) return groupNode;
  return <DocumentList>{groupNode}</DocumentList>;
}
