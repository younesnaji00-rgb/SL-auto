'use client';

import React, { use, useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc, collection, query, orderBy, onSnapshot, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { useFirestore, useStorage, useAuth, useDoc, useCollection } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import {
  ArrowLeft, Loader2, Calendar, MapPin, Upload, Eye, Check, X, Pencil, ImageIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { uploadFileWithOfflineSupport } from '@/lib/offline/upload-file';
import { logHistorique } from '../../dossiers/[id]/log-historique';
import Link from 'next/link';

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

  const [activeTab, setActiveTab] = useState('Avant');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editObservation, setEditObservation] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dossier data
  const dossierRef = useMemo(() => (db ? doc(db, 'dossiers', dossierId) : null), [db, dossierId]);
  const { data: dossier, loading: dossierLoading } = useDoc(dossierRef);

  // Planifications
  const plansQuery = useMemo(
    () => db ? query(collection(db, 'dossiers', dossierId, 'planifications'), orderBy('createdAt', 'desc')) : null,
    [db, dossierId]
  );
  const { data: plans, loading: plansLoading } = useCollection<any>(plansQuery);

  // Photos listener
  useEffect(() => {
    if (!db) return;
    const unsub = onSnapshot(collection(db, 'dossiers', dossierId, 'photos'), (snap) => {
      const items: Photo[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Photo));
      setPhotos(items);
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
        observationUpdatedBy: userEmail,
      });
      await logHistorique(db, dossierId, 'Observation ATG mise à jour', userEmail, `Observation mise à jour pour la planification.`, 'planification');
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
      toast({ title: 'Photos uploadées avec succès' });
    } catch {
      toast({ variant: 'destructive', title: "Erreur lors de l'upload" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
                                MAJ: {formatDate(p.observationUpdatedAt)}
                              </span>
                            )}
                          </div>
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
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Photo upload section */}
      <Card className="shadow-sm">
        <CardContent className="pt-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-muted-foreground" />
              Photos — {activeTab}
              <Badge variant="secondary" className="text-[10px] font-mono">{filteredPhotos.length}</Badge>
            </h3>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleUpload(e.target.files)}
              />
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Ajouter des photos
              </Button>
            </div>
          </div>

          {filteredPhotos.length === 0 ? (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
              <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Aucune photo {activeTab.toLowerCase()} pour le moment.</p>
              <p className="text-xs mt-1">Cliquez sur "Ajouter des photos" pour uploader.</p>
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

      {/* Photo preview dialog */}
      {previewPhoto && (
        <Dialog open onOpenChange={() => setPreviewPhoto(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              <img src={previewPhoto.url} className="max-w-full max-h-full object-contain" alt={previewPhoto.name} />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
