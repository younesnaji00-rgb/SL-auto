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
import { ArrowLeft, FileType, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
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
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg animate-pulse bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-40 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
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
          <h1 className="text-2xl font-semibold tracking-tight">{chiffrage.dossierNom}</h1>
          <p className="text-muted-foreground text-sm">
            Correcteur assigné : {chiffrage.assignedChiffreurNom}
          </p>
        </div>
        <div className="ml-auto">
          <Badge variant={chiffrage.status === 'done' ? 'success' : 'secondary'} className="gap-1.5 py-1 px-3">
            {chiffrage.status === 'done' ? 'Terminé' : 'En cours'}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4">
        {chiffrage.files.length === 0 && (
          <EmptyState
            icon={<FileType />}
            title="Aucun fichier"
            description="Aucun fichier n'a encore été associé à ce chiffrage."
          />
        )}
        {chiffrage.files.map((file, i) => (
          <div
            key={`${file.storagePath}-${i}`}
            className="border rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-start bg-card shadow-sm hover:shadow-md transition-all group cursor-pointer"
            onClick={() => router.push(`/viewer?chiffrageId=${id}&dossierId=${chiffrage.dossierId}&fileIndex=${i}`)}
          >
            <div className="w-28 h-28 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border shadow-inner relative">
              {downloadUrls[i] && (file.type === "photo" || file.name.match(/\.(jpg|jpeg|png)$/i)) ? (
                <img
                  src={downloadUrls[i]}
                  alt={file.name}
                  loading="lazy"
                  decoding="async"
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

    </div>
  );
}

function StatusBadge({ status, hasAnnotations }: { status: string; hasAnnotations: boolean }) {
  if (hasAnnotations) {
    return <Badge variant="success">Corrigé</Badge>;
  }
  if (status === 'processing') {
    return <Badge variant="chiffrage" className="animate-pulse">En traitement</Badge>;
  }
  if (status === 'error') {
    return <Badge variant="destructive">Erreur</Badge>;
  }
  if (status === 'done') {
    return <Badge variant="success">Terminé</Badge>;
  }
  return <Badge variant="secondary">En attente</Badge>;
}
