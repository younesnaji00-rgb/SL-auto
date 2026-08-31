'use client';

import React, { useRef } from 'react';
import { FileText, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseAccordDocType } from '@/lib/docType-accorde';
import { cn } from '@/lib/utils';
import { useReplayHighlight, highlightClass, ChangeBadge } from './replay-highlight';

export type ExtraSlotKind = 'devis' | 'facture';

export type TypedDoc = {
  id: string;
  nom?: string;
  fileName?: string;
  url?: string | null;
  type?: string;
  typeDocument?: string;
  uploadePar?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  storagePath?: string;
  pendingUpload?: boolean;
  taille?: number;
  // Marks a document as belonging to a gestionnaire-created extra slot
  // (rendered after "Devis Garage" / "Facture Garage"). The slot grouping
  // key is still the `type` string; this field is used only to detect
  // which slots are user-managed (pimple + rename affordances).
  extraSlot?: ExtraSlotKind;
};

export const isImage = (name: string) =>
  /\.(jpe?g|png|gif|webp|bmp)$/i.test(name || '');

export const isPdf = (name: string) => /\.pdf$/i.test(name || '');

export interface SlotCardProps {
  slot: string;
  docs: TypedDoc[];
  canEdit: boolean;
  canDeleteDoc: (d: TypedDoc) => boolean;
  userRole?: string;
  isUploading: boolean;
  deletingId: string | null;
  extraSlotKind?: ExtraSlotKind;
  canManageExtraSlots: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (d: TypedDoc) => void;
  onCreateNextCardinal: () => void;
  onCreateExtraSlot: (kind: ExtraSlotKind, files: File[]) => void;
  onRenameExtraSlot: () => void;
  onPreview: (d: TypedDoc) => void;
  /**
   * When true, the cardinal `+` pimple button (used to create the next
   * accord/proposition cardinal slot) is not rendered. The "extra slot"
   * pimple+ for spawning Devis Garage 2 / Facture Garage 2 is unaffected.
   * Used by step 6 to lock the cardinal chain to the current revision.
   */
  hideCardinalPlus?: boolean;
  /**
   * When true, the "extra slot" `+` pimple button next to base
   * `Devis Garage` / `Facture Garage` slots is not rendered (the one that
   * spawns Devis Garage 2 etc.). Used in step 1 where the base devis/facture
   * cards are display-only — extras live in the Accord step.
   */
  hideExtraSlotPlus?: boolean;
  /**
   * Round 9 item 004 — when set AND the slot is a pending accord/proposition
   * (no docs yet), render an "Éditer" button that calls this callback.
   * Used on assignations-chiffrage to route to the structured editor scoped
   * to this specific slot.
   */
  onEdit?: () => void;
}

// 24 px ghost icon control used in the card header (rename pencil, cardinal
// `+`, extra-slot `+`). Plain <button> rather than <Button> so the `title`
// tooltip still shows on the disabled cardinal `+` (shadcn's Button disables
// pointer events, which suppresses the native tooltip).
const HEADER_ICON_BUTTON_CLASS =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors ' +
  'hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground';

