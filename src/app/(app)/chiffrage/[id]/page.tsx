'use client';

import React, { useEffect, useState, use, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { useFirestore, useStorage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, FileType, PencilLine, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PdfEditor } from '@/components/chiffreurs/pdf-editor';
import Link from 'next/link';

interface ChiffrageFileDoc {
  name: string;
  storagePath: string;
  type: "photo" | "rapport";
  status: "pending" | "processing" | "done" | "error";
  annotations?: any[];
  pdfUrl: string | null;
}

interface ChiffrageDoc {
  dossierId: string;
  dossierNom: string;
  assignedChiffreurNom: string;
  status: string;
  files: ChiffrageFileDoc[];
}

export default function ChiffragePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const [chiffrage, setChiffrage] = useState<ChiffrageDoc | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<Record<number, string>>({});
  const [editorIndex, setEditorIndex] = useState<number | null>(null);
  const [pageReady, setPageReady] = useState(false);
  
  const hasLoadedRef = useRef(false);
  const fetchedPathsRef = useRef<Set<string>>(new Set());

  const chiffrageRef = useMemo(() => (db && id ? doc(db, "chiffrages", id) : null), [db, id]);

  useEffect(() => {
    if (!chiffrageRef) return;
    
    const unsub = onSnapshot(chiffrageRef, (snap) => {
      if (!snap.exists()) {
        if (hasLoadedRef.current) {
          toast({ variant: 'destructive', title: "Chiffrage introuvable." });
          router.push("/dashboard");
        }
        return;
      }
      hasLoadedRef.current = true;
      setChiffrage(snap.data() as ChiffrageDoc);
      setPageReady(true);
    }, (error) => {
      console.error("Chiffrage listener error:", error);
    });
    
    return () => unsub();
  }, [chiffrageRef, router, toast]);

  useEffect(() => {
    if (!chiffrage || !storage) return;

    chiffrage.files.forEach((file, i) => {
      const path = file.storagePath;
      if (!path || fetchedPathsRef.current.has(path)) return;

      fetchedPathsRef.current.add(path);

      getDownloadURL(ref(storage, path))
        .then((url) => {
          setDownloadUrls((prev) => {
            if (prev[i] === url) return prev;
            return { ...prev, [i]: url };
          });
        })
        .catch((err) => {
          console.error("Storage fetch error:", err);
          fetchedPathsRef.current.delete(path);
        });
    });
  }, [chiffrage?.files, storage]);

  if (!pageReady || !chiffrage) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
        <p className="text-sm text-muted-foreground animate-pulse">Chargement de la plateforme de correction...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{chiffrage.dossierNom}</h1>
          <p className="text-muted-foreground text-sm">
            Correcteur assigné : {chiffrage.assignedChiffreurNom}
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        {chiffrage.files.map((file, i) => (
          <div
            key={`${file.storagePath}-${i}`}
            className="border rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start bg-card shadow-sm hover:shadow-md transition-all group"
          >
            <div className="w-28 h-28 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border shadow-inner relative">
              {downloadUrls[i] && (file.type === "photo" || file.name.match(/\.(jpg|jpeg|png)$/i)) ? (
                <img
                  src={downloadUrls[i]}
                  alt={file.name}
                  className="object-cover w-full h-full"
                />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <FileType className="h-8 w-8 text-muted-foreground opacity-40" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">{file.type === 'photo' ? 'Image' : 'PDF/Doc'}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Eye className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm">{file.name}</span>
                <StatusBadge status={file.status} hasAnnotations={!!file.annotations?.length} />
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2 italic bg-muted/30 p-2 rounded">
                Mode "Correction Native" : Utilisez l'éditeur pour barrer les erreurs et ajouter vos corrections directement sur le document.
              </p>

              <div className="flex gap-2 flex-wrap pt-2">
                <Button
                  size="sm"
                  onClick={() => setEditorIndex(i)}
                  className="bg-primary shadow-lg shadow-primary/20"
                >
                  <PencilLine className="h-4 w-4 mr-2" />
                  Ouvrir l'Éditeur / Corriger
                </Button>

                {file.pdfUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                  >
                    <a href={file.pdfUrl} target="_blank" rel="noopener noreferrer">Voir le PDF Exporté</a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {editorIndex !== null && chiffrage.files[editorIndex] && (
        <PdfEditor
          chiffrageId={id}
          fileIndex={editorIndex}
          fileName={chiffrage.files[editorIndex].name}
          fileUrl={downloadUrls[editorIndex]}
          onClose={() => setEditorIndex(null)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status, hasAnnotations }: { status: string; hasAnnotations: boolean }) {
  if (hasAnnotations) {
    return <Badge variant="expertise">Corrigé</Badge>;
  }
  return <Badge variant="secondary">En attente</Badge>;
}
