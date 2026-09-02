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
  CalendarDays,
  Camera,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  MapPin,
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
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
import { useFirestore, useAuth, useStorage, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { logHistorique, logWorkflow } from './log-historique';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useReplayHighlight, highlightClass, ChangeBadge } from '@/components/dossier-timeline/replay-highlight';

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
  /**
   * Optional location metadata. Photos uploaded by the Agent de Terrain
   * may eventually carry a free-text location label and/or raw GPS
   * coordinates. Today only a watermark is burned into the image, so
   * these fields are usually undefined — when that happens the photo is
   * grouped under "Sans localisation" in the location-partition view.
   */
  location?: string;
  lat?: number;
  lng?: number;
}

type PartitionMode = 'date' | 'location';

/**
 * Bucket key + display label used when grouping photos by location.
 * - Prefers an explicit `location` text field if present (option a).
 * - Falls back to a rounded lat/lng coordinate bucket (~100 m precision,
 *   option c) — keeps groups cohesive without needing a network call.
 * - Photos with neither land in the "Sans localisation" bucket (option d).
 */
function locationBucket(photo: Photo): { key: string; label: string } {
  const txt = typeof photo.location === 'string' ? photo.location.trim() : '';
  if (txt) return { key: `t:${txt.toLowerCase()}`, label: txt };
  const { lat, lng } = photo;
  if (typeof lat === 'number' && typeof lng === 'number' && isFinite(lat) && isFinite(lng)) {
    const rLat = lat.toFixed(3);
    const rLng = lng.toFixed(3);
    return { key: `c:${rLat},${rLng}`, label: `${rLat}, ${rLng}` };
  }
  return { key: '__unknown__', label: 'Sans localisation' };
}

const CATEGORIES: { id: PhotoCategory; label: string; fullLabel: string }[] = [
  { id: 'avant', label: 'Photos avant', fullLabel: 'Photos avant' },
  { id: 'en_cours', label: 'Photos en cours', fullLabel: 'Photos en cours' },
  { id: 'apres', label: 'Photos après', fullLabel: 'Photos après' },
];

/** Default cap per photo section (avant / en cours / après). Lifted to
 *  {@link MAX_PHOTOS_WITH_REFORME} when the dossier has `propositionReforme`
 *  set (see item 021). */
export const MAX_PHOTOS_PER_SECTION = 30;
/** Cap when proposition réforme is active. */
export const MAX_PHOTOS_WITH_REFORME = 60;

/* Preview-lightbox header height (≈46px) is folded into the lg
   window-width formula on the DialogContent below. */

