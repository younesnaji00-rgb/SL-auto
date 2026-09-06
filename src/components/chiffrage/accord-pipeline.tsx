'use client';

/**
 * AccordPipeline — the chiffrage detail page's version-pipeline grid
 * (docs/chiffrage-redesign-spec.md B1–B3; research chiffrage-workspace.md §3
 * candidate A). NN/g comparison-table structure: versions as COLUMNS shared
 * across every family, families as aligned row bands — lineage is literally
 * the x-axis: Source → 1er accord → 2ème → … → propositions.
 *
 * - Cells reuse `SlotCard` read-only (canEdit=false, no-op uploads, preview →
 *   lightbox) exactly like the old FamilyRow arrangement did.
 * - The next legal stage renders as ONE quiet dashed ghost socket carrying the
 *   family's single `tonal` Éditer affordance (B3: one primary per family —
 *   Hick; other filled slots keep the SlotCard Aperçu path as « Consulter »).
 * - Version-state chips (B2): `Actuel` (info) on the highest filled version,
 *   `Remplacé` (neutral) on superseded ones, `Envoyé` (success) when the
 *   dossier statut is « Accord envoyé ». Chip + de-emphasis, never colour
 *   alone. Source cells carry no chip.
 * - Below `lg` the aligned grid falls back to a per-family stacked flow
 *   (the pipeline needs width — workspace S5 "160+ characters").
 * - Below `md` (phone, mobile pass 2026-09-06 — research
 *   mobile-record-pages.md E11) the x-axis becomes the y-axis: one flat block
 *   per family, versions as 56 px ROWS in lineage order. This is the ONE place
 *   the "sockets, never a list" ruling bends, and deliberately: a version's
 *   identity is its stage label (« 2ème accord »), not a document type, so a
 *   row reads it faster than a tile and eight tiles do not fit a 390 px screen.
 *   Editing a devis is desktop-only (owner call E-Q3): the next legal stage is
 *   a dashed ghost row printing « Édition sur ordinateur ».
 */

import React, { useMemo } from 'react';
import { ChevronRight, Lock, Pencil, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  SlotCard,
  SOCKET_BASE_CLASS,
  type ExtraSlotKind,
  type TypedDoc,
} from '@/components/dossier-timeline/slot-card';
import type { DocFamily } from '@/lib/doc-family';
import { mapToAccorde, parseAccordDocType } from '@/lib/docType-accorde';
import { toOrdinalFeminineFr, toOrdinalFr } from '@/lib/devis-schema';
import { useViewportClass } from '@/hooks/use-viewport-class';
import { useEdgeScroll } from '@/hooks/use-edge-scroll';
import { EdgeArrow } from '@/components/ui/edge-arrow';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

// ── Stage model ─────────────────────────────────────────────────────────────
// A stage is one pipeline column: the source, an accord ordinal or a
// proposition ordinal. Keyed by (kind, ordinal) via parseAccordDocType so the
// columns are SHARED across families (B1: global max stage alignment).

type StageKind = 'source' | 'accord' | 'proposition-accord';

interface Stage {
  kind: StageKind;
  ordinal: number; // 0 for source
}

const stageKey = (s: Stage) => `${s.kind}:${s.ordinal}`;

/** Lineage rank: Source → accords ascending → propositions ascending. */
const stageRank = (s: Stage) =>
  s.kind === 'source' ? 0 : s.kind === 'accord' ? s.ordinal : 100 + s.ordinal;

type CellState = 'filled' | 'awaiting';

interface FamilyPipeline {
  group: DocFamily;
  /** Slot label + fill state per present stage (source always present). */
  cells: Map<string, { slot: string; state: CellState }>;
  /** Next legal accord stage (ghost socket) — null when the family is empty. */
  ghost: Stage | null;
  /** Highest FILLED version stage (accord/proposition) — carries `Actuel`. */
  actuel: Stage | null;
  receivedCount: number;
  totalSlots: number;
}

