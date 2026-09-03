'use client';

/**
 * SlotCard — one document slot as a **game-inventory socket** (equipment-grid
 * convention: a uniform grid of sockets with unmistakable filled / empty /
 * locked states), translated into the app tokens — no fantasy chrome.
 *
 * Used by the accord board (families, réforme, rapport, note d'honoraire,
 * ATG) AND by the step-1 Pièces tab, so the dossier has one visual language.
 *
 * The files of a slot are the PAGES of one document (a carte grise is shot
 * recto then verso). A slot holding n ≥ 2 files renders a 2-up page strip,
 * the slot title + "n pages · size · date · user" meta and a numbered pager
 * (per-page Aperçu · Télécharger · Supprimer). Pages are ordered by upload
 * time (oldest first). n = 1 keeps the single-item layout. Pages are added
 * only by the SmartInbox classifying a file into the same type — filled
 * tiles have no "add" affordance and accept no OS file drops.
 *
 * Socket-to-socket drag (correcting the AI's placement): a filled tile is
 * draggable (`application/x-sl-doc` = `{ docId, type }`); every socket the
 * user may upload into is a drop target — empty → "Déplacer ici" (move),
 * filled → "Échanger" (swap). The host performs the writes (`onDocDrop`).
 *
 * Three states:
 *  1. Filled ("item in slot") — raised paper tile, the document visual
 *     dominant (image cover / first PDF page), hover lift (`shadow-raised` +
 *     `scale-[1.02]`), actions as a hover/focus overlay. A 2 px success top
 *     edge is the only received signal — no "Reçu" chip.
 *  2. Empty uploadable ("open socket") — recessed dashed well; the whole tile
 *     is the upload button AND the file-drop target.
 *  3. Locked — recessed, non-interactive, `Lock` icon: chiffreur-only
 *     accord / proposition / réforme / rapport slots without a document
 *     (plus any empty slot for read-only viewers). Never a drop target.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, Loader2, Lock, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { parseAccordDocType } from '@/lib/docType-accorde';
import { cn } from '@/lib/utils';
import { useReplayHighlight, highlightClass, ChangeBadge } from './replay-highlight';
import { PdfThumbnail } from '@/components/common/pdf-thumbnail';
import {
  DOC_DRAG_MIME,
  docDisplayName,
  docMetaLine,
  docPagesMetaLine,
  downloadFileFromUrl,
  isImage,
  isPdf,
  readDocDragPayload,
  sortPagesAsc,
  writeDocDragPayload,
  type DocDragPayload,
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
  /**
   * Open the lightbox on `d`. `pages` (upload order) is passed for multi-page
   * slots so the host can enable ‹ › paging across the sibling files.
   */
  onPreview: (d: TypedDoc, pages?: TypedDoc[]) => void;
  /**
   * Socket-to-socket drag support. When set, a filled tile is draggable and
   * this socket accepts a dragged document (`payload.type` ≠ this slot):
   * the host moves (empty target) or swaps (filled target). Only slots the
   * user may upload into (`canEdit`, not chiffreur-only) take part.
   */
  onDocDrop?: (payload: DocDragPayload) => void;
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
  /**
   * Optional version-state chip (`Actuel` / `Remplacé` / `Envoyé` — spec B2)
   * rendered in the filled tile's header row, before the slot controls.
   * ADDITIVE-ONLY: when omitted the tile renders pixel-identically to before
   * (dossier-timeline callers pass nothing). Used by the chiffrage accord
   * pipeline (`components/chiffrage/accord-pipeline.tsx`).
   */
  versionChip?: React.ReactNode;
  /** DOM id on the tile root (summary-line links scroll/focus to it). */
  id?: string;
  /** `t-caption` under the slot name in the empty / locked states ("obligatoire"). */
  hint?: string;
  /** Caption of the empty uploadable socket (default "Déposer"; "Optionnel"…). */
  emptyCaption?: string;
  /** `accept` attribute of the file inputs (default `image/*,.pdf`). */
  accept?: string;
  /** Drop filter matching `accept` (default images + PDF). */
  acceptFile?: (f: File) => boolean;
  /** Selection mode: checkbox overlay on the filled tile (selects every page). */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

// 24 px ghost icon control used for the slot controls (rename pencil, cardinal
// `+`, extra-slot `+`). Plain <button> rather than <Button> so the `title`
// tooltip still shows on the disabled cardinal `+` (shadcn's Button disables
// pointer events, which suppresses the native tooltip).
const HEADER_ICON_BUTTON_CLASS =
  'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-ink-3 transition-colors ' +
  'hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:cursor-not-allowed disabled:text-ink-4 disabled:hover:bg-transparent';

