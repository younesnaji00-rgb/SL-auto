'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc, onSnapshot, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { useFirestore, useStorage, useDoc } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, FileText, CheckCircle2, FileType,
  Trash2, Eye, PencilLine, ChevronDown, ChevronRight, ImageIcon,
  FileSignature, Receipt,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { DevisEditor } from '@/components/chiffreurs/devis-editor';

interface ChiffrageFileDoc {
  name: string;
  storagePath: string;
  type: 'photo' | 'rapport';
  docType?: string;
  category?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  pdfUrl: string | null;
  annotations?: any[];
}

interface ChiffrageDoc {
  id: string;
  dossierId: string;
  dossierNom: string;
  assignedChiffreurNom: string;
  status: string;
  files: ChiffrageFileDoc[];
}

type CreatorKind = 'devis' | 'facture';

export default function ChiffrageTab({ dossierId }: { dossierId: string }) {
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { profile, canDelete } = useCurrentUser();
  // Creator buttons (Devis / Facture) are only visible to Admin + Gestionnaire.
  // Task #5 fills in the full editor flow; Task #6 wires the save-to-pieces-jointes pipeline.
  const canCreateChiffrageDoc =
    profile?.role === 'Admin' || profile?.role === 'Gestionnaire';
  const [creatorKind, setCreatorKind] = useState<CreatorKind | null>(null);

  const dossierRef = useMemo(
    () => (db && dossierId ? doc(db, 'dossiers', dossierId) : null),
    [db, dossierId]
  );
  const { data: dossier, loading: dossierLoading } = useDoc(dossierRef);
  const chiffrageId = dossier?.currentChiffrageId;

  const [chiffrage, setChiffrage] = useState<ChiffrageDoc | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<Record<number, string>>({});
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [loadingChiffrage, setLoadingChiffrage] = useState(false);

  const fetchedPathsRef = useRef<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  // Group files by type
  const groupedFiles = useMemo(() => {
    if (!chiffrage?.files) return [];
    const groups: Record<string, { label: string; icon: 'photo' | 'doc'; files: { file: ChiffrageFileDoc; index: number }[] }> = {};
    chiffrage.files.forEach((file, i) => {
      let groupKey: string;
      let groupLabel: string;
      let icon: 'photo' | 'doc';
      if (file.type === 'photo') {
        const cat = file.category || 'avant';
        const catLabels: Record<string, string> = { avant: 'Photos - Avant', en_cours: 'Photos - En cours', apres: 'Photos - Après' };
        groupKey = `photo_${cat}`;
        groupLabel = catLabels[cat] || `Photos - ${cat}`;
        icon = 'photo';
      } else {
        groupKey = `doc_${file.docType || 'Autre'}`;
        groupLabel = file.docType || 'Documents - Autre';
        icon = 'doc';
      }
      if (!groups[groupKey]) groups[groupKey] = { label: groupLabel, icon, files: [] };
      groups[groupKey].files.push({ file, index: i });
    });
    // Expand all groups by default on first load
    if (expandedGroups.size === 1 && expandedGroups.has('all')) {
      const allKeys = Object.keys(groups);
      setExpandedGroups(new Set(allKeys));
    }
    return Object.entries(groups);
  }, [chiffrage?.files]);

  useEffect(() => {
    if (!db || !chiffrageId) { setChiffrage(null); return; }
    setLoadingChiffrage(true);
    const unsub = onSnapshot(doc(db, 'chiffrages', chiffrageId), (snap) => {
      if (snap.exists()) setChiffrage({ id: snap.id, ...snap.data() } as ChiffrageDoc);
      setLoadingChiffrage(false);
    }, () => setLoadingChiffrage(false));
    return () => unsub();
  }, [chiffrageId, db]);

  useEffect(() => {
    if (!chiffrage || !storage) return;
    chiffrage.files.forEach((file, i) => {
      const path = file.storagePath;
      if (!path || fetchedPathsRef.current.has(path)) return;
      fetchedPathsRef.current.add(path);
      getDownloadURL(ref(storage, path))
        .then((url) => setDownloadUrls((prev) => prev[i] === url ? prev : { ...prev, [i]: url }))
        .catch(() => fetchedPathsRef.current.delete(path));
    });
  }, [chiffrage?.files?.length, storage]);

  const clean = (f: any) => ({
    name:           f.name           || '',
    storagePath:    f.storagePath    || '',
    type:           f.type           || 'photo',
    status:         f.status         || 'pending',
    pdfUrl:         f.pdfUrl         || null,
    annotations:    f.annotations    || [],
  });

  async function handleDelete(index: number) {
    if (!chiffrage || !db || !chiffrageId) return;
    try {
      const updatedFiles = chiffrage.files.filter((_, i) => i !== index).map(clean);
      await updateDoc(doc(db, 'chiffrages', chiffrageId), { files: updatedFiles, updatedAt: serverTimestamp() });
      toast({ title: 'Fichier supprimé' });
    } catch {
      toast({ variant: 'destructive', title: 'Erreur de suppression' });
    } finally {
      setDeletingIndex(null);
    }
  }

  if (dossierLoading || loadingChiffrage) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="space-y-2">
            <div className="h-5 w-56 animate-pulse rounded bg-muted" />
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="flex gap-3">
            <div className="h-9 w-36 animate-pulse rounded-lg bg-muted" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4 flex gap-4 items-start bg-card">
              <div className="w-24 h-24 rounded-lg animate-pulse bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Task #5: mount the real <DevisEditor /> inside a near-full-screen dialog
  // so the spreadsheet-style table breathes. Task #6: the editor here runs in
  // `gestionnaire` mode — save routes into the dossier's pieces-jointes with
  // `skipAIScan: true` rather than writing to the chiffrage. A chiffrage is
  // not required to open the dialog anymore.
  const editorDocType = creatorKind === 'devis' ? 'Devis Garage' : 'Facture Garage';
  const creatorDialog = (
    <Dialog open={!!creatorKind} onOpenChange={(o) => !o && setCreatorKind(null)}>
      <DialogContent className="max-w-[calc(98vw/var(--app-zoom))] w-full h-[calc(95vh/var(--app-zoom))] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b shrink-0">
          <DialogTitle>
            {creatorKind === 'devis' ? 'Créer un devis' : 'Créer une facture'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-auto">
          {creatorKind ? (
            <DevisEditor
              mode="gestionnaire"
              dossierId={dossierId}
              chiffrageId={chiffrageId || undefined}
              docType={editorDocType}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );

  // Role-gated button row, reused in both branches.
  const creatorButtons = canCreateChiffrageDoc ? (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setCreatorKind('devis')}>
        <FileSignature className="mr-2 h-3.5 w-3.5" />
        Créer un devis
      </Button>
      <Button size="sm" variant="outline" onClick={() => setCreatorKind('facture')}>
        <Receipt className="mr-2 h-3.5 w-3.5" />
        Créer une facture
      </Button>
    </div>
  ) : null;

  if (!chiffrageId) {
    return (
      <div className="space-y-6">
        {creatorButtons}
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30">
          <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-semibold">Aucune correction en cours</h3>
          <p className="text-sm text-muted-foreground text-center max-w-xs mt-2">
            Utilisez <span className="font-bold">« Envoyer vers chiffrage »</span> pour activer le mode correcteur.
          </p>
        </div>
        {creatorDialog}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {creatorButtons}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-bold">Plateforme de Correction Native</h2>
          <p className="text-xs text-muted-foreground">
            Correcteur responsable : <span className="font-bold text-foreground">{chiffrage?.assignedChiffreurNom}</span>
          </p>
        </div>
        <Badge variant={chiffrage?.status === 'done' ? 'expertise' : 'secondary'} className="gap-1.5 py-1 px-3">
          {chiffrage?.status === 'done' ? <CheckCircle2 className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
          {chiffrage?.status === 'done' ? 'Terminé' : 'En cours'}
        </Badge>
      </div>

      <div className="space-y-4">
        {groupedFiles.map(([groupKey, group]) => (
          <div key={groupKey} className="border rounded-xl overflow-hidden bg-card shadow-sm">
            <button
              onClick={() => toggleGroup(groupKey)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
            >
              {expandedGroups.has(groupKey) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              {group.icon === 'photo' ? <ImageIcon className="h-4 w-4 text-muted-foreground" /> : <FileText className="h-4 w-4 text-muted-foreground" />}
              <span className="text-sm font-bold flex-1">{group.label}</span>
              <Badge variant="secondary" className="text-[11px] font-mono">{group.files.length}</Badge>
            </button>
            {expandedGroups.has(groupKey) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {group.files.map(({ file, index: i }) => (
                  <div
                    key={`${file.storagePath}-${i}`}
                    className="border rounded-xl p-4 flex gap-4 items-start bg-card shadow-sm hover:shadow-md transition-all group cursor-pointer"
                    onClick={() => router.push(`/viewer?chiffrageId=${chiffrageId}&dossierId=${dossierId}&fileIndex=${i}`)}
                  >
                    <div
                      className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border shadow-inner cursor-pointer relative"
                      onClick={(e) => { e.stopPropagation(); if (downloadUrls[i]) setPreviewIndex(i); }}
                    >
                      {downloadUrls[i] && (file.type === 'photo' || file.name.match(/\.(jpg|jpeg|png)$/i)) ? (
                        <img src={downloadUrls[i]} alt={file.name} loading="lazy" decoding="async" className="object-cover w-full h-full" />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <FileType className="h-6 w-6 text-muted-foreground opacity-40" />
                          <span className="text-[10px] uppercase font-black text-muted-foreground">{file.type}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-2 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <span className="font-bold text-xs truncate max-w-[150px]">{file.name}</span>
                        <StatusBadge status={file.status} hasAnnotations={!!file.annotations?.length} />
                      </div>

                      <div className="bg-muted/30 p-2 rounded text-[11px] text-muted-foreground italic line-clamp-2 leading-relaxed">
                        Mode Correcteur : Ajoutez vos annotations, barrez les prix et modifiez les valeurs directement sur l'image.
                      </div>

                      <div className="flex gap-1.5 flex-wrap pt-1">
                        {canDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 ml-auto opacity-0 group-hover:opacity-100"
                            onClick={() => setDeletingIndex(i)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {previewIndex !== null && chiffrage && downloadUrls[previewIndex] && (
        <Dialog open onOpenChange={() => setPreviewIndex(null)}>
          <DialogContent className="max-w-2xl h-[calc(60vh/var(--app-zoom))] flex flex-col p-0">
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              {chiffrage.files[previewIndex].name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <img src={downloadUrls[previewIndex]} className="max-w-full max-h-full object-contain" alt="Aperçu" />
              ) : (
                <iframe src={downloadUrls[previewIndex]} className="w-full h-full border-none" title="Aperçu" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={deletingIndex !== null} onOpenChange={() => setDeletingIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce fichier ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingIndex !== null && handleDelete(deletingIndex)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {creatorDialog}
    </div>
  );
}

function StatusBadge({ status, hasAnnotations }: { status: string; hasAnnotations: boolean }) {
  if (hasAnnotations) {
    return <Badge variant="expertise" className="text-[11px] py-0 h-4 uppercase font-black">CORRIGÉ</Badge>;
  }
  return <Badge variant="secondary" className="text-[11px] py-0 h-4 uppercase font-black">EN ATTENTE</Badge>;
}