const hasRealDoc = (docs: TypedDoc[] | undefined) =>
  (docs || []).some((d) => !!d.url && !d.pendingUpload);

function buildFamilyPipeline(
  group: DocFamily,
  docsByType: Record<string, TypedDoc[]>,
): FamilyPipeline {
  const cells = new Map<string, { slot: string; state: CellState }>();
  let maxFilledAccord = 0;
  let actuel: Stage | null = null;
  let received = 0;

  for (const slot of group.slots) {
    const docs = docsByType[slot] || [];
    const filled = hasRealDoc(docs);
    if (filled) received += 1;
    const stage: Stage | null =
      slot === group.parent
        ? { kind: 'source', ordinal: 0 }
        : (() => {
            const parsed = parseAccordDocType(slot);
            return parsed ? { kind: parsed.kind, ordinal: parsed.ordinal } : null;
          })();
    if (!stage) continue;
    if (filled) {
      cells.set(stageKey(stage), { slot, state: 'filled' });
      if (stage.kind === 'accord') maxFilledAccord = Math.max(maxFilledAccord, stage.ordinal);
      if (stage.kind !== 'source' && (!actuel || stageRank(stage) > stageRank(actuel))) {
        actuel = stage;
      }
    } else if (docs.length > 0) {
      // Placeholder-only slot (gestionnaire-created cardinal awaiting the
      // chiffreur) — renders as a quiet editable socket, not a locked card.
      cells.set(stageKey(stage), { slot, state: 'awaiting' });
    }
    // Empty slots with no docs at all render nothing (B1: later stages are
    // blank grid cells) — except the ghost next stage computed below.
  }

  // Ghost = next legal accord stage (« Éditer le 1er accord » when no accord
  // exists yet, « + 2ème accord » afterwards). An entirely empty family gets
  // no ghost — a dead family should not carry an invitation to edit nothing.
  const anythingReal = received > 0;
  const ghost: Stage | null = anythingReal
    ? { kind: 'accord', ordinal: maxFilledAccord + 1 }
    : null;

  return {
    group,
    cells,
    ghost,
    actuel,
    receivedCount: received,
    totalSlots: group.slots.length,
  };
}

/**
 * Column label per stage (B1 header row) — returns the FRENCH source string.
 * `toOrdinalFr` / `toOrdinalFeminineFr` are French ordinal generators shared
 * with the devis schema, so nothing is translated inside them: the resulting
 * enumerable strings (« Source », « 1er accord », « 2ème accord », …,
 * « Proposition », « 1ère proposition », …) go through `t()` at the render
 * sites below.
 */
function stageLabel(stage: Stage, maxProp: number): string {
  if (stage.kind === 'source') return 'Source';
  if (stage.kind === 'accord') return `${toOrdinalFr(stage.ordinal)} accord`;
  return maxProp <= 1 ? 'Proposition' : `${toOrdinalFeminineFr(stage.ordinal)} proposition`;
}

// ── Ghost socket ────────────────────────────────────────────────────────────
// Whole socket = ONE button (no nested interactives); the inner pill is a
// styled span. `tonal` pill = the family's single Éditer (B3); `quiet` for
// awaiting placeholder slots so only one tonal affordance exists per family.

