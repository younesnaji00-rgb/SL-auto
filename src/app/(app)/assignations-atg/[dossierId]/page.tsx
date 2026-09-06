'use client';

import { PageHeader } from '@/components/layout/page-header';
import React, { use, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  doc, collection, query, orderBy, onSnapshot, updateDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
import { useFirestore, useStorage, useAuth, useDoc, useCollection } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import {
  Loader2, Eye, ImageIcon, Camera, Trash2, FileText, ChevronDown, MapPin, Upload,
  Navigation, Phone, MessageSquare, Paperclip,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { IconChip } from '@/components/ui/icon-chip';
import { format } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { watermarkAtgPhoto } from '@/lib/photo-watermark';
import { logHistorique, logWorkflow } from '../../dossiers/[id]/log-historique';
import { addObservation } from '../../dossiers/[id]/log-observation';
import { useCurrentUser } from '@/hooks/use-current-user';
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
import { useTutorialMode } from '@/lib/tutorial/use-tutorial-mode';
import { useIsPhone } from '@/hooks/use-viewport-class';
import { usePhoneChrome, useRegisterPageTitle } from '@/components/layout/page-chrome';
import { BottomActionBar } from '@/components/layout/bottom-action-bar';
import { PhotoGrid } from '@/components/common/photo-grid';
import { DocumentPreviewLightbox } from '@/components/document-preview-lightbox';
import { GeofenceCheckinBanner, type GeofenceCandidate } from '../mission-geofence-checkin';
import Loading from './loading';

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

export default function ATGDossierDetailPage({ params }: { params: Promise<{ dossierId: string }> }) {
  const { dossierId } = use(params);
  const t = useT();
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const { toast } = useToast();
  const { canWrite, canDelete, profile } = useCurrentUser();
  const tutorialMode = useTutorialMode();
  const isPhone = useIsPhone();
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
  // The phone body IS the photo section, so its segmented control switches the
  // mission phase in place (E10). On desktop the phase still comes from
  // `?mission=` and nothing sets it — behaviour unchanged.
  const [activeTab, setActiveTab] = useState<'Avant' | 'En cours' | 'Après'>(initialTab);
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
  // Section toggles (mutually exclusive)
  const [isPhotosOpen, setIsPhotosOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
  // Phone: « Observations » is a collapsed disclosure row like « Documents ».
  const [isObsOpen, setIsObsOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDeletingPhoto, setIsDeletingPhoto] = useState<string | null>(null);
  const [isDeletingDoc, setIsDeletingDoc] = useState<string | null>(null);
  const [deletingPreuve, setDeletingPreuve] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  // Demo brand: gallery import next to the camera — prospects demo from a
  // desktop, where "take photos" has no camera to talk to.
  const galleryInputRef = useRef<HTMLInputElement>(null);
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
    if (!ts) return null;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, "d MMM yyyy HH:mm", { locale: dateFnsLocale() }); }
    catch { return null; }
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

      toast({ title: t('Observation enregistrée') });
      setEditingPlanId(null);
    } catch {
      toast({ variant: 'destructive', title: t("Erreur lors de l'enregistrement") });
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
        title: t('Limite atteinte'),
        description: `${t('Limite de')} ${photoCap} ${t('photos atteinte pour cette section.')}`,
      });
      return;
    }
    if (files.length > available) {
      toast({
        variant: 'destructive',
        title: t('Limite de photos'),
        description: `${files.length - available} ${t('photo(s) ignorée(s) — la limite de')} ${photoCap} ${t('par section a été atteinte.')}`,
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
      toast({ title: `${files.length} ${files.length > 1 ? t('photos uploadées avec succès') : t('photo uploadée avec succès')}` });
    } catch {
      toast({ variant: 'destructive', title: t("Erreur lors de l'upload") });
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
        title: t('Suppression refusée'),
        description: t('Vous ne pouvez supprimer que les photos que vous avez vous-même téléversées.'),
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
      toast({ title: t('Photo supprimée') });
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({ variant: 'destructive', title: t('Erreur lors de la suppression') });
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
      toast({ variant: 'destructive', title: t('Suppression refusée'), description: t('Vous n\'avez pas la permission de supprimer ce document.') });
      return;
    }
    if (!window.confirm(`${t('Supprimer le document')} "${docItem.nom || docItem.name || ''}" ?`)) return;
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
      toast({ title: t('Document supprimé') });
    } catch (err) {
      console.error('Delete doc error:', err);
      toast({ variant: 'destructive', title: t('Erreur lors de la suppression du document') });
    } finally {
      setIsDeletingDoc(null);
    }
  };

  // Delete preuve photo
  const handleDeletePreuvePhoto = async (planId: string, url: string, idx: number) => {
    if (!db || !storage) return;
    if (!window.confirm(t('Supprimer cette preuve ?'))) return;
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
      toast({ title: t('Preuve supprimée') });
    } catch (err) {
      console.error('Delete preuve error:', err);
      toast({ variant: 'destructive', title: t('Erreur lors de la suppression de la preuve') });
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
      toast({ title: t('Preuve(s) uploadée(s)') });
    } catch (err) {
      console.error('Preuve upload error:', err);
      toast({ variant: 'destructive', title: t("Erreur lors de l'upload de preuve") });
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
        toast({ title: list.length === 1 ? t('Document uploadé avec succès') : `${list.length} ${t('documents uploadés')}` });
      } catch (error: any) {
        console.error('Document upload error:', error);
        toast({ variant: 'destructive', title: t("Erreur lors de l'upload du document"), description: error.message || t('Une erreur est survenue.') });
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
      toast({ title: t('Document uploadé avec succès') });
      setDocUploadModalOpen(false);
      setSelectedDocFile(null);
      setDocUploadType('');
    } catch (error: any) {
      console.error('Document upload error:', error);
      toast({ variant: 'destructive', title: t("Erreur lors de l'upload du document"), description: error.message || t('Une erreur est survenue.') });
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

  // Proposition réforme (item 021). AT-only toggle; lifts photo cap from 30 to
  // 60 per section. Does NOT change dossier statut. Reversible → never `destructive`.
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
      toast({ title: next ? t('Proposition réforme activée') : t('Proposition réforme annulée') });
    } catch (e) {
      console.error('propositionReforme toggle error:', e);
      toast({ variant: 'destructive', title: t('Erreur'), description: t('Impossible de modifier la proposition réforme.') });
    }
  };

  // Geofence candidates of THIS mission: planifications that carry an address
  // and have not been checked in yet (same shape the queue banner consumes).
  const geofenceCandidates = useMemo<GeofenceCandidate[]>(
    () =>
      (filteredPlans as any[])
        .filter((p) => !!p.adresse && !p.checkinAt)
        .map((p) => ({
          key: `${dossierId}:${p.id}`,
          dossierId,
          planifId: p.id,
          refLabel: (dossier as any)?.refExpert || dossierId,
          adresse: p.adresse as string,
        })),
    [filteredPlans, dossierId, dossier],
  );

  // ── PHONE chrome (docs/research/mobile-record-pages.md §E10 + §E3).
  // The record identity moves INTO the shell top bar: « ‹ Missions », the ref
  // as the title, the assuré as the subtitle, and the four page-level actions
  // as the « ⋯ » sheet. Nothing of it is painted as prose in the body.
  const refLabel = dossier?.refExpert || dossierId;
  const assureForChrome = assureName(dossier?.assure) || assureNom;
  const firstAdresse = (filteredPlans[0] as any)?.adresse || '';
  useRegisterPageTitle(dossier ? refLabel : null);
  usePhoneChrome({
    upHref: '/assignations-atg',
    upLabel: 'Missions',
    subtitle: assureForChrome || null,
    primaryAction: null,
    secondaryActions: [
      {
        key: 'route',
        label: t('Itinéraire'),
        icon: <Navigation />,
        hidden: !firstAdresse,
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(firstAdresse)}`,
        external: true,
      },
      {
        key: 'call',
        label: t('Appeler'),
        icon: <Phone />,
        hidden: !assureTelephoneHref,
        href: `tel:${assureTelephoneHref}`,
      },
      {
        key: 'obs',
        label: t('Observations'),
        icon: <MessageSquare />,
        onSelect: () => {
          setIsObsOpen(true);
          document.getElementById('atg-observations')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        },
      },
      {
        key: 'docs',
        label: t('Documents'),
        icon: <Paperclip />,
        onSelect: () => {
          setIsDocsOpen(true);
          document.getElementById('atg-documents-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        },
      },
    ],
  });

  if (dossierLoading || plansLoading) {
    // Loading (element-specs §15): the route skeleton mirrors this exact layout.
    return <Loading />;
  }

  const statut: string = dossier?.statut || 'Nouveau';
  const plate = dossier?.matricule || dossier?.vehicule?.immatriculation || '';
  const assure = assureName(dossier?.assure) || assureNom;
  const cameraLabel = isUploading ? t('Upload en cours...') : t('Prendre des photos');
  const propositionReforme = !!(dossier as any)?.propositionReforme;
  const atPhotoCap = filteredPhotos.length >= photoCap;
  const nextPlanId = (() => {
    // The next upcoming RDV of this mission gets the "Prochain" info chip.
    const now = Date.now();
    let best: { id: string; t: number } | null = null;
    for (const p of filteredPlans as any[]) {
      const rdv = toDate(p.dateRDV);
      if (!rdv || rdv.getTime() < now) continue;
      if (!best || rdv.getTime() < best.t) best = { id: p.id, t: rdv.getTime() };
    }
    return best?.id ?? null;
  })();

  const openMapsFor = (adresse: string) =>
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`, '_blank', 'noopener,noreferrer');

  // Telephone as a `link` (§8): the only coloured text on the page.
  const phoneValue = assureTelephoneRaw ? (
    <a href={`tel:${assureTelephoneHref}`} className="font-semibold tabular-nums text-primary underline-offset-4 hover:underline">
      {assureTelephoneRaw}
    </a>
  ) : (
    <span className="font-normal text-ink-4">—</span>
  );

  return (
    <div className={cn('space-y-6', isPhone && 'space-y-4 pb-24')}>
      {/* (1) Arrival / geofence banner — the queue's thumb-zone rule, kept on
          the mission the agent has actually opened (E10). */}
      {isPhone && isATG && geofenceCandidates.length > 0 && (
        <GeofenceCheckinBanner candidates={geofenceCandidates} />
      )}

      {/* Header stack */}
      <div data-tour="atgd-header" className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          {/* Page header (element-specs §1: Polaris Page ✓ breadcrumb back to
              the parent, compact t-title on a record page; meta chips §11 —
              dossier status pair, plate (neutral, mono), expert rank (neutral)).
              No filled button here: the page primary sits in the Photos panel.
              HIDDEN below md: the ref, the assuré and the up-link live in the
              shell top bar (E3/E10 — no PageHeader prose on a phone). */}
          <div className="max-md:hidden">
          <PageHeader
            size="compact"
            backHref="/assignations-atg"
            backLabel={t('Missions terrain')}
            title={dossier?.refExpert || dossierId}
            subtitle={[assure, dossier?.compagnie].filter(Boolean).join(' — ') || undefined}
            meta={
              <>
                <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(statut))}>{t(statut)}</Badge>
                {plate && <Badge variant="neutral" className="font-mono">{plate}</Badge>}
                {dossier?.expertRank && <Badge variant="neutral">{dossier.expertRank}</Badge>}
              </>
            }
          />
          </div>

          {/* PHONE: the status + plate chips the PageHeader used to carry, on
              one 32 px line — the only identity prose left in the body. */}
          <div className="flex flex-wrap items-center gap-2 md:hidden">
            <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(statut))}>{t(statut)}</Badge>
            {plate && <Badge variant="neutral" className="font-mono">{plate}</Badge>}
          </div>

          {/* Plan facts as a definition list (element-specs §10: GOV.UK summary
              list ✓ key / value; Refactoring UI — labels quiet, values 14/600;
              empty = "—" in ink-4). One row per planification of this mission:
              Rendez-vous · Zone · Adresse (Maps `link`) · Téléphone (`tel:` link). */}
          {filteredPlans.length === 0 ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <div className="min-w-0 max-md:min-h-[44px]">
                <dt className="t-label">{t('Téléphone')}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-ink">{phoneValue}</dd>
              </div>
            </dl>
          ) : (
            <div className="space-y-4">
              {filteredPlans.map((p: any) => (
                <dl key={p.id} className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                  <div className="min-w-0 max-md:min-h-[44px]">
                    <dt className="t-label">{t('Rendez-vous')}</dt>
                    {/* Date block = the warm anchor (addendum 1a): every RDV date
                        is the terracotta tint; the NEXT upcoming one is the page's
                        single SOLID block. Figures stay Inter 600 tabular (addendum 3). */}
                    <dd className="mt-0.5 flex flex-wrap items-center gap-2 text-sm font-semibold tabular-nums text-ink">
                      {formatDate(p.dateRDV) ? (
                        <span
                          className={cn(
                            'inline-flex items-center rounded-md px-2 py-0.5',
                            p.id === nextPlanId
                              ? 'bg-tertiary text-tertiary-foreground shadow-rim-filled'
                              : 'bg-tertiary-bg text-tertiary-deep shadow-rim',
                          )}
                        >
                          {formatDate(p.dateRDV)}
                        </span>
                      ) : (
                        <span className="font-normal text-ink-4">—</span>
                      )}
                      {p.id === nextPlanId && <Badge variant="time">{t('Prochain')}</Badge>}
                    </dd>
                  </div>
                  <div className="min-w-0 max-md:min-h-[44px]">
                    <dt className="t-label">{t('Zone')}</dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-ink">{p.zone || <span className="font-normal text-ink-4">—</span>}</dd>
                  </div>
                  <div className="min-w-0 max-md:min-h-[44px]">
                    <dt className="t-label">{t('Adresse')}</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink">
                      {p.adresse ? (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); e.preventDefault(); openMapsFor(p.adresse); }}
                          title={p.adresse}
                          className="block max-w-full truncate text-left text-primary underline-offset-4 hover:underline max-md:whitespace-normal max-md:overflow-visible"
                        >
                          {p.adresse}
                        </button>
                      ) : (
                        <span className="font-normal text-ink-4">—</span>
                      )}
                    </dd>
                  </div>
                  <div className="min-w-0 max-md:min-h-[44px]">
                    <dt className="t-label">{t('Téléphone')}</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink">{phoneValue}</dd>
                  </div>
                </dl>
              ))}
            </div>
          )}
        </div>
        {/* Zone of the active mission's first planification — sits on the
            right of the title row, independent of the rest (neutral chip §11). */}
        {filteredPlans[0]?.zone && (
          <Badge variant="neutral" className="mt-1 shrink-0 gap-1 max-md:hidden">
            <MapPin className="h-3 w-3" aria-hidden />
            {filteredPlans[0].zone}
          </Badge>
        )}
      </div>

      {/* PHONE (3): the PHOTO SECTION IS THE BODY (E10) — segmented phase,
          « 12/40 » counter, two explicit capture affordances, 3-column grid.
          No toggle card in front of it: the agent came here to shoot. */}
      {isPhone && (
        <section aria-label={`${t('Photos')} — ${t(activeTab)}`} data-tour="atgd-photos-toggle">
          {/* Phase segments — 40 px, equal width, preselected from ?mission=. */}
          <div role="tablist" aria-label={t('Phase de la mission')} className="mb-3 grid grid-cols-3 gap-1 rounded-lg bg-surface-2 p-1">
            {MISSION_TABS.map((tab) => {
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tab.id as 'Avant' | 'En cours' | 'Après')}
                  className={cn(
                    'h-10 rounded-md text-[13px] font-medium transition-colors',
                    selected ? 'bg-card text-ink shadow-rim' : 'text-ink-3',
                  )}
                >
                  {t(tab.label)}
                </button>
              );
            })}
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2" data-tour="atgd-photo-actions">
            <span className="t-caption tabular-nums">
              {filteredPhotos.length}/{photoCap} {t('photos')}
            </span>
            {canEdit && (
              <div className="flex items-center gap-2">
                {/* « Importer » — NO `capture` attribute, so the OS sheet still
                    offers the gallery (MDN: with `capture` the camera REPLACES
                    the file picker). The camera has its own button and its own
                    in-app screen; one input can never be both. */}
                <Button
                  variant="ghost"
                  className="h-11 gap-2 px-3 text-[14px]"
                  disabled={isUploading}
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {t('Importer')}
                </Button>
                {isATG && (
                  <Button
                    variant={propositionReforme ? 'tonal' : 'outline'}
                    aria-pressed={propositionReforme}
                    className="h-11 px-3 text-[14px]"
                    disabled={!dossierRef}
                    onClick={togglePropositionReforme}
                  >
                    {propositionReforme ? t('Annuler la réforme') : t('Réforme')}
                  </Button>
                )}
              </div>
            )}
          </div>

          {filteredPhotos.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-hairline-strong py-12 text-center">
              <Camera className="h-10 w-10 text-ink-4" aria-hidden />
              <p className="t-body-sm font-medium text-ink-2">
                {`${t('Aucune photo')} ${t(activeTab).toLowerCase()}`}
              </p>
              <p className="t-caption">{t('Utilisez « Prendre des photos » en bas de l’écran.')}</p>
            </div>
          ) : (
            <PhotoGrid photos={filteredPhotos} onOpen={(photo) => setPreviewPhoto(photo)} />
          )}
        </section>
      )}

      {/* Observations section — scoped to the AT's current mission tab. The
          panel auto-tags new obs with phaseATG=activeTab (round 8 Q-3 → A)
          and only shows obs (or legacy un-tagged AT/dossiers obs) for that
          phase. On a phone it moves BELOW the photo body (E10) and stays a
          collapsed disclosure row. */}
      {!isPhone && (
        <div data-tour="atgd-observations">
          <ObservationsTab
            dossierId={dossierId}
            section="assignations-atg"
            variant="collapsible"
            contextPhase={activeTab as 'Avant' | 'En cours' | 'Après'}
          />
        </div>
      )}

      {/* Photos & Documents toggle row — selectable tiles (Carbon tile ✓
          "single-select tiles when the user can only select one tile from a
          tile group", states enabled / hover / selected / focus, no drop
          shadow, "do not mix tile variants in groups"; NN/g accordions ✓
          heading AND icon both toggle). Padding 16, rim, selected = 2 px
          `primary` ring, count as a neutral pill (§11). */}
      {!isPhone && (
      <div className="grid grid-cols-2 gap-4" role="group" aria-label={t('Photos ou documents')}>
        <button
          type="button"
          data-tour="atgd-photos-toggle"
          onClick={() => { setIsPhotosOpen((v) => !v); setIsDocsOpen(false); }}
          aria-expanded={isPhotosOpen}
          aria-controls="atg-photos-panel"
          className={cn(
            'flex items-center gap-3 rounded-xl bg-card p-4 text-left shadow-rim transition-[color,background-color,box-shadow] duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isPhotosOpen && 'ring-2 ring-primary',
          )}
        >
          <ImageIcon className={cn('h-5 w-5 shrink-0', isPhotosOpen ? 'text-ink' : 'text-ink-3')} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{t('Photos')}</span>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">{photos.length}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform', isPhotosOpen ? 'rotate-180' : 'rotate-0')} aria-hidden />
        </button>

        <button
          type="button"
          data-tour="atgd-docs-toggle"
          onClick={() => { setIsDocsOpen((v) => !v); setIsPhotosOpen(false); }}
          aria-expanded={isDocsOpen}
          aria-controls="atg-documents-panel"
          className={cn(
            'flex items-center gap-3 rounded-xl bg-card p-4 text-left shadow-rim transition-[color,background-color,box-shadow] duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            isDocsOpen && 'ring-2 ring-primary',
          )}
        >
          <FileText className={cn('h-5 w-5 shrink-0', isDocsOpen ? 'text-ink' : 'text-ink-3')} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{t('Documents')}</span>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">{documents.length}</span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform', isDocsOpen ? 'rotate-180' : 'rotate-0')} aria-hidden />
        </button>
      </div>
      )}

      {/* Photos panel (revealed when toggled) — desktop only; the phone body
          above already IS the photo section. */}
      {!isPhone && isPhotosOpen && (
        // Content card (element-specs §5: Material 3 cards ✓ container only,
        // padding 24, 16 between blocks; toolbar at the top with the page's ONE
        // `default` button at the right end — §8 GOV.UK "one default button").
        <Card id="atg-photos-panel" role="region" aria-label={`${t('Photos')} — ${t(activeTab)}`}>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {/* The page's ONE neutral IconChip (addendum 1b) beside the title of
                    the section that anchors the AT's job here — taking photos. */}
                <IconChip>
                  <ImageIcon />
                </IconChip>
                <h3 className="t-heading">{t('Photos')} — {t(activeTab)}</h3>
                {/* Cap counter as a caption (§6: figures in Inter, tabular in a caption). */}
                <span className="t-caption tabular-nums">{filteredPhotos.length}/{photoCap} {t('photos')}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end" data-tour="atgd-photo-actions">
                {/* Proposition réforme (item 021). AT-only toggle; lifts photo cap
                    from 30 to 60 per section. Reversible → `outline` when off,
                    `tonal` (pressed) when on — never `destructive` (§8 GOV.UK:
                    warning buttons only for irreversible destruction). */}
                {isATG && (
                  <Button
                    data-tour="atgd-reforme"
                    variant={propositionReforme ? 'tonal' : 'outline'}
                    aria-pressed={propositionReforme}
                    disabled={!dossierRef}
                    onClick={togglePropositionReforme}
                  >
                    {propositionReforme ? t('Annuler la réforme proposée') : t('Proposer une réforme')}
                  </Button>
                )}
                {/* Demo/tutorial brand: gallery import next to the camera — the
                    guided tour (and desktop prospects) have no camera to talk to. */}
                {canEdit && tutorialMode && (
                  <>
                    <Button
                      data-tour="atgd-import"
                      variant="outline"
                      disabled={isUploading}
                      onClick={() => galleryInputRef.current?.click()}
                    >
                      <Upload />
                      {t('Importer des photos')}
                    </Button>
                  </>
                )}
                {canEdit && (
                  <Button
                    data-tour="atgd-camera"
                    variant="default"
                    disabled={isUploading}
                    loading={isUploading}
                    onClick={() => setIsCameraOpen(true)}
                  >
                    {!isUploading && <Camera />}
                    {cameraLabel}
                  </Button>
                )}
              </div>
            </div>

            {filteredPhotos.length === 0 ? (
              // Empty state (§12: NN/g ✓ state + reason + pathway; the pathway is
              // the toolbar primary above, so no second button here).
              <EmptyState
                icon={<ImageIcon />}
                title={`${t('Aucune photo')} ${t(activeTab).toLowerCase()} ${t('pour le moment')}`}
                description={t('Utilisez « Prendre des photos » pour capturer la première.')}
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
                  `${format(day, 'd MMMM yyyy', { locale: dateFnsLocale() })} — ${count} ${count > 1 ? t('photos') : t('photo')}`
                }
                renderItem={(photo) => (
                  // Photo tile (element-specs §21: filled socket = raised tile,
                  // radius 10 inside the 12 px paper, hover-revealed actions —
                  // always visible on touch, where there is no hover). Solid
                  // scrim for the filename (no gradients).
                  <div className="group relative aspect-square overflow-hidden rounded-[10px] bg-card shadow-card dark:ring-1 dark:ring-hairline">
                    <button
                      type="button"
                      onClick={() => setPreviewPhoto(photo)}
                      aria-label={`${t('Agrandir')} ${photo.name}`}
                      className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-ink-solid/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        <Eye className="h-5 w-5 text-on-ink" aria-hidden />
                      </span>
                    </button>
                    {canDeletePhoto(photo) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1 z-10 h-8 w-8 bg-card/90 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-visible:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(t('Supprimer cette photo ?'))) handleDeletePhoto(photo);
                        }}
                        disabled={isDeletingPhoto === photo.id}
                        aria-label={t('Supprimer la photo')}
                      >
                        {isDeletingPhoto === photo.id
                          ? <Loader2 className="animate-spin" />
                          : <Trash2 />}
                      </Button>
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-ink-solid/60 p-1.5">
                      <p className="truncate text-[11px] text-on-ink">{photo.name}</p>
                    </div>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* PHONE (4): « Documents » as a 48 px disclosure row with a count —
          uploads are rare for the AT, so the section stays folded (E10). */}
      {isPhone && (
        <button
          type="button"
          data-tour="atgd-docs-toggle"
          onClick={() => setIsDocsOpen((v) => !v)}
          aria-expanded={isDocsOpen}
          aria-controls="atg-documents-panel"
          className="flex min-h-[48px] w-full items-center gap-3 rounded-lg bg-card px-4 text-left shadow-rim"
        >
          <FileText className="h-5 w-5 shrink-0 text-ink-3" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{t('Documents')}</span>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2">
            {documents.length}
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-ink-3 transition-transform', isDocsOpen ? 'rotate-180' : 'rotate-0')} aria-hidden />
        </button>
      )}

      {/* Documents panel (revealed when toggled) */}
      {isDocsOpen && (
        <Card id="atg-documents-panel" data-tour="atgd-docs" role="region" aria-label={t('Pièces jointes')}>
          <CardContent className={cn('space-y-4 p-6', isPhone && 'p-4')}>
            <h3 className="t-heading">{t('Pièces jointes')}</h3>
            {/* Document sockets — shared component (§21), untouched. */}
            <TypedDocumentsGrid
              dossierId={dossierId}
              hideCardinalPlus
              hideExtraSlotPlus
              hideAccordSlots
              showBaseGarageSlots
              hideReformeSlots
            />
          </CardContent>
        </Card>
      )}

      {/* PHONE (5): « Observations » — same collapsible panel, moved under the
          photo body and the documents row (E10). */}
      {isPhone && (
        <div id="atg-observations" data-tour="atgd-observations">
          <ObservationsTab
            dossierId={dossierId}
            section="assignations-atg"
            variant="collapsible"
            contextPhase={activeTab as 'Avant' | 'En cours' | 'Après'}
          />
        </div>
      )}

      {/* PHONE preview (E8): the shared full-screen lightbox — pinch zoom,
          swipe across the section's photos, Supprimer in the header « ⋯ ».
          Replaces the 60 vh dialog, which the research rules out on a phone. */}
      {isPhone && previewPhoto && (() => {
        const toDoc = (p: Photo) => ({ url: p.url, nom: p.name });
        return (
          <DocumentPreviewLightbox
            doc={toDoc(previewPhoto)}
            pages={filteredPhotos.map(toDoc)}
            onPageChange={(d) => {
              const next = filteredPhotos.find((p) => p.url === d.url);
              if (next) setPreviewPhoto(next);
            }}
            onClose={() => setPreviewPhoto(null)}
            actions={
              canDeletePhoto(previewPhoto)
                ? [
                    {
                      key: 'delete',
                      label: t('Supprimer'),
                      destructive: true,
                      onSelect: () => {
                        if (!window.confirm(t('Supprimer cette photo ?'))) return;
                        const target = previewPhoto;
                        setPreviewPhoto(null);
                        void handleDeletePhoto(target);
                      },
                    },
                  ]
                : undefined
            }
          />
        );
      })()}

      {/* Photo preview dialog (element-specs §13: Material 3 dialogs ✓ one
          focused thing; the glass panel + scrim come from the primitive,
          bottom sheet below lg). Title is visually hidden but announced. */}
      {!isPhone && previewPhoto && (
        <Dialog open onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="flex h-[calc(60vh/var(--app-zoom))] flex-col p-0 lg:max-w-2xl">
            <DialogTitle className="sr-only">{previewPhoto.name}</DialogTitle>
            <div className="flex flex-1 items-center justify-center overflow-hidden bg-ink-solid">
              <img src={previewPhoto.url} className="max-h-full max-w-full object-contain" alt={previewPhoto.name} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Preuve preview dialog */}
      {previewPreuvePhotos && (
        <Dialog open onOpenChange={() => setPreviewPreuvePhotos(null)}>
          <DialogContent className="flex h-[calc(60vh/var(--app-zoom))] flex-col p-0 lg:max-w-2xl">
            <DialogTitle className="sr-only">{t('Photos de preuve')}</DialogTitle>
            <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-ink-solid">
              <img
                src={previewPreuvePhotos.urls[previewPreuvePhotos.index]}
                className="max-h-full max-w-full object-contain"
                alt={`${t('Preuve')} ${previewPreuvePhotos.index + 1}`}
              />
            </div>
            {previewPreuvePhotos.urls.length > 1 && (
              <div className="flex items-center justify-center gap-2 border-t border-hairline bg-background p-3">
                {previewPreuvePhotos.urls.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPreviewPreuvePhotos({ ...previewPreuvePhotos, index: idx })}
                    aria-label={`${t('Preuve')} ${idx + 1}`}
                    aria-current={idx === previewPreuvePhotos.index}
                    className={cn(
                      'h-14 w-14 overflow-hidden rounded-md transition-opacity',
                      idx === previewPreuvePhotos.index ? 'ring-2 ring-ring' : 'shadow-rim opacity-60 hover:opacity-100'
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

      {/* « Importer » target — ONE input, no `capture` attribute, so the OS
          sheet keeps offering the gallery and the files app (MDN). Shared by
          the phone body and the desktop demo button. */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          if (files.length > 0) void handleUploadFiles(files);
          e.target.value = '';
        }}
      />

      {/* PHONE: the ONE primary of the page, in the thumb zone. It replaces
          the navigation bar (E4) and states the cap instead of hiding it. */}
      {isPhone && canEdit && (
        <BottomActionBar
          primary={{
            // The label never changes (the action is still what it is); the
            // caption below carries the reason it is closed (E4 — a disabled
            // primary must say WHY, not rename itself).
            label: t('Prendre des photos'),
            icon: <Camera />,
            onClick: () => setIsCameraOpen(true),
            disabled: atPhotoCap || isUploading,
            loading: isUploading,
            dataTour: 'atgd-camera',
          }}
          secondary={[
            ...(assureTelephoneHref
              ? [{ label: t('Appeler'), icon: <Phone />, href: `tel:${assureTelephoneHref}` }]
              : []),
            ...(filteredPlans[0]?.adresse
              ? [{
                  label: t('Itinéraire'),
                  icon: <Navigation />,
                  href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(filteredPlans[0].adresse)}`,
                  external: true,
                }]
              : []),
          ]}
          caption={atPhotoCap ? `${t('Photos complètes')} (${filteredPhotos.length}/${photoCap})` : undefined}
        />
      )}
    </div>
  );
}
