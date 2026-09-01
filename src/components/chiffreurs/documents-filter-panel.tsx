'use client';

import React, { useMemo, useState } from 'react';
import {
  Download,
  Trash2,
  Loader2,
  FileIcon,
  FileText,
  Eye,
  Search,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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

const formatSize = (bytes?: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (ts: any) => {
  if (!ts) return '-';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
};

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

/** Count chip: `bg-surface-3 text-ink-2`; inside a selected (accent) row it
 *  inherits the accent foreground on a quiet tint. */
function CountChip({ count, selected }: { count: number; selected?: boolean }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
        selected ? 'bg-accent-foreground/10 text-accent-foreground' : count === 0 ? 'bg-surface-2 text-ink-4' : 'bg-surface-3 text-ink-2',
      )}
    >
      {count}
    </span>
  );
}

/** One selectable filter row — the "chip" of the filter panel: quiet at rest,
 *  hover on surface-2, selected = accent tint (no left bar, no coloured band). */
function FilterRowButton({
  label,
  count,
  selected,
  indent,
  emphasis,
  title,
  onClick,
}: {
  label: string;
  count: number;
  selected: boolean;
  indent?: boolean;
  emphasis?: boolean;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={title}
      className={cn(
        'flex w-full items-center justify-between gap-3 py-2.5 pr-4 text-left text-sm transition-colors duration-150',
        indent ? 'pl-12' : 'pl-6',
        selected
          ? 'bg-accent font-semibold text-accent-foreground'
          : count === 0
            ? 'text-ink-3 hover:bg-surface-2'
            : cn('text-ink-2 hover:bg-surface-2 hover:text-ink', emphasis && 'font-medium text-ink'),
      )}
    >
      <span className="truncate">{label}</span>
      <CountChip count={count} selected={selected} />
    </button>
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

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (parent: string) =>
    setCollapsedSections((prev) => ({ ...prev, [parent]: !prev[parent] }));

  const isSearchActive = typeSearch.trim().length > 0;

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

  // Section CTA: full-size solid primary, text only (no decorative icon).
  const importButton = onImportClick ? (
    canImport ? (
      <Button onClick={onImportClick}>Importer</Button>
    ) : (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button disabled>Importer</Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Import non disponible pour le chiffreur</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  ) : null;

  const renderAccordSubsection = (title: string, rows: FamilyAccordRow[]) => (
    <>
      {/* Group label: t-label, no coloured band per group. */}
      <div className="t-label py-1.5 pl-12 pr-4">{title}</div>
      <div className="divide-y divide-hairline">
        {rows.map((row) => {
          const parsed = parseAccordDocType(row.label);
          const display = parsed ? shortenAccordLabel(parsed) : row.label;
          return (
            <FilterRowButton
              key={row.label}
              label={display}
              count={row.count}
              selected={selectedType === row.label}
              indent
              title={row.label}
              onClick={() => onSelectedTypeChange(row.label)}
            />
          );
        })}
      </div>
    </>
  );

  return (
    <div className={cn('grid items-start gap-6 lg:grid-cols-3', className)}>
      {/* LEFT: type filter — a glass pane (Card tonal); the nested-solid rule
          flattens it when the host is already paper. */}
      <Card className="overflow-hidden lg:col-span-1">
        <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-hairline px-6 py-3">
          <h3 className="t-heading truncate">Type de document</h3>
          <div className="relative w-[160px] max-w-full shrink-0">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
            <Input
              placeholder="Rechercher..."
              value={typeSearch}
              onChange={(e) => onTypeSearchChange(e.target.value)}
              className="h-8 pl-7 text-xs"
              aria-label="Rechercher un type"
            />
          </div>
        </header>
        <div className="max-h-[640px] overflow-y-auto">
          {/* "Tous" entry always at the top */}
          <div className="border-b border-hairline">
            <FilterRowButton
              label="Tous les documents"
              count={documents.length}
              selected={selectedType === ALL_TYPES_KEY}
              emphasis
              onClick={() => onSelectedTypeChange(ALL_TYPES_KEY)}
            />
          </div>

          {isSearchActive ? (
            filterRows.length === 0 ? (
              <p className="t-caption py-8 text-center">Aucun type.</p>
            ) : (
              <div className="divide-y divide-hairline">
                {filterRows.map((row) => (
                  <FilterRowButton
                    key={row.label}
                    label={row.label}
                    count={row.count}
                    selected={selectedType === row.label}
                    onClick={() => onSelectedTypeChange(row.label)}
                  />
                ))}
              </div>
            )
          ) : filterGroups.nonFamily.length === 0 &&
            filterGroups.devisFamilies.length === 0 &&
            filterGroups.factureFamilies.length === 0 ? (
            <p className="t-caption py-8 text-center">Aucun type.</p>
          ) : (
            <div className="divide-y divide-hairline">
              {filterGroups.nonFamily.map((row) => (
                <FilterRowButton
                  key={row.label}
                  label={row.label}
                  count={row.count}
                  selected={selectedType === row.label}
                  onClick={() => onSelectedTypeChange(row.label)}
                />
              ))}
              {[...filterGroups.devisFamilies, ...filterGroups.factureFamilies].map((fam) => {
                const collapsed = !!collapsedSections[fam.parent];
                const isParentSelected = selectedType === fam.parent;
                return (
                  <div key={fam.parent}>
                    <div
                      className={cn(
                        'flex w-full items-stretch text-sm transition-colors duration-150',
                        isParentSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-surface-2'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(fam.parent)}
                        className={cn(
                          'flex w-9 shrink-0 items-center justify-center pl-2',
                          isParentSelected ? 'text-accent-foreground' : 'text-ink-3 hover:text-ink'
                        )}
                        aria-label={collapsed ? 'Développer la section' : 'Réduire la section'}
                        aria-expanded={!collapsed}
                      >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectedTypeChange(fam.parent)}
                        aria-pressed={isParentSelected}
                        className="flex flex-1 items-center justify-between gap-3 py-2.5 pl-1 pr-4 text-left"
                      >
                        <span className={cn('truncate', isParentSelected ? 'font-semibold' : 'font-medium text-ink')}>
                          {fam.parent}
                        </span>
                        <CountChip count={fam.totalCount} selected={isParentSelected} />
                      </button>
                    </div>

                    {!collapsed && (fam.accords.length > 0 || fam.propositions.length > 0) && (
                      <div className="border-t border-hairline">
                        {fam.accords.length > 0 && renderAccordSubsection('Accords', fam.accords)}
                        {fam.propositions.length > 0 && renderAccordSubsection('Propositions', fam.propositions)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* RIGHT: preview grid */}
      <Card className="overflow-hidden lg:col-span-2">
        {importButton && (
          <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-hairline px-6 py-3">
            <h3 className="t-heading truncate">
              {selectedType === ALL_TYPES_KEY ? 'Tous les documents' : selectedType}
            </h3>
            {importButton}
          </header>
        )}
        <div className="p-6">
          {loading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-ink-3" />
            </div>
          ) : visibleDocs.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-center">
              <FileText className="mb-2 h-10 w-10 text-ink-4" aria-hidden />
              <p className="t-caption">
                {selectedType === ALL_TYPES_KEY ? 'Aucun document.' : `Aucun document de type "${selectedType}".`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {visibleDocs.map((item) => {
                const name = item.nom || item.fileName || 'document';
                const isImg = isImage(name) && !!item.url;
                const isPdfFile = isPdf(name);
                const isSelected = !!selectedIds?.has(item.id);
                const selectable = !item.pendingUpload && !!item.url;
                const canOpen = !item.pendingUpload && !!item.url;
                return (
                  // Tile = raised socket (slot-card.tsx): hairline ring, 8 px radius
                  // inside the 12 px card; no shadow-* on paper. Clicking the tile
                  // only toggles selection — the eye icon is the only way into the
                  // viewer (lightbox rule).
                  <div
                    key={item.id}
                    className={cn(
                      'group relative overflow-hidden rounded-lg bg-card ring-1 ring-hairline transition-[box-shadow] duration-150 hover:ring-hairline-strong focus-within:ring-2 focus-within:ring-ring',
                      selectionMode && isSelected && 'ring-2 ring-ring hover:ring-ring',
                      selectionMode && (selectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60')
                    )}
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
                        <div className="flex flex-col items-center gap-1.5 text-ink-3">
                          <FileIcon className={cn('h-12 w-12', isPdfFile && 'text-ink-2')} aria-hidden />
                          <span className="text-[11px] font-semibold tracking-wide">{fileExt(name)}</span>
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

                      {item.pendingUpload && (
                        <Badge variant="validation" className="absolute left-1 top-1 px-1.5 py-0 text-[11px]">
                          En attente
                        </Badge>
                      )}
                    </div>

                    {/* Footer info — name is the value (ink, 600), meta in ink-3 */}
                    <div className="space-y-0.5 border-t border-hairline p-2">
                      <p className="truncate text-xs font-semibold text-ink" title={name}>{name}</p>
                      <div className="flex items-center justify-between gap-1 text-[11px] text-ink-3">
                        <span className="tabular-nums">{formatSize(item.taille || item.fileSize)}</span>
                        <span className="truncate tabular-nums">{formatDate(item.dateUpload || item.uploadedAt)}</span>
                      </div>
                      <p className="truncate text-[11px] text-ink-3" title={item.uploadePar || item.uploadedBy}>
                        {item.uploadePar || item.uploadedBy || '—'}
                      </p>
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
