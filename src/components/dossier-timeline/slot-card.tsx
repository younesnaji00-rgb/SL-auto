'use client';

/**
 * SlotCard — one document slot as a **game-inventory socket** (equipment-grid
 * convention: a uniform grid of sockets with unmistakable filled / empty /
 * locked states), translated into the app tokens — no fantasy chrome.
 *
 * Three states:
 *  1. Filled ("item in slot") — raised paper tile, the document visual
 *     dominant, hover lift (`shadow-raised` + `scale-[1.02]`), actions as a
 *     hover/focus overlay. A 2 px success top edge is the only received
 *     signal — no "Reçu" chip.
 *  2. Empty uploadable ("open socket") — recessed dashed well; the whole tile
 *     is the upload button AND the drop target.
 *  3. Locked — recessed, non-interactive, `Lock` icon: chiffreur-only
 *     accord / proposition / réforme / rapport slots without a document
 *     (plus any empty slot for read-only viewers).
 *
 * All behaviour is the original slot-card contract: cardinal `+` pimple with
 * chain gating, extra-garage `+` picker, rename pencil on extras, 1-doc cap on
 * extras, per-doc delete rules, chiffreur "Éditer" on pending accords,
 * session-replay highlighting.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, Loader2, Lock, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseAccordDocType } from '@/lib/docType-accorde';
import { cn } from '@/lib/utils';
import { useReplayHighlight, highlightClass, ChangeBadge } from './replay-highlight';
import { PdfThumbnail } from '@/components/common/pdf-thumbnail';
import {
  docDisplayName,
  docMetaLine,
  downloadFileFromUrl,
  isImage,
  isPdf,
  type ExtraSlotKind,
  type TypedDoc,
} from '@/components/documents/typed-doc';

// Canonical doc types + helpers now live in `@/components/documents/typed-doc`;
// re-exported here so historical importers keep compiling.
export { isImage, isPdf } from '@/components/documents/typed-doc';
export type { ExtraSlotKind, TypedDoc } from '@/components/documents/typed-doc';

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

// 24 px ghost icon control used for the slot controls (rename pencil, cardinal
// `+`, extra-slot `+`). Plain <button> rather than <Button> so the `title`
// tooltip still shows on the disabled cardinal `+` (shadcn's Button disables
// pointer events, which suppresses the native tooltip).
const HEADER_ICON_BUTTON_CLASS =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors ' +
  'hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:cursor-not-allowed disabled:text-ink-4 disabled:hover:bg-transparent';

// Recessed socket base — shared by the empty and locked states.
const SOCKET_BASE_CLASS =
  'flex min-h-[120px] w-full flex-col items-center justify-center gap-1 rounded-lg bg-surface-2 px-3 py-4 text-center ' +
  'shadow-[inset_0_1px_3px_hsl(var(--shadow-color)/0.08)]';

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
  void userRole; // accepted for prop compatibility; roles gate via callbacks
  const inputRef = useRef<HTMLInputElement>(null);
  const extraSlotInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
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
  // Cardinal accord/proposition slots must never accept manual uploads — the
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
  const cardinalPimpleDisabled = !docs.some((d) => !d.pendingUpload && !!d.url);
  // Hide placeholder docs (no url) — they are cardinal-slot bookkeeping, not
  // files, and must not masquerade as documents.
  const visibleDocs = docs.filter((d) => !!d.url);
  // Base-slot pimple: next to `Devis Garage` / `Facture Garage`, lets the
  // gestionnaire spawn a new numbered slot (first = "… 2", then 3, etc.).
  const baseExtraKind: ExtraSlotKind | null =
    slot === 'Devis Garage' ? 'devis'
    : slot === 'Facture Garage' ? 'facture'
    : null;
  // Extra garage slots created via the `+` file-picker are capped at 1 doc.
  const isFilledExtraSlot = !!extraSlotKind && docs.length >= 1;
  const showExtraSlotPimple = !!baseExtraKind && canManageExtraSlots && !hideExtraSlotPlus;
  // Rename pencil: only on gestionnaire-managed extras.
  const showRenameButton = !!extraSlotKind && canManageExtraSlots;

  // Drop accepted only when the upload UI itself is allowed for this slot.
  const dropEnabled = canEdit && !hideUploadForAccord && !isFilledExtraSlot;
  const uploadAllowed = dropEnabled;

  const filled = visibleDocs.length > 0;

  // `animate-scale-in` only on the empty → filled transition ("item lands in
  // the socket"), never on initial mount — page load must stay still.
  const prevFilled = useRef(filled);
  const [justFilled, setJustFilled] = useState(false);
  useEffect(() => {
    if (filled && !prevFilled.current) setJustFilled(true);
    prevFilled.current = filled;
  }, [filled]);

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

  // Slot controls (rename · cardinal + · extra +) — original placement rules.
  const hasControls =
    showRenameButton ||
    (showCardinalPimple && canEdit && !hideCardinalPlus) ||
    showExtraSlotPimple;
  const controls = hasControls ? (
    <>
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
            tabIndex={-1}
            aria-hidden
          />
          <button
            type="button"
            onClick={() => extraSlotInputRef.current?.click()}
            className={HEADER_ICON_BUTTON_CLASS}
            title={baseExtraKind === 'devis' ? 'Ajouter un devis (nouveau garage)' : 'Ajouter une facture (nouveau garage)'}
            aria-label={baseExtraKind === 'devis' ? 'Ajouter un devis' : 'Ajouter une facture'}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </>
  ) : null;

  const uploadInput = uploadAllowed ? (
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
  ) : null;

  // ── State 1: filled ("item in slot") ───────────────────────────────────────
  if (filled) {
    const primary = visibleDocs[0];
    const rest = visibleDocs.slice(1);
    const primaryName = docDisplayName(primary);
    const primaryClickable = !!primary.url && !primary.pendingUpload;
    const primaryReplay = hl.statusForEntry('documents', primary.id);
    const primaryDeleting = deletingId === primary.id;
    const chiffreurName =
      parsedAccord && typeof primary.uploadedByName === 'string'
        ? primary.uploadedByName.trim()
        : '';
    const meta = docMetaLine(primary);

    return (
      <div
        className={cn(
          'group relative flex min-h-[120px] flex-col overflow-hidden rounded-lg bg-card shadow-card dark:ring-1 dark:ring-hairline',
          'transition-[transform,box-shadow] duration-150 hover:scale-[1.02] hover:shadow-raised motion-reduce:transform-none motion-reduce:hover:scale-100',
          justFilled && 'animate-scale-in',
          isDragOver && 'bg-accent/40 ring-2 ring-primary/50',
        )}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* The only "received" signal — a 2 px success edge. No chip. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-status-success-fg/60" />
        {uploadInput}

        {/* Slot label + controls */}
        <div className="flex items-center gap-1 px-2.5 pb-1 pt-2">
          <span className="t-caption min-w-0 flex-1 truncate font-medium" title={slot}>{slot}</span>
          {controls}
        </div>

        {/* Item visual — image cover, first PDF page, or large glyph; overlay actions */}
        <div className="relative mx-2.5 h-20 shrink-0 overflow-hidden rounded-md bg-surface-2">
          {primary.url && isImage(primaryName) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={primary.url} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          ) : primary.url && isPdf(primaryName) ? (
            <PdfThumbnail url={primary.url} width={320} className="h-full w-full" />
          ) : (
            <div className="flex h-full items-center justify-center text-ink-3" aria-hidden>
              <FileText className="h-6 w-6" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-ink-solid/60 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={() => primaryClickable && onPreview(primary)}
              disabled={!primaryClickable}
              title="Aperçu"
              aria-label={`Aperçu — ${primaryName}`}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={() => primary.url && downloadFileFromUrl(primary.url, primaryName)}
              disabled={!primaryClickable}
              title="Télécharger"
              aria-label={`Télécharger — ${primaryName}`}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            {canDeleteDoc(primary) && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-7 w-7"
                onClick={() => onDelete(primary)}
                disabled={primaryDeleting || !!primary.pendingUpload}
                title="Supprimer"
                aria-label={`Supprimer — ${primaryName}`}
              >
                {primaryDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Name + meta */}
        <div className={cn('min-w-0 flex-1 rounded-md px-2.5 pb-2 pt-1.5', highlightClass(primaryReplay))}>
          <button
            type="button"
            onClick={() => primaryClickable && onPreview(primary)}
            className="flex w-full min-w-0 items-center gap-1.5 text-left focus-visible:outline-none"
            title={primaryName}
          >
            <span className="t-body-sm min-w-0 truncate font-medium">{primaryName}</span>
            <ChangeBadge status={primaryReplay} className="shrink-0" />
          </button>
          {primary.pendingUpload && (
            <p className="t-caption text-status-warning-fg">En attente…</p>
          )}
          {meta && <p className="t-caption truncate tabular-nums">{meta}</p>}
          {chiffreurName && (
            <p className="t-caption truncate" title={`Chiffré par ${chiffreurName}`}>
              Chiffré par {chiffreurName}
            </p>
          )}
        </div>

        {/* Additional documents in the same slot — compact stacked rows */}
        {rest.length > 0 && (
          <ul className="mx-2.5 mb-2 space-y-0.5 border-t border-hairline pt-1.5">
            {rest.map((d) => {
              const name = docDisplayName(d);
              const clickable = !!d.url && !d.pendingUpload;
              const replayStatus = hl.statusForEntry('documents', d.id);
              const isDeleting = deletingId === d.id;
              return (
                <li key={d.id} className={cn('flex h-6 min-w-0 items-center gap-1.5 rounded px-1', highlightClass(replayStatus))}>
                  <FileText className="h-3 w-3 shrink-0 text-ink-3" aria-hidden />
                  <button
                    type="button"
                    onClick={() => clickable && onPreview(d)}
                    className="t-caption min-w-0 flex-1 truncate text-left text-ink-2 hover:text-ink focus-visible:underline focus-visible:outline-none"
                    title={name}
                  >
                    {name}
                  </button>
                  <ChangeBadge status={replayStatus} className="shrink-0" />
                  {canDeleteDoc(d) && (
                    <button
                      type="button"
                      onClick={() => onDelete(d)}
                      disabled={isDeleting || !!d.pendingUpload}
                      className={cn(
                        'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-3 transition-opacity duration-150 hover:text-status-danger-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        '[@media(hover:hover)]:opacity-0 group-focus-within:opacity-100 group-hover:opacity-100',
                        isDeleting && 'opacity-100',
                      )}
                      title="Supprimer"
                      aria-label={`Supprimer — ${name}`}
                    >
                      {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Multi-doc sources keep an explicit add affordance */}
        {uploadAllowed && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="mx-2.5 mb-2 flex h-7 items-center justify-center gap-1.5 rounded-md border border-dashed border-hairline text-[11px] font-medium text-ink-3 transition-colors duration-150 hover:border-primary/50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Envoi…
              </>
            ) : (
              <>
                <Plus className="h-3 w-3" />
                Ajouter
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  // ── State 2: empty uploadable ("open socket") ─────────────────────────────
  if (uploadAllowed) {
    return (
      <div
        className="relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {uploadInput}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          aria-label={`Déposer un document — ${slot}`}
          className={cn(
            SOCKET_BASE_CLASS,
            'group/socket border border-dashed border-hairline-strong transition-colors duration-150',
            'hover:border-primary/50 hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:cursor-wait',
            isDragOver && 'bg-accent/40 ring-2 ring-primary/50',
          )}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin text-ink-3" aria-hidden />
          ) : (
            <Upload className="h-5 w-5 text-ink-3 transition-colors duration-150 group-hover/socket:text-ink" aria-hidden />
          )}
          <span
            className="t-body-sm w-full truncate font-medium text-ink-2 transition-colors duration-150 group-hover/socket:text-ink"
            title={slot}
          >
            {slot}
          </span>
          <span className="t-caption">{isUploading ? 'Envoi…' : 'Déposer'}</span>
        </button>
        {controls && (
          <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-0.5">{controls}</div>
        )}
      </div>
    );
  }

  // ── State 3: locked ("locked slot") ───────────────────────────────────────
  const lockText =
    parsedAccord || isReformeSlot
      ? 'En attente de chiffrage'
      : isRapportSlot
        ? "Généré depuis l'étape Rapport"
        : 'Aucun document';

  return (
    <div className="relative">
      <div className={cn(SOCKET_BASE_CLASS, 'border border-hairline')}>
        <Lock className="h-5 w-5 text-ink-4" aria-hidden />
        <span className="t-body-sm w-full truncate font-medium text-ink-3" title={slot}>{slot}</span>
        <span className="t-caption text-ink-4">{lockText}</span>
        {/* Round 9 item 004 — per-slot Éditer button on pending
            accord/proposition slots (chiffreur side). */}
        {onEdit && !!parsedAccord && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-1 h-7 gap-1.5 text-xs"
            onClick={onEdit}
          >
            <Pencil className="h-3 w-3" />
            Éditer
          </Button>
        )}
      </div>
      {controls && (
        <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-0.5">{controls}</div>
      )}
    </div>
  );
}