/** Recessed socket base — shared by the empty and locked states (exported for sibling tiles). */
export const SOCKET_BASE_CLASS =
  'flex min-h-[120px] w-full flex-col items-center justify-center gap-1 rounded-[10px] bg-surface-2 px-3 py-4 text-center ' +
  'shadow-[inset_0_1px_3px_hsl(var(--shadow-color)/0.08)]';

/** Interactive dashed variant of the socket (empty uploadable / "add" tiles). */
export const SOCKET_OPEN_CLASS =
  'group/socket border border-dashed border-hairline-strong transition-colors duration-150 ' +
  'hover:border-primary/50 hover:bg-surface-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// Raised item tile (filled state).
const ITEM_TILE_CLASS =
  'group relative flex min-h-[120px] flex-col overflow-hidden rounded-[10px] bg-card shadow-card dark:ring-1 dark:ring-hairline ' +
  'transition-[transform,box-shadow] duration-150 hover:scale-[1.02] hover:shadow-raised motion-reduce:transform-none motion-reduce:hover:scale-100';

// Numbered page pill (multi-page pager).
const PAGE_PILL_CLASS =
  'inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2 ' +
  'transition-colors duration-150 hover:bg-surface-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

const DRAG_OVER_CLASS = 'bg-accent/40 ring-2 ring-primary/50';

const DEFAULT_ACCEPT = 'image/*,.pdf';
const defaultAcceptFile = (f: File) => f.type.startsWith('image/') || /\.pdf$/i.test(f.name);

type DragKind = 'file' | 'doc' | null;

/** One page's visual — image cover, first PDF page, or the file glyph. */
function PageThumb({ doc }: { doc: TypedDoc }) {
  const name = docDisplayName(doc);
  if (doc.url && isImage(name)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={doc.url} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-cover" />;
  }
  if (doc.url && isPdf(name)) {
    return <PdfThumbnail url={doc.url} width={320} className="h-full w-full" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center text-ink-3" aria-hidden>
      <FileText className="h-6 w-6" />
    </div>
  );
}

