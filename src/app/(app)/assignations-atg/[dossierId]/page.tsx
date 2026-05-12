'use client';

import React, { use, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc, collection, query, orderBy, onSnapshot, updateDoc, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes, deleteObject } from 'firebase/storage';
import { useFirestore, useStorage, useAuth, useDoc, useCollection } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Loader2, Calendar, MapPin, Upload, Eye, Check, X, Pencil, ImageIcon, Camera, Paperclip, FileText,
  ChevronDown, ChevronRight, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { logHistorique, logWorkflow } from '../../dossiers/[id]/log-historique';
import { addObservation } from '../../dossiers/[id]/log-observation';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useIsMobile } from '@/hooks/use-mobile';
import ObservationsTab from '@/components/observations-tab';
import CameraCapture from '@/components/camera-capture';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import { MAX_PHOTOS_PER_SECTION, MAX_PHOTOS_WITH_REFORME } from '@/app/(app)/dossiers/[id]/photos-tab';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
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

export default function ATGDossierDetailPage({ params }: { params: Promise<{ dossierId: string }> }) {
  const { dossierId } = use(params);
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const { toast } = useToast();
  const { canWrite, canDelete, profile } = useCurrentUser();
  const isMobile = useIsMobile();
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

  const [activeTab, setActiveTab] = useState('Avant');
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
  // Section toggles
  const [isPhotosOpen, setIsPhotosOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);
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
      for (const file of files) {
        const timestamp = Date.now();
        const storagePath = `dossiers/${dossierId}/photos/${categoryAtUpload}/${timestamp}_${file.name}`;
        await uploadFileWithOfflineSupport({
          storage,
          db,
          file,
          fileName: file.name,
          storagePath,
          firestoreDocPath: `dossiers/${dossierId}/photos`,
          firestoreMetadata: {
            name: file.name,
            category: categoryAtUpload,
            uploadedAt: serverTimestamp(),
            uploadedBy: userEmail,
            storagePath,
          },
        });
        await logHistorique(db, dossierId, 'Upload photo Agent de Terrain', userEmail, `Photo "${file.name}" uploadée (${categoryAtUpload}).`, 'photo', profile?.nom);
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

  if (dossierLoading || plansLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg animate-pulse bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="h-12 w-full animate-pulse rounded bg-muted" />
        <div className="h-64 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div>
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 border-b bg-card">
          <Link
            href="/assignations-atg"
            className="inline-flex items-center justify-center h-9 w-9 -ml-2 rounded-md hover:bg-accent"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate">
              {dossier?.refExpert || dossierId}
            </h1>
            {assureNom && (
              <p className="text-xs text-muted-foreground truncate">{assureNom}</p>
            )}
          </div>
        </header>
        {(dossier?.compagnie || dossier?.expertRank) && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 py-3 border-b">
            {dossier?.compagnie && (
              <Badge variant="outline" className="whitespace-nowrap">
                {dossier.compagnie}
              </Badge>
            )}
            {dossier?.expertRank && (
              <Badge variant="outline" className="whitespace-nowrap">
                {dossier.expertRank}
              </Badge>
            )}
          </div>
        )}
        <div className="sticky top-14 z-20 grid grid-cols-3 gap-1 p-1 border-b bg-card">
          {MISSION_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center justify-center h-11 rounded-md text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {filteredPlans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Calendar className="h-8 w-8 mb-2 opacity-20" />
            <p className="text-sm">Aucune planification {activeTab.toLowerCase()} pour ce dossier.</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredPlans.map((p: any) => {
              const itineraireHref = p.adresse
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    [p.zone, p.adresse].filter(Boolean).join(' '),
                  )}`
                : null;
              return (
                <div key={p.id} className="bg-card border rounded-xl p-4 shadow-sm space-y-2">
                  <div className="text-base font-semibold">
                    {formatDate(p.dateRDV)}
                  </div>
                  {p.zone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span>{p.zone}</span>
                    </div>
                  )}
                  {p.adresse && (
                    <div className="text-sm flex items-start justify-between gap-3">
                      <span className="flex-1 break-words">{p.adresse}</span>
                      {itineraireHref && (
                        <a
                          href={itineraireHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary text-xs underline-offset-2 hover:underline whitespace-nowrap shrink-0"
                        >
                          Itinéraire
                        </a>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] italic text-muted-foreground pt-1 border-t border-dashed">
                    Observation et preuves — à venir
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/assignations-atg"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{dossier?.refExpert || dossierId}</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
            {assureNom && <span>{assureNom}</span>}
            {dossier?.compagnie && <span> — {dossier.compagnie}</span>}
            {dossier?.expertRank && (
              <Badge variant="outline" className="ml-2 text-[10px]">{dossier.expertRank}</Badge>
            )}
          </div>
        </div>
        {/* Proposition réforme (item 021). AT-only toggle; lifts photo cap
            from 30 to 60 per section. Does NOT change dossier statut. */}
        {isATG && (
          <Button
            variant={(dossier as any)?.propositionReforme ? 'destructive' : 'outline'}
            size="sm"
            disabled={!dossierRef}
            onClick={async () => {
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
            }}
          >
            {(dossier as any)?.propositionReforme ? 'Réforme proposée — annuler' : 'Proposition réforme'}
          </Button>
        )}
      </div>

      {/* Mission type tabs */}
      <div className="bg-card border rounded-xl shadow-sm sticky top-0 z-20">
        <div className="flex overflow-x-auto no-scrollbar">
          {MISSION_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {tab.label}
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className="text-[10px] font-mono ml-1 h-5 min-w-[20px] justify-center"
                >
                  {countByType[tab.id] || 0}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Planification table */}
      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {filteredPlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Calendar className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">Aucune planification {activeTab.toLowerCase()} pour ce dossier.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-bold text-xs">Date & Heure RDV</TableHead>
                  <TableHead className="font-bold text-xs">Zone</TableHead>
                  <TableHead className="font-bold text-xs">Adresse</TableHead>
                  <TableHead className="font-bold text-xs min-w-[200px]">Observation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map((p: any) => (
                  <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="text-xs font-medium whitespace-nowrap">{formatDate(p.dateRDV)}</TableCell>
                    <TableCell>
                      {p.zone ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" /> {p.zone}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-xs">{p.adresse || '-'}</TableCell>
                    <TableCell className="text-xs">
                      {editingPlanId === p.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Select
                              value={editObservation}
                              onValueChange={(v) => setEditObservation(v)}
                              disabled={observationPresetsLoading || activeObservationPresets.length === 0}
                            >
                              <SelectTrigger className="flex-1 h-8 text-xs">
                                <SelectValue
                                  placeholder={
                                    observationPresetsLoading
                                      ? 'Chargement…'
                                      : activeObservationPresets.length === 0
                                        ? 'Aucune observation disponible'
                                        : "Saisir l'observation..."
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {activeObservationPresets.map((opt) => (
                                  <SelectItem key={opt.id} value={opt.label}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <OptionsManagerModal
                              collectionName="options_observations"
                              title="Observations"
                              defaultValues={['Assuré injoignable', "Véhicule hors ville d'expertise", 'Autre']}
                            />
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleSaveObservation(p.id)}>
                              <Check className="h-3 w-3" /> Enregistrer
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEditingPlanId(null)}>
                              <X className="h-3 w-3" /> Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1 group">
                          <div className="flex-1">
                            <span className="text-muted-foreground">{p.observation || '-'}</span>
                            {p.observationUpdatedAt && (
                              <span className="block text-[10px] text-amber-600 mt-0.5">
                                MAJ {p.observationSource === 'ATG' ? 'Agent de Terrain' : p.observationSource === 'Gestionnaire' ? 'Gestionnaire' : ''}{p.observationUpdatedBy ? ` (${p.observationUpdatedBy})` : ''} — {formatDate(p.observationUpdatedAt)}
                              </span>
                            )}
                          </div>
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                              onClick={() => {
                                setEditingPlanId(p.id);
                                setEditObservation(p.observation || '');
                              }}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Preuve section */}
                      <div className="mt-2 pt-2 border-t border-dashed">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Paperclip className="h-3 w-3" /> Preuve
                          </span>
                          {canEdit && (
                            <div>
                              <input
                                ref={(el) => { preuveInputRefs.current[p.id] = el; }}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(e) => e.target.files && handleUploadPreuve(p.id, e.target.files)}
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-[10px] gap-1 px-2"
                                disabled={uploadingPreuveId === p.id}
                                onClick={() => preuveInputRefs.current[p.id]?.click()}
                              >
                                {uploadingPreuveId === p.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <><Upload className="h-3 w-3" /> Ajouter</>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                        {p.preuvePhotos && p.preuvePhotos.length > 0 ? (
                          <div className="flex gap-1.5 flex-wrap">
                            {p.preuvePhotos.map((url: string, idx: number) => {
                              const key = `${p.id}:${idx}`;
                              return (
                                <div
                                  key={idx}
                                  className="relative w-12 h-12 rounded border overflow-hidden cursor-pointer group/preuve"
                                  onClick={() => setPreviewPreuvePhotos({ urls: p.preuvePhotos, index: idx })}
                                >
                                  <img src={url} alt={`Preuve ${idx + 1}`} className="object-cover w-full h-full" />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/preuve:opacity-100 transition-opacity flex items-center justify-center">
                                    <Eye className="h-3 w-3 text-white" />
                                  </div>
                                  {(canDelete || (isATG && canEdit)) && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleDeletePreuvePhoto(p.id, url, idx); }}
                                      disabled={deletingPreuve === key}
                                      className="absolute top-0.5 right-0.5 bg-red-600/85 hover:bg-red-600 rounded-full p-0.5 z-10"
                                      aria-label="Supprimer la preuve"
                                    >
                                      {deletingPreuve === key
                                        ? <Loader2 className="h-2.5 w-2.5 text-white animate-spin" />
                                        : <Trash2 className="h-2.5 w-2.5 text-white" />}
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-[10px] text-muted-foreground italic">Aucune preuve jointe</p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Photos & Documents toggle row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Photos toggle */}
        <button
          onClick={() => setIsPhotosOpen(!isPhotosOpen)}
          className={cn(
            'flex items-center gap-3 px-5 py-4 rounded-xl border shadow-sm transition-all text-left',
            isPhotosOpen
              ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
              : 'bg-card hover:bg-muted/50'
          )}
        >
          {isPhotosOpen ? <ChevronDown className="h-5 w-5 text-primary shrink-0" /> : <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
          <ImageIcon className={cn('h-5 w-5 shrink-0', isPhotosOpen ? 'text-primary' : 'text-muted-foreground')} />
          <div className="flex-1">
            <span className={cn('text-sm font-bold', isPhotosOpen && 'text-primary')}>Photos</span>
            <Badge variant="secondary" className="text-[10px] font-mono ml-2">{photos.length}</Badge>
          </div>
        </button>

        {/* Documents toggle */}
        <button
          onClick={() => setIsDocsOpen(!isDocsOpen)}
          className={cn(
            'flex items-center gap-3 px-5 py-4 rounded-xl border shadow-sm transition-all text-left',
            isDocsOpen
              ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
              : 'bg-card hover:bg-muted/50'
          )}
        >
          {isDocsOpen ? <ChevronDown className="h-5 w-5 text-primary shrink-0" /> : <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />}
          <FileText className={cn('h-5 w-5 shrink-0', isDocsOpen ? 'text-primary' : 'text-muted-foreground')} />
          <div className="flex-1">
            <span className={cn('text-sm font-bold', isDocsOpen && 'text-primary')}>Documents</span>
            <Badge variant="secondary" className="text-[10px] font-mono ml-2">{documents.length}</Badge>
          </div>
        </button>
      </div>

      {/* Photos section (revealed when toggled) */}
      {isPhotosOpen && (
        <>
          {/* Photo upload section */}
          <Card className="shadow-sm">
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  Photos — {activeTab}
                  <Badge variant="secondary" className="text-[10px] font-mono">{filteredPhotos.length}/{photoCap}</Badge>
                </h3>
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={isUploading}
                    onClick={() => setIsCameraOpen(true)}
                  >
                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                    {isUploading ? 'Upload en cours...' : 'Prendre des photos'}
                  </Button>
                )}
              </div>

              {filteredPhotos.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Aucune photo {activeTab.toLowerCase()} pour le moment.</p>
                  <p className="text-xs mt-1">Utilisez le bouton &quot;Prendre une photo&quot; pour capturer.</p>
                </div>
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
                    <div
                      className="group relative aspect-square rounded-lg overflow-hidden border bg-muted cursor-pointer"
                      onClick={() => setPreviewPhoto(photo)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        loading="lazy"
                        decoding="async"
                        className="object-cover w-full h-full"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      {canDeletePhoto(photo) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm('Supprimer cette photo ?')) handleDeletePhoto(photo);
                          }}
                          disabled={isDeletingPhoto === photo.id}
                          className="absolute top-1 right-1 bg-red-600/85 hover:bg-red-600 rounded-full p-1 z-10 shadow"
                          aria-label="Supprimer la photo"
                        >
                          {isDeletingPhoto === photo.id
                            ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                            : <Trash2 className="h-3 w-3 text-white" />}
                        </button>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                        <p className="text-[10px] text-white truncate">{photo.name}</p>
                      </div>
                    </div>
                  )}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Documents section (revealed when toggled) */}
      {isDocsOpen && (
        <Card className="shadow-sm">
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Pieces jointes
              </h3>
            </div>

            <TypedDocumentsGrid dossierId={dossierId} hideCardinalPlus hideExtraSlotPlus />
          </CardContent>
        </Card>
      )}

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

      {/* Photo preview dialog */}
      {previewPhoto && (
        <Dialog open onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-2xl h-[60vh] flex flex-col p-0">
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              <img src={previewPhoto.url} className="max-w-full max-h-full object-contain" alt={previewPhoto.name} />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Preuve preview dialog */}
      {previewPreuvePhotos && (
        <Dialog open onOpenChange={() => setPreviewPreuvePhotos(null)}>
          <DialogContent className="max-w-2xl h-[60vh] flex flex-col p-0">
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center relative">
              <img
                src={previewPreuvePhotos.urls[previewPreuvePhotos.index]}
                className="max-w-full max-h-full object-contain"
                alt={`Preuve ${previewPreuvePhotos.index + 1}`}
              />
            </div>
            {previewPreuvePhotos.urls.length > 1 && (
              <div className="flex items-center justify-center gap-2 p-3 bg-background border-t">
                {previewPreuvePhotos.urls.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPreviewPreuvePhotos({ ...previewPreuvePhotos, index: idx })}
                    className={cn(
                      "w-14 h-14 rounded border-2 overflow-hidden transition-all",
                      idx === previewPreuvePhotos.index ? "border-primary ring-2 ring-primary/30" : "border-muted opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={url} className="object-cover w-full h-full" alt="" />
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Camera capture */}
      <CameraCapture
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onConfirm={handleCameraConfirm}
      />
    </div>
  );
}
