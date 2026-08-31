'use client';

/**
 * Accord matrix — the ≥ md layout of the accord board (dossier steps 6 / 11).
 *
 * One garage "unit" (the Devis family + its Facture counterpart, paired by
 * parent ordinal) renders as a `DocumentGroup` whose body is a 3-column
 * matrix (IBM Carbon data table):
 *
 *     Étape                 Devis                    Facture
 *     Document source       [file]                   [Déposer]
 *     1ère proposition      En attente de chiffrage  —
 *     1er accord            [file]                   [file]
 *     2ème proposition      …                        …
 *
 * so the negotiation rounds read once, chronologically, across both document
 * kinds instead of as two separate stacks. No per-cell status chips — the
 * visible file IS the status (GOV.UK: tag only where state isn't
 * self-evident); the group pill stays the only summary.
 *
 * Below md the matrix would crush, so each unit falls back to the SlotRow
 * list (`TypedSlotRow`) with a Devis / Facture sub-label per side.
 */

import React, { useRef, useState } from 'react';
import { Loader2, MoreHorizontal, Pencil, Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DocFamily } from '@/lib/doc-family';
import { parseAccordDocType, mapToAccorde } from '@/lib/docType-accorde';
import { toOrdinalFr, toOrdinalFeminineFr } from '@/lib/devis-schema';
import { cn } from '@/lib/utils';
import { useReplayHighlight, highlightClass, ChangeBadge } from '@/components/dossier-timeline/replay-highlight';
import { DocumentGroup, DocumentItem } from './document-list';
import { TypedSlotRow } from './typed-slot-row';
import {
  docDisplayName,
  docMetaLine,
  downloadFileFromUrl,
  type ExtraSlotKind,
  type TypedDoc,
} from './typed-doc';

// ── Shared plumbing ──────────────────────────────────────────────────────────

export interface MatrixSlotHandlers {
  docsByType: Record<string, TypedDoc[]>;
  canEdit: boolean;
  canDeleteDoc: (d: TypedDoc) => boolean;
  isUploading: (slot: string) => boolean;
  deletingId: string | null;
  extraSlotKindForSlot: (slot: string) => ExtraSlotKind | undefined;
  canManageExtraSlots: boolean;
  onUpload: (slot: string, files: File[]) => void;
  onDelete: (d: TypedDoc) => void;
  onRenameExtraSlot: (slot: string) => void;
  onPreview: (d: TypedDoc) => void;
}

/** A Devis family and its Facture counterpart, paired by parent ordinal. */
export interface GarageUnit {
  key: string;
  devis?: DocFamily;
  facture?: DocFamily;
}

type CardinalFilter = 'all' | '1-only' | '2-plus';

const filterFamilySlots = (fam: DocFamily | undefined, cardinalFilter: CardinalFilter): string[] => {
  if (!fam) return [];
  if (cardinalFilter === 'all') return fam.slots;
  return fam.slots.filter((s) => {
    const parsed = parseAccordDocType(s);
    if (cardinalFilter === '1-only') return parsed == null || parsed.ordinal === 1;
    return parsed != null && parsed.ordinal >= 2;
  });
};

const isSlotFilled = (docs: TypedDoc[] | undefined) =>
  (docs || []).some((d) => !!d.url && !d.pendingUpload);

/** Compact Étape / mobile-row label for any slot of the unit. */
const rowLabelForSlot = (slot: string): string => {
  const parsed = parseAccordDocType(slot);
  if (!parsed) return slot;
  return parsed.kind === 'accord'
    ? `${toOrdinalFr(parsed.ordinal)} accord`
    : `${toOrdinalFeminineFr(parsed.ordinal)} proposition`;
};

const ACCEPT_DROP = (f: File) => f.type.startsWith('image/') || /\.pdf$/i.test(f.name);

// Same ghost header action as the family rows — plain <button> so the native
// `title` tooltip survives the disabled state.
const HEADER_ACTION_CLASS =
  'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-ink-2 transition-colors ' +
  'hover:bg-surface-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
  'disabled:cursor-not-allowed disabled:text-ink-4 disabled:hover:bg-transparent';

// ── One matrix cell ──────────────────────────────────────────────────────────