/** Dashed caption shown over a socket while a document hovers it. */
function DropCaption({ label }: { label: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-[10px]">
      <span className="rounded-md border border-dashed border-primary/60 bg-card px-2 py-1 text-xs font-medium text-ink shadow-card">
        {label}
      </span>
    </div>
  );
}

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
  onDocDrop,
  hideCardinalPlus,
  hideExtraSlotPlus,
  onEdit,
  versionChip,
  id,
  hint,
  emptyCaption = 'Déposer',
  accept = DEFAULT_ACCEPT,
  acceptFile = defaultAcceptFile,
  selectable,
  selected,
  onToggleSelect,
}: SlotCardProps) {
  void userRole; // accepted for prop compatibility; roles gate via callbacks
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const extraSlotInputRef = useRef<HTMLInputElement>(null);
  const [dragKind, setDragKind] = useState<DragKind>(null);
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
  // files, and must not masquerade as documents. What remains are the PAGES
  // of this slot's document, in upload order.
  const pages = sortPagesAsc(docs.filter((d) => !!d.url));
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

  const filled = pages.length > 0;
  // Explicit typed upload: click / OS file drop — EMPTY sockets only.
  const uploadAllowed = canEdit && !hideUploadForAccord && !isFilledExtraSlot && !filled;
  // Socket-to-socket document drag: any slot the user may upload into.
  const docDndEnabled = !!onDocDrop && canEdit && !hideUploadForAccord;

  // `animate-scale-in` only on the empty → filled transition ("item lands in
  // the socket"), never on initial mount — page load must stay still.
  const prevFilled = useRef(filled);
  const [justFilled, setJustFilled] = useState(false);
  useEffect(() => {
    if (filled && !prevFilled.current) setJustFilled(true);
    prevFilled.current = filled;
  }, [filled]);

  // ── Drop-target plumbing (OS files on empty sockets, documents anywhere allowed)
  const kindOf = (dt: DataTransfer): DragKind => {
    const types = Array.from(dt.types || []);
    if (docDndEnabled && types.includes(DOC_DRAG_MIME)) return 'doc';
    if (uploadAllowed && types.includes('Files')) return 'file';
    return null;
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    const kind = kindOf(e.dataTransfer);
    if (!kind) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setDragKind(kind);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    const kind = kindOf(e.dataTransfer);
    if (!kind) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = kind === 'doc' ? 'move' : 'copy';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dragKind) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragKind(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    const kind = kindOf(e.dataTransfer);
    dragDepth.current = 0;
    setDragKind(null);
    if (!kind) return;
    e.preventDefault();
    e.stopPropagation();
    if (kind === 'doc') {
      const payload = readDocDragPayload(e.dataTransfer);
      if (payload && payload.type !== slot) onDocDrop?.(payload);
      return;
    }
    const files = Array.from(e.dataTransfer.files || []).filter(acceptFile);
    if (files.length > 0) onUpload(files);
  };

  const dropProps = {
    onDragEnter: handleDragEnter,
    onDragOver: handleDragOver,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop,
  };

  // ── Drag source (filled tiles): the whole tile is the drag image.
  const draggable = filled && docDndEnabled;
  const handleDragStart = (e: React.DragEvent<HTMLElement>) => {
    if (!draggable) return;
    writeDocDragPayload(e.dataTransfer, { docId: pages[0].id, type: slot });
    if (rootRef.current) e.dataTransfer.setDragImage(rootRef.current, 24, 24);
  };
  const dragSourceProps = draggable
    ? { draggable: true, onDragStart: handleDragStart, title: 'Glisser vers un autre emplacement pour reclasser' }
    : {};

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
            accept={accept}
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

  const selectionOverlay = (anySelectable: boolean) =>
    selectable ? (
      <div className="absolute left-1.5 top-1.5 z-10 rounded bg-card p-0.5 shadow-card">
        <Checkbox
          checked={!!selected}
          onCheckedChange={onToggleSelect}
          disabled={!anySelectable}
          aria-label={`Sélectionner ${slot}`}
        />
      </div>
    ) : null;

  const tileClass = cn(
    ITEM_TILE_CLASS,
    justFilled && 'animate-scale-in',
    dragKind && DRAG_OVER_CLASS,
    selectable && selected && 'ring-2 ring-primary',
  );
  const docDropCaption = dragKind === 'doc' ? <DropCaption label={filled ? 'Échanger' : 'Déplacer ici'} /> : null;

  // ── State 1b: filled, multi-page (n ≥ 2) ──────────────────────────────────
  if (pages.length >= 2) {
    const n = pages.length;
    const latest = pages[n - 1];
    const meta = docPagesMetaLine(pages);
    const anySelectable = pages.some((p) => !!p.url && !p.pendingUpload);
    const chiffreurName =
      parsedAccord && typeof latest.uploadedByName === 'string' ? latest.uploadedByName.trim() : '';

    return (
      <div id={id} ref={rootRef} className={tileClass} {...dropProps}>
        {/* The only "received" signal — a 2 px success edge. No chip. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-status-success-fg/60" />

        {/* Controls row (only when a control or a version chip exists) */}
        {versionChip ? (
          <div className="flex items-center justify-between gap-1 px-2.5 pt-2">
            {versionChip}
            <div className="flex items-center gap-1">{controls}</div>
          </div>
        ) : controls ? (
          <div className="flex items-center justify-end gap-1 px-2.5 pt-2">{controls}</div>
        ) : (
          <div className="pt-2" aria-hidden />
        )}

        {/* Page strip — the first two pages 2-up, "+n" on the second when more.
            Draggable: carries every page of this document. */}
        <div
          className={cn('relative mx-2.5 mt-1 h-20 shrink-0 overflow-hidden rounded-md bg-hairline', draggable && 'cursor-grab active:cursor-grabbing')}
          {...dragSourceProps}
        >
          <button
            type="button"
            onClick={() => onPreview(pages[0], pages)}
            className="grid h-full w-full grid-cols-2 gap-px text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Aperçu — ${slot} (${n} pages)`}
          >
            <span className="relative block h-full overflow-hidden bg-surface-2">
              <PageThumb doc={pages[0]} />
            </span>
            <span className="relative block h-full overflow-hidden bg-surface-2">
              <PageThumb doc={pages[1]} />
              {n > 2 && (
                <span className="absolute inset-0 flex items-center justify-center bg-ink-solid/60 text-[13px] font-semibold tabular-nums text-on-ink">
                  +{n - 2}
                </span>
              )}
            </span>
          </button>
          {selectionOverlay(anySelectable)}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-solid/60 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
            <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-card px-2 text-xs font-medium text-ink">
              <Eye className="h-3.5 w-3.5" aria-hidden />
              Aperçu
            </span>
          </div>
        </div>

        {/* Document title + pages meta */}
        <div className="min-w-0 px-2.5 pb-1 pt-1.5">
          <p className="t-body-sm truncate font-medium" title={slot}>{slot}</p>
          {meta && <p className="t-caption truncate tabular-nums">{meta}</p>}
          {chiffreurName && (
            <p className="t-caption truncate" title={`Chiffré par ${chiffreurName}`}>
              Chiffré par {chiffreurName}
            </p>
          )}
        </div>

        {/* Pager — numbered pills with per-page actions */}
        <div className="flex flex-wrap items-center gap-1 px-2.5 pb-2" aria-label="Pages">
          {pages.map((p, i) => {
            const name = docDisplayName(p);
            const clickable = !!p.url && !p.pendingUpload;
            const isDeleting = deletingId === p.id;
            const replayStatus = hl.statusForEntry('documents', p.id);
            return (
              <DropdownMenu key={p.id}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(PAGE_PILL_CLASS, highlightClass(replayStatus))}
                    aria-label={`Page ${i + 1} — ${name}`}
                    title={name}
                  >
                    {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem disabled={!clickable} onSelect={() => onPreview(p, pages)}>
                    <Eye className="h-3.5 w-3.5" />
                    Aperçu
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!clickable} onSelect={() => { if (p.url) downloadFileFromUrl(p.url, name); }}>
                    <Download className="h-3.5 w-3.5" />
                    Télécharger
                  </DropdownMenuItem>
                  {canDeleteDoc(p) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={isDeleting || !!p.pendingUpload}
                        className="text-status-danger-fg focus:text-status-danger-fg"
                        onSelect={() => onDelete(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Supprimer
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
        {docDropCaption}
      </div>
    );
  }

  // ── State 1a: filled, single page ─────────────────────────────────────────
  if (filled) {
    const primary = pages[0];
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
      <div id={id} ref={rootRef} className={tileClass} {...dropProps}>
        {/* The only "received" signal — a 2 px success edge. No chip. */}
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-status-success-fg/60" />

        {/* Slot label + optional version chip + controls */}
        <div className="flex items-center gap-1 px-2.5 pb-1 pt-2">
          <span className="t-caption min-w-0 flex-1 truncate font-medium" title={slot}>{slot}</span>
          {versionChip}
          {controls}
        </div>

        {/* Item visual — image cover, first PDF page, or large glyph; overlay
            actions. Draggable to another socket to reclassify. */}
        <div
          className={cn('relative mx-2.5 h-20 shrink-0 overflow-hidden rounded-md bg-surface-2', draggable && 'cursor-grab active:cursor-grabbing')}
          {...dragSourceProps}
        >
          <PageThumb doc={primary} />
          {selectionOverlay(primaryClickable)}
          <div className="absolute inset-0 flex items-center justify-center gap-1 bg-ink-solid/60 opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7"
              onClick={() => primaryClickable && onPreview(primary, pages)}
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
            onClick={() => primaryClickable && onPreview(primary, pages)}
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
        {docDropCaption}
      </div>
    );
  }

  // ── State 2: empty uploadable ("open socket") ─────────────────────────────
  if (uploadAllowed) {
    return (
      <div id={id} className="relative" {...dropProps}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="hidden"
          onChange={handlePick}
          tabIndex={-1}
          aria-hidden
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          aria-label={`Déposer un document — ${slot}`}
          className={cn(
            SOCKET_BASE_CLASS,
            SOCKET_OPEN_CLASS,
            'disabled:cursor-wait',
            dragKind && DRAG_OVER_CLASS,
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
          <span className="t-caption">{isUploading ? 'Envoi…' : emptyCaption}</span>
          {hint && !isUploading && <span className="t-caption w-full truncate text-ink-4" title={hint}>{hint}</span>}
        </button>
        {controls && (
          <div className="absolute right-1.5 top-1.5 z-10 flex items-center gap-0.5">{controls}</div>
        )}
        {docDropCaption}
      </div>
    );
  }

  // ── State 3: locked ("locked slot") — never a drop target ─────────────────
  const lockText =
    parsedAccord || isReformeSlot
      ? 'En attente de chiffrage'
      : isRapportSlot
        ? "Généré depuis l'étape Rapport"
        : 'Aucun document';

  return (
    <div id={id} className="relative">
      {/* Lighter than a disabled button (user ruling 2026-09-01): near-white
          fill + faint SOLID edge + lock. Dashed stays reserved for "drop here". */}
      <div className={cn(SOCKET_BASE_CLASS, 'border border-hairline bg-card/60')}>
        <Lock className="h-5 w-5 text-ink-4" aria-hidden />
        <span className="t-body-sm w-full truncate font-medium text-ink-3" title={slot}>{slot}</span>
        <span className="t-caption text-ink-4">{lockText}</span>
        {hint && <span className="t-caption w-full truncate text-ink-4" title={hint}>{hint}</span>}
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
