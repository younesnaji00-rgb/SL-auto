'use client';

import React, { useMemo } from 'react';
import {
  Download,
  Trash2,
  Loader2,
  FileIcon,
  FileText,
  Eye,
  Search,
  Upload,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import {
  parseAccordeParent,
  parseAccordDocType,
  type ParsedAccordDocType,
  type AccordeSourceDocType,
} from '@/lib/docType-accorde';
import { cn } from '@/lib/utils';
import { useTabSlopeMorph } from '@/hooks/use-tab-morph';
import { useEdgeScroll } from '@/hooks/use-edge-scroll';
import { EdgeArrow } from '@/components/ui/edge-arrow';

export const ALL_TYPES_KEY = '__all__';

export type DocumentsFilterPanelDoc = {
  id: string;
  type?: string;
  typeDocument?: string;
  nom?: string;
  fileName?: string;
  url?: string;
  taille?: number;
  fileSize?: number;
  dateUpload?: any;
  uploadedAt?: any;
  uploadePar?: string;
  uploadedBy?: string;
  storagePath?: string;
  pendingUpload?: boolean;
  devisVariant?: 'original' | 'counter';
  [key: string]: any;
};

export type DocTypeOption = {
  id: string;
  label: string;
  order?: number;
  active?: boolean;
};

export interface DocumentsFilterPanelProps {
  /** Sorted/prepared documents to display. */
  documents: DocumentsFilterPanelDoc[];
  /** Admin-managed doc types (from options_types_documents). */
  docTypes: DocTypeOption[];
  /** Currently selected type filter. Use ALL_TYPES_KEY for "all". */
  selectedType: string;
  onSelectedTypeChange: (type: string) => void;
  /** Local search string for the type filter list. */
  typeSearch: string;
  onTypeSearchChange: (v: string) => void;
  /** Loading indicator for the right card. */
  loading?: boolean;
  /** Whether the user can trigger imports. If false, import button is hidden. */
  canImport: boolean;
  /** Invoked when user clicks the "Importer" button (opens the file picker). */
  onImportClick?: () => void;
  /** Whether the user can delete documents (renders the trash button). */
  canDelete?: boolean;
  /** Document currently being deleted (for spinner). */
  isDeleting?: string | null;
  /** Selection mode (batch download). */
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  /** Actions on an individual document. */
  onOpenDocument?: (doc: DocumentsFilterPanelDoc) => void;
  onDownloadDocument?: (doc: DocumentsFilterPanelDoc) => void;
  onDeleteDocument?: (doc: DocumentsFilterPanelDoc) => void;
  className?: string;
}

// User-curated removal list: legacy types that must NOT appear as filter rows
// even when observed on existing documents.
const REMOVED_FILTER_DOC_TYPES: ReadonlySet<string> = new Set([
  'Avis de dommage',
  'Bon de commande',
  'CIN/Identité',
  'Ordre de mission',
  'Permis de conduire',
  'Photos après expertise',
  'Photos au moment du sinistre',
  'Photos avant expertise',
  'Procuration',
  'PV de constat',
  "Rapport d'expertise",
]);

const isImage = (name?: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(name || '');
const isPdf = (name?: string) => /\.pdf$/i.test(name || '');
const fileExt = (name?: string) => {
  const m = (name || '').match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toUpperCase() : 'FILE';
};

type FilterRow = { label: string; count: number };
type FamilyAccordRow = FilterRow & { ordinal: number };

type FilterFamily = {
  parent: string;
  sourceDocType: AccordeSourceDocType;
  parentOrdinal: number;
  parentEntry: FilterRow | null;
  accords: FamilyAccordRow[];
  propositions: FamilyAccordRow[];
  totalCount: number;
};

type FilterGroups = {
  nonFamily: FilterRow[];
  devisFamilies: FilterFamily[];
  factureFamilies: FilterFamily[];
};

// Inside a per-parent section the parent context is implicit, so display a
// compact label that just describes the variant within the parent.
const shortenAccordLabel = (parsed: ParsedAccordDocType): string => {
  if (parsed.kind === 'accord') {
    if (parsed.ordinal === 1) return 'Accordé';
    return `${parsed.ordinal}ème accord`;
  }
  const fem = parsed.ordinal === 1 ? '1ère' : `${parsed.ordinal}ème`;
  return `${fem} proposition`;
};

/** Count pill on a tab — the dossiers step-tabs anatomy verbatim (neutral
 *  `surface-3`, 11 px, tabular). Zero-count types never render a tab, so
 *  there is no zero variant here. */
function TabCount({ count }: { count: number }) {
  return (
    <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
      {count}
    </span>
  );
}

/** Browser-tab filter (owner 2026-09-04: the document-type filter is a view
 *  switcher, so it wears the app's Firefox tab instead of a card of rows).
 *  Same anatomy as `dossier-timeline/step-tabs.tsx`: `.tab-slope` draws the
 *  sloped body + outward feet that merge into the strip's hairline, the
 *  accent underline is a SPAN (::after is the feet), and the seat morph is
 *  provided by the strip's `useTabSlopeMorph`. Selection travels on
 *  `aria-selected`, which both the CSS and the morph hook key on. */
function FilterTab({
  label,
  count,
  selected,
  title,
  dense,
  onSelect,
}: {
  label: string;
  count: number;
  selected: boolean;
  title?: string;
  /** Sub-strip (family versions) sits one step shorter than the main strip. */
  dense?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      title={title ?? label}
      onClick={onSelect}
      className={cn(
        // Underline = span, never border-b-2 (a bottom border lifts the
        // padding box the feet anchor to — owner 2026-09-03).
        'tab-slope group relative -mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-[13px] font-medium text-ink-3',
        'transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
        dense ? 'h-9' : 'h-10',
        selected && 'text-ink',
      )}
    >
      <span className="max-w-[15rem] truncate">{label}</span>
      <TabCount count={count} />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-primary transition-opacity',
          selected ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span className="tab-feet" aria-hidden />
    </button>
  );
}

/** The scrollable tab track. `px-2` ≥ the 7 px feet or `overflow-x-auto`
 *  clips them (owner 2026-09-03); `useTabSlopeMorph` flies the active seat
 *  between tabs, exactly as on the dossiers step strip. Arrows appear at both
 *  ends as soon as the types outrun the width, and the selected tab is always
 *  scrolled back into view (it used to hide under the search field). */
function FilterTabStrip({
  label,
  activeKey,
  className,
  children,
}: {
  label: string;
  /** Changes whenever the selection moves — re-reveals the seated tab. */
  activeKey?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { ref, canScrollLeft, canScrollRight, hasOverflow, scrollByPage, reveal } =
    useEdgeScroll<HTMLDivElement>([children]);
  useTabSlopeMorph(ref);

  // Keep the seated tab visible when the selection changes from anywhere
  // (a click deep in the strip, the sub-strip, or the keyboard).
  React.useEffect(() => {
    reveal(ref.current?.querySelector<HTMLElement>('[aria-selected="true"]'));
  }, [activeKey, reveal, ref]);

  // A tablist owns ← → Home End (the roving tabIndex lives on the tabs).
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const tabs = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
    if (tabs.length === 0) return;
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    let next: number;
    if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    else if (e.key === 'ArrowLeft') next = current <= 0 ? tabs.length - 1 : current - 1;
    else next = current === -1 || current === tabs.length - 1 ? 0 : current + 1;
    e.preventDefault();
    tabs[next]?.focus();
    tabs[next]?.click();
  };

  return (
    <div className={cn('flex min-w-0 flex-1 items-end', className)}>
      {hasOverflow && (
        <EdgeArrow dir="left" disabled={!canScrollLeft} onClick={() => scrollByPage(-1)} className="mb-1.5" />
      )}
      <div
        ref={ref}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="relative isolate flex min-w-0 flex-1 items-end gap-4 overflow-x-auto px-2 scrollbar-thin"
      >
        {children}
      </div>
      {hasOverflow && (
        <EdgeArrow dir="right" disabled={!canScrollRight} onClick={() => scrollByPage(1)} className="mb-1.5" />
      )}
    </div>
  );
}

export function DocumentsFilterPanel(props: DocumentsFilterPanelProps) {
  const {
    documents,
    docTypes,
    selectedType,
    onSelectedTypeChange,
    typeSearch,
    onTypeSearchChange,
    loading,
    canImport,
    onImportClick,
    canDelete = false,
    isDeleting = null,
    selectionMode = false,
    selectedIds,
    onToggleSelect,
    onOpenDocument,
    onDownloadDocument,
    onDeleteDocument,
    className,
  } = props;

  // Per-type counts for the left filter card
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of documents) {
      const t = d.type || d.typeDocument || 'Autre';
      counts[t] = (counts[t] || 0) + 1;
      // Roll "Devis Garage*" into "Devis", "Facture Garage*" into "Facture"
      // so the curated parent rows in the filter list show non-zero counts.
      if (t.startsWith('Devis ')) counts['Devis'] = (counts['Devis'] || 0) + 1;
      if (t.startsWith('Facture ')) counts['Facture'] = (counts['Facture'] || 0) + 1;
    }
    return counts;
  }, [documents]);

  const filterRows = useMemo(() => {
    // Task #27 — union of: static canonical list (always present so the filter
    // stays stable even if admins prune Firestore options), the dynamic
    // `docTypes` (admin-managed), and any `type` actually observed on the
    // dossier's documents. The latter is what surfaces cardinal / proposition
    // accord variants created by tasks #24/#26 (e.g. "Devis 2ème accord").
    const allLabels = new Set<string>();
    for (const t of defaultDocTypes) allLabels.add(t);
    for (const t of docTypes) {
      if (t.label) allLabels.add(t.label);
    }
    Object.keys(typeCounts).forEach((t) => {
      if (t) allLabels.add(t);
    });
    const rows = Array.from(allLabels)
      .filter((label) => !REMOVED_FILTER_DOC_TYPES.has(label))
      .map((label) => ({ label, count: typeCounts[label] || 0 }));
    rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const search = typeSearch.toLowerCase().trim();
    return search ? rows.filter((r) => r.label.toLowerCase().includes(search)) : rows;
  }, [docTypes, typeCounts, typeSearch]);

  // Grouped view: each garage parent (Devis Garage, Devis Garage 2, …, Facture
  // Garage, Facture Garage 2, …) is its own collapsible section with two
  // subsections (Accords / Propositions). Non-family doc types stay in a flat
  // list above the family sections. Search bypasses grouping (handled in render).
  const filterGroups = useMemo<FilterGroups>(() => {
    const allLabels = new Set<string>();
    for (const t of defaultDocTypes) allLabels.add(t);
    for (const t of docTypes) {
      if (t.label) allLabels.add(t.label);
    }
    Object.keys(typeCounts).forEach((t) => {
      if (t) allLabels.add(t);
    });

    const familyByParent = new Map<string, FilterFamily>();
    const nonFamily: FilterRow[] = [];

    const ensureFamily = (
      parent: string,
      sourceDocType: AccordeSourceDocType,
      parentOrdinal: number,
    ): FilterFamily => {
      const existing = familyByParent.get(parent);
      if (existing) return existing;
      const fam: FilterFamily = {
        parent,
        sourceDocType,
        parentOrdinal,
        parentEntry: null,
        accords: [],
        propositions: [],
        totalCount: 0,
      };
      familyByParent.set(parent, fam);
      return fam;
    };

    for (const label of allLabels) {
      if (REMOVED_FILTER_DOC_TYPES.has(label)) continue;
      const count = typeCounts[label] || 0;
      const parsedParent = parseAccordeParent(label);
      if (parsedParent) {
        const fam = ensureFamily(label, parsedParent.sourceDocType, parsedParent.ordinal);
        fam.parentEntry = { label, count };
        fam.totalCount += count;
        continue;
      }
      const parsedAccord = parseAccordDocType(label);
      if (parsedAccord) {
        const fam = ensureFamily(
          parsedAccord.parent,
          parsedAccord.sourceDocType,
          parsedAccord.parentOrdinal,
        );
        const row: FamilyAccordRow = { label, count, ordinal: parsedAccord.ordinal };
        if (parsedAccord.kind === 'accord') fam.accords.push(row);
        else fam.propositions.push(row);
        fam.totalCount += count;
        continue;
      }
      nonFamily.push({ label, count });
    }

    for (const fam of familyByParent.values()) {
      fam.accords.sort((a, b) => a.ordinal - b.ordinal);
      fam.propositions.sort((a, b) => a.ordinal - b.ordinal);
    }
    nonFamily.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const allFamilies = Array.from(familyByParent.values()).sort(
      (a, b) => a.parentOrdinal - b.parentOrdinal,
    );
    const dropEmpty = (fams: FilterFamily[]) =>
      fams.filter((f) => f.parentEntry || f.accords.length > 0 || f.propositions.length > 0);

    return {
      nonFamily,
      devisFamilies: dropEmpty(allFamilies.filter((f) => f.sourceDocType === 'Devis Garage')),
      factureFamilies: dropEmpty(allFamilies.filter((f) => f.sourceDocType === 'Facture Garage')),
    };
  }, [docTypes, typeCounts]);

  const isSearchActive = typeSearch.trim().length > 0;

  // Tabs are faceted filters: a type with no document filters to an empty
  // grid, so it never earns a tab (and the strip stays short enough to scan
  // without scrolling). The card-of-rows used to list them greyed out.
  const families = useMemo(
    () => [...filterGroups.devisFamilies, ...filterGroups.factureFamilies].filter((f) => f.totalCount > 0),
    [filterGroups],
  );

  /** The family the current selection belongs to (parent OR any of its
   *  versions) — drives the level-1 seat and the version sub-strip. */
  const activeFamily = useMemo(
    () =>
      families.find(
        (f) =>
          f.parent === selectedType ||
          f.accords.some((a) => a.label === selectedType) ||
          f.propositions.some((p) => p.label === selectedType),
      ) ?? null,
    [families, selectedType],
  );

  /** Sub-strip: the source document + every version that actually exists. */
  const versionTabs = useMemo(() => {
    if (!activeFamily) return [];
    const tabs: { label: string; display: string; count: number }[] = [];
    if (activeFamily.parentEntry && activeFamily.parentEntry.count > 0) {
      // « Source » matches the pipeline grid's first column on this page.
      tabs.push({ label: activeFamily.parent, display: 'Source', count: activeFamily.parentEntry.count });
    }
    for (const row of [...activeFamily.accords, ...activeFamily.propositions]) {
      if (row.count === 0) continue;
      const parsed = parseAccordDocType(row.label);
      tabs.push({ label: row.label, display: parsed ? shortenAccordLabel(parsed) : row.label, count: row.count });
    }
    return tabs;
  }, [activeFamily]);

  const visibleDocs = useMemo(() => {
    if (selectedType === ALL_TYPES_KEY) return documents;
    return documents.filter((d) => {
      const t = d.type || d.typeDocument || '';
      if (t === selectedType) return true;
      if (selectedType === 'Devis' && t.startsWith('Devis ')) return true;
      if (selectedType === 'Facture' && t.startsWith('Facture ')) return true;
      return false;
    });
  }, [documents, selectedType]);

  // Section CTA — element-specs §8 (GOV.UK button: one default button for the
  // main call to action; leading 16 px icon is fine — only sparkle/AI icons
  // are banned). Restored `Upload` icon from 3d5629a.
  const importButton = onImportClick ? (
    canImport ? (
      <Button onClick={onImportClick} className="gap-1.5">
        <Upload className="h-4 w-4" /> Importer
      </Button>
    ) : (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button disabled className="gap-1.5">
                <Upload className="h-4 w-4" /> Importer
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Import non disponible pour le chiffreur</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  ) : null;

  return (
    <div className={cn('space-y-0', className)}>
      {/* Type filter = the app's browser tabs (owner 2026-09-04: no card, no
          rows). Level 1 = « Tous » + the plain types + one tab per garage
          family; the search field sits at the right end of the same rail so
          it never scrolls away with the tabs. */}
      <div className="flex items-end gap-3 border-b border-hairline">
        <FilterTabStrip label="Filtrer par type de document" activeKey={selectedType}>
          <FilterTab
            label="Tous les documents"
            count={documents.length}
            selected={selectedType === ALL_TYPES_KEY}
            onSelect={() => onSelectedTypeChange(ALL_TYPES_KEY)}
          />
          {isSearchActive
            ? filterRows
                .filter((row) => row.count > 0)
                .map((row) => (
                  <FilterTab
                    key={row.label}
                    label={row.label}
                    count={row.count}
                    selected={selectedType === row.label}
                    onSelect={() => onSelectedTypeChange(row.label)}
                  />
                ))
            : (
              <>
                {filterGroups.nonFamily
                  .filter((row) => row.count > 0)
                  .map((row) => (
                    <FilterTab
                      key={row.label}
                      label={row.label}
                      count={row.count}
                      selected={selectedType === row.label}
                      onSelect={() => onSelectedTypeChange(row.label)}
                    />
                  ))}
                {families.map((fam) => (
                  // A family tab stays seated while any of its versions is
                  // the selection — the version sub-strip says which one.
                  <FilterTab
                    key={fam.parent}
                    label={fam.parent}
                    count={fam.totalCount}
                    selected={activeFamily?.parent === fam.parent}
                    onSelect={() => onSelectedTypeChange(fam.parent)}
                  />
                ))}
              </>
            )}
        </FilterTabStrip>
        <div className="relative mb-1.5 w-[170px] shrink-0">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input
            placeholder="Devis, facture…"
            value={typeSearch}
            onChange={(e) => onTypeSearchChange(e.target.value)}
            className="h-8 pl-7 text-xs"
            aria-label="Rechercher un type de document"
          />
        </div>
      </div>

      {/* Level 2 — the versions of the selected family (Source · Accordé ·
          2ème accord · 1ère proposition …), one step shorter than level 1.
          Only when there is more than one version to choose from. */}
      {versionTabs.length > 1 && (
        <FilterTabStrip
          label={`Versions — ${activeFamily?.parent ?? ''}`}
          activeKey={selectedType}
          className="border-b border-hairline pt-1"
        >
          {versionTabs.map((tab) => (
            <FilterTab
              key={tab.label}
              label={tab.display}
              title={tab.label}
              count={tab.count}
              dense
              selected={selectedType === tab.label}
              onSelect={() => onSelectedTypeChange(tab.label)}
            />
          ))}
        </FilterTabStrip>
      )}

      {/* Panel — the tab's content surface. Named once by the active tab, so
          the header carries only the count and the section CTA. */}
      <Card className="mt-4 overflow-hidden">
        {importButton && (
          <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-hairline px-6 py-3">
            <p className="t-caption tabular-nums">
              {visibleDocs.length} document{visibleDocs.length > 1 ? 's' : ''}
            </p>
            {importButton}
          </header>
        )}
        {/* Incoming panel only: 200 ms fade + 1 px rise on the decelerate
            curve — the same entrance TabsContent gives every other tab
            panel in the app (motion-spec §7). */}
        <div
          key={selectedType}
          className="p-6 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 ease-enter motion-reduce:animate-none"
        >
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
            </div>
          ) : visibleDocs.length === 0 ? (
            // Empty state — element-specs §12 (NN/g: state + reason; Polaris:
            // one line). Flat well inside the card (`dashed={false}` — dashed is
            // the drop-target cue). The action lives in the header (Importer).
            <EmptyState
              dashed={false}
              icon={<FileText />}
              title={selectedType === ALL_TYPES_KEY ? 'Aucun document' : `Aucun document « ${selectedType} »`}
              description={selectedType === ALL_TYPES_KEY ? 'Les documents importés apparaîtront ici.' : 'Choisissez un autre type ou « Tous les documents ».'}
            />
          ) : (
            // Thumbnails only (no meta band), so the grid packs tighter as it
            // widens — 8 across at 2xl instead of stretching 6 tiles.
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-8">
              {visibleDocs.map((item) => {
                const name = item.nom || item.fileName || 'document';
                const isImg = isImage(name) && !!item.url;
                const isPdfFile = isPdf(name);
                const isSelected = !!selectedIds?.has(item.id);
                const selectable = !item.pendingUpload && !!item.url;
                const canOpen = !item.pendingUpload && !!item.url;
                return (
                  // Tile — element-specs §21 (Carbon tile: no decorative
                  // shadow, do not mix variants; owner sockets ruling): raised
                  // tile, 10 px radius inside the 12 px card, thumbnail +
                  // `t-body-sm`-weight name + `t-caption` meta, hover-revealed
                  // actions. Clicking the tile only toggles selection — the eye
                  // icon is the only way into the viewer (lightbox rule).
                  <div
                    key={item.id}
                    className={cn(
                      'group relative overflow-hidden rounded-[10px] bg-card shadow-rim transition-[box-shadow] duration-150 focus-within:ring-2 focus-within:ring-ring',
                      // The name/size/date band is gone (owner 2026-09-04) —
                      // the tile is the image. The filename survives as the
                      // native tooltip and in each action's aria-label.
                      selectionMode && isSelected && 'ring-2 ring-ring hover:ring-ring',
                      selectionMode && (selectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')
                    )}
                    title={name}
                    onClick={() => {
                      if (selectionMode && selectable && onToggleSelect) onToggleSelect(item.id);
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-surface-2">
                      {isImg ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt={name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        // A PDF/blank tile has no self-identifying picture, so
                        // its name goes INSIDE the placeholder's empty space —
                        // « 1ère proposition » and « 2ème proposition » would
                        // otherwise be two identical icons.
                        <div className="flex w-full flex-col items-center gap-1 px-2 text-ink-3">
                          <FileIcon className={cn('h-10 w-10', isPdfFile && 'text-ink-2')} aria-hidden />
                          <span className="text-[11px] font-semibold tracking-wide">{fileExt(name)}</span>
                          <span className="line-clamp-2 text-center text-[11px] leading-tight text-ink-3">
                            {name}
                          </span>
                        </div>
                      )}

                      {/* Selection checkbox overlay */}
                      {selectionMode && selectable && (
                        <div className="absolute left-1.5 top-1.5 z-10 rounded bg-card/90 p-0.5 shadow-rim" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelect?.(item.id)}
                            aria-label={`Sélectionner ${name}`}
                          />
                        </div>
                      )}

                      {/* Hover / focus overlay with actions (dark functional scrim) */}
                      <div
                        className={cn(
                          'absolute inset-0 flex items-center justify-center gap-1.5 bg-ink-solid/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100',
                          selectionMode && 'hidden'
                        )}
                      >
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canOpen && onOpenDocument) onOpenDocument(item);
                          }}
                          title="Apercu"
                          aria-label={`Aperçu de ${name}`}
                          disabled={!canOpen}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="h-7 w-7"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (canOpen && onDownloadDocument) onDownloadDocument(item);
                          }}
                          title="Telecharger"
                          aria-label={`Télécharger ${name}`}
                          disabled={!canOpen}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        {canDelete && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDocument?.(item);
                            }}
                            title="Supprimer"
                            aria-label={`Supprimer ${name}`}
                            disabled={isDeleting === item.id || !!item.pendingUpload}
                          >
                            {isDeleting === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>

                      {/* Status badge §11: warning pair + label (pending IS an exception). */}
                      {item.pendingUpload && (
                        <Badge variant="warning" className="absolute left-1 top-1">
                          En attente
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
