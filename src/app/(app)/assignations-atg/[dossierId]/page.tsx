'use client';

import React, { use, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc, collection, query, orderBy, onSnapshot, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { useFirestore, useStorage, useAuth, useDoc, useCollection } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
  ArrowLeft, Loader2, Calendar, MapPin, Upload, Eye, Check, X, Pencil, ImageIcon, Camera, Paperclip, GitBranch, FileText,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { logHistorique, logWorkflow } from '../../dossiers/[id]/log-historique';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';
import ModalDecisionStatus from '../../dossiers/[id]/modal-decision-status';
import { DOCUMENT_TYPES as defaultDocTypes } from '@/lib/constants';
import { useOptions } from '@/hooks/use-options';

type PhotoCategory = 'avant' | 'en_cours' | 'apres';

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
  const { canWrite, profile } = useCurrentUser();
  const canEdit = canWrite('assignations-atg');

  const [activeTab, setActiveTab] = useState('Avant');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editObservation, setEditObservation] = useState('');
  const [uploadingPreuveId, setUploadingPreuveId] = useState<string | null>(null);
  const [previewPreuvePhotos, setPreviewPreuvePhotos] = useState<{ urls: string[]; index: number } | null>(null);
  const [isDecisionStatusOpen, setDecisionStatusOpen] = useState(false);
  // Document upload state
  const [isDocUploading, setIsDocUploading] = useState(false);
  const [isDocUploadModalOpen, setDocUploadModalOpen] = useState(false);
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [docUploadType, setDocUploadType] = useState<string>('');
  const [documents, setDocuments] = useState<any[]>([]);
  // Section toggles
  const [isPhotosOpen, setIsPhotosOpen] = useState(false);
  const [isDocsOpen, setIsDocsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const preuveInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const docCameraInputRef = useRef<HTMLInputElement>(null);

  // Dossier data
  const dossierRef = useMemo(() => (db ? doc(db, 'dossiers', dossierId) : null), [db, dossierId]);
  const { data: dossier, loading: dossierLoading } = useDoc(dossierRef);

  // Planifications
  const plansQuery = useMemo(
    () => db ? query(collection(db, 'dossiers', dossierId, 'planifications'), orderBy('createdAt', 'desc')) : null,
    [db, dossierId]
  );
  const { data: plans, loading: plansLoading } = useCollection<any>(plansQuery);

  // Document types
  const { options: dbDocTypes } = useOptions('options_types_documents', [...defaultDocTypes]);
  const docTypes = useMemo(() => dbDocTypes.length > 0 ? dbDocTypes : defaultDocTypes.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbDocTypes]);

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

  const userEmail = auth?.currentUser?.email || 'ATG';

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
      await logHistorique(db, dossierId, 'Observation ATG mise à jour', userEmail, `Observation mise à jour pour la planification.`, 'planification');
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'ATG : remarque ajoutée', userEmail, userId, 'done', { dossierRef: dossier?.refExpert || dossierId, details: `Observation mise à jour par ATG` });
      toast({ title: 'Observation enregistrée' });
      setEditingPlanId(null);
    } catch {
      toast({ variant: 'destructive', title: "Erreur lors de l'enregistrement" });
    }
  };

  // Upload photos
  const handleUpload = async (files: FileList) => {
    if (!db || !storage) return;
    setIsUploading(true);
    try {
      for (const file of Array.from(files)) {
        const timestamp = Date.now();
        const storagePath = `dossiers/${dossierId}/photos/${currentCategory}/${timestamp}_${file.name}`;
        await uploadFileWithOfflineSupport({
          storage,
          db,
          file,
          fileName: file.name,
          storagePath,
          firestoreDocPath: `dossiers/${dossierId}/photos`,
          firestoreMetadata: {
            name: file.name,
            category: currentCategory,
            uploadedAt: serverTimestamp(),
            uploadedBy: userEmail,
            storagePath,
          },
        });
        await logHistorique(db, dossierId, 'Upload photo ATG', userEmail, `Photo "${file.name}" uploadée (${currentCategory}).`, 'photo');
      }
      const catLabel = currentCategory === 'avant' ? 'Avant' : currentCategory === 'en_cours' ? 'En cours' : 'Après';
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'ATG : photos ajoutées en planification', userEmail, userId, 'done', { dossierRef: dossier?.refExpert || dossierId, details: `Photos ${catLabel} ajoutées par ATG` });
      toast({ title: 'Photos uploadées avec succès' });
    } catch {
      toast({ variant: 'destructive', title: "Erreur lors de l'upload" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      await logHistorique(db, dossierId, 'Preuve ATG ajoutée', userEmail, `${newUrls.length} photo(s) de preuve ajoutée(s).`, 'planification');
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'ATG : preuve ajoutée', userEmail, userId, 'done', { dossierRef: dossier?.refExpert || dossierId, details: `${newUrls.length} photo(s) de preuve ajoutée(s) par ATG` });
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

  // Document file select (opens type-selection modal)
  const handleDocFileSelect = (file: File) => {
    setSelectedDocFile(file);
    // Keep docUploadType if pre-set from grid click, otherwise clear it
    if (!docUploadType) setDocUploadType('');
    setDocUploadModalOpen(true);
  };

  // Document upload handler
  const handleDocUpload = async () => {
    if (!selectedDocFile || !docUploadType || !db || !storage) return;
    setIsDocUploading(true);
    try {
      const timestamp = Date.now();
      const storagePath = `dossiers/${dossierId}/documents/${timestamp}_${selectedDocFile.name}`;
      await uploadFileWithOfflineSupport({
        storage,
        db,
        file: selectedDocFile,
        fileName: selectedDocFile.name,
        storagePath,
        firestoreDocPath: `dossiers/${dossierId}/documents`,
        firestoreMetadata: {
          nom: selectedDocFile.name,
          type: docUploadType,
          taille: selectedDocFile.size,
          uploadePar: userEmail,
          storagePath,
          _localCreatedAt: timestamp,
          uploadSource: 'ATG',
        },
      });
      await logHistorique(db, dossierId, 'Upload document ATG', userEmail, `Document "${selectedDocFile.name}" uploadé (type: ${docUploadType}).`, 'document');
      const userId = auth?.currentUser?.uid || 'unknown';
      await logWorkflow(db, dossierId, 'ATG : document ajouté', userEmail, userId, 'done', { dossierRef: dossier?.refExpert || dossierId, details: `Document "${selectedDocFile.name}" ajouté par ATG (${docUploadType})` });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/assignations-atg"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{dossier?.refExpert || dossierId}</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-1 flex-wrap">
            {assureNom && <span>{assureNom}</span>}
            {dossier?.compagnie && <span> — {dossier.compagnie}</span>}
            {dossier?.expertRank && (
              <Badge variant="outline" className="ml-2 text-[10px]">{dossier.expertRank}</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Action toolbar */}
      {canEdit && (
        <div className="bg-card border rounded-xl shadow-sm px-4 py-2 flex flex-wrap gap-2 items-center">
          <div className="flex-1" />
          <Button
            variant="default"
            size="sm"
            onClick={() => setDecisionStatusOpen(true)}
            className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700"
          >
            <GitBranch className="h-3.5 w-3.5" /> Décision de statut
          </Button>
        </div>
      )}

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
                          <Textarea
                            value={editObservation}
                            onChange={(e) => setEditObservation(e.target.value)}
                            rows={3}
                            className="text-xs"
                            placeholder="Saisir l'observation..."
                            autoFocus
                          />
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
                            {p.preuvePhotos.map((url: string, idx: number) => (
                              <div
                                key={idx}
                                className="relative w-12 h-12 rounded border overflow-hidden cursor-pointer group/preuve"
                                onClick={() => setPreviewPreuvePhotos({ urls: p.preuvePhotos, index: idx })}
                              >
                                <img src={url} alt={`Preuve ${idx + 1}`} className="object-cover w-full h-full" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/preuve:opacity-100 transition-opacity flex items-center justify-center">
                                  <Eye className="h-3 w-3 text-white" />
                                </div>
                              </div>
                            ))}
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
                  <Badge variant="secondary" className="text-[10px] font-mono">{filteredPhotos.length}</Badge>
                </h3>
                {canEdit && (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => e.target.files && handleUpload(e.target.files)}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      disabled={isUploading}
                      onClick={() => {
                        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                        if (!isMobile) {
                          toast({ variant: 'destructive', title: 'Appareil incompatible', description: 'Cette fonctionnalité nécessite un appareil mobile avec caméra.' });
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                    >
                      {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                      Prendre une photo
                    </Button>
                  </div>
                )}
              </div>

              {filteredPhotos.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Aucune photo {activeTab.toLowerCase()} pour le moment.</p>
                  <p className="text-xs mt-1">Utilisez le bouton &quot;Prendre une photo&quot; pour capturer.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredPhotos.map((photo) => (
                    <div
                      key={photo.id}
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
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                        <p className="text-[10px] text-white truncate">{photo.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
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

            {/* Hidden file inputs */}
            <input
              ref={docFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleDocFileSelect(e.target.files[0]);
                if (docFileInputRef.current) docFileInputRef.current.value = '';
              }}
            />
            <input
              ref={docCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleDocFileSelect(e.target.files[0]);
                if (docCameraInputRef.current) docCameraInputRef.current.value = '';
              }}
            />

            {/* Document type grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {docTypes.map((dt) => {
                const docsOfType = documents.filter((d: any) => d.type === dt.label);
                return (
                  <div key={dt.id} className="border rounded-xl p-4 bg-card space-y-3">
                    <h4 className="text-sm font-bold">{dt.label}</h4>

                    {/* Existing documents of this type */}
                    {docsOfType.length > 0 && (
                      <div className="space-y-1.5">
                        {docsOfType.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-2 p-1.5 rounded border bg-muted/30 text-xs">
                            <FileText className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span className="flex-1 truncate">{item.nom || item.name}</span>
                            {item.pendingUpload && (
                              <Badge variant="outline" className="text-amber-600 border-amber-300 text-[9px]">En attente</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload button */}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1.5 h-9 text-xs border-dashed"
                        onClick={() => {
                          setDocUploadType(dt.label);
                          docFileInputRef.current?.click();
                        }}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Ajouter
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document type selection modal */}
      <Dialog open={isDocUploadModalOpen} onOpenChange={(open) => { if (!open) { setDocUploadModalOpen(false); setSelectedDocFile(null); } }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Catégorie du document</DialogTitle>
            <DialogDescription>
              Fichier: <span className="font-semibold text-foreground">{selectedDocFile?.name}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type de document</Label>
              <Select value={docUploadType} onValueChange={setDocUploadType} disabled={isDocUploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {docTypes.map((type) => (
                    <SelectItem key={type.id} value={type.label}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isDocUploading && (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Envoi en cours...</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDocUploadModalOpen(false); setSelectedDocFile(null); }} disabled={isDocUploading}>
              Annuler
            </Button>
            <Button onClick={handleDocUpload} disabled={!selectedDocFile || !docUploadType || isDocUploading}>
              {isDocUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isDocUploading ? 'Transfert...' : 'Uploader'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Decision Status Modal */}
      <ModalDecisionStatus
        open={isDecisionStatusOpen}
        onOpenChange={setDecisionStatusOpen}
        dossierId={dossierId}
        currentStatus={dossier?.statut || 'Nouveau'}
        assureEmail={typeof dossier?.assure === 'object' ? (dossier?.assure?.email || '') : ''}
        assureNom={typeof dossier?.assure === 'object' ? (dossier?.assure?.nom || '') : (dossier?.assure || '')}
        dossierRef={dossier?.refExpert || dossierId}
      />
    </div>
  );
}
