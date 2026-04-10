'use client';

import React, { useEffect, useState, useRef, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, onSnapshot } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { useFirestore, useStorage } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, FileType, Eye, CheckCircle2, Loader2,
  ChevronDown, ChevronRight, ImageIcon, FileText, ExternalLink, PenLine,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';

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
  dossierId: string;
  dossierNom: string;
  assignedChiffreurNom: string;
  status: string;
  files: ChiffrageFileDoc[];
}

export default function AssignationChiffrageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  const { canWrite } = useCurrentUser();
  const canEdit = canWrite('assignations-chiffrage');

  const [chiffrage, setChiffrage] = useState<ChiffrageDoc | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));

  const fetchedPathsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!db || !id) return;
    const unsub = onSnapshot(doc(db, 'chiffrages', id), (snap) => {
      if (!snap.exists()) {
        toast({ variant: 'destructive', title: 'Assignation introuvable.' });
        router.push('/assignations-chiffrage');
        return;
      }
      setChiffrage(snap.data() as ChiffrageDoc);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [db, id]);

  useEffect(() => {
    if (!chiffrage || !storage) return;
    chiffrage.files.forEach((file, i) => {
      const path = file.storagePath;
      if (!path || fetchedPathsRef.current.has(path)) return;
      fetchedPathsRef.current.add(path);
      getDownloadURL(ref(storage, path))
        .then((url) => setDownloadUrls((prev) => ({ ...prev, [i]: url })))
        .catch(() => fetchedPathsRef.current.delete(path));
    });
  }, [chiffrage?.files?.length, storage]);

  const groupedFiles = useMemo(() => {
    if (!chiffrage?.files) return [];
    const groups: Record<string, { label: string; icon: 'photo' | 'doc'; files: { file: ChiffrageFileDoc; index: number }[] }> = {};
    chiffrage.files.forEach((file, i) => {
      let groupKey: string;
      let groupLabel: string;
      let icon: 'photo' | 'doc';
      if (file.type === 'photo') {
        const cat = file.category || 'avant';
        const catLabels: Record<string, string> = { avant: 'Photos - Avant', en_cours: 'Photos - En cours', apres: 'Photos - Apres' };
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
    if (expandedGroups.size === 1 && expandedGroups.has('all')) {
      setExpandedGroups(new Set(Object.keys(groups)));
    }
    return Object.entries(groups);
  }, [chiffrage?.files]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group); else next.add(group);
      return next;
    });
  };

  if (loading || !chiffrage) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg animate-pulse bg-muted" />
          <div className="space-y-2 flex-1">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-64 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-xl p-4 flex gap-4 items-start bg-card">
              <div className="w-24 h-24 rounded-lg animate-pulse bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/assignations-chiffrage"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{chiffrage.dossierNom || 'Sans ref.'}</h1>
          <p className="text-sm text-muted-foreground">
            Correcteur : <span className="font-bold text-foreground">{chiffrage.assignedChiffreurNom}</span>
          </p>
        </div>
        {canEdit && (
          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={() => router.push(`/editor?chiffrageId=${id}&dossierId=${chiffrage.dossierId}&fileIndex=0`)}
          >
            <PenLine className="h-3.5 w-3.5" />
            Ouvrir l&apos;éditeur
          </Button>
        )}
        <Badge variant={chiffrage.status === 'done' ? 'expertise' : 'secondary'} className="gap-1.5 py-1 px-3">
          {chiffrage.status === 'done' ? <CheckCircle2 className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
          {chiffrage.status === 'done' ? 'Termine' : 'En cours'}
        </Badge>
      </div>

      {/* File groups */}
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
              <Badge variant="secondary" className="text-[10px] font-mono">{group.files.length}</Badge>
            </button>
            {expandedGroups.has(groupKey) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                {group.files.map(({ file, index: i }) => (
                  <div
                    key={`${file.storagePath}-${i}`}
                    className="border rounded-xl p-4 flex gap-4 items-start bg-card shadow-sm hover:shadow-md transition-all group cursor-pointer"
                    onClick={() => router.push(`/viewer?chiffrageId=${id}&dossierId=${chiffrage.dossierId}&fileIndex=${i}`)}
                  >
                    {/* Thumbnail */}
                    <div
                      className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center shrink-0 overflow-hidden border shadow-inner cursor-pointer relative"
                      onClick={(e) => { e.stopPropagation(); if (downloadUrls[i]) setPreviewIndex(i); }}
                    >
                      {downloadUrls[i] && (file.type === 'photo' || file.name.match(/\.(jpg|jpeg|png)$/i)) ? (
                        <img src={downloadUrls[i]} alt={file.name} loading="lazy" decoding="async" className="object-cover w-full h-full" />
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

                    {/* Info */}
                    <div className="flex-1 space-y-2 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap justify-between">
                        <span className="font-bold text-xs truncate max-w-[150px]">{file.name}</span>
                        <StatusBadge status={file.status} hasAnnotations={!!file.annotations?.length} />
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Cliquez pour ouvrir la vue de comparaison
                      </p>
                      {file.pdfUrl && (
                        <a
                          href={file.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" /> PDF Exporte
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox preview */}
      {previewIndex !== null && chiffrage && downloadUrls[previewIndex] && (
        <Dialog open onOpenChange={() => setPreviewIndex(null)}>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
            <DialogTitle className="sr-only">Apercu du fichier</DialogTitle>
            <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
              {chiffrage.files[previewIndex].name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                <img src={downloadUrls[previewIndex]} className="max-w-full max-h-full object-contain" alt="Apercu" />
              ) : (
                <iframe src={downloadUrls[previewIndex]} className="w-full h-full border-none" title="Apercu" />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StatusBadge({ status, hasAnnotations }: { status: string; hasAnnotations: boolean }) {
  if (hasAnnotations) {
    return <Badge variant="expertise" className="text-[9px] py-0 h-4 uppercase font-black">CORRIGE</Badge>;
  }
  return <Badge variant="secondary" className="text-[9px] py-0 h-4 uppercase font-black">EN ATTENTE</Badge>;
}
