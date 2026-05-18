'use client';

import React, { useMemo, useState } from 'react';
import {
  Upload,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const importButton = onImportClick ? (
    canImport ? (
      <Button size="sm" onClick={onImportClick}>
        <Upload className="mr-2 h-4 w-4" />
        Importer
      </Button>
    ) : (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>
              <Button size="sm" disabled>
                <Upload className="mr-2 h-4 w-4" />
                Importer
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>Import non disponible pour le chiffreur</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  ) : null;

  return (
    <div className={cn('grid gap-4 lg:grid-cols-3 items-start', className)}>
      {/* LEFT: type filter */}
      <Card className="shadow-sm border-0 rounded-xl overflow-hidden lg:col-span-1">
        <CardHeader className="bg-heading-bg py-3 rounded-t-xl flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-sm text-primary">Type de document</CardTitle>
          <div className="relative w-[160px] max-w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={typeSearch}
              onChange={(e) => onTypeSearchChange(e.target.value)}
              className="h-8 pl-7 text-xs border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0 max-h-[640px] overflow-y-auto">
          {/* "Tous" entry always at the top */}
          <button
            onClick={() => onSelectedTypeChange(ALL_TYPES_KEY)}
            className={cn(
              'flex items-center justify-between w-full px-4 py-3 text-sm transition-colors text-left border-b',
              selectedType === ALL_TYPES_KEY ? 'bg-accent border-l-2 border-l-primary' : 'hover:bg-accent/50'
            )}
          >
            <span className={cn('truncate', selectedType === ALL_TYPES_KEY && 'font-semibold text-primary')}>
              Tous les documents
            </span>
            <span className="text-xs font-bold rounded-full px-2.5 py-0.5 shrink-0 bg-muted text-foreground">
              {documents.length}
            </span>
          </button>

          {isSearchActive ? (
            filterRows.length === 0 ? (
              <p className="text-xs italic text-muted-foreground text-center py-8">Aucun type.</p>
            ) : (
              filterRows.map((row, idx) => {
                const isSelected = selectedType === row.label;
                return (
                  <button
                    key={row.label}
                    onClick={() => onSelectedTypeChange(row.label)}
                    className={cn(
                      'flex items-center justify-between w-full px-4 py-3 text-sm transition-colors text-left',
                      idx !== filterRows.length - 1 && 'border-b',
                      isSelected ? 'bg-accent border-l-2 border-l-primary' : 'hover:bg-accent/50',
                      row.count === 0 && 'opacity-60'
                    )}
                  >
                    <span className={cn('truncate', isSelected && 'font-semibold text-primary')}>{row.label}</span>
                    <span className="text-xs font-bold rounded-full px-2.5 py-0.5 shrink-0 bg-muted text-foreground">
                      {row.count}
                    </span>
                  </button>
                );
              })
            )
          ) : filterGroups.nonFamily.length === 0 &&
            filterGroups.devisFamilies.length === 0 &&
            filterGroups.factureFamilies.length === 0 ? (
            <p className="text-xs italic text-muted-foreground text-center py-8">Aucun type.</p>
          ) : (
            <>
              {filterGroups.nonFamily.map((row) => {
                const isSelected = selectedType === row.label;
                return (
                  <button
                    key={row.label}
                    onClick={() => onSelectedTypeChange(row.label)}
                    className={cn(
                      'flex items-center justify-between w-full px-4 py-3 text-sm transition-colors text-left border-b',
                      isSelected ? 'bg-accent border-l-2 border-l-primary' : 'hover:bg-accent/50',
                      row.count === 0 && 'opacity-60'
                    )}
                  >
                    <span className={cn('truncate', isSelected && 'font-semibold text-primary')}>{row.label}</span>
                    <span className="text-xs font-bold rounded-full px-2.5 py-0.5 shrink-0 bg-muted text-foreground">
                      {row.count}
                    </span>
                  </button>
                );
              })}
              {[...filterGroups.devisFamilies, ...filterGroups.factureFamilies].map((fam) => {
                const collapsed = !!collapsedSections[fam.parent];
                const isParentSelected = selectedType === fam.parent;
                return (
                  <div key={fam.parent} className="border-b">
                    <div
                      className={cn(
                        'flex items-stretch w-full text-sm transition-colors',
                        isParentSelected
                          ? 'bg-accent border-l-2 border-l-primary'
                          : 'hover:bg-accent/50'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSection(fam.parent)}
                        className="flex items-center justify-center w-9 shrink-0 text-muted-foreground hover:text-foreground"
                        aria-label={collapsed ? 'Développer la section' : 'Réduire la section'}
                        aria-expanded={!collapsed}
                      >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectedTypeChange(fam.parent)}
                        className="flex items-center justify-between flex-1 pr-4 py-3 text-left"
                      >
                        <span
                          className={cn(
                            'truncate font-medium',
                            isParentSelected && 'font-semibold text-primary'
                          )}
                        >
                          {fam.parent}
                        </span>
                        <span className="text-xs font-bold rounded-full px-2.5 py-0.5 shrink-0 bg-muted text-foreground">
                          {fam.totalCount}
                        </span>
                      </button>
                    </div>

                    {!collapsed && (fam.accords.length > 0 || fam.propositions.length > 0) && (
                      <div>
                        {fam.accords.length > 0 && (
                          <>
                            <div className="pl-12 pr-4 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted/30">
                              Accords
                            </div>
                            {fam.accords.map((row) => {
                              const parsed = parseAccordDocType(row.label);
                              const display = parsed ? shortenAccordLabel(parsed) : row.label;
                              const rowSelected = selectedType === row.label;
                              return (
                                <button
                                  key={row.label}
                                  onClick={() => onSelectedTypeChange(row.label)}
                                  className={cn(
                                    'flex items-center justify-between w-full pl-12 pr-4 py-2.5 text-sm transition-colors text-left',
                                    rowSelected
                                      ? 'bg-accent border-l-2 border-l-primary'
                                      : 'hover:bg-accent/50',
                                    row.count === 0 && 'opacity-60'
                                  )}
                                  title={row.label}
                                >
                                  <span
                                    className={cn(
                                      'truncate',
                                      rowSelected && 'font-semibold text-primary'
                                    )}
                                  >
                                    {display}
                                  </span>
                                  <span className="text-xs font-bold rounded-full px-2.5 py-0.5 shrink-0 bg-muted text-foreground">
                                    {row.count}
                                  </span>
                                </button>
                              );
                            })}
                          </>
                        )}
                        {fam.propositions.length > 0 && (
                          <>
                            <div className="pl-12 pr-4 py-1.5 text-[10px] uppercase tracking-wider font-semibold text-muted-foreground bg-muted/30">
                              Propositions
                            </div>
                            {fam.propositions.map((row) => {
                              const parsed = parseAccordDocType(row.label);
                              const display = parsed ? shortenAccordLabel(parsed) : row.label;
                              const rowSelected = selectedType === row.label;
                              return (
                                <button
                                  key={row.label}
                                  onClick={() => onSelectedTypeChange(row.label)}
                                  className={cn(
                                    'flex items-center justify-between w-full pl-12 pr-4 py-2.5 text-sm transition-colors text-left',
                                    rowSelected
                                      ? 'bg-accent border-l-2 border-l-primary'
                                      : 'hover:bg-accent/50',
                                    row.count === 0 && 'opacity-60'
                                  )}
                                  title={row.label}
                                >
                                  <span
                                    className={cn(
                                      'truncate',
                                      rowSelected && 'font-semibold text-primary'
                                    )}
                                  >
                                    {display}
                                  </span>
                                  <span className="text-xs font-bold rounded-full px-2.5 py-0.5 shrink-0 bg-muted text-foreground">
                                    {row.count}
                                  </span>
                                </button>
                              );
                            })}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      {/* RIGHT: preview grid */}
      <Card className="shadow-sm border-0 rounded-xl overflow-hidden lg:col-span-2">
        {importButton && (
          <CardHeader className="bg-heading-bg py-3 rounded-t-xl flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm text-primary">
              {selectedType === ALL_TYPES_KEY ? 'Tous les documents' : selectedType}
            </CardTitle>
            {importButton}
          </CardHeader>
        )}
        <CardContent className="p-4">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : visibleDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground italic">
                {selectedType === ALL_TYPES_KEY ? 'Aucun document.' : `Aucun document de type "${selectedType}".`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
              {visibleDocs.map((item) => {
                const name = item.nom || item.fileName || 'document';
                const isImg = isImage(name) && !!item.url;
                const isPdfFile = isPdf(name);
                const isSelected = !!selectedIds?.has(item.id);
                const selectable = !item.pendingUpload && !!item.url;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'group relative border rounded-lg overflow-hidden bg-card shadow-sm hover:shadow-md transition-all cursor-pointer',
                      selectionMode && isSelected && 'ring-2 ring-primary border-primary',
                      selectionMode && !selectable && 'opacity-60 cursor-not-allowed'
                    )}
                    onClick={() => {
                      if (selectionMode) {
                        if (selectable && onToggleSelect) onToggleSelect(item.id);
                        return;
                      }
                      if (!item.pendingUpload && item.url && onOpenDocument) onOpenDocument(item);
                    }}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square bg-muted flex items-center justify-center overflow-hidden relative">
                      {isImg ? (
                        <img
                          src={item.url}
                          alt={name}
                          loading="lazy"
                          decoding="async"
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                          <FileIcon className={cn('h-12 w-12', isPdfFile && 'text-red-500')} />
                          <span className="text-[9px] uppercase font-black tracking-wider">{fileExt(name)}</span>
                        </div>
                      )}

                      {/* Selection checkbox overlay */}
                      {selectionMode && selectable && (
                        <div className="absolute top-1.5 left-1.5 z-10 bg-background/90 rounded shadow-sm p-0.5" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelect?.(item.id)}
                          />
                        </div>
                      )}

                      {/* Hover overlay with actions */}
                      <div
                        className={cn(
                          'absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5',
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
                            if (!item.pendingUpload && item.url && onOpenDocument) onOpenDocument(item);
                          }}
                          title="Apercu"
                          disabled={!!item.pendingUpload}
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
                            if (!item.pendingUpload && item.url && onDownloadDocument) onDownloadDocument(item);
                          }}
                          title="Telecharger"
                          disabled={!!item.pendingUpload}
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
                        <Badge variant="outline" className="absolute top-1 left-1 text-amber-700 bg-amber-50 border-amber-300 text-[9px] py-0 px-1.5">
                          En attente
                        </Badge>
                      )}
                    </div>

                    {/* Footer info */}
                    <div className="p-2 space-y-1 border-t">
                      <p className="text-[11px] font-semibold truncate" title={name}>{name}</p>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{formatSize(item.taille || item.fileSize)}</span>
                        <span className="truncate ml-1">{formatDate(item.dateUpload || item.uploadedAt)}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground truncate" title={item.uploadePar || item.uploadedBy}>
                        {item.uploadePar || item.uploadedBy || '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