export function SlotCard({
  slot,
  docs,
  canEdit,
  canDeleteDoc,
  userRole,
  isUploading,
  deletingId,
  extraSlotKind,
  canManageExtraSlots,
  onUpload,
  onDelete,
  onCreateNextCardinal,
  onCreateExtraSlot,
  onRenameExtraSlot,
  onPreview,
  hideCardinalPlus,
  hideExtraSlotPlus,
  onEdit,
}: SlotCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const extraSlotInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const dragDepth = useRef(0);
  // Inert on the live editing page; in the rappel replica it tints documents
  // the gestionnaire added / changed during their treatment session.
  const hl = useReplayHighlight();

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) onUpload(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleExtraSlotPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0 && baseExtraKind) {
      onCreateExtraSlot(baseExtraKind, files);
    }
    if (extraSlotInputRef.current) extraSlotInputRef.current.value = '';
  };

  // Task #26 — accord/proposition slot detection.
  const parsedAccord = parseAccordDocType(slot);
  const isReformeSlot = slot === 'Réforme technique' || slot === 'Réforme économique';
  const isRapportSlot = slot.startsWith('Rapport ') || slot === 'Rapport final';
  // Cardinal accord/proposition rows must never accept manual uploads — the
  // chiffreur produces them via the editor save flow. Same applies to réforme
  // technique/économique slots and to any rapport slot (populated by the
  // "Générer le rapport" flow, never via direct upload).
  const hideUploadForAccord = !!parsedAccord || isReformeSlot || isRapportSlot;
  // Pimple "+" button appears on accord OR proposition slots; uncapped — chain
  // enforcement is via `cardinalPimpleDisabled` (current slot must be
  // chiffreur-filled before the next cardinal can be created).
  const showCardinalPimple =
    !!parsedAccord &&
    (parsedAccord.kind === 'accord' || parsedAccord.kind === 'proposition-accord');
  // Cardinal pimple is disabled until the current cardinal slot has a real (chiffreur-filled) doc
  // — not just a placeholder. Applies to all roles; the chiffreur produces the source doc via
  // the editor save flow, so other roles cannot bypass.
  const cardinalPimpleDisabled = !docs.some((d) => !d.pendingUpload && !!d.url);
  // Hide placeholder docs (no url) from the slot card so the chiffreur sees a
  // clean "En attente de chiffrage" + Éditer affordance instead of a
  // non-clickable "document En attente…" entry. Placeholders are bookkeeping
  // for the cardinal slot machinery — they shouldn't masquerade as files.
  const visibleDocs = docs.filter((d) => !!d.url);
  // Base-slot pimple: next to `Devis Garage` / `Facture Garage`, lets the
  // gestionnaire spawn a new numbered slot (first = "… 2", then 3, etc.).
  const baseExtraKind: ExtraSlotKind | null =
    slot === 'Devis Garage' ? 'devis'
    : slot === 'Facture Garage' ? 'facture'
    : null;
  // Extra garage slots created via the `+` file-picker are capped at 1 doc:
  // once they hold a file, hide the in-card Ajouter affordance. Base
  // `Devis Garage` / `Facture Garage` slots (extraSlotKind === undefined) keep
  // their multi-doc behaviour.
  const isFilledExtraSlot = !!extraSlotKind && docs.length >= 1;
  const showExtraSlotPimple = !!baseExtraKind && canManageExtraSlots && !hideExtraSlotPlus;
  // Rename pencil: only on gestionnaire-managed extras (not on the base
  // `Devis Garage` / `Facture Garage` and not on cardinal accord variants).
  const showRenameButton = !!extraSlotKind && canManageExtraSlots;

  // Drop accepted only when the upload UI itself is allowed for this slot.
  const dropEnabled = canEdit && !hideUploadForAccord && !isFilledExtraSlot;

  // Header status chip, derived from the same state that drives the body:
  // received / awaiting the chiffreur (no manual upload) / to be dropped.
  const hasDocs = visibleDocs.length > 0;
  const statusChip = hasDocs
    ? { label: 'Reçu', className: 'bg-status-success-bg text-status-success-fg' }
    : hideUploadForAccord
      ? { label: 'En attente', className: 'bg-muted text-muted-foreground' }
      : { label: 'À déposer', className: 'bg-status-warning-bg text-status-warning-fg' };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dropEnabled) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dropEnabled) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dropEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dropEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []).filter(
      (f) => f.type.startsWith('image/') || /\.pdf$/i.test(f.name),
    );
    if (files.length > 0) onUpload(files);
  };

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border border-border/80 bg-card transition-colors',
        isDragOver && 'ring-2 ring-primary/40 bg-primary/5',
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header: label · status chip · header controls */}
      <div className="flex min-h-10 items-center gap-2 border-b border-border/70 px-3 py-2">
        <h4 className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground" title={slot}>
          {slot}
        </h4>
        <span
          className={cn(
            'shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-4',
            statusChip.className,
          )}
        >
          {statusChip.label}
        </span>

        {showRenameButton && (
          <button
            type="button"
            className={HEADER_ICON_BUTTON_CLASS}
            onClick={onRenameExtraSlot}
            title="Renommer"
            aria-label="Renommer le slot"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}

        {showCardinalPimple && canEdit && !hideCardinalPlus && (
          <button
            type="button"
            onClick={onCreateNextCardinal}
            disabled={cardinalPimpleDisabled}
            className={HEADER_ICON_BUTTON_CLASS}
            title={
              cardinalPimpleDisabled
                ? "En attente de chiffrage : remplissez ce slot avant de créer le suivant."
                : "Créer le cardinal suivant"
            }
            aria-label="Créer le cardinal suivant"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}

        {showExtraSlotPimple && baseExtraKind && (
          <>
            <input
              ref={extraSlotInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={handleExtraSlotPick}
            />
            <button
              type="button"
              onClick={() => extraSlotInputRef.current?.click()}
              className={HEADER_ICON_BUTTON_CLASS}
              title={baseExtraKind === 'devis' ? 'Ajouter un devis' : 'Ajouter une facture'}
              aria-label={baseExtraKind === 'devis' ? 'Ajouter un devis' : 'Ajouter une facture'}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Body: document rows / empty state, then the upload affordance */}
      <div className="flex flex-1 flex-col gap-2 p-2">
        {visibleDocs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-3">
            <p className="text-center text-xs text-muted-foreground">
              {(parsedAccord || isReformeSlot) ? 'En attente de chiffrage' : 'Aucun document'}
            </p>
            {/* Round 9 item 004 — per-slot Éditer button on pending
                accord/proposition slots, vertically stacked under the
                status text (Q-2 → B). */}
            {onEdit && !!parsedAccord && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
                onClick={onEdit}
              >
                <Pencil className="h-3 w-3" />
                Éditer
              </Button>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {visibleDocs.map((d) => {
              const name = d.nom || d.fileName || 'document';
              const img = d.url && isImage(name);
              const clickable = !!d.url && !d.pendingUpload;
              // Chiffreur attribution: only on accord/proposition-accord slots
              // (i.e. true chiffrage outputs). Non-chiffrage docs (carte grise,
              // attestation, etc.) skip this footer line. When the chiffreur's
              // name is missing on an older doc, render nothing rather than a
              // placeholder.
              const chiffreurName =
                parsedAccord && typeof d.uploadedByName === 'string'
                  ? d.uploadedByName.trim()
                  : '';
              const replayStatus = hl.statusForEntry('documents', d.id);
              const isDeleting = deletingId === d.id;
              return (
                <li
                  key={d.id}
                  className={cn(
                    'group flex min-h-9 items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/60',
                    clickable && 'cursor-pointer',
                    highlightClass(replayStatus),
                  )}
                  onClick={() => clickable && onPreview(d)}
                >
                  {img ? (
                    <img
                      src={d.url!}
                      alt={name}
                      className="h-7 w-7 shrink-0 rounded object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[13px] leading-5 text-foreground" title={name}>
                      <span className="truncate">{name}</span>
                      <ChangeBadge status={replayStatus} className="shrink-0" />
                    </p>
                    {d.pendingUpload && (
                      <p className="text-[11px] leading-4 text-status-warning-fg">En attente…</p>
                    )}
                    {chiffreurName && (
                      <p
                        className="truncate text-[11px] leading-4 text-muted-foreground"
                        title={`Chiffré par ${chiffreurName}`}
                      >
                        Chiffré par {chiffreurName}
                      </p>
                    )}
                  </div>
                  {canDeleteDoc(d) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        'h-7 w-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100',
                        isDeleting && 'opacity-100',
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(d);
                      }}
                      disabled={isDeleting || !!d.pendingUpload}
                      title="Supprimer"
                      aria-label="Supprimer"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canEdit && !hideUploadForAccord && !isFilledExtraSlot && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={handlePick}
            />
            <button
              type="button"
              className={cn(
                'flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground transition-colors',
                'hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:text-muted-foreground',
              )}
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un document
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
