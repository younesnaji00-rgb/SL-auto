'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  Download,
  Trash2,
  Filter,
  Loader2,
  FileIcon,
  Settings,
  Eye,
} from 'lucide-react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import { useFirestore, useAuth, useCollection, useStorage } from '@/firebase';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from 'firebase/firestore';
import {
  ref,
  deleteObject
} from 'firebase/storage';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logHistorique } from './log-historique';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';

type DocumentsTabProps = {
  dossierId: string;
};

export default function DocumentsTab({ dossierId }: DocumentsTabProps) {
  const db = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const { toast } = useToast();
  
  const { options: dbDocTypes } = useOptions('options_types_documents', [...defaultDocTypes]);
  const docTypes = useMemo(() => dbDocTypes.length > 0 ? dbDocTypes : defaultDocTypes.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbDocTypes]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterType, setFilterType] = useState<string>('all');
  const [isUploadModalOpen, setUploadModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; nom: string } | null>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);

  const collQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'dossiers', dossierId, 'documents');
  }, [db, dossierId]);

  const { data: allDocuments, loading } = useCollection<any>(collQuery);

  const documents = useMemo(() => {
    if (!allDocuments) return [];
    
    let result = [...allDocuments];
    
    // Filter
    if (filterType !== 'all') {
      result = result.filter(doc => (doc.type || doc.typeDocument) === filterType);
    }
    
    // Sort by dateUpload desc
    result.sort((a, b) => {
      const tsA = a.dateUpload || a.uploadedAt;
      const tsB = b.dateUpload || b.uploadedAt;
      const dateA = tsA?.toDate ? tsA.toDate().getTime() : (tsA || 0);
      const dateB = tsB?.toDate ? tsB.toDate().getTime() : (tsB || 0);
      return dateB - dateA;
    });
    
    return result;
  }, [allDocuments, filterType]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadModalOpen(true);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadType || !db || !storage || !auth) return;
    const userEmail = auth.currentUser?.email || 'Admin';
    setIsUploading(true);

    try {
      const timestamp = Date.now();
      const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${selectedFile.name}`;

      // Upload with offline support
      await uploadFileWithOfflineSupport({
        storage,
        db,
        file: selectedFile,
        fileName: selectedFile.name,
        storagePath,
        firestoreDocPath: `dossiers/${dossierId}/documents`,
        firestoreMetadata: {
          nom: selectedFile.name,
          type: uploadType,
          taille: selectedFile.size,
          uploadePar: userEmail,
          storagePath,
          _localCreatedAt: timestamp,
        },
      });

      await logHistorique(db, dossierId, 'Upload document', userEmail, `Document "${selectedFile.name}" uploadé.`, 'document');

      toast({ title: 'Document uploadé avec succès' });
      setUploadModalOpen(false);
      setSelectedFile(null);
      setUploadType('');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ 
        variant: 'destructive', 
        title: "Erreur lors de l'upload", 
        description: error.message || 'Une erreur inconnue est survenue.'
      });
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  const handleDelete = async (document: any) => {
    const userEmail = auth?.currentUser?.email || 'Admin';
    if (!db || !storage) return;
    if (!window.confirm('Supprimer ce document ?')) return;
    
    setIsDeleting(document.id);

    try {
      // 1. Delete from Storage (with fail-safe)
      if (document.storagePath) {
        const storageRef = ref(storage, document.storagePath);
        await deleteObject(storageRef).catch(err => {
          console.warn('Storage file already missing or blocked by rules:', err);
        });
      }

      // 2. Delete from Firestore
      await deleteDoc(doc(db, 'dossiers', dossierId, 'documents', document.id));
      
      await logHistorique(db, dossierId, 'Suppression document', userEmail, `Document "${document.nom || 'inconnu'}" supprimé.`, 'document');

      toast({ title: 'Document supprimé avec succès' });
    } catch (error: any) {
      console.error('Document delete error:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erreur lors de la suppression',
        description: error?.message || 'Vérifiez les permissions de stockage.'
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
      toast({ variant: 'destructive', title: "Erreur lors du téléchargement" });
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, 'dd/MM/yyyy HH:mm', { locale: fr });
  };

  return (
    <div className="space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
        onChange={handleFileSelect}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Tous les documents" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les documents</SelectItem>
              {docTypes.map((type) => (
                <SelectItem key={`filter-${type.id}`} value={type.label}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <OptionsManagerModal collectionName="options_types_documents" title="Types de documents" defaultValues={[...defaultDocTypes]} />
        </div>
        <Button 
          onClick={() => fileInputRef.current?.click()} 
          className="w-full sm:w-auto"
        >
          <Upload className="mr-2 h-4 w-4" />
          Ajouter un document
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom du fichier</TableHead>
                <TableHead>Type de document</TableHead>
                <TableHead>Uploadé par</TableHead>
                <TableHead>Date d'upload</TableHead>
                <TableHead>Taille</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : !documents || documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Aucun document trouvé.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="truncate max-w-[200px]">{item.nom || item.fileName}</span>
                        {item.pendingUpload && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">En attente</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">{item.type || item.typeDocument}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {item.uploadePar || item.uploadedBy}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(item.dateUpload || item.uploadedAt)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSize(item.taille || item.fileSize)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => !item.pendingUpload && item.url && setPreviewDoc({ url: item.url, nom: item.nom || 'document' })}
                          title={item.pendingUpload ? 'En attente de synchronisation' : 'Apercu'}
                          disabled={!!item.pendingUpload}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => handleDownload(item.url, item.nom || 'document')}
                          title={item.pendingUpload ? 'En attente de synchronisation' : 'Telecharger'}
                          disabled={!!item.pendingUpload}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="text-destructive hover:text-destructive hover:bg-destructive/5"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          disabled={isDeleting === item.id || !!item.pendingUpload}
                          title={item.pendingUpload ? 'En attente de synchronisation' : 'Supprimer'}
                        >
                          {isDeleting === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4 text-red-500" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isUploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Catégorie du document</DialogTitle>
            <DialogDescription>
              Fichier: <span className="font-semibold text-foreground">{selectedFile?.name}</span>
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
                setSelectedFile(null);
              }}
              disabled={isUploading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || !uploadType || isUploading}
            >
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isUploading ? 'Transfert...' : 'Uploader'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewDoc && (
        <Dialog open onOpenChange={() => setPreviewDoc(null)}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-4 py-3 border-b shrink-0">
              <DialogTitle className="text-sm truncate">{previewDoc.nom}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              {previewDoc.nom.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
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