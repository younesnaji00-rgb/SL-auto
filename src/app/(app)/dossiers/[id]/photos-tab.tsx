'use client';

import React, { useState, useEffect, useRef } from 'react';
import { format as dateFormat } from 'date-fns';
import { fr } from 'date-fns/locale';
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
import { CollapsedByDayList } from '@/components/common/collapsed-by-day-list';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { useFirestore, useAuth, useStorage } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  { id: 'avant', label: 'Photos avant', fullLabel: 'Photos avant' },
  { id: 'en_cours', label: 'Photos en cours', fullLabel: 'Photos en cours' },
  { id: 'apres', label: 'Photos après', fullLabel: 'Photos après' },
];

export default function PhotosTab({ dossierId, initialCategory }: { dossierId: string; initialCategory?: PhotoCategory }) {
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

  const fileInputRefs = useRef<Record<PhotoCategory, HTMLInputElement | null>>({
    avant: null,
    en_cours: null,
    apres: null,
  });

  useEffect(() => {
    if (!db || !dossierId) return;
    setLoading(true);
    const photosRef = collection(db, 'dossiers', dossierId, 'photos');
    const unsubscribe = onSnapshot(
      photosRef,
      (snapshot) => {
        const fetched = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Photo[];
        setAllPhotos(fetched);
        setLoading(false);
      },
      (error) => {
        console.error('Photos listener error:', error);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, [db, dossierId]);

  const photosForCategory = (cat: PhotoCategory) =>
    allPhotos
      .filter((p) => p.category === cat)
      .sort((a, b) => {
        const tA = a.uploadedAt?.toDate ? a.uploadedAt.toDate().getTime() : 0;
        const tB = b.uploadedAt?.toDate ? b.uploadedAt.toDate().getTime() : 0;
        return tB - tA;
      });

  const handleUpload = async (cat: PhotoCategory, files: FileList) => {
    if (!storage || !db) return;
    const userEmail = auth?.currentUser?.email || 'Admin';
    const userId = auth?.currentUser?.uid || 'unknown';
    setIsUploading(cat);
    try {
      const fileList = Array.from(files);
      // Fire all uploads in parallel. Use allSettled so one failure doesn't abort the batch.
      const results = await Promise.allSettled(
        fileList.map((file, idx) => {
          // Jitter the timestamp so parallel uploads don't collide on the same ms.
          const timestamp = Date.now() + idx;
          const storagePath = `dossiers/${dossierId}/photos/${cat}/${timestamp}_${file.name}`;
          return uploadFileWithOfflineSupport({
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
        }),
      );

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      // Batch-log — one historique/workflow entry for the group rather than per-file.
      if (successful > 0) {
        await logHistorique(
          db,
          dossierId,
          'Upload photos',
          userEmail,
          `${successful} photo(s) uploadée(s) dans la section ${cat}.`,
          'photo',
        );
        await logWorkflow(db, dossierId, 'Nouvelle photo ajoutée', userEmail, userId, 'done', {
          details: `${successful} photo(s) ajoutée(s) dans la section ${cat}`,
        });

        // Denormalize "latest photo upload" timestamp per category onto the dossier doc.
        const fieldMap: Record<string, string> = {
          avant: 'datePhotosAvant',
          en_cours: 'datePhotosEnCours',
          apres: 'datePhotosApres',
        };
        const field = fieldMap[cat];
        if (field) {
          await setDoc(doc(db, 'dossiers', dossierId), { [field]: serverTimestamp() }, { merge: true });
        }
      }

      if (failed === 0) {
        toast({
          title: successful === 1 ? 'Photo uploadée' : `${successful} photos uploadées`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: `${failed} échec(s)`,
          description: `${successful}/${results.length} photos uploadées.`,
        });
        results.forEach((r, i) => {
          if (r.status === 'rejected') console.error(`Upload failed for ${fileList[i].name}:`, r.reason);
        });
      }
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
        await deleteObject(storageRef).catch((e) => console.warn('Storage delete warn:', e));
      }
      await deleteDoc(doc(db, 'dossiers', dossierId, 'photos', photo.id));
      const userEmail = auth?.currentUser?.email || 'Admin';
      const userId = auth?.currentUser?.uid || 'unknown';
      await logHistorique(
        db,
        dossierId,
        'Suppression photo',
        userEmail,
        `Photo "${photo.name || 'inconnue'}" supprimée.`,
        'photo',
      );
      await logWorkflow(db, dossierId, 'Photo supprimée', userEmail, userId, 'done', {
        details: `Photo "${photo.name || 'inconnue'}" supprimée (par gestionnaire)`,
      });
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue={initialCategory ?? 'avant'} className="w-full">
        <TabsList>
          {CATEGORIES.map((cat) => {
            const count = photosForCategory(cat.id).length;
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                <Camera className="h-3.5 w-3.5" />
                {cat.label}
                <Badge variant="secondary" className="font-mono text-[10px] px-1.5 h-5 min-w-[20px]">
                  {count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {CATEGORIES.map((cat) => {
          const catPhotos = photosForCategory(cat.id);
          return (
            <TabsContent key={cat.id} value={cat.id} className="mt-4">
              {/* Upload header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{cat.fullLabel}</h3>
                  <Badge variant="secondary" className="font-mono text-[10px] px-1.5 h-5 min-w-[20px]">
                    {catPhotos.length}
                  </Badge>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  ref={(el) => {
                    fileInputRefs.current[cat.id] = el;
                  }}
                  onChange={(e) => e.target.files && handleUpload(cat.id, e.target.files)}
                />
                {canEdit && (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs gap-2"
                    disabled={isUploading === cat.id}
                    onClick={() => fileInputRefs.current[cat.id]?.click()}
                  >
                    {isUploading === cat.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    Ajouter
                  </Button>
                )}
              </div>

              {/* Photo grid or empty state */}
              {catPhotos.length === 0 ? (
                <div
                  className={cn(
                    'flex flex-col items-center justify-center py-16 text-center gap-3 rounded-md border border-dashed border-border bg-muted/20',
                    canEdit && 'cursor-pointer hover:bg-muted/40 transition-colors',
                  )}
                  onClick={() => canEdit && fileInputRefs.current[cat.id]?.click()}
                >
                  <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground italic">Aucune photo</p>
                  {canEdit && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-2"
                      disabled={isUploading === cat.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRefs.current[cat.id]?.click();
                      }}
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
                <CollapsedByDayList
                  items={catPhotos}
                  getDate={(photo) => (photo.uploadedAt?.toDate ? photo.uploadedAt.toDate() : null)}
                  keyOf={(photo) => photo.id}
                  defaultExpanded={false}
                  gridItems
                  groupLabel={(day, count) =>
                    `${dateFormat(day, 'd MMMM yyyy', { locale: fr })} — ${count} photo${count > 1 ? 's' : ''}`
                  }
                  renderItem={(photo) => {
                    const isEditing = editingId === photo.id;
                    return (
                      <div
                        className="group relative bg-muted/30 rounded-md border border-border overflow-hidden transition-all hover:shadow-md"
                      >
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
                                onClick={() => {
                                  setEditingId(photo.id);
                                  setEditName(photo.name);
                                }}
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
                                onChange={(e) => setEditName(e.target.value)}
                                className="h-7 text-[11px] px-1 focus-visible:ring-1"
                                autoFocus
                                onKeyDown={(e) => {
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
                            <>
                              <p
                                className="text-[10px] text-muted-foreground font-medium truncate"
                                title={photo.name}
                              >
                                {photo.name}
                              </p>
                              {photo.uploadedAt?.toDate && (
                                <p className="text-[9px] text-muted-foreground/70 mt-0.5">
                                  {dateFormat(photo.uploadedAt.toDate(), 'd MMM HH:mm', { locale: fr })}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  }}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Preview Modal */}
      {previewPhoto && (
        <Dialog open onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-2xl h-[60vh] flex flex-col p-0">
            <DialogHeader className="px-4 py-3 border-b shrink-0">
              <DialogTitle className="text-sm truncate">{previewPhoto.name}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              <img
                src={previewPhoto.url}
                className="max-w-full max-h-full object-contain"
                alt={previewPhoto.name}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
