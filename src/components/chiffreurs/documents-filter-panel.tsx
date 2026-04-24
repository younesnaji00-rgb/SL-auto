'use client';

import React, { useMemo } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Loader2,
  FileIcon,
  FileText,
  Eye,
  Search,
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
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CollapsedByDayList } from '@/components/common/collapsed-by-day-list';

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
    const rows = Array.from(allLabels).map((label) => ({ label, count: typeCounts[label] || 0 }));
    rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const search = typeSearch.toLowerCase().trim();
    return search ? rows.filter((r) => r.label.toLowerCase().includes(search)) : rows;
  }, [docTypes, typeCounts, typeSearch]);

  const visibleDocs = useMemo(() => {
    if (selectedType === ALL_TYPES_KEY) return documents;
    return documents.filter((d) => (d.type || d.typeDocument) === selectedType);
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

          {filterRows.length === 0 ? (
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
            <CollapsedByDayList
              items={visibleDocs}
              getDate={(item) => {
                const ts = item.dateUpload || item.uploadedAt;
                if (!ts) return null;
                return ts.toDate ? ts.toDate() : new Date(ts);
              }}
              keyOf={(item) => item.id}
              defaultExpanded={false}
              gridItems
              groupLabel={(day, count) =>
                `${format(day, 'd MMMM yyyy', { locale: fr })} — ${count} document${count > 1 ? 's' : ''}`
              }
              renderItem={(item) => {
                const name = item.nom || item.fileName || 'document';
                const isImg = isImage(name) && !!item.url;
                const isPdfFile = isPdf(name);
                const isSelected = !!selectedIds?.has(item.id);
                const selectable = !item.pendingUpload && !!item.url;
                return (
                  <div
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
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
