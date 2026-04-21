'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Loader2,
  FileIcon,
  FileText,
  Eye,
  Search,
  X,
  CheckSquare,
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import { toOrdinalFr } from '@/lib/devis-schema';
import { useFirestore, useAuth, useCollection, useStorage } from '@/firebase';
import {
  collection,
  deleteDoc,
  doc,
} from 'firebase/firestore';
import {
  ref,
  deleteObject,
} from 'firebase/storage';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logHistorique, logWorkflow } from './log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';

type DocumentsTabProps = {
  dossierId: string;
};

const ALL_TYPES_KEY = '__all__';

export default function DocumentsTab({ dossierId }: DocumentsTabProps) {
  const db = useFirestore();
  const { canWrite } = useCurrentUser();
  const canEdit = canWrite('dossiers');
  const auth = useAuth();
  const storage = useStorage();
  const { toast } = useToast();

  const { options: dbDocTypes } = useOptions('options_types_documents', [...defaultDocTypes]);
  const docTypes = useMemo(
    () => (dbDocTypes.length > 0 ? dbDocTypes : defaultDocTypes.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true }))),
    [dbDocTypes]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState<string>(ALL_TYPES_KEY);
  const [typeSearch, setTypeSearch] = useState('');
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; nom: string } | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadType, setUploadType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  // Devis-specific variant (only shown when uploadType === 'Devis')
  const [devisVariant, setDevisVariant] = useState<'original' | 'counter'>('original');
  const [counterRoundLabel, setCounterRoundLabel] = useState<string>('');

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  const collQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'dossiers', dossierId, 'documents');
  }, [db, dossierId]);

  const { data: allDocuments, loading } = useCollection<any>(collQuery);

  const sortedDocs = useMemo(() => {
    if (!allDocuments) return [];
    return [...allDocuments].sort((a, b) => {
      const tsA = a.dateUpload || a.uploadedAt;
      const tsB = b.dateUpload || b.uploadedAt;
      const dateA = tsA?.toDate ? tsA.toDate().getTime() : (tsA || 0);
      const dateB = tsB?.toDate ? tsB.toDate().getTime() : (tsB || 0);
      return dateB - dateA;
    });
  }, [allDocuments]);

  // Per-type counts for the left filter card
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of sortedDocs) {
      const t = d.type || d.typeDocument || 'Autre';
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [sortedDocs]);

  const filterRows = useMemo(() => {
    const knownLabels = docTypes.map((t) => t.label);
    // Include any type present in docs but missing from the canonical list
    const allLabels = new Set<string>(knownLabels);
    Object.keys(typeCounts).forEach((t) => allLabels.add(t));
    const rows = Array.from(allLabels).map((label) => ({ label, count: typeCounts[label] || 0 }));
    rows.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    const search = typeSearch.toLowerCase().trim();
    return search ? rows.filter((r) => r.label.toLowerCase().includes(search)) : rows;
  }, [docTypes, typeCounts, typeSearch]);

  const visibleDocs = useMemo(() => {
    if (selectedType === ALL_TYPES_KEY) return sortedDocs;
    return sortedDocs.filter((d) => (d.type || d.typeDocument) === selectedType);
  }, [sortedDocs, selectedType]);

  // Tally Devis-typed documents in this dossier by their variant.
  // Files missing `devisVariant` are treated as original (back-compat with older uploads).
  const devisStats = useMemo(() => {
    const devisDocs = sortedDocs.filter((d: any) => (d.type || d.typeDocument) === 'Devis');
    const originals = devisDocs.filter((d: any) => (d.devisVariant ?? 'original') === 'original').length;
    const counters = devisDocs.filter((d: any) => d.devisVariant === 'counter').length;
    return { originals, counters };
  }, [sortedDocs]);

  const canSelectCounter = devisStats.originals > 0;

  // When the user switches uploadType or opens the dialog, reset variant fields sensibly.
  React.useEffect(() => {
    if (uploadType !== 'Devis') return;
    // If no original yet → force 'original'. Otherwise default to 'original' but allow switch.
    setDevisVariant('original');
    setCounterRoundLabel(toOrdinalFr(devisStats.counters + 1) + ' accord');
  }, [uploadType, devisStats.counters, isUploadModalOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(Array.from(e.target.files));
      setUploadModalOpen(true);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !uploadType || !db || !storage || !auth) return;
    const userEmail = auth.currentUser?.email || 'Admin';
    const userId = auth?.currentUser?.uid || 'unknown';
    setIsUploading(true);

    // Guard: counter variant requires an original already in this dossier.
    if (uploadType === 'Devis' && devisVariant === 'counter' && !canSelectCounter) {
      toast({
        variant: 'destructive',
        title: 'Devis original manquant',
        description: "Uploadez d'abord un devis original avant d'ajouter un contre-devis.",
      });
      return;
    }

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const timestamp = Date.now();
        const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${file.name}`;

        const isDevis = uploadType === 'Devis';
        // When multiple counter files are selected at once, auto-increment the round label
        // so that "1er accord", "2ème accord", etc. don't collide on the same upload.
        const devisMetadata: Record<string, any> = {};
        if (isDevis) {
          devisMetadata.devisVariant = devisVariant;
          if (devisVariant === 'counter') {
            const baseLabel = counterRoundLabel.trim() || (toOrdinalFr(devisStats.counters + 1 + i) + ' accord');
            // Only suffix if user didn't already set a custom label and this is a subsequent file.
            const label = counterRoundLabel.trim() && i === 0
              ? counterRoundLabel.trim()
              : toOrdinalFr(devisStats.counters + 1 + i) + ' accord';
            devisMetadata.counterRoundLabel = label;
            devisMetadata.counterRoundOrder = devisStats.counters + 1 + i;
          }
        }

        await uploadFileWithOfflineSupport({
          storage,
          db,
          file,
          fileName: file.name,
          storagePath,
          firestoreDocPath: `dossiers/${dossierId}/documents`,
          firestoreMetadata: {
            nom: file.name,
            type: uploadType,
            taille: file.size,
            uploadePar: userEmail,
            storagePath,
            _localCreatedAt: timestamp,
            ...devisMetadata,
          },
        });
        await logHistorique(db, dossierId, 'Upload document', userEmail, `Document "${file.name}" uploadé.`, 'document');
        await logWorkflow(db, dossierId, 'Nouveau document ajouté', userEmail, userId, 'done', { details: `Document "${file.name}" ajouté (par gestionnaire)` });
      }

      toast({ title: selectedFiles.length === 1 ? 'Document uploadé avec succès' : `${selectedFiles.length} documents uploadés` });
      setUploadModalOpen(false);
      setSelectedFiles([]);
      setUploadType('');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        variant: 'destructive',
        title: "Erreur lors de l'upload",
        description: error.message || 'Une erreur inconnue est survenue.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (document: any) => {
    const userEmail = auth?.currentUser?.email || 'Admin';
    if (!db || !storage) return;
    if (!window.confirm('Supprimer ce document ?')) return;

    setIsDeleting(document.id);

    try {
      if (document.storagePath) {
        const storageRef = ref(storage, document.storagePath);
        await deleteObject(storageRef).catch((err) => {
          console.warn('Storage file already missing or blocked by rules:', err);
        });
      }
      await deleteDoc(doc(db, 'dossiers', dossierId, 'documents', document.id));
      await logHistorique(db, dossierId, 'Suppression document', userEmail, `Document "${document.nom || 'inconnu'}" supprimé.`, 'document');
      toast({ title: 'Document supprimé avec succès' });
    } catch (error: any) {
      console.error('Document delete error:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur lors de la suppression',
        description: error?.message || 'Vérifiez les permissions de stockage.',
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Download error:', e);
      toast({ variant: 'destructive', title: 'Erreur lors du téléchargement' });
    }
  };

  const toggleSelectDoc = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleDocs.forEach((d: any) => {
        if (d.id && !d.pendingUpload && d.url) next.add(d.id);
      });
      return next;
    });
  };

  const deselectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleDocs.forEach((d: any) => next.delete(d.id));
      return next;
    });
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDownloadSelected = async () => {
    if (!allDocuments || selectedIds.size === 0) return;
    const chosen = allDocuments.filter((d: any) => selectedIds.has(d.id) && d.url);
    if (chosen.length === 0) return;
    setIsBatchDownloading(true);
    try {
      for (const d of chosen) {
        const name = d.nom || d.fileName || 'document';
        await handleDownload(d.url, name);
        await new Promise((r) => setTimeout(r, 250));
      }
      toast({ title: `${chosen.length} document(s) téléchargé(s)` });
    } finally {
      setIsBatchDownloading(false);
    }
  };

  const allVisibleSelected =
    visibleDocs.length > 0 && visibleDocs.every((d: any) => selectedIds.has(d.id));

  const formatSize = (bytes: number) => {
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

  const isImage = (name: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(name || '');
  const isPdf = (name: string) => /\.pdf$/i.test(name || '');
  const fileExt = (name: string) => {
    const m = (name || '').match(/\.([a-z0-9]+)$/i);
    return m ? m[1].toUpperCase() : 'FILE';
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        ref={fileInputRef}
        multiple
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileSelect}
      />

      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {selectedType === ALL_TYPES_KEY ? 'Tous les documents' : selectedType}
            <Badge variant="secondary" className="ml-2 text-[10px]">{visibleDocs.length}</Badge>
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {!selectionMode && (
            <>
              <OptionsManagerModal collectionName="options_types_documents" title="Types de documents" defaultValues={[...defaultDocTypes]} />
              <Button variant="outline" size="sm" onClick={() => setSelectionMode(true)}>
                <CheckSquare className="mr-2 h-4 w-4" />
                Sélectionner
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Selection toolbar */}
      {selectionMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/50 border rounded-lg px-4 py-2">
          <span className="text-sm font-medium">
            {selectedIds.size} document(s) sélectionné(s)
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={allVisibleSelected ? deselectAllVisible : selectAllVisible}
              disabled={visibleDocs.length === 0}
            >
              {allVisibleSelected ? 'Tout désélectionner' : 'Sélectionner tout'}
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadSelected}
              disabled={selectedIds.size === 0 || isBatchDownloading}
            >
              {isBatchDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Télécharger ({selectedIds.size})
            </Button>
            <Button variant="ghost" size="sm" onClick={exitSelectionMode} disabled={isBatchDownloading}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 items-start">
        {/* LEFT: type filter */}
        <Card className="shadow-sm border-0 rounded-xl overflow-hidden lg:col-span-1">
          <CardHeader className="bg-heading-bg py-3 rounded-t-xl flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-sm text-primary">Type de document</CardTitle>
            <div className="relative w-[160px] max-w-full">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                className="h-8 pl-7 text-xs border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[640px] overflow-y-auto">
            {/* "Tous" entry always at the top */}
            <button
              onClick={() => setSelectedType(ALL_TYPES_KEY)}
              className={cn(
                'flex items-center justify-between w-full px-4 py-3 text-sm transition-colors text-left border-b',
                selectedType === ALL_TYPES_KEY ? 'bg-accent border-l-2 border-l-primary' : 'hover:bg-accent/50'
              )}
            >
              <span className={cn('truncate', selectedType === ALL_TYPES_KEY && 'font-semibold text-primary')}>
                Tous les documents
              </span>
              <span className="text-xs font-bold rounded-full px-2.5 py-0.5 shrink-0 bg-muted text-foreground">
                {sortedDocs.length}
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
                    onClick={() => setSelectedType(row.label)}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {visibleDocs.map((item: any) => {
                  const name = item.nom || item.fileName || 'document';
                  const isImg = isImage(name) && item.url;
                  const isPdfFile = isPdf(name);
                  const isSelected = selectedIds.has(item.id);
                  const selectable = !item.pendingUpload && item.url;
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'group relative border rounded-lg overflow-hidden bg-card shadow-sm hover:shadow-md transition-all cursor-pointer',
                        selectionMode && isSelected && 'ring-2 ring-primary border-primary',
                        selectionMode && !selectable && 'opacity-60 cursor-not-allowed',
                      )}
                      onClick={() => {
                        if (selectionMode) {
                          if (selectable) toggleSelectDoc(item.id);
                          return;
                        }
                        if (!item.pendingUpload && item.url) setPreviewDoc({ url: item.url, nom: name });
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
                              onCheckedChange={() => toggleSelectDoc(item.id)}
                            />
                          </div>
                        )}

                        {/* Hover overlay with actions */}
                        <div className={cn(
                          "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5",
                          selectionMode && "hidden",
                        )}>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!item.pendingUpload && item.url) setPreviewDoc({ url: item.url, nom: name });
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
                              if (!item.pendingUpload && item.url) handleDownload(item.url, name);
                            }}
                            title="Telecharger"
                            disabled={!!item.pendingUpload}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          {canEdit && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-7 w-7"
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(item);
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

      {/* Upload modal */}
      <Dialog open={isUploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Catégorie du document</DialogTitle>
            <DialogDescription>
              {selectedFiles.length === 1 ? (
                <>Fichier: <span className="font-semibold text-foreground">{selectedFiles[0]?.name}</span></>
              ) : (
                <><span className="font-semibold text-foreground">{selectedFiles.length} fichiers</span> seront uploadés avec ce type.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Type de document</label>
                <OptionsManagerModal collectionName="options_types_documents" title="Types de documents" defaultValues={[...defaultDocTypes]} />
              </div>
              <Select value={uploadType} onValueChange={setUploadType} disabled={isUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map((type) => (
                    <SelectItem key={`type-${type.id}`} value={type.label}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {uploadType === 'Devis' && (
              <div className="space-y-2 pt-1 border-t">
                <Label className="text-xs font-semibold">Variante du devis</Label>
                <RadioGroup
                  value={devisVariant}
                  onValueChange={(v) => setDevisVariant(v as 'original' | 'counter')}
                  className="gap-2"
                  disabled={isUploading}
                >
                  <label className="flex items-start gap-2 cursor-pointer">
                    <RadioGroupItem value="original" id="dv-original" className="mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">Devis original</div>
                      <div className="text-[11px] text-muted-foreground">
                        Lignes et prix imprimés. Extraction complète par l'IA au moment du chiffrage.
                      </div>
                    </div>
                  </label>
                  <label className={cn('flex items-start gap-2', canSelectCounter ? 'cursor-pointer' : 'cursor-not-allowed opacity-50')}>
                    <RadioGroupItem value="counter" id="dv-counter" className="mt-0.5" disabled={!canSelectCounter} />
                    <div className="flex-1">
                      <div className="text-sm font-medium">
                        Contre-devis / accord
                        <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-red-600 align-middle" />
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {canSelectCounter
                          ? "Prix de contre-proposition (annotés à la main ou en surimpression). Ajoute une colonne rouge au devis lors du chiffrage."
                          : "Vous devez d'abord uploader un devis original pour ce dossier."}
                      </div>
                    </div>
                  </label>
                </RadioGroup>

                {devisVariant === 'counter' && canSelectCounter && (
                  <div className="space-y-1 pt-2">
                    <Label className="text-xs font-semibold">Label du round</Label>
                    <Input
                      value={counterRoundLabel}
                      onChange={(e) => setCounterRoundLabel(e.target.value)}
                      placeholder="1er accord"
                      className="h-8 text-xs"
                      disabled={isUploading}
                    />
                    <div className="text-[10px] text-muted-foreground">
                      Devient le nom de la colonne rouge (ex: "1er accord", "Expert arbitre").
                    </div>
                  </div>
                )}
              </div>
            )}

            {isUploading && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Envoi en cours...</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadModalOpen(false);
                setSelectedFiles([]);
              }}
              disabled={isUploading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={
                selectedFiles.length === 0
                || !uploadType
                || isUploading
                || (uploadType === 'Devis' && devisVariant === 'counter' && (!canSelectCounter || !counterRoundLabel.trim()))
              }
            >
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isUploading ? 'Transfert...' : 'Uploader'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox preview */}
      {previewDoc && (
        <Dialog open onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-4 py-3 border-b shrink-0 flex flex-row items-center justify-between gap-2">
              <DialogTitle className="text-sm truncate flex-1">{previewDoc.nom}</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleDownload(previewDoc.url, previewDoc.nom)}
                title="Telecharger"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setPreviewDoc(null)}
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              {isImage(previewDoc.nom) ? (
                <img src={previewDoc.url} className="max-w-full max-h-full object-contain" alt={previewDoc.nom} />
              ) : (
                <iframe src={previewDoc.url} className="w-full h-full border-none" title={previewDoc.nom} />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
