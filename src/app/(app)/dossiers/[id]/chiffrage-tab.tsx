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
  Trash2, Eye, PencilLine
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ChiffrageFileDoc {
  name: string;
  storagePath: string;
  type: 'photo' | 'rapport';
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

export default function ChiffrageTab({ dossierId }: { dossierId: string }) {
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

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
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground italic">Chargement de l'espace correction...</p>
      </div>
    );
  }

  if (!chiffrageId) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30">
        <FileText className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
        <h3 className="text-lg font-semibold">Aucune correction en cours</h3>
        <p className="text-sm text-muted-foreground text-center max-w-xs mt-2">
          Utilisez <span className="font-bold">« Envoyer vers chiffrage »</span> pour activer le mode correcteur.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chiffrage?.files.map((file, i) => (
          <div
            key={`${file.storagePath}-${i}`}
            className="border rounded-xl p-4 flex gap-4 items-start bg-card shadow-sm hover:shadow-md transition-all group"
          >
            <div
              className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border shadow-inner cursor-pointer relative"
              onClick={() => downloadUrls[i] && setPreviewIndex(i)}
            >
              {downloadUrls[i] && (file.type === 'photo' || file.name.match(/\.(jpg|jpeg|png)$/i)) ? (
                <img src={downloadUrls[i]} alt={file.name} className="object-cover w-full h-full" />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <FileType className="h-6 w-6 text-muted-foreground opacity-40" />
                  <span className="text-[8px] uppercase font-black text-muted-foreground">{file.type}</span>
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

              <div className="bg-muted/30 p-2 rounded text-[10px] text-muted-foreground italic line-clamp-2 leading-relaxed">
                Mode Correcteur : Ajoutez vos annotations, barrez les prix et modifiez les valeurs directement sur l'image.
              </div>

              <div className="flex gap-1.5 flex-wrap pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] px-2.5 font-bold bg-primary text-white hover:bg-primary/90 border-none shadow-sm"
                  onClick={() => router.push(`/editor?chiffrageId=${chiffrageId}&fileIndex=${i}&dossierId=${dossierId}`)}
                >
                  <PencilLine className="h-3 w-3 mr-1.5" />
                  Ouvrir l'Éditeur
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10 ml-auto opacity-0 group-hover:opacity-100"
                  onClick={() => setDeletingIndex(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {previewIndex !== null && chiffrage && downloadUrls[previewIndex] && (
        <Dialog open onOpenChange={() => setPreviewIndex(null)}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
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
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deletingIndex !== null && handleDelete(deletingIndex)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status, hasAnnotations }: { status: string; hasAnnotations: boolean }) {
  if (hasAnnotations) {
    return <Badge variant="expertise" className="text-[9px] py-0 h-4 uppercase font-black">CORRIGÉ</Badge>;
  }
  return <Badge variant="secondary" className="text-[9px] py-0 h-4 uppercase font-black">EN ATTENTE</Badge>;
}
