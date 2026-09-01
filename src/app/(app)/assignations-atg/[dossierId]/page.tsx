'use client';

import React, { use, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  doc, collection, query, orderBy, onSnapshot, updateDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
import { useFirestore, useStorage, useAuth, useDoc, useCollection } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Loader2, Eye, ImageIcon, Camera, Trash2, MoreHorizontal, Phone,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { watermarkAtgPhoto } from '@/lib/photo-watermark';
import { logHistorique, logWorkflow } from '../../dossiers/[id]/log-historique';
import { addObservation } from '../../dossiers/[id]/log-observation';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useRegisterPageTitle } from '@/components/layout/page-chrome';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { assureName } from '@/lib/dossier-label';
import ObservationsTab from '@/components/observations-tab';
import CameraCapture from '@/components/camera-capture';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import { MAX_PHOTOS_PER_SECTION, MAX_PHOTOS_WITH_REFORME } from '@/app/(app)/dossiers/[id]/photos-tab';
import { useOptions } from '@/hooks/use-options';
import { deriveStatus, isPlanificationStatus } from '@/lib/status-machine';
import { CollapsedByDayList } from '@/components/common/collapsed-by-day-list';
import TypedDocumentsGrid from '@/components/dossier-timeline/typed-documents-grid';

type PhotoCategory = 'avant' | 'en_cours' | 'apres';

/**
 * Task #10 — After a photo upload (per category), advance the dossier status to
 * `Planification expertise avant | en cours | après` on the 0 → ≥1 transition.
 * Idempotent: if the dossier is already on the target status, it's a no-op.
 * Also a no-op when the dossier has progressed past the planification phase
 * (e.g. `Chiffrage en cours`, `Accord`, …) so we never regress the workflow.
 */
async function maybeAdvanceToExpertise(
  db: any,
  dossierId: string,
  currentStatut: string | undefined,
  category: PhotoCategory,
  userEmail: string,
) {
  const targetStatut = deriveStatus({ kind: 'photo', category });
  if (currentStatut === targetStatut) return; // already on target — idempotent
  // Only advance from Création dossier or another Planification * state.
  if (currentStatut && currentStatut !== 'Création dossier' && !isPlanificationStatus(currentStatut)) return;
  try {
    await updateDoc(doc(db, 'dossiers', dossierId), { statut: targetStatut });
    await logHistorique(
      db,
      dossierId,
      targetStatut,
      userEmail,
      `Statut mis à jour automatiquement par l'ajout de la première photo (${category}).`,
      'statut',
      undefined,
    );
  } catch (err) {
    // Non-blocking: don't fail the upload if the status update throws (offline, perms, etc.)
    console.error('Auto-advance to expertise failed:', err);
  }
}

interface Photo {
  id: string;
  url: string;
  name: string;
  category: PhotoCategory;
  uploadedAt: any;
  uploadedBy: string;
  storagePath: string;
}

const MISSION_TABS = [
  { id: 'Avant', label: 'Avant', category: 'avant' as PhotoCategory },
  { id: 'En cours', label: 'En cours', category: 'en_cours' as PhotoCategory },
  { id: 'Après', label: 'Après', category: 'apres' as PhotoCategory },
];

function normalizeType(type: string): string {
  if (type === 'Apres' || type === 'Après') return 'Après';
  if (type === 'En cours') return 'En cours';
  if (type === 'Avant') return 'Avant';
  return type;
}

// Sticky record bar bleeds through the layout padding (p-4 md:p-6 lg:p-8) —
// this route is not in FLUSH_ROUTE_PATTERNS, so the bar reclaims the gutter itself.
const BAR_BLEED = '-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8';