export default function PhotosTab({
  dossierId,
  initialCategory,
  onlyCategory,
  photosOverride,
}: {
  dossierId: string;
  initialCategory?: PhotoCategory;
  onlyCategory?: PhotoCategory;
  /** Replay: frozen photo list rendered instead of the live subscription. */
  photosOverride?: any[];
}) {
  const visibleCategories = onlyCategory ? CATEGORIES.filter((c) => c.id === onlyCategory) : CATEGORIES;
  // Mounted inside a step facet tab (`onlyCategory` set): the photos already
  // have their own tab, so date/location groups open EXPANDED by default.
  const defaultGroupsOpen = Boolean(onlyCategory);
  const db = useFirestore();
  const auth = useAuth();
  const storage = useStorage();
  const { toast } = useToast();
  const { canWrite, profile } = useCurrentUser();
  const hl = useReplayHighlight();
  const canEdit = canWrite('dossiers');
  // Reads the propositionReforme flag (item 021). When true, the per-section
  // cap is 60 instead of 30.
  const dossierRef = React.useMemo(
    () => (db ? doc(db, 'dossiers', dossierId) : null),
    [db, dossierId],
  );
  const { data: dossier } = useDoc<any>(dossierRef as any);
  const photoCap = dossier?.propositionReforme ? MAX_PHOTOS_WITH_REFORME : MAX_PHOTOS_PER_SECTION;

  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState<PhotoCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  // width / height of the previewed photo — measured by PRELOADING the image
  // (owner ruling 2026-09-02: the window must open AT its final size, no
  // resize-and-snap after mount; same approach as document-preview-lightbox).
  // The lightbox renders only once measured; while paging ‹ › the previous
  // ratio is kept until the next photo's is known (smooth in-place resize).
  const [previewRatio, setPreviewRatio] = useState<number | null>(null);
  const [previewMeasured, setPreviewMeasured] = useState(false);
  const previewWasOpenRef = useRef(false);
  if (!previewPhoto) previewWasOpenRef.current = false;
  useEffect(() => {
    if (!previewPhoto?.url) { setPreviewRatio(null); setPreviewMeasured(false); return; }
    setPreviewMeasured(false);
    let alive = true;
    const probe = new Image();
    probe.onload = () => {
      if (!alive) return;
      if (probe.naturalWidth > 0 && probe.naturalHeight > 0) setPreviewRatio(probe.naturalWidth / probe.naturalHeight);
      setPreviewMeasured(true);
    };
    probe.onerror = () => { if (alive) { setPreviewRatio(null); setPreviewMeasured(true); } };
    probe.src = previewPhoto.url;
    return () => { alive = false; };
  }, [previewPhoto?.url]);
  // How photos are partitioned in the planification view. "date" (default)
  // keeps the historical per-day grouping; "location" groups by an explicit
  // `location` field if available, otherwise by a ~100 m lat/lng bucket, and
  // photos without location fall under "Sans localisation".
  const [partitionMode, setPartitionMode] = useState<PartitionMode>('date');

  const fileInputRefs = useRef<Record<PhotoCategory, HTMLInputElement | null>>({
    avant: null,
    en_cours: null,
    apres: null,
  });

  useEffect(() => {
    if (photosOverride !== undefined) {
      // Replay override: frozen data — no live subscription.
      setAllPhotos(photosOverride as Photo[]);
      setLoading(false);
      return;
    }
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
  }, [db, dossierId, photosOverride]);

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
    // Enforce per-section cap. Accept up to the cap, toast the overflow.
    const existing = photosForCategory(cat).length;
    const available = Math.max(0, photoCap - existing);
    if (available === 0) {
      toast({
        variant: 'destructive',
        title: 'Limite atteinte',
        description: `Limite de ${photoCap} photos atteinte pour cette section.`,
      });
      return;
    }
    setIsUploading(cat);
    try {
      const fileList = Array.from(files).slice(0, available);
      if (files.length > available) {
        toast({
          variant: 'destructive',
          title: 'Limite de photos',
          description: `${files.length - available} photo(s) ignorée(s) — la limite de ${photoCap} par section a été atteinte.`,
        });
      }
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
          profile?.nom,
        );
        await logWorkflow(db, dossierId, 'Nouvelle photo ajoutée', userEmail, userId, 'done', {
          details: `${successful} photo(s) ajoutée(s) dans la section ${cat}`,
        }, profile?.nom);

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
        profile?.nom,
      );
      await logWorkflow(db, dossierId, 'Photo supprimée', userEmail, userId, 'done', {
        details: `Photo "${photo.name || 'inconnue'}" supprimée (par gestionnaire)`,
      }, profile?.nom);
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

  /**
   * Shared photo-card render — used by both the per-date grouping
   * (CollapsedByDayList) and the per-location grouping (renderByLocation
   * below). Extracted so the two partition modes guarantee an identical
   * card UI.
   */
  const renderPhotoCard = (photo: Photo) => {
    const isEditing = editingId === photo.id;
    const replayStatus = hl.statusForEntry('photos', photo.id);
    return (
      <div
        className={cn("group relative overflow-hidden rounded-md border border-hairline bg-surface-2 transition-shadow hover:shadow-card", highlightClass(replayStatus))}
      >
        {replayStatus && (
          <div className="absolute left-1 top-1 z-10 rounded bg-card/90 px-1">
            <ChangeBadge status={replayStatus} />
          </div>
        )}
        <div className="relative aspect-square w-full overflow-hidden bg-surface-3">
          {photo.pendingUpload ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-status-warning-bg text-status-warning-fg">
              <Upload className="mb-2 h-8 w-8" />
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

        <div className="border-t border-hairline bg-card p-2">
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
                className="h-7 w-7 text-status-success-fg hover:bg-status-success-bg hover:text-status-success-fg"
                onClick={() => handleRename(photo)}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-ink-3"
                onClick={() => setEditingId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <p
                className="t-caption truncate font-medium text-ink-2"
                title={photo.name}
              >
                {photo.name}
              </p>
              {photo.uploadedAt?.toDate && (
                <p className="t-caption mt-0.5 tabular-nums">
                  {dateFormat(photo.uploadedAt.toDate(), 'd MMM HH:mm', { locale: fr })}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-sm text-ink-3">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p>Chargement des photos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue={onlyCategory ?? initialCategory ?? 'avant'} className="w-full">
        {/* Inside a step facet the phase is already named by the step title
            (« Planification en cours ») — no category strip, no repeated
            « Photos en cours » heading (user ruling). */}
        {!onlyCategory && (
        <TabsList>
          {visibleCategories.map((cat) => {
            const count = photosForCategory(cat.id).length;
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-2">
                <Camera className="h-3.5 w-3.5" />
                {cat.label}
                <span className="rounded-full bg-surface-3 px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums text-ink-2">
                  {count}/{photoCap}
                </span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        )}

        {visibleCategories.map((cat) => {
          const catPhotos = photosForCategory(cat.id);
          return (
            <TabsContent key={cat.id} value={cat.id} className={onlyCategory ? 'mt-0' : 'mt-4'}>
              {/* Upload header */}
              <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
                {onlyCategory ? (
                  <span className="t-caption tabular-nums">{catPhotos.length}/{photoCap} photos</span>
                ) : (
                <h3 className="t-heading flex items-center gap-2">
                  {cat.fullLabel}
                  <span className="rounded-full bg-surface-3 px-2 py-0.5 font-mono text-[11px] font-medium tabular-nums text-ink-2">
                    {catPhotos.length}/{photoCap}
                  </span>
                </h3>
                )}
                <div className="flex items-center gap-2">
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
              </div>

              {/* Grouping mode as underline tabs (styled like step-tabs.tsx) —
                  replaces the previous Select. Both modes show every photo, so
                  there is no separate "Toutes" (no-filter) state here. */}
              {catPhotos.length > 0 && (
                <div
                  role="tablist"
                  aria-label="Mode de regroupement des photos"
                  className="-mx-2 mb-4 flex items-end gap-1 overflow-x-auto border-b border-hairline px-2 scrollbar-thin"
                >
                  {([
                    ['date', 'Par date', CalendarDays],
                    ['location', 'Par localisation', MapPin],
                  ] as const).map(([mode, label, Icon]) => (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={partitionMode === mode}
                      onClick={() => setPartitionMode(mode)}
                      className={cn(
                        // Browser-tab shape (owner ruling 2026-09-02):
                        // `.tab-slope` draws the sloped card fill via
                        // aria-selected; accent underline stays.
                        'tab-slope relative -mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3.5 text-[13px] font-medium text-ink-3',
                        'transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                        partitionMode === mode && 'border-primary text-ink',
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {/* Photo grid or empty state */}
              {catPhotos.length === 0 ? (
                <div
                  className={cn(
                    'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-hairline-strong py-16 text-center',
                    canEdit && 'cursor-pointer transition-colors hover:bg-surface-2',
                  )}
                  onClick={() => canEdit && fileInputRefs.current[cat.id]?.click()}
                >
                  <ImageIcon className="h-12 w-12 text-ink-4" />
                  <div>
                    <p className="t-heading">Aucune photo</p>
                    {canEdit && <p className="t-caption mt-1">Déposez ou sélectionnez des photos pour cette section.</p>}
                  </div>
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
              ) : partitionMode === 'location' ? (
                <PhotosByLocation
                  photos={catPhotos}
                  renderPhoto={renderPhotoCard}
                  defaultExpanded={defaultGroupsOpen}
                />
              ) : (
                <CollapsedByDayList
                  items={catPhotos}
                  getDate={(photo) => (photo.uploadedAt?.toDate ? photo.uploadedAt.toDate() : null)}
                  keyOf={(photo) => photo.id}
                  defaultExpanded={defaultGroupsOpen}
                  gridItems
                  groupLabel={(day, count) =>
                    `${dateFormat(day, 'd MMMM yyyy', { locale: fr })} — ${count} photo${count > 1 ? 's' : ''}`
                  }
                  renderItem={(photo) => renderPhotoCard(photo)}
                />
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Preview Modal — fullscreen with zoom (wheel / pinch / buttons),
          ←/→ navigation, and explicit X close. Round 8: integrates
          react-zoom-pan-pinch. Per Q-9 A photo opens fit-to-screen; per
          Q-10 A zoom buttons live in a bottom-center floating toolbar;
          per Q-6 A the X close button sits top-right. */}
      {previewPhoto && (previewMeasured || previewWasOpenRef.current) && (() => {
        previewWasOpenRef.current = true;
        const siblings = photosForCategory(previewPhoto.category);
        const currentIdx = siblings.findIndex((p) => p.id === previewPhoto.id);
        const total = siblings.length;
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx >= 0 && currentIdx < total - 1;
        const goto = (delta: -1 | 1) => {
          const next = siblings[currentIdx + delta];
          if (next) setPreviewPhoto(next);
        };
        const onKey = (e: React.KeyboardEvent) => {
          if (e.key === 'ArrowLeft' && hasPrev) goto(-1);
          else if (e.key === 'ArrowRight' && hasNext) goto(1);
        };
        return (
          <Dialog open onOpenChange={() => setPreviewPhoto(null)}>
            <DialogContent
              hideCloseButton
              calm
              className={cn(
                // Orientation-aware window (same sizing approach as
                // document-preview-lightbox): below lg the dialog base is a
                // bottom sheet; at lg+ the centred window follows the photo's
                // orientation. Every vh/vw is divided by --app-zoom.
                // `calm` = fade + centred zoom, nothing else; the size
                // transition smooths paging onto a differently-oriented photo.
                'flex h-[calc(85dvh/var(--app-zoom))] flex-col overflow-hidden border-0 bg-black/95 p-0',
                'lg:transition-[width,height,max-width,max-height,min-width] lg:duration-200 motion-reduce:transition-none',
                // Ratio unknown (failed measure): neutral box.
                previewRatio === null && 'lg:h-[calc(85svh/var(--app-zoom))] lg:max-w-4xl',
                // Measured: the window WRAPS the photo exactly (owner ruling
                // 2026-09-02, no letterbox bands) — same one-formula sizing
                // as document-preview-lightbox.
                previewRatio !== null &&
                  'lg:h-auto lg:min-w-[360px] lg:w-[min(calc(96vw/var(--app-zoom)),calc((92svh/var(--app-zoom)_-_46px)*var(--ar)),1400px)] lg:max-w-[calc(96vw/var(--app-zoom))]',
              )}
              style={previewRatio !== null ? ({ ['--ar' as string]: String(previewRatio) } as React.CSSProperties) : undefined}
              onKeyDown={onKey}
            >
              <DialogHeader className="px-4 py-3 border-b border-white/10 shrink-0 pr-14">
                <DialogTitle className="text-sm truncate text-white">
                  {previewPhoto.name}
                  {total > 1 && (
                    <span className="ml-2 text-white/60 tabular-nums">
                      {currentIdx + 1}/{total}
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              {/* Explicit X close (top-right, Q-6 A). Sits above the
                  zoom-pan-pinch layer so it always receives clicks. */}
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                aria-label="Fermer"
                className="absolute right-3 top-2.5 z-50 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
              <div
                className={cn(
                  'relative flex max-w-full items-center justify-center overflow-hidden',
                  previewRatio === null && 'flex-1',
                  // Height follows the window width through the aspect ratio —
                  // the photo fills the box edge to edge, no letterbox.
                  previewRatio !== null && 'min-h-0 flex-1 lg:flex-none lg:w-full lg:aspect-[var(--ar)]',
                )}
              >
                <TransformWrapper
                  key={previewPhoto.id /* reset zoom on photo change */}
                  initialScale={1}
                  minScale={1}
                  maxScale={8}
                  centerOnInit
                  wheel={{ step: 0.2 }}
                  doubleClick={{ mode: 'toggle', step: 1.5 }}
                  panning={{ disabled: false }}
                >
                  {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                    <>
                      <TransformComponent
                        wrapperStyle={{ width: '100%', height: '100%' }}
                        contentStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <img
                          src={previewPhoto.url}
                          className="max-w-full max-h-full object-contain select-none"
                          alt={previewPhoto.name}
                          draggable={false}
                        />
                      </TransformComponent>
                      {hasPrev && (
                        <button
                          type="button"
                          onClick={() => goto(-1)}
                          aria-label="Photo précédente"
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                        >
                          <ChevronLeft className="h-7 w-7" />
                        </button>
                      )}
                      {hasNext && (
                        <button
                          type="button"
                          onClick={() => goto(1)}
                          aria-label="Photo suivante"
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-40 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
                        >
                          <ChevronRight className="h-7 w-7" />
                        </button>
                      )}
                      {/* Bottom-center zoom toolbar (Q-10 A). */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur px-2 py-1.5">
                        <button
                          type="button"
                          onClick={() => zoomOut()}
                          aria-label="Dézoomer"
                          className="h-9 w-9 rounded-full text-white hover:bg-white/20 flex items-center justify-center"
                        >
                          <ZoomOut className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Round 9 item 006 — fit-to-screen fix.
                            // `resetTransform` alone preserved any pan
                            // accumulated before zooming back to 1×;
                            // `centerView(1, ...)` explicitly recenters
                            // at the initial scale so the image refits
                            // the viewport reliably.
                            resetTransform(200, 'easeOut');
                            centerView(1, 200, 'easeOut');
                          }}
                          aria-label="Ajuster à l'écran"
                          className="h-9 w-9 rounded-full text-white hover:bg-white/20 flex items-center justify-center"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => zoomIn()}
                          aria-label="Zoomer"
                          className="h-9 w-9 rounded-full text-white hover:bg-white/20 flex items-center justify-center"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </TransformWrapper>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}

/**
 * Per-location photo grouping. Mirrors {@link CollapsedByDayList} visually
 * (collapsible day-style headers, same grid layout) but buckets by
 * {@link locationBucket} instead of upload date. The "Sans localisation"
 * bucket — for photos without a `location` field or lat/lng coords — sorts
 * last so located groups stay on top.
 */
function PhotosByLocation({
  photos,
  renderPhoto,
  defaultExpanded = false,
}: {
  photos: Photo[];
  renderPhoto: (photo: Photo) => React.ReactNode;
  /** Groups open by default (used when the photos live in their own step tab). */
  defaultExpanded?: boolean;
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: Photo[] }>();
    photos.forEach((photo) => {
      const { key, label } = locationBucket(photo);
      let group = map.get(key);
      if (!group) {
        group = { key, label, items: [] };
        map.set(key, group);
      }
      group.items.push(photo);
    });
    const arr = Array.from(map.values());
    arr.sort((a, b) => {
      // Push the "Sans localisation" bucket to the bottom; sort the rest
      // alphabetically by label for stable ordering.
      if (a.key === '__unknown__') return 1;
      if (b.key === '__unknown__') return -1;
      return a.label.localeCompare(b.label, 'fr');
    });
    return arr;
  }, [photos]);

  const [expanded, setExpanded] = useState<Map<string, boolean>>(new Map());
  const isExpanded = (key: string) => expanded.get(key) ?? defaultExpanded;
  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Map(prev);
      next.set(key, !(prev.get(key) ?? defaultExpanded));
      return next;
    });
  };

  if (photos.length === 0) return null;

  return (
    <div>
      {groups.map((group) => {
        const count = group.items.length;
        const open = isExpanded(group.key);
        const isUnknown = group.key === '__unknown__';
        return (
          <div key={group.key}>
            <button
              type="button"
              onClick={() => toggle(group.key)}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors hover:bg-surface-2"
            >
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-ink-3" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
              )}
              <MapPin
                className={cn(
                  'h-4 w-4 shrink-0',
                  isUnknown ? 'text-ink-4' : 'text-ink-3',
                )}
              />
              <span
                className={cn(
                  't-body-sm font-medium',
                  isUnknown && 'italic text-ink-3',
                )}
              >
                {group.label} — {count} photo{count > 1 ? 's' : ''}
              </span>
            </button>
            {open && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
                {group.items.map((photo) => (
                  <React.Fragment key={photo.id}>{renderPhoto(photo)}</React.Fragment>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
