'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Download,
  Loader2,
  X,
  CheckSquare,
} from 'lucide-react';
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
import { logHistorique, logWorkflow } from './log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { useCurrentUser } from '@/hooks/use-current-user';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DocumentsFilterPanel,
  ALL_TYPES_KEY,
  type DocumentsFilterPanelDoc,
} from '@/components/chiffreurs/documents-filter-panel';

type DocumentsTabProps = {
  dossierId: string;
};

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
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
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
      setDeleteTarget(null);
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

  const isImage = (name: string) => /\.(jpe?g|png|gif|webp|bmp)$/i.test(name || '');

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

      <DocumentsFilterPanel
        documents={sortedDocs as DocumentsFilterPanelDoc[]}
        docTypes={docTypes}
        selectedType={selectedType}
        onSelectedTypeChange={setSelectedType}
        typeSearch={typeSearch}
        onTypeSearchChange={setTypeSearch}
        loading={loading}
        canImport={canEdit}
        canDelete={canEdit}
        isDeleting={isDeleting}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onToggleSelect={toggleSelectDoc}
        onOpenDocument={(d) => {
          if (!d.pendingUpload && d.url) setPreviewDoc({ url: d.url, nom: d.nom || d.fileName || 'document' });
        }}
        onDownloadDocument={(d) => {
          if (!d.pendingUpload && d.url) handleDownload(d.url, d.nom || d.fileName || 'document');
        }}
        onDeleteDocument={(d) => setDeleteTarget(d)}
      />

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
              <div className="flex items-center gap-2 text-primary">
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.nom && <span className="font-semibold">{deleteTarget.nom}</span>} sera supprimé définitivement du stockage et du dossier. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={!!isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDelete(deleteTarget);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