/** Paper section (information-tab `Section`): hairline header row + 24 px body. */
function Section({ title, count, actions, children, className }: { title: string; count?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <Card role="region" aria-label={title} className={cn('min-w-0 overflow-hidden', className)}>
      <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-hairline px-6 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="t-heading truncate">{title}</h2>
          {count !== undefined && count !== null && (
            <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-2">{count}</span>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </header>
      <div className="p-6">{children}</div>
    </Card>
  );
}

type Facet = 'photos' | 'documents';

export default function ATGDossierDetailPage({ params }: { params: Promise<{ dossierId: string }> }) {
  const { dossierId } = use(params);
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const { toast } = useToast();
  const { canWrite, canDelete, profile } = useCurrentUser();
  const canEdit = canWrite('assignations-atg');
  const isATG = profile?.role === 'Agent de Terrain';
  // Admins and directeurs (canDelete) can always delete any photo. ATG may
  // delete a photo only if they uploaded it themselves. Other write-allowed
  // roles (gestionnaire) get no delete permission anymore (item 012).
  const canDeletePhoto = (photo: Photo): boolean => {
    if (canDelete) return true;
    if (isATG && canEdit) {
      const me = auth?.currentUser?.email || profile?.email || '';
      return !!me && photo.uploadedBy === me;
    }
    return false;
  };

  const searchParams = useSearchParams();
  const missionParam = searchParams.get('mission');
  const initialTab = (['Avant', 'En cours', 'Après'] as const).includes(missionParam as any)
    ? (missionParam as 'Avant' | 'En cours' | 'Après')
    : 'Avant';
  const [activeTab] = useState<'Avant' | 'En cours' | 'Après'>(initialTab);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editObservation, setEditObservation] = useState('');
  const [uploadingPreuveId, setUploadingPreuveId] = useState<string | null>(null);
  const [previewPreuvePhotos, setPreviewPreuvePhotos] = useState<{ urls: string[]; index: number } | null>(null);
  // Document upload state
  const [isDocUploading, setIsDocUploading] = useState(false);
  const [isDocUploadModalOpen, setDocUploadModalOpen] = useState(false);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [docUploadType, setDocUploadType] = useState<string>('');
  const [documents, setDocuments] = useState<any[]>([]);
  // Photos | Documents facet (underline tabs, DESIGN.md §9) — photos first: camera-first page.
  const [facet, setFacet] = useState<Facet>('photos');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<string | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState<string | null>(null);
  const [deletingPreuve, setDeletingPreuve] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const preuveInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const docCameraInputRef = useRef<HTMLInputElement>(null);

  // Dossier data
  const dossierRef = useMemo(() => (db ? doc(db, 'dossiers', dossierId) : null), [db, dossierId]);
  const { data: dossier, loading: dossierLoading } = useDoc<any>(dossierRef as any);
  // Proposition réforme (item 021) lifts the per-section cap from 30 to 60.
  const photoCap = (dossier as any)?.propositionReforme ? MAX_PHOTOS_WITH_REFORME : MAX_PHOTOS_PER_SECTION;

  // Planifications
  const plansQuery = useMemo(
    () => db ? query(collection(db, 'dossiers', dossierId, 'planifications'), orderBy('createdAt', 'desc')) : null,
    [db, dossierId]
  );
  const { data: plans, loading: plansLoading } = useCollection<any>(plansQuery);

  // Document types
  const { options: dbDocTypes } = useOptions('options_types_documents', [...defaultDocTypes]);
  const docTypes = useMemo(() => dbDocTypes.length > 0 ? dbDocTypes : defaultDocTypes.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbDocTypes]);

  // Observation presets (shared with planification modal)
  const { options: dbObservationPresets, loading: observationPresetsLoading } = useOptions('options_observations');
  const activeObservationPresets = useMemo(
    () => dbObservationPresets.filter((o) => o.active !== false),
    [dbObservationPresets],
  );

  // Photos listener
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'dossiers', dossierId, 'photos'), (snap) => {
      const items: Photo[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Photo));
      setPhotos(items);
    });
    return () => unsub();
  }, [db, dossierId]);

  // Documents listener
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'dossiers', dossierId, 'documents'), (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDocuments(items);
    });
    return () => unsub();
  }, [db, dossierId]);

  // Count planifications by type
  const countByType = useMemo(() => {
    const counts: Record<string, number> = { 'Avant': 0, 'En cours': 0, 'Après': 0 };
    (plans || []).forEach((p: any) => {
      const type = normalizeType(p.typeMission);
      if (counts[type] !== undefined) counts[type]++;
    });
    return counts;
  }, [plans]);

  // Filtered planifications for active tab
  const filteredPlans = useMemo(
    () => (plans || []).filter((p: any) => normalizeType(p.typeMission) === activeTab),
    [plans, activeTab]
  );

  // Current tab's photo category
  const currentCategory = MISSION_TABS.find(t => t.id === activeTab)?.category || 'avant';

  // Filtered photos for active tab
  const filteredPhotos = useMemo(
    () => photos.filter(p => p.category === currentCategory).sort((a, b) => {
      const ta = a.uploadedAt?.toDate?.() || new Date(0);
      const tb = b.uploadedAt?.toDate?.() || new Date(0);
      return tb.getTime() - ta.getTime();
    }),
    [photos, currentCategory]
  );

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, "d MMM yyyy HH:mm", { locale: fr }); }
    catch { return '-'; }
  };

  const toDate = (ts: any): Date | null => {
    if (!ts) return null;
    return ts.toDate ? ts.toDate() : new Date(ts);
  };

  const userEmail = auth?.currentUser?.email || 'Agent de Terrain';

  // Save observation
  const handleSaveObservation = async (planId: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'dossiers', dossierId, 'planifications', planId), {
        observation: editObservation,
        observationUpdatedAt: serverTimestamp(),
        observationUpdatedBy: profile?.nom || userEmail,
        observationSource: 'ATG',
      });
      await logHistorique(db, dossierId, 'Observation Agent de Terrain mise à jour', userEmail, `Observation mise à jour pour la planification.`, 'planification', profile?.nom);
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'Agent de Terrain : remarque ajoutée', userEmail, userId, 'done', { dossierRef: dossier?.refExpert || dossierId, details: `Observation mise à jour par Agent de Terrain` }, profile?.nom);

      // Persist observation to subcollection for history. Round 8 — tag with
      // phaseATG matching the active mission tab (Q-3 → A) so the obs is
      // scoped to the right step in the dossier view.
      if (editObservation.trim()) {
        const phaseTag = (activeTab as 'Avant' | 'En cours' | 'Après');
        await addObservation(
          db, dossierId, editObservation.trim(), 'Planification',
          profile?.nom || userEmail, userEmail, profile?.role || 'Agent de Terrain',
          'assignations-atg', phaseTag, null,
        );
      }

      toast({ title: 'Observation enregistrée' });
      setEditingPlanId(null);
    } catch {
      toast({ variant: 'destructive', title: "Erreur lors de l'enregistrement" });
    }
  };

  // Upload photos (from camera capture)
  const handleUploadFiles = async (files: File[]) => {
    if (!db || !storage || files.length === 0) return;
    // Capture the statut BEFORE the upload loop so the auto-advance check is
    // race-free with respect to additional snapshots arriving mid-batch.
    const statutBeforeUpload: string | undefined = dossier?.statut;
    const categoryAtUpload: PhotoCategory = currentCategory;
    // Enforce per-section cap (item 020) — lifted to MAX_PHOTOS_WITH_REFORME
    // when proposition réforme is active on this dossier (item 021).
    const existing = filteredPhotos.length;
    const available = Math.max(0, photoCap - existing);
    if (available === 0) {
      toast({
        variant: 'destructive',
        title: 'Limite atteinte',
        description: `Limite de ${photoCap} photos atteinte pour cette section.`,
      });
      return;
    }
    if (files.length > available) {
      toast({
        variant: 'destructive',
        title: 'Limite de photos',
        description: `${files.length - available} photo(s) ignorée(s) — la limite de ${photoCap} par section a été atteinte.`,
      });
      files = files.slice(0, available);
    }
    setIsUploading(true);
    try {
      // Build a friendly display name for the watermark — prefer the user's
      // full name from their profile, fall back to email, then a generic label.
      const watermarkName = [profile?.prenom, profile?.nom]
        .filter(Boolean)
        .join(' ')
        .trim() || userEmail || 'Agent de Terrain';
      for (const file of files) {
        const timestamp = Date.now();
        // Stamp BEFORE queuing so the watermark survives offline uploads too.
        const stamped = await watermarkAtgPhoto(file, watermarkName);
        const storagePath = `dossiers/${dossierId}/photos/${categoryAtUpload}/${timestamp}_${stamped.name}`;
        await uploadFileWithOfflineSupport({
          storage,
          db,
          file: stamped,
          fileName: stamped.name,
          storagePath,
          firestoreDocPath: `dossiers/${dossierId}/photos`,
          firestoreMetadata: {
            name: stamped.name,
            category: categoryAtUpload,
            uploadedAt: serverTimestamp(),
            uploadedBy: userEmail,
            storagePath,
          },
        });
        await logHistorique(db, dossierId, 'Upload photo Agent de Terrain', userEmail, `Photo "${stamped.name}" uploadée (${categoryAtUpload}).`, 'photo', profile?.nom);
      }
      const catLabel = categoryAtUpload === 'avant' ? 'Avant' : categoryAtUpload === 'en_cours' ? 'En cours' : 'Après';
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'Agent de Terrain : photos ajoutées en planification', userEmail, userId, 'done', { dossierRef: dossier?.refExpert || dossierId, details: `${files.length} photos ${catLabel} ajoutées par Agent de Terrain` }, profile?.nom);
      // Auto-advance status on first-photo-for-category transition. Non-blocking:
      // fires and forgets so the UI isn't held on the status write even offline.
      // Idempotent — re-uploads in the same category are no-ops because the
      // helper early-returns when currentStatut already equals the target.
      void maybeAdvanceToExpertise(db, dossierId, statutBeforeUpload, categoryAtUpload, userEmail);
      toast({ title: `${files.length} photo${files.length > 1 ? 's' : ''} uploadée${files.length > 1 ? 's' : ''} avec succès` });
    } catch {
      toast({ variant: 'destructive', title: "Erreur lors de l'upload" });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle camera confirm — close camera then upload
  const handleCameraConfirm = (files: File[]) => {
    setIsCameraOpen(false);
    handleUploadFiles(files);
  };

  // Delete photo
  const handleDeletePhoto = async (photo: Photo) => {
    if (!db || !storage) return;
    if (!canDeletePhoto(photo)) {
      toast({
        variant: 'destructive',
        title: 'Suppression refusée',
        description: 'Vous ne pouvez supprimer que les photos que vous avez vous-même téléversées.',
      });
      return;
    }
    setIsDeletingPhoto(photo.id);
    try {
      if (photo.storagePath) {
        const storageRef = ref(storage, photo.storagePath);
        await deleteObject(storageRef).catch(e => console.warn('Storage delete warn:', e));
      }
      await deleteDoc(doc(db, 'dossiers', dossierId, 'photos', photo.id));
      const userId = auth?.currentUser?.uid || 'unknown';
      await logHistorique(db, dossierId, 'Suppression photo Agent de Terrain', userEmail, `Photo "${photo.name || 'inconnue'}" supprimée.`, 'photo', profile?.nom);
      await logWorkflow(db, dossierId, 'Photo supprimée par Agent de Terrain', userEmail, userId, 'done', { details: `Photo "${photo.name || 'inconnue'}" supprimée` }, profile?.nom);
      toast({ title: 'Photo supprimée' });
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({ variant: 'destructive', title: 'Erreur lors de la suppression' });
    } finally {
      setIsDeletingPhoto(null);
    }
  };

  // Delete document
  const handleDeleteDocument = async (docItem: any) => {
    if (!db || !storage) return;
    // Admins / directeurs may delete any document. ATG may delete only their
    // own uploads. Everyone else is blocked.
    const isOwnATGUpload = docItem.uploadSource === 'ATG' && docItem.uploadePar === auth?.currentUser?.email;
    if (!canDelete && !(isATG && isOwnATGUpload)) {
      toast({ variant: 'destructive', title: 'Suppression refusée', description: 'Vous n\'avez pas la permission de supprimer ce document.' });
      return;
    }
    if (!window.confirm(`Supprimer le document "${docItem.nom || docItem.name || ''}" ?`)) return;
    setIsDeletingDoc(docItem.id);
    try {
      if (docItem.storagePath) {
        const storageRef = ref(storage, docItem.storagePath);
        await deleteObject(storageRef).catch(e => console.warn('Storage delete warn:', e));
      }
      await deleteDoc(doc(db, 'dossiers', dossierId, 'documents', docItem.id));
      const userId = auth?.currentUser?.uid || 'unknown';
      await logHistorique(db, dossierId, 'Suppression document Agent de Terrain', userEmail, `Document "${docItem.nom || docItem.name || 'inconnu'}" supprimé.`, 'document', profile?.nom);
      await logWorkflow(db, dossierId, 'Document supprimé par Agent de Terrain', userEmail, userId, 'done', { details: `Document "${docItem.nom || docItem.name || 'inconnu'}" supprimé` }, profile?.nom);
      toast({ title: 'Document supprimé' });
    } catch (err) {
      console.error('Delete doc error:', err);
      toast({ variant: 'destructive', title: 'Erreur lors de la suppression du document' });
    } finally {
      setIsDeletingDoc(null);
    }
  };

  // Delete preuve photo
  const handleDeletePreuvePhoto = async (planId: string, url: string, idx: number) => {
    if (!db || !storage) return;
    if (!window.confirm('Supprimer cette preuve ?')) return;
    const key = `${planId}:${idx}`;
    setDeletingPreuve(key);
    try {
      const plan = (plans || []).find((p: any) => p.id === planId);
      const existing: string[] = plan?.preuvePhotos || [];
      const next = existing.filter((u) => u !== url);
      await updateDoc(doc(db, 'dossiers', dossierId, 'planifications', planId), {
        preuvePhotos: next,
        preuveUpdatedAt: serverTimestamp(),
        preuveUpdatedBy: userEmail,
      });
      // Best-effort storage delete (parse path from download URL if possible)
      try {
        const match = url.match(/\/o\/([^?]+)/);
        if (match && match[1]) {
          const path = decodeURIComponent(match[1]);
          await deleteObject(ref(storage, path)).catch(e => console.warn('Preuve storage delete warn:', e));
        }
      } catch (e) {
        console.warn('Preuve path parse warn:', e);
      }
      await logHistorique(db, dossierId, 'Suppression preuve Agent de Terrain', userEmail, `Photo de preuve supprimée.`, 'planification', profile?.nom);
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'Preuve supprimée par Agent de Terrain', userEmail, userId, 'done', { dossierRef: dossier?.refExpert || dossierId, details: 'Photo de preuve supprimée par Agent de Terrain' }, profile?.nom);
      toast({ title: 'Preuve supprimée' });
    } catch (err) {
      console.error('Delete preuve error:', err);
      toast({ variant: 'destructive', title: 'Erreur lors de la suppression de la preuve' });
    } finally {
      setDeletingPreuve(null);
    }
  };

  // Legacy upload handler (for FileList from input)
  const handleUpload = async (files: FileList) => {
    await handleUploadFiles(Array.from(files));
  };

  // Upload preuve photos (from gallery, stored as URLs on planification document)
  const handleUploadPreuve = async (planId: string, files: FileList) => {
    if (!db || !storage) return;
    setUploadingPreuveId(planId);
    try {
      const newUrls: string[] = [];
      for (const file of Array.from(files)) {
        const timestamp = Date.now();
        const storagePath = `dossiers/${dossierId}/preuves/${planId}/${timestamp}_${file.name}`;
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        newUrls.push(url);
      }
      // Update the planification document with preuve URLs
      const plan = (plans || []).find((p: any) => p.id === planId);
      const existingPreuves: string[] = plan?.preuvePhotos || [];
      await updateDoc(doc(db, 'dossiers', dossierId, 'planifications', planId), {
        preuvePhotos: [...existingPreuves, ...newUrls],
        preuveUpdatedAt: serverTimestamp(),
        preuveUpdatedBy: userEmail,
      });
      await logHistorique(db, dossierId, 'Preuve Agent de Terrain ajoutée', userEmail, `${newUrls.length} photo(s) de preuve ajoutée(s).`, 'planification', profile?.nom);
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'Agent de Terrain : preuve ajoutée', userEmail, userId, 'done', { dossierRef: dossier?.refExpert || dossierId, details: `${newUrls.length} photo(s) de preuve ajoutée(s) par Agent de Terrain` }, profile?.nom);
      toast({ title: 'Preuve(s) uploadée(s)' });
    } catch (err) {
      console.error('Preuve upload error:', err);
      toast({ variant: 'destructive', title: "Erreur lors de l'upload de preuve" });
    } finally {
      setUploadingPreuveId(null);
      const input = preuveInputRefs.current[planId];
      if (input) input.value = '';
    }
  };

  // Shared uploader — used by direct (per-slot) and modal-confirmed paths, and by multi-select batches.
  const uploadDocument = async (file: File, type: string) => {
    if (!file || !type || !db || !storage) return;
    const timestamp = Date.now();
    const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${file.name}`;
    await uploadFileWithOfflineSupport({
      storage,
      db,
      file,
      fileName: file.name,
      storagePath,
      firestoreDocPath: `dossiers/${dossierId}/documents`,
      firestoreMetadata: {
        nom: file.name,
        type,
        taille: file.size,
        uploadePar: userEmail,
        storagePath,
        _localCreatedAt: timestamp,
        uploadSource: 'ATG',
      },
    });
    await logHistorique(db, dossierId, 'Upload document Agent de Terrain', userEmail, `Document "${file.name}" uploadé (type: ${type}).`, 'document', profile?.nom);
    const userId = auth?.currentUser?.uid || 'unknown';
    await logWorkflow(db, dossierId, 'Agent de Terrain : document ajouté', userEmail, userId, 'done', { dossierRef: dossier?.refExpert || dossierId, details: `Document "${file.name}" ajouté par Agent de Terrain (${type})` }, profile?.nom);
  };

  // Document files picked — skip the type modal if docUploadType is already set
  // (per-slot "Ajouter" button), else open the modal so the user can choose.
  // Supports multi-select: all files in a batch share the same type.
  const handleDocFilesSelect = async (files: FileList) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    if (docUploadType) {
      setIsDocUploading(true);
      try {
        for (const f of list) {
          await uploadDocument(f, docUploadType);
        }
        toast({ title: list.length === 1 ? 'Document uploadé avec succès' : `${list.length} documents uploadés` });
      } catch (error: any) {
        console.error('Document upload error:', error);
        toast({ variant: 'destructive', title: "Erreur lors de l'upload du document", description: error.message || 'Une erreur est survenue.' });
      } finally {
        setIsDocUploading(false);
        setDocUploadType('');
      }
      return;
    }
    // No pre-set type: fall back to modal (single file — modal flow doesn't batch).
    setSelectedDocFile(list[0]);
    setDocUploadModalOpen(true);
  };

  // Modal confirm — only reached when user opened the generic add path (no slot context).
  const handleDocUpload = async () => {
    if (!selectedDocFile || !docUploadType) return;
    setIsDocUploading(true);
    try {
      await uploadDocument(selectedDocFile, docUploadType);
      toast({ title: 'Document uploadé avec succès' });
      setDocUploadModalOpen(false);
      setSelectedDocFile(null);
      setDocUploadType('');
    } catch (error: any) {
      console.error('Document upload error:', error);
      toast({ variant: 'destructive', title: "Erreur lors de l'upload du document", description: error.message || 'Une erreur est survenue.' });
    } finally {
      setIsDocUploading(false);
    }
  };

  const assureNom = dossier ? `${dossier.assure?.nom || ''} ${dossier.assure?.prenom || ''}`.trim() : '';
  const assureTelephoneRaw = (dossier?.assure?.telephone || dossier?.assure?.telephone2 || '').trim();
  // Normalize for tel: URI — keep leading + (international prefix) and strip everything but digits.
  const assureTelephoneHref = (() => {
    if (!assureTelephoneRaw) return '';
    const hasPlus = assureTelephoneRaw.startsWith('+');
    const digits = assureTelephoneRaw.replace(/\D/g, '');
    return hasPlus ? `+${digits}` : digits;
  })();

  // Breadcrumb / document.title (PageHeader used to register it).
  useRegisterPageTitle(dossier ? (dossier.refExpert || dossierId) : null);

  // Proposition réforme (item 021). AT-only toggle; lifts photo cap from 30 to
  // 60 per section. Does NOT change dossier statut.
  const togglePropositionReforme = async () => {
    if (!dossierRef || !db) return;
    const next = !(dossier as any)?.propositionReforme;
    try {
      await updateDoc(dossierRef, { propositionReforme: next });
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(
        db, dossierId,
        next ? 'Proposition réforme activée' : 'Proposition réforme annulée',
        userEmail, userId, 'done',
        { details: `Limite photo par section : ${next ? MAX_PHOTOS_WITH_REFORME : MAX_PHOTOS_PER_SECTION}` },
        profile?.nom,
      );
      toast({ title: next ? 'Proposition réforme activée' : 'Proposition réforme annulée' });
    } catch (e) {
      console.error('propositionReforme toggle error:', e);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de modifier la proposition réforme.' });
    }
  };

  if (dossierLoading || plansLoading) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className={cn('flex h-12 items-center gap-3 border-b border-hairline px-3 sm:px-5', BAR_BLEED)}>
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-8 w-40" />
        </div>
        <div className="mx-auto max-w-5xl space-y-6">
          <Skeleton className="h-12 w-full md:hidden" />
          <div className="paper p-6">
            <div className="flex items-start gap-4">
              <Skeleton className="h-14 w-14 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3.5 w-72 max-w-full" />
              </div>
            </div>
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const statut: string = dossier?.statut || 'Nouveau';
  const plate = dossier?.matricule || dossier?.vehicule?.immatriculation || '';
  const assure = assureName(dossier?.assure) || assureNom;
  const cameraLabel = isUploading ? 'Upload en cours...' : 'Prendre des photos';
  const propositionReforme = !!(dossier as any)?.propositionReforme;
  const nextPlanId = (() => {
    // The next upcoming RDV wears the third colour (planification-tab convention).
    const now = Date.now();
    let best: { id: string; t: number } | null = null;
    for (const p of filteredPlans as any[]) {
      const rdv = toDate(p.dateRDV);
      if (!rdv || rdv.getTime() < now) continue;
      if (!best || rdv.getTime() < best.t) best = { id: p.id, t: rdv.getTime() };
    }
    return best?.id ?? null;
  })();

  return (
    <div className="space-y-6">
      {/* Sticky identity bar — mirrors components/dossiers/record-bar.tsx
          (its props expect dossier steps + gestionnaire actions). */}
      <div className={cn('sticky top-0 z-40 flex min-h-[48px] items-center gap-2 glass-bar border-b border-hairline px-3 sm:px-5', BAR_BLEED)} data-record-bar>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-ink-3 hover:text-ink" asChild>
              <Link href="/assignations-atg" aria-label="Retour aux missions terrain">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Missions terrain</TooltipContent>
        </Tooltip>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
          <h1 className="t-mono min-w-0 truncate font-semibold tracking-tight" title={dossier?.refExpert || undefined}>
            {dossier?.refExpert || dossierId}
          </h1>
          {assure && <span className="t-body min-w-0 truncate font-medium">{assure}</span>}
          {dossier?.compagnie && <span className="hidden truncate text-sm text-ink-3 md:inline">{dossier.compagnie}</span>}
          {plate && <span className="t-mono hidden text-ink-3 lg:inline">{plate}</span>}
          <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(statut), 'shrink-0')}>
            {statut}
          </Badge>
          {dossier?.expertRank && (
            <span className="hidden rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium text-ink-2 xl:inline">{dossier.expertRank}</span>
          )}
        </div>

        {/* The ONE primary of the mission: capture. Full-width twin below md (see content). */}
        {canEdit && (
          <Button size="sm" className="hidden h-8 shrink-0 gap-1.5 md:inline-flex" disabled={isUploading} loading={isUploading} onClick={() => setIsCameraOpen(true)}>
            {!isUploading && <Camera className="h-3.5 w-3.5" />}
            {cameraLabel}
          </Button>
        )}

        {(canEdit || assureTelephoneRaw) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" aria-label="Plus d'actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="t-caption truncate font-normal">{dossier?.refExpert || dossierId}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {canEdit && (
                <DropdownMenuItem onSelect={() => setIsCameraOpen(true)} disabled={isUploading} className="md:hidden">
                  <Camera className="mr-2 h-4 w-4" /> {cameraLabel}
                </DropdownMenuItem>
              )}
              {assureTelephoneRaw && (
                <DropdownMenuItem asChild>
                  <a href={`tel:${assureTelephoneHref}`}>
                    <Phone className="mr-2 h-4 w-4" /> Appeler l&apos;assuré
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Phones: the capture CTA is solid, full width and thumb-sized. */}
        {canEdit && (
          <Button className="h-12 w-full gap-2 font-semibold md:hidden" disabled={isUploading} loading={isUploading} onClick={() => setIsCameraOpen(true)}>
            {!isUploading && <Camera />}
            {cameraLabel}
          </Button>
        )}

        {/* Mission facts — planification-tab rows: date block anchor, labels quiet, values bold. */}
        <Section title={`Mission ${activeTab.toLowerCase()}`} count={filteredPlans.length}>
          {filteredPlans.length === 0 ? (
            <p className="t-caption">Aucune planification pour cette mission.</p>
          ) : (
            <ol className="-my-4 divide-y divide-hairline">
              {filteredPlans.map((p: any) => {
                const rdv = toDate(p.dateRDV);
                const upcoming = p.id === nextPlanId;
                return (
                  <li key={p.id} className="flex items-start gap-4 py-4">
                    <div
                      className={cn(
                        'flex w-14 shrink-0 flex-col items-center justify-center rounded-md py-1.5 text-center tabular-nums',
                        upcoming ? 'bg-tertiary text-tertiary-foreground shadow-rim-filled' : 'bg-surface-3 text-ink-2 shadow-rim',
                      )}
                    >
                      <span className="text-[11px] font-medium leading-none">{rdv ? format(rdv, 'MMM', { locale: fr }).replace('.', '') : '—'}</span>
                      <span className="font-headline text-xl font-semibold leading-tight">{rdv ? format(rdv, 'd') : '—'}</span>
                      <span className="text-[11px] leading-none">{rdv ? format(rdv, 'HH:mm') : ''}</span>
                    </div>
                    <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                      <div className="min-w-0">
                        <dt className="t-label">Rendez-vous</dt>
                        <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-ink">{formatDate(p.dateRDV)}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="t-label">Zone</dt>
                        <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{p.zone || <span className="font-normal text-ink-3">—</span>}</dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="t-label">Téléphone assuré</dt>
                        <dd className="mt-0.5 text-sm">
                          {assureTelephoneRaw ? (
                            <a href={`tel:${assureTelephoneHref}`} className="font-semibold tabular-nums text-primary hover:underline">
                              {assureTelephoneRaw}
                            </a>
                          ) : (
                            <span className="text-ink-3">—</span>
                          )}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="t-label">Agent de terrain</dt>
                        <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{p.agentTerrain || <span className="font-normal text-ink-3">—</span>}</dd>
                      </div>
                      <div className="col-span-2 min-w-0 sm:col-span-4">
                        <dt className="t-label">Adresse</dt>
                        <dd className="mt-0.5 text-sm text-ink">
                          {p.adresse ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                window.open(
                                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.adresse)}`,
                                  '_blank',
                                  'noopener,noreferrer',
                                );
                              }}
                              className="max-w-full truncate text-left font-semibold text-primary hover:underline"
                            >
                              {p.adresse}
                            </button>
                          ) : (
                            <span className="text-ink-3">—</span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </li>
                );
              })}
            </ol>
          )}
        </Section>

        {/* Observations section — scoped to the AT's current mission tab. The
            panel auto-tags new obs with phaseATG=activeTab (round 8 Q-3 → A)
            and only shows obs (or legacy un-tagged AT/dossiers obs) for that
            phase. */}
        <ObservationsTab
          dossierId={dossierId}
          section="assignations-atg"
          variant="collapsible"
          contextPhase={activeTab as 'Avant' | 'En cours' | 'Après'}
        />

        {/* Photos | Documents as underline facet tabs (step-tabs convention) — replaces the two toggle cards. */}
        <Card role="region" aria-label="Photos et documents" className="overflow-hidden">
          <div role="tablist" aria-label="Photos et documents" className="flex border-b border-hairline px-6">
            {([
              { id: 'photos' as Facet, label: 'Photos', count: photos.length },
              { id: 'documents' as Facet, label: 'Documents', count: documents.length },
            ]).map((tab) => {
              const isActive = facet === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setFacet(tab.id)}
                  className={cn(
                    'flex h-12 flex-1 items-center justify-center gap-2 whitespace-nowrap border-b-2 px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-none',
                    isActive ? 'border-primary text-ink' : 'border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink',
                  )}
                >
                  {tab.label}
                  <span className={cn('inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-medium tabular-nums', isActive ? 'bg-accent text-accent-foreground' : 'bg-surface-3 text-ink-3')}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {facet === 'photos' && (
            <div className="space-y-4 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="t-label">
                  <span className="text-sm font-semibold tabular-nums text-ink">{filteredPhotos.length}/{photoCap}</span> photos — {activeTab}
                </span>
                {/* Proposition réforme (item 021). AT-only toggle; lifts photo
                    cap from 30 to 60 per section. Does NOT change dossier statut. */}
                {isATG && (
                  <Button
                    variant={propositionReforme ? 'destructive' : 'outline'}
                    size="sm"
                    disabled={!dossierRef}
                    onClick={togglePropositionReforme}
                  >
                    {propositionReforme ? 'Réforme proposée — annuler' : 'Proposition réforme'}
                  </Button>
                )}
              </div>

              {filteredPhotos.length === 0 ? (
                <EmptyState
                  icon={<ImageIcon />}
                  title={`Aucune photo ${activeTab.toLowerCase()} pour le moment.`}
                  description={<>Utilisez le bouton &quot;Prendre une photo&quot; pour capturer.</>}
                  dashed={false}
                />
              ) : (
                <CollapsedByDayList
                  items={filteredPhotos}
                  getDate={(photo) => (photo.uploadedAt?.toDate ? photo.uploadedAt.toDate() : null)}
                  keyOf={(photo) => photo.id}
                  defaultExpanded={false}
                  gridItems
                  groupLabel={(day, count) =>
                    `${format(day, 'd MMMM yyyy', { locale: fr })} — ${count} photo${count > 1 ? 's' : ''}`
                  }
                  renderItem={(photo) => (
                    // Filled socket: raised tile (slot-card convention), 10 px radius inside the 12 px paper.
                    <div
                      className="group relative aspect-square cursor-pointer overflow-hidden rounded-[10px] bg-card shadow-card dark:ring-1 dark:ring-hairline"
                      onClick={() => setPreviewPhoto(photo)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-ink-solid/40 opacity-0 transition-opacity group-hover:opacity-100">
                        <Eye className="h-5 w-5 text-on-ink" />
                      </div>
                      {canDeletePhoto(photo) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Supprimer cette photo ?')) handleDeletePhoto(photo);
                          }}
                          disabled={isDeletingPhoto === photo.id}
                          className="absolute right-1 top-1 z-10 rounded-full bg-destructive p-1 text-destructive-foreground shadow-rim-filled hover:brightness-[1.06]"
                          aria-label="Supprimer la photo"
                        >
                          {isDeletingPhoto === photo.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <Trash2 className="h-3 w-3" />}
                        </button>
                      )}
                      {/* Solid scrim (no gradients — DESIGN.md §3). */}
                      <div className="absolute inset-x-0 bottom-0 bg-ink-solid/60 p-1.5">
                        <p className="truncate text-[11px] text-on-ink">{photo.name}</p>
                      </div>
                    </div>
                  )}
                />
              )}
            </div>
          )}

          {facet === 'documents' && (
            <div className="p-6">
              <TypedDocumentsGrid
                dossierId={dossierId}
                hideCardinalPlus
                hideExtraSlotPlus
                hideAccordSlots
                showBaseGarageSlots
                hideReformeSlots
              />
            </div>
          )}
        </Card>
      </div>

      {/* Photo preview dialog */}
      {previewPhoto && (
        <Dialog open onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="flex h-[calc(60vh/var(--app-zoom))] max-w-2xl flex-col p-0">
            <div className="flex flex-1 items-center justify-center overflow-hidden bg-ink-solid">
              <img src={previewPhoto.url} className="max-h-full max-w-full object-contain" alt={previewPhoto.name} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Preuve preview dialog */}
      {previewPreuvePhotos && (
        <Dialog open onOpenChange={() => setPreviewPreuvePhotos(null)}>
          <DialogContent className="flex h-[calc(60vh/var(--app-zoom))] max-w-2xl flex-col p-0">
            <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-ink-solid">
              <img
                src={previewPreuvePhotos.urls[previewPreuvePhotos.index]}
                className="max-h-full max-w-full object-contain"
                alt={`Preuve ${previewPreuvePhotos.index + 1}`}
              />
            </div>
            {previewPreuvePhotos.urls.length > 1 && (
              <div className="flex items-center justify-center gap-2 border-t border-hairline bg-background p-3">
                {previewPreuvePhotos.urls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPreviewPreuvePhotos({ ...previewPreuvePhotos, index: idx })}
                    className={cn(
                      "h-14 w-14 overflow-hidden rounded-md transition-opacity",
                      idx === previewPreuvePhotos.index ? "ring-2 ring-ring" : "shadow-rim opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={url} className="h-full w-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Camera capture — `maxCaptures` is the remaining-slot count for the
          currently active section, so the shutter button hard-stops at the
          per-section cap instead of letting the uploader silently drop the
          excess photos on confirm. */}
      <CameraCapture
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onConfirm={handleCameraConfirm}
        maxCaptures={Math.max(0, photoCap - filteredPhotos.length)}
      />
    </div>
  );
}
