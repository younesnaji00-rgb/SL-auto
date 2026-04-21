'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Loader2,
  Download,
  Pencil,
  X,
  Check,
  Eye,
  Camera,
  ImageIcon,
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';
import {
  ref,
  deleteObject
} from 'firebase/storage';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { useFirestore, useAuth, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { logHistorique, logWorkflow } from './log-historique';
import { useCurrentUser } from '@/hooks/use-current-user';

type PhotoCategory = 'avant' | 'en_cours' | 'apres';

interface Photo {
  id: string;
  url: string;
  name: string;
  category: PhotoCategory;
  uploadedAt: any;
  uploadedBy: string;
  storagePath: string;
  pendingUpload?: boolean;
}

const CATEGORIES: { id: PhotoCategory; label: string; fullLabel: string }[] = [
  { id: 'avant', label: 'Avant', fullLabel: 'Photos avant' },
  { id: 'en_cours', label: 'En cours', fullLabel: 'Photos en cours' },
  { id: 'apres', label: 'Après', fullLabel: 'Photos après' },
];

export default function PhotosTab({ dossierId }: { dossierId: string }) {
  const db = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const { toast } = useToast();
  const { canWrite } = useCurrentUser();
  const canEdit = canWrite('dossiers');

  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<PhotoCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [galleryCategory, setGalleryCategory] = useState<PhotoCategory | null>(null);

  const fileInputRefs = useRef<Record<PhotoCategory, HTMLInputElement | null>>({
    avant: null,
    en_cours: null,
    apres: null,
  });

  useEffect(() => {
    if (!db || !dossierId) return;
    setLoading(true);
    const photosRef = collection(db, 'dossiers', dossierId, 'photos');
    const unsubscribe = onSnapshot(photosRef, (snapshot) => {
      const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Photo[];
      setAllPhotos(fetched);
      setLoading(false);
    }, (error) => {
      console.error('Photos listener error:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, dossierId]);

  const photosForCategory = (cat: PhotoCategory) =>
    allPhotos
      .filter(p => p.category === cat)
      .sort((a, b) => {
        const tA = a.uploadedAt?.toDate ? a.uploadedAt.toDate().getTime() : 0;
        const tB = b.uploadedAt?.toDate ? b.uploadedAt.toDate().getTime() : 0;
        return tB - tA;
      });

  const handleUpload = async (cat: PhotoCategory, files: FileList) => {
    if (!storage || !db) return;
    const userEmail = auth?.currentUser?.email || 'Admin';
    setIsUploading(cat);
    try {
      for (const file of Array.from(files)) {
        const timestamp = Date.now();
        const storagePath = `dossiers/${dossierId}/photos/${cat}/${timestamp}_${file.name}`;
        await uploadFileWithOfflineSupport({
          storage,
          db,
          file,
          fileName: file.name,
          storagePath,
          firestoreDocPath: `dossiers/${dossierId}/photos`,
          firestoreMetadata: {
            name: file.name,
            category: cat,
            uploadedAt: serverTimestamp(),
            uploadedBy: userEmail,
            storagePath,
            _localCreatedAt: timestamp,
          },
        });

        await logHistorique(db, dossierId, 'Upload photo', userEmail, `Photo "${file.name}" uploadée dans la section ${cat}.`, 'photo');
      }
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'Nouvelle photo ajoutée', userEmail, userId, 'done', { details: `Photo ajoutée dans la section ${cat} (par gestionnaire)` });
      toast({ title: 'Photo(s) uploadée(s) avec succès' });
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ variant: 'destructive', title: "Erreur lors de l'upload", description: err.message });
    } finally {
      setIsUploading(null);
      const input = fileInputRefs.current[cat];
      if (input) input.value = '';
    }
  };

  const handleDelete = async (photo: Photo) => {
    if (!db || !storage) return;
    setIsDeleting(photo.id);
    try {
      if (photo.storagePath) {
        const storageRef = ref(storage, photo.storagePath);
        await deleteObject(storageRef).catch(e => console.warn('Storage delete warn:', e));
      }
      await deleteDoc(doc(db, 'dossiers', dossierId, 'photos', photo.id));
      const userEmail = auth?.currentUser?.email || 'Admin';
      const userId = auth?.currentUser?.uid || 'unknown';
      await logHistorique(db, dossierId, 'Suppression photo', userEmail, `Photo "${photo.name || 'inconnue'}" supprimée.`, 'photo');
      await logWorkflow(db, dossierId, 'Photo supprimée', userEmail, userId, 'done', { details: `Photo "${photo.name || 'inconnue'}" supprimée (par gestionnaire)` });
      toast({ title: 'Photo supprimée' });
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({ variant: 'destructive', title: 'Erreur lors de la suppression' });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDownload = async (photo: Photo) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = photo.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error('Download error:', e);
      toast({ variant: 'destructive', title: 'Erreur lors du téléchargement' });
    }
  };

  const handleRename = async (photo: Photo) => {
    if (!db || !editName.trim()) return;
    try {
      await updateDoc(doc(db, 'dossiers', dossierId, 'photos', photo.id), { name: editName.trim() });
      toast({ title: 'Photo renommée' });
    } catch (e) {
      console.error('Rename error:', e);
      toast({ variant: 'destructive', title: 'Erreur lors du renommage' });
    } finally {
      setEditingId(null);
      setEditName('');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Chargement des photos...</p>
      </div>
    );
  }

  const galleryCat = galleryCategory ? CATEGORIES.find(c => c.id === galleryCategory) : null;
  const galleryPhotos = galleryCategory ? photosForCategory(galleryCategory) : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {CATEGORIES.map(cat => {
          const catPhotos = photosForCategory(cat.id);
          const previewStrip = catPhotos.slice(0, 6);

          return (
            <Card key={cat.id} className="flex flex-col overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-sm uppercase tracking-wider truncate">{cat.fullLabel}</span>
                  <Badge variant="secondary" className="font-mono text-[10px] px-1.5 h-5 min-w-[20px] flex items-center justify-center shrink-0">
                    {catPhotos.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={el => { fileInputRefs.current[cat.id] = el; }}
                    onChange={e => e.target.files && handleUpload(cat.id, e.target.files)}
                  />
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-2 bg-background hover:bg-muted"
                      disabled={isUploading === cat.id}
                      onClick={(e) => { e.stopPropagation(); fileInputRefs.current[cat.id]?.click(); }}
                      title="Ajouter"
                    >
                      {isUploading === cat.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Camera className="h-3 w-3" />
                      )}
                      Ajouter
                    </Button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 p-3 flex flex-col gap-3">
                {catPhotos.length === 0 ? (
                  <div
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center py-10 text-center gap-3 rounded-md border border-dashed border-border bg-muted/20",
                      canEdit && "cursor-pointer hover:bg-muted/40 transition-colors"
                    )}
                    onClick={() => canEdit && fileInputRefs.current[cat.id]?.click()}
                  >
                    <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground italic">Aucune photo</p>
                    {canEdit && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-2"
                        disabled={isUploading === cat.id}
                        onClick={(e) => { e.stopPropagation(); fileInputRefs.current[cat.id]?.click(); }}
                      >
                        {isUploading === cat.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        Ajouter
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      className="grid grid-cols-3 gap-1.5 cursor-pointer"
                      onClick={() => setGalleryCategory(cat.id)}
                      title="Voir toutes les photos"
                    >
                      {previewStrip.map(photo => (
                        <div key={photo.id} className="relative aspect-square rounded-md overflow-hidden bg-black/5 border border-border">
                          {photo.pendingUpload ? (
                            <div className="w-full h-full flex items-center justify-center text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                              <Upload className="h-5 w-5 opacity-60" />
                            </div>
                          ) : (
                            <img
                              src={photo.url}
                              alt={photo.name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full h-8 text-xs gap-2"
                      onClick={() => setGalleryCategory(cat.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Voir toutes les photos
                    </Button>
                  </>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Gallery Dialog */}
      <Dialog open={galleryCategory !== null} onOpenChange={(open) => { if (!open) setGalleryCategory(null); }}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-4 py-3 border-b shrink-0 flex-row items-center justify-between gap-2">
            <DialogTitle className="text-base truncate">
              {galleryCat?.fullLabel}
              {galleryCat && (
                <Badge variant="secondary" className="ml-2 font-mono text-[10px] px-1.5 h-5 min-w-[20px] inline-flex items-center justify-center">
                  {galleryPhotos.length}
                </Badge>
              )}
            </DialogTitle>
            {galleryCategory && canEdit && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-2 mr-8"
                disabled={isUploading === galleryCategory}
                onClick={() => fileInputRefs.current[galleryCategory]?.click()}
              >
                {isUploading === galleryCategory ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Camera className="h-3 w-3" />
                )}
                Ajouter
              </Button>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-auto p-4">
            {galleryPhotos.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground italic">Aucune photo</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {galleryPhotos.map(photo => {
                  const isEditing = editingId === photo.id;

                  return (
                    <div key={photo.id} className="group relative bg-muted/30 rounded-md border border-border overflow-hidden transition-all hover:shadow-md">
                      <div className="aspect-square w-full relative overflow-hidden bg-black/5">
                        {photo.pendingUpload ? (
                          <div className="w-full h-full flex flex-col items-center justify-center text-amber-600 bg-amber-50 dark:bg-amber-950/30">
                            <Upload className="h-8 w-8 mb-2 opacity-60" />
                            <span className="text-xs font-medium">En attente</span>
                          </div>
                        ) : (
                          <img
                            src={photo.url}
                            alt={photo.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        )}

                        {!photo.pendingUpload && (
                          <div
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            onClick={() => setPreviewPhoto(photo)}
                          >
                            <Eye className="h-6 w-6 text-white" />
                          </div>
                        )}

                        {!isEditing && (
                          <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 rounded-full shadow-lg bg-background/90 hover:bg-background"
                              onClick={() => handleDownload(photo)}
                              title="Telecharger"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="secondary"
                              className="h-7 w-7 rounded-full shadow-lg bg-background/90 hover:bg-background"
                              onClick={() => { setEditingId(photo.id); setEditName(photo.name); }}
                              title="Renommer"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {canEdit && (
                              <Button
                                size="icon"
                                variant="destructive"
                                className="h-7 w-7 rounded-full shadow-lg"
                                disabled={isDeleting === photo.id}
                                onClick={() => handleDelete(photo)}
                                title="Supprimer"
                              >
                                {isDeleting === photo.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <X className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="p-2 bg-background border-t border-border">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              className="h-7 text-[11px] px-1 focus-visible:ring-1"
                              autoFocus
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRename(photo);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-green-600 hover:bg-green-50"
                              onClick={() => handleRename(photo)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground font-medium truncate" title={photo.name}>
                            {photo.name}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {previewPhoto && (
        <Dialog open onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-2xl h-[60vh] flex flex-col p-0">
            <DialogHeader className="px-4 py-3 border-b shrink-0">
              <DialogTitle className="text-sm truncate">{previewPhoto.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              <img src={previewPhoto.url} className="max-w-full max-h-full object-contain" alt={previewPhoto.name} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