function MatrixCell({ slot, handlers }: { slot?: string; handlers: MatrixSlotHandlers }) {
  const hl = useReplayHighlight();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const dragDepth = useRef(0);

  // A round that doesn't exist on this side — quiet dash, no affordance.
  if (!slot) {
    return (
      <div className="py-2.5 text-[13px] leading-5 text-ink-4" aria-hidden>
        —
      </div>
    );
  }

  const docs = handlers.docsByType[slot] || [];
  const visibleDocs = docs.filter((d) => !!d.url);
  const parsed = parseAccordDocType(slot);
  const isReformeSlot = slot === 'Réforme technique' || slot === 'Réforme économique';
  const isRapportSlot = slot.startsWith('Rapport ') || slot === 'Rapport final';
  const chiffreurOnly = !!parsed || isReformeSlot || isRapportSlot;
  const extraKind = handlers.extraSlotKindForSlot(slot);
  const isFilledExtraSlot = !!extraKind && docs.length >= 1;
  const uploadable = handlers.canEdit && !chiffreurOnly && !isFilledExtraSlot;
  const showRename = !!extraKind && handlers.canManageExtraSlots;
  const uploading = handlers.isUploading(slot);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) handlers.onUpload(slot, files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!uploadable || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setDragOver(true);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!uploadable || !e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!uploadable) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragOver(false);
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!uploadable) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []).filter(ACCEPT_DROP);
    if (files.length > 0) handlers.onUpload(slot, files);
  };

  return (
    <div
      className={cn(
        'group/row min-w-0 py-2.5 transition-colors',
        uploadable && dragOver && 'rounded-md bg-accent/30 ring-1 ring-inset ring-primary/40',
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {uploadable && (
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
      <div className="flex items-start gap-1">
        <div className="min-w-0 flex-1 space-y-0.5">
          {visibleDocs.length > 0 ? (
            <>
              {visibleDocs.map((d) => {
                const name = docDisplayName(d);
                const replayStatus = hl.statusForEntry('documents', d.id);
                const chiffreurName =
                  parsed && typeof d.uploadedByName === 'string' ? d.uploadedByName.trim() : '';
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
                    onOpen={() => handlers.onPreview(d)}
                    onDownload={d.url ? () => downloadFileFromUrl(d.url!, name) : undefined}
                    onDelete={handlers.canDeleteDoc(d) ? () => handlers.onDelete(d) : undefined}
                    deleting={handlers.deletingId === d.id}
                  />
                );
              })}
              {uploadable && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-7 gap-1.5 px-2 text-ink-2',
                    !uploading &&
                      '[@media(hover:hover)]:opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100',
                  )}
                  onClick={() => inputRef.current?.click()}
                  disabled={uploading}
                  aria-label={`Ajouter — ${slot}`}
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? 'Envoi…' : 'Ajouter'}
                </Button>
              )}
            </>
          ) : uploadable ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-ink-2"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              aria-label={`Déposer — ${slot}`}
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {uploading ? 'Envoi…' : 'Déposer'}
            </Button>
          ) : chiffreurOnly ? (
            <p className="t-caption py-1 italic text-ink-4">En attente de chiffrage</p>
          ) : (
            <p className="t-caption py-1">Aucun document</p>
          )}
        </div>
        {showRename && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn(
                  'h-7 w-7 shrink-0 text-ink-3 hover:text-ink',
                  '[@media(hover:hover)]:opacity-0 group-focus-within/row:opacity-100 group-hover/row:opacity-100',
                )}
                title="Actions du slot"
                aria-label={`Actions — ${slot}`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => handlers.onRenameExtraSlot(slot)}>
                <Pencil className="h-3.5 w-3.5" />
                Renommer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// ── Matrix rows ──────────────────────────────────────────────────────────────

interface MatrixRow {
  key: string;
  label: string;
  hint?: string;
  devisSlot?: string;
  factureSlot?: string;
}

const COLS: Record<1 | 2, string> = {
  1: 'grid-cols-[10rem_minmax(0,1fr)]',
  2: 'grid-cols-[10rem_minmax(0,1fr)_minmax(0,1fr)]',
};