function GhostSocket({
  stage,
  actionLabel,
  tone,
  onClick,
}: {
  stage: string;
  actionLabel: string;
  tone: 'tonal' | 'quiet';
  onClick: () => void;
}) {
  // Module-scope helper component: it needs its own translator. `stage` and
  // `actionLabel` arrive already translated from the caller.
  const t = useT();
  const isCreate = /^\+/.test(stage);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={actionLabel}
      title={actionLabel}
      className={cn(
        SOCKET_BASE_CLASS,
        'group/ghost h-full border border-dashed border-hairline-strong',
        'transition-colors duration-200 ease-standard hover:border-primary/50 hover:bg-surface-3',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {isCreate ? (
        <Plus className="h-4 w-4 text-ink-3 transition-colors duration-200 group-hover/ghost:text-ink" aria-hidden />
      ) : (
        <Pencil className="h-4 w-4 text-ink-3 transition-colors duration-200 group-hover/ghost:text-ink" aria-hidden />
      )}
      <span className="t-body-sm w-full truncate font-medium text-ink-2" title={stage}>
        {stage.replace(/^\+\s*/, '')}
      </span>
      <span
        className={cn(
          'mt-1 inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium shadow-rim',
          tone === 'tonal' ? 'bg-accent text-accent-foreground' : 'bg-card text-ink-2',
        )}
        aria-hidden
      >
        <Pencil className="h-3 w-3" />
        {t('Éditer')}
      </span>
    </button>
  );
}

/** Hairline connector drawn into a cell whose left neighbour is occupied. */
function Connector() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -left-4 top-1/2 -mt-px flex w-4 items-center"
    >
      <span className="h-0.5 w-full bg-hairline-strong" />
      <ChevronRight className="absolute -right-1 h-3 w-3 shrink-0 text-hairline-strong" strokeWidth={3} />
    </span>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

export interface AccordPipelineProps {
  families: DocFamily[];
  docsByType: Record<string, TypedDoc[]>;
  /** Dossier statut — « Accord envoyé » turns the Actuel chip into Envoyé. */
  dossierStatut: string;
  userRole?: string;
  onPreview: (d: TypedDoc, pages?: TypedDoc[]) => void;
  /** Deep link to the devis editor — same semantics as handleEditSlot. */
  onEditSlot: (parent: string, slot: string) => void;
}

// SlotCard is read-only on the chiffreur side: uploads and slot management
// belong to the gestionnaire flow (unchanged from the FamilyRow arrangement).
const noop = () => {};
const noopCreateExtraSlot = (_kind: ExtraSlotKind, _files: File[]) => {};
const neverDelete = () => false;

export function AccordPipeline({
  families,
  docsByType,
  dossierStatut,
  userRole,
  onPreview,
  onEditSlot,
}: AccordPipelineProps) {
  const t = useT();
  // < 1024 px — the aligned pipeline needs width.  now means
  // < 768 (mobile pass 2026-09-06), so this keys on the viewport class.
  const viewport = useViewportClass();
  const stacked = viewport !== 'desktop';
  const isPhone = viewport === 'phone';

  const pipelines = useMemo(
    () => families.map((g) => buildFamilyPipeline(g, docsByType)),
    [families, docsByType],
  );

  // Global shared columns (B1): accords up to the max filled/awaiting/ghost
  // ordinal across ALL families; proposition columns only where one exists.
  const columns = useMemo<Stage[]>(() => {
    let maxAccord = 0;
    let maxProp = 0;
    for (const p of pipelines) {
      if (p.ghost) maxAccord = Math.max(maxAccord, p.ghost.ordinal);
      for (const key of p.cells.keys()) {
        const [kind, ord] = key.split(':');
        const n = Number(ord);
        if (kind === 'accord') maxAccord = Math.max(maxAccord, n);
        if (kind === 'proposition-accord') maxProp = Math.max(maxProp, n);
      }
    }
    const cols: Stage[] = [{ kind: 'source', ordinal: 0 }];
    for (let i = 1; i <= maxAccord; i++) cols.push({ kind: 'accord', ordinal: i });
    for (let i = 1; i <= maxProp; i++) cols.push({ kind: 'proposition-accord', ordinal: i });
    return cols;
  }, [pipelines]);

  const maxProp = columns.filter((c) => c.kind === 'proposition-accord').length;

  const {
    ref: scrollRef,
    canScrollLeft,
    canScrollRight,
    hasOverflow,
    scrollByPage,
  } = useEdgeScroll<HTMLDivElement>([columns.length, pipelines.length]);

  // Rail (9.5rem) + version columns — the same template on the header row and
  // on every family band keeps the columns vertically aligned. Columns hold a
  // FLOOR of 13rem (owner 2026-09-04: a 4ème accord used to squeeze every card
  // instead of running off the edge) and a 20rem ceiling so two-stage families
  // don't stretch their cards across the whole page; past the floor the rail
  // scrolls and the arrows appear.
  const gridTemplate = `9.5rem repeat(${columns.length}, minmax(13rem, 20rem))`;

  const chipFor = (p: FamilyPipeline, stage: Stage): React.ReactNode => {
    if (stage.kind === 'source' || !p.actuel) return undefined;
    const isActuel = stageKey(stage) === stageKey(p.actuel);
    if (isActuel) {
      // `dossierStatut` is the stored French value — compared, never displayed.
      return dossierStatut === 'Accord envoyé' ? (
        <Badge variant="success">{t('Envoyé')}</Badge>
      ) : (
        <Badge variant="info">{t('Actuel')}</Badge>
      );
    }
    return <Badge variant="neutral">{t('Remplacé')}</Badge>;
  };

  /** Slot label to deep-link for a stage (existing slot or the mapped label). */
  const slotForStage = (p: FamilyPipeline, stage: Stage): string => {
    const cell = p.cells.get(stageKey(stage));
    if (cell) return cell.slot;
    if (stage.kind === 'source') return p.group.parent;
    return mapToAccorde(p.group.parent, stage.kind, stage.ordinal);
  };

  /** One pipeline cell (shared by the grid and the stacked fallback). */
  const renderCell = (p: FamilyPipeline, stage: Stage): React.ReactNode => {
    const key = stageKey(stage);
    const cell = p.cells.get(key);
    const isGhost = p.ghost && key === stageKey(p.ghost);

    if (cell?.state === 'filled') {
      return (
        <SlotCard
          slot={cell.slot}
          docs={docsByType[cell.slot] || []}
          canEdit={false}
          canDeleteDoc={neverDelete}
          userRole={userRole}
          isUploading={false}
          deletingId={null}
          canManageExtraSlots={false}
          onUpload={noop}
          onDelete={noop}
          onCreateNextCardinal={noop}
          onCreateExtraSlot={noopCreateExtraSlot}
          onRenameExtraSlot={noop}
          onPreview={onPreview}
          versionChip={chipFor(p, stage)}
        />
      );
    }

    if (isGhost) {
      // Next legal stage — the family's ONE tonal Éditer (B3). Ordinal 1 also
      // opens the SOURCE in the editor (devis-editor treats the 1er-accord
      // slot as the primary editing session — audit fix).
      const slot = slotForStage(p, stage);
      const label =
        stage.ordinal === 1
          ? t('1er accord')
          : `+ ${t(`${toOrdinalFr(stage.ordinal)} accord`)}`;
      const action =
        stage.ordinal === 1
          ? `${t('Éditer le 1er accord')} — ${p.group.parent}`
          : `${t(`Créer le ${toOrdinalFr(stage.ordinal)} accord`)} — ${p.group.parent}`;
      return (
        <GhostSocket
          stage={label}
          actionLabel={action}
          tone="tonal"
          onClick={() => onEditSlot(p.group.parent, slot)}
        />
      );
    }

    if (cell?.state === 'awaiting') {
      // Gestionnaire-created placeholder outside the accord chain (e.g. a
      // pending proposition) — quiet editable socket, never a second tonal.
      const label = t(stageLabel(stage, maxProp));
      return (
        <GhostSocket
          stage={label}
          actionLabel={`${t('Éditer')} — ${cell.slot}`}
          tone="quiet"
          onClick={() => onEditSlot(p.group.parent, cell.slot)}
        />
      );
    }

    if (stage.kind === 'source') {
      // Empty source: quiet locked socket (upload lives on the dossier page).
      return (
        <div className={cn(SOCKET_BASE_CLASS, 'h-full border border-hairline bg-card/60')}>
          <Lock className="h-5 w-5 text-ink-4" aria-hidden />
          <span className="t-body-sm w-full truncate font-medium text-ink-3" title={p.group.parent}>
            {p.group.parent}
          </span>
          <span className="t-caption text-ink-4">{t('Aucun document')}</span>
        </div>
      );
    }

    return null; // later stages stay blank (B1)
  };

  const familyRail = (p: FamilyPipeline) => (
    <>
      <h3 className="min-w-0 truncate text-[13px] font-semibold text-ink" title={p.group.parent}>
        {p.group.parent}
      </h3>
      {p.group.parentOrdinal >= 2 && (
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tertiary-bg text-[11px] font-semibold tabular-nums text-tertiary-deep"
          title={`${t('Garage')} ${p.group.parentOrdinal}`}
          aria-label={`${t('Garage numéro')} ${p.group.parentOrdinal}`}
        >
          {p.group.parentOrdinal}
        </span>
      )}
      <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium leading-4 tabular-nums text-ink-2">
        {p.receivedCount}/{p.totalSlots} {t(p.receivedCount > 1 ? 'reçus' : 'reçu')}
      </span>
    </>
  );

  // ── Phone (< md): the lineage becomes rows (E11) ─────────────────────────
  if (isPhone) {
    return (
      <div className="-mx-4">
        {pipelines.map((p) => {
          const stages = columns.filter(
            (c) => p.cells.has(stageKey(c)) || (p.ghost && stageKey(c) === stageKey(p.ghost)) || c.kind === 'source',
          );
          return (
            <section key={p.group.parent} aria-label={p.group.parent} className="mb-5 last:mb-0">
              {/* Family identity: the pill title + « Actuel » chip (B2). */}
              <header className="flex flex-wrap items-center gap-2 px-4 pb-2">
                <span className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-full bg-card px-3 shadow-rim">
                  <h3 className="t-label min-w-0 truncate leading-none text-ink-2" title={p.group.parent}>
                    {p.group.parent}
                  </h3>
                </span>
                {p.group.parentOrdinal >= 2 && (
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-tertiary-bg text-[11px] font-semibold tabular-nums text-tertiary-deep"
                    aria-label={`${t('Garage numéro')} ${p.group.parentOrdinal}`}
                  >
                    {p.group.parentOrdinal}
                  </span>
                )}
                <span className="t-caption tabular-nums">
                  {p.receivedCount}/{p.totalSlots} {t(p.receivedCount > 1 ? 'reçus' : 'reçu')}
                </span>
              </header>

              <ul className="divide-y divide-hairline border-y border-hairline">
                {stages.map((stage) => {
                  const key = stageKey(stage);
                  const cell = p.cells.get(key);
                  const label = t(stageLabel(stage, maxProp));
                  const docs = cell ? docsByType[cell.slot] || [] : [];
                  const file = docs.find((d) => !!d.url && !d.pendingUpload);
                  if (cell?.state === 'filled' && file) {
                    return (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => onPreview(file, docs)}
                          className="flex min-h-[56px] w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2 focus:outline-none focus-visible:bg-surface-2"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="t-body-sm block truncate font-semibold text-ink">{label}</span>
                            <span className="t-caption block truncate">{file.nom || file.fileName || cell.slot}</span>
                          </span>
                          {chipFor(p, stage)}
                          <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                        </button>
                      </li>
                    );
                  }
                  // Next legal stage (or a gestionnaire placeholder): a dashed
                  // ghost row. Devis editing is desktop-only (E-Q3), so the row
                  // states the fact instead of offering a broken affordance.
                  const ghostLabel = cell?.state === 'awaiting' ? label : stage.kind === 'accord' ? t(`${toOrdinalFr(stage.ordinal)} accord`) : label;
                  return (
                    <li key={key} className="flex min-h-[56px] items-center gap-3 px-4 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="t-body-sm block truncate font-medium text-ink-2">{ghostLabel}</span>
                        <span className="t-caption block truncate">
                          {stage.kind === 'source' && !cell ? t('Aucun document') : t('Édition sur ordinateur')}
                        </span>
                      </span>
                      <span aria-hidden className="h-6 w-16 shrink-0 rounded-md border border-dashed border-hairline-strong" />
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    );
  }

  // ── Stacked fallback (tablet): family header band + sm:grid-cols-2 flow ───
  if (stacked) {
    return (
      <div className="space-y-4">
        {pipelines.map((p) => {
          const stages = columns.filter(
            (c) => p.cells.has(stageKey(c)) || (p.ghost && stageKey(c) === stageKey(p.ghost)) || c.kind === 'source',
          );
          return (
            <section
              key={p.group.parent}
              aria-label={p.group.parent}
              className="space-y-3 border-t border-hairline pt-5 first:border-t-0 first:pt-0"
            >
              <div className="flex min-h-10 items-center gap-2 rounded-lg bg-surface-2 px-3 text-ink">
                {familyRail(p)}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {stages.map((stage) => (
                  <React.Fragment key={stageKey(stage)}>{renderCell(p, stage)}</React.Fragment>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  // ── Aligned pipeline grid (lg+) ───────────────────────────────────────────
  // The whole grid (labels + every family band) scrolls as ONE rail so the
  // columns can never drift out of alignment; the family rail freezes on the
  // left like the queue's identifier column.
  const railSticky = 'sticky left-0 z-[1] bg-background';
  return (
    <div>
      {/* « ‹ › » above the rail (owner 2026-09-04, for 4ème accord and
          beyond) — grouped at the end, on top, per the carousel guidance. */}
      {hasOverflow && (
        <div className="mb-1 flex items-center justify-end gap-1">
          <EdgeArrow dir="left" disabled={!canScrollLeft} onClick={() => scrollByPage(-1)} />
          <EdgeArrow dir="right" disabled={!canScrollRight} onClick={() => scrollByPage(1)} />
        </div>
      )}

      <div ref={scrollRef} className="overflow-x-auto scrollbar-thin">
        {/* Column header row — plain, not sticky (element-specs §23: one
            sticky bar per page; the grid is short enough that labels stay in
            view). */}
        <div
          className="mb-2 grid gap-x-4"
          style={{ gridTemplateColumns: gridTemplate }}
          aria-hidden
        >
          <div className={railSticky} />
          {columns.map((c) => (
            <div key={stageKey(c)} className="t-label px-1">
              {t(stageLabel(c, maxProp))}
            </div>
          ))}
        </div>

        {pipelines.map((p, famIdx) => (
          <section
            key={p.group.parent}
            aria-label={p.group.parent}
            className={cn(
              'grid gap-x-4 gap-y-3',
              famIdx > 0 && 'mt-3 border-t border-hairline pt-3',
            )}
            style={{ gridTemplateColumns: gridTemplate }}
          >
            {/* Family identity rail (FamilyRow header anatomy, sans collapse). */}
            <div
              className={cn(
                'flex min-w-0 flex-col items-start gap-1.5 py-2 pr-1',
                railSticky,
                // Reads as a layer over the scrolled cards, not a seam — only
                // once something has actually scrolled under it.
                canScrollLeft && 'shadow-[6px_0_8px_-6px_hsl(var(--ink)/0.14)]',
              )}
            >
              {familyRail(p)}
            </div>
            {columns.map((stage, colIdx) => {
              const content = renderCell(p, stage);
              const prev = colIdx > 0 ? columns[colIdx - 1] : null;
              const prevOccupied =
                !!prev &&
                (p.cells.has(stageKey(prev)) ||
                  (p.ghost != null && stageKey(prev) === stageKey(p.ghost)) ||
                  prev.kind === 'source');
              return (
                <div key={stageKey(stage)} className="relative min-w-0">
                  {/* Derivation hairline between occupied neighbours (B1). */}
                  {content && colIdx > 0 && prevOccupied && <Connector />}
                  {content}
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}