function MatrixTable({
  rows,
  columns,
  handlers,
}: {
  rows: MatrixRow[];
  columns: Array<'devis' | 'facture'>;
  handlers: MatrixSlotHandlers;
}) {
  const cols = COLS[columns.length as 1 | 2];
  return (
    <div className="hidden border-t border-hairline md:block">
      {/* Column sub-header */}
      <div className={cn('grid gap-x-4 bg-surface-2 px-4 py-1.5', cols)}>
        <span className="t-label">Étape</span>
        {columns.includes('devis') && <span className="t-label">Devis</span>}
        {columns.includes('facture') && <span className="t-label">Facture</span>}
      </div>
      <div className="divide-y divide-hairline">
        {rows.map((r) => (
          <div key={r.key} className={cn('grid gap-x-4 px-4', cols)}>
            <div className="py-2.5">
              <p className="t-body-sm font-medium text-ink">{r.label}</p>
              {r.hint && <p className="t-caption truncate">{r.hint}</p>}
            </div>
            {columns.includes('devis') && <MatrixCell slot={r.devisSlot} handlers={handlers} />}
            {columns.includes('facture') && <MatrixCell slot={r.factureSlot} handlers={handlers} />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── One garage unit as a matrix group ────────────────────────────────────────

export interface AccordMatrixGroupProps {
  unit: GarageUnit;
  handlers: MatrixSlotHandlers;
  hideCardinalPlus?: boolean;
  hideExtraSlotPlus?: boolean;
  cardinalFilter?: CardinalFilter;
  onCreateNextCardinal: (slot: string) => void;
  onCreateExtraSlot: (kind: ExtraSlotKind, files: File[]) => void;
}

export function AccordMatrixGroup({
  unit,
  handlers,
  hideCardinalPlus,
  hideExtraSlotPlus,
  cardinalFilter = 'all',
  onCreateNextCardinal,
  onCreateExtraSlot,
}: AccordMatrixGroupProps) {
  const devisInputRef = useRef<HTMLInputElement>(null);
  const factureInputRef = useRef<HTMLInputElement>(null);

  const devisSlots = filterFamilySlots(unit.devis, cardinalFilter);
  const factureSlots = filterFamilySlots(unit.facture, cardinalFilter);
  if (devisSlots.length === 0 && factureSlots.length === 0) return null;

  const devisSet = new Set(devisSlots);
  const factureSet = new Set(factureSlots);
  const columns: Array<'devis' | 'facture'> = [];
  if (devisSlots.length > 0) columns.push('devis');
  if (factureSlots.length > 0) columns.push('facture');

  const isExtraUnit = (unit.devis?.parentOrdinal ?? unit.facture?.parentOrdinal ?? 1) >= 2;

  // ── Rows: Document source, then each round (proposition before accord). ──
  const rounds = new Map<number, { prop: boolean; accord: boolean }>();
  for (const s of [...devisSlots, ...factureSlots]) {
    const p = parseAccordDocType(s);
    if (!p) continue;
    const r = rounds.get(p.ordinal) ?? { prop: false, accord: false };
    if (p.kind === 'accord') r.accord = true;
    else r.prop = true;
    rounds.set(p.ordinal, r);
  }

  const sideSlot = (
    fam: DocFamily | undefined,
    set: Set<string>,
    kind: 'source' | 'accord' | 'prop',
    ordinal: number,
  ): string | undefined => {
    if (!fam) return undefined;
    const label = kind === 'source'
      ? fam.parent
      : mapToAccorde(fam.parent, kind === 'accord' ? 'accord' : 'proposition-accord', ordinal);
    return set.has(label) ? label : undefined;
  };

  const rows: MatrixRow[] = [];
  const sourceDevis = sideSlot(unit.devis, devisSet, 'source', 0);
  const sourceFacture = sideSlot(unit.facture, factureSet, 'source', 0);
  if (sourceDevis || sourceFacture) {
    rows.push({
      key: 'source',
      label: 'Document source',
      hint: isExtraUnit ? 'garage supplémentaire' : 'déposé par le gestionnaire',
      devisSlot: sourceDevis,
      factureSlot: sourceFacture,
    });
  }
  for (const n of [...rounds.keys()].sort((a, b) => a - b)) {
    const flags = rounds.get(n)!;
    if (flags.prop) {
      rows.push({
        key: `p${n}`,
        label: `${toOrdinalFeminineFr(n)} proposition`,
        devisSlot: sideSlot(unit.devis, devisSet, 'prop', n),
        factureSlot: sideSlot(unit.facture, factureSet, 'prop', n),
      });
    }
    if (flags.accord) {
      rows.push({
        key: `a${n}`,
        label: `${toOrdinalFr(n)} accord`,
        devisSlot: sideSlot(unit.devis, devisSet, 'accord', n),
        factureSlot: sideSlot(unit.facture, factureSet, 'accord', n),
      });
    }
  }

  // ── Group pill: filled cells / existing cells (the only summary). ──
  const cellSlots = rows.flatMap((r) => [r.devisSlot, r.factureSlot]).filter((s): s is string => !!s);
  const received = cellSlots.filter((s) => isSlotFilled(handlers.docsByType[s])).length;

  // ── Cardinal "+": next round on the negotiation side (devis when present).
  // Same chain rule as before: enabled once the LAST round holds a
  // chiffreur-filled document.
  const cardinalSide =
    unit.devis && unit.devis.slots.some((s) => parseAccordDocType(s))
      ? unit.devis
      : unit.facture && unit.facture.slots.some((s) => parseAccordDocType(s))
        ? unit.facture
        : undefined;
  let showCardinalPlus = false;
  let cardinalDisabled = true;
  let cardinalSourceSlot: string | undefined;
  let cardinalNextOrdinal = 2;
  if (cardinalSide && handlers.canEdit && !hideCardinalPlus && rounds.size > 0) {
    const parsedSlots = cardinalSide.slots
      .map((s) => ({ slot: s, parsed: parseAccordDocType(s) }))
      .filter((x): x is { slot: string; parsed: NonNullable<ReturnType<typeof parseAccordDocType>> } => !!x.parsed);
    const maxOrdinal = parsedSlots.reduce((m, x) => Math.max(m, x.parsed.ordinal), 0);
    if (maxOrdinal > 0) {
      const lastRound = parsedSlots.filter((x) => x.parsed.ordinal === maxOrdinal);
      cardinalSourceSlot =
        lastRound.find((x) => x.parsed.kind === 'accord')?.slot ?? lastRound[0]?.slot;
      cardinalDisabled = !lastRound.some((x) => isSlotFilled(handlers.docsByType[x.slot]));
      cardinalNextOrdinal = maxOrdinal + 1;
      showCardinalPlus = !!cardinalSourceSlot;
    }
  }

  // ── Extra-garage "+" (base unit only): spawn "… Garage 2, 3…" with the
  // first upload.
  const showExtraDevisPlus =
    !isExtraUnit && !!unit.devis && handlers.canManageExtraSlots && !hideExtraSlotPlus;
  const showExtraFacturePlus =
    !isExtraUnit && !!unit.facture && handlers.canManageExtraSlots && !hideExtraSlotPlus;

  const handleExtraPick = (kind: ExtraSlotKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) onCreateExtraSlot(kind, files);
    const ref = kind === 'devis' ? devisInputRef : factureInputRef;
    if (ref.current) ref.current.value = '';
  };

  const title =
    unit.devis && unit.facture
      ? (isExtraUnit ? `${unit.devis.parent} & ${unit.facture.parent}` : 'Devis & Facture Garage')
      : (unit.devis?.parent ?? unit.facture?.parent ?? 'Garage');

  return (
    <DocumentGroup
      bodyAs="plain"
      title={title}
      subtitle={isExtraUnit ? 'garage supplémentaire' : undefined}
      received={received}
      total={cellSlots.length}
      actions={
        (showExtraDevisPlus || showExtraFacturePlus || showCardinalPlus) ? (
          <>
            {showExtraDevisPlus && (
              <>
                <input ref={devisInputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleExtraPick('devis')} tabIndex={-1} aria-hidden />
                <button
                  type="button"
                  className={HEADER_ACTION_CLASS}
                  onClick={() => devisInputRef.current?.click()}
                  title="Créer un slot « Devis Garage 2, 3… » (autre garage) avec le fichier choisi"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouveau devis
                </button>
              </>
            )}
            {showExtraFacturePlus && (
              <>
                <input ref={factureInputRef} type="file" accept="image/*,.pdf" multiple className="hidden" onChange={handleExtraPick('facture')} tabIndex={-1} aria-hidden />
                <button
                  type="button"
                  className={HEADER_ACTION_CLASS}
                  onClick={() => factureInputRef.current?.click()}
                  title="Créer un slot « Facture Garage 2, 3… » (autre garage) avec le fichier choisi"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Nouvelle facture
                </button>
              </>
            )}
            {showCardinalPlus && cardinalSourceSlot && (
              <button
                type="button"
                className={HEADER_ACTION_CLASS}
                onClick={() => onCreateNextCardinal(cardinalSourceSlot!)}
                disabled={cardinalDisabled}
                title={
                  cardinalDisabled
                    ? 'En attente de chiffrage : remplissez le dernier accord avant de créer le suivant.'
                    : `Créer le ${toOrdinalFr(cardinalNextOrdinal)} accord et sa proposition`
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
      {/* ≥ md: the matrix */}
      <MatrixTable rows={rows} columns={columns} handlers={handlers} />

      {/* < md: SlotRow list per side, Devis then Facture */}
      <div className="border-t border-hairline md:hidden">
        {columns.map((side) => {
          const slots = side === 'devis' ? devisSlots : factureSlots;
          return (
            <div key={side}>
              {columns.length > 1 && (
                <p className="t-label bg-surface-2 px-4 py-1.5">{side === 'devis' ? 'Devis' : 'Facture'}</p>
              )}
              <ul role="list" className="divide-y divide-hairline">
                {slots.map((slot) => (
                  <TypedSlotRow
                    key={slot}
                    slot={slot}
                    label={rowLabelForSlot(slot)}
                    docs={handlers.docsByType[slot] || []}
                    canEdit={handlers.canEdit}
                    canDeleteDoc={handlers.canDeleteDoc}
                    isUploading={handlers.isUploading(slot)}
                    deletingId={handlers.deletingId}
                    extraSlotKind={handlers.extraSlotKindForSlot(slot)}
                    canManageExtraSlots={handlers.canManageExtraSlots}
                    onUpload={(files) => handlers.onUpload(slot, files)}
                    onDelete={handlers.onDelete}
                    onRenameExtraSlot={() => handlers.onRenameExtraSlot(slot)}
                    onPreview={handlers.onPreview}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </DocumentGroup>
  );
}

// ── Single-column variant (Réforme) ─────────────────────────────────────────

export function SlotMatrixGroup({
  title,
  columnHeader = 'Document',
  slots,
  handlers,
}: {
  title: string;
  columnHeader?: string;
  slots: string[];
  handlers: MatrixSlotHandlers;
}) {
  if (slots.length === 0) return null;
  const received = slots.filter((s) => isSlotFilled(handlers.docsByType[s])).length;
  return (
    <DocumentGroup bodyAs="plain" title={title} received={received} total={slots.length}>
      <div className="hidden border-t border-hairline md:block">
        <div className={cn('grid gap-x-4 bg-surface-2 px-4 py-1.5', COLS[1])}>
          <span className="t-label">Étape</span>
          <span className="t-label">{columnHeader}</span>
        </div>
        <div className="divide-y divide-hairline">
          {slots.map((slot) => (
            <div key={slot} className={cn('grid gap-x-4 px-4', COLS[1])}>
              <div className="py-2.5">
                <p className="t-body-sm font-medium text-ink">{slot}</p>
              </div>
              <MatrixCell slot={slot} handlers={handlers} />
            </div>
          ))}
        </div>
      </div>
      <ul role="list" className="divide-y divide-hairline border-t border-hairline md:hidden">
        {slots.map((slot) => (
          <TypedSlotRow
            key={slot}
            slot={slot}
            docs={handlers.docsByType[slot] || []}
            canEdit={handlers.canEdit}
            canDeleteDoc={handlers.canDeleteDoc}
            isUploading={handlers.isUploading(slot)}
            deletingId={handlers.deletingId}
            extraSlotKind={handlers.extraSlotKindForSlot(slot)}
            canManageExtraSlots={handlers.canManageExtraSlots}
            onUpload={(files) => handlers.onUpload(slot, files)}
            onDelete={handlers.onDelete}
            onRenameExtraSlot={() => handlers.onRenameExtraSlot(slot)}
            onPreview={handlers.onPreview}
          />
        ))}
      </ul>
    </DocumentGroup>
  );
}
