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
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowLeft, FileType } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { useRegisterPageTitle } from '@/components/layout/page-chrome';
import { cn } from '@/lib/utils';
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

// Sticky record bar bleeds through the layout padding (p-4 md:p-6 lg:p-8).
const BAR_BLEED = '-mx-4 -mt-4 md:-mx-6 md:-mt-6 lg:-mx-8 lg:-mt-8';

// Status pairs only (DESIGN.md §10).
type ChipTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';
const CHIP_TONE: Record<ChipTone, string> = {
  neutral: 'bg-surface-3 text-ink-2',
  success: 'bg-status-success-bg text-status-success-fg',
  warning: 'bg-status-warning-bg text-status-warning-fg',
  danger: 'bg-status-danger-bg text-status-danger-fg',
  info: 'bg-status-info-bg text-status-info-fg',
};
function StatusChip({ tone, className, children }: { tone: ChipTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex h-5 items-center whitespace-nowrap rounded-full px-2 text-[11px] font-medium', CHIP_TONE[tone], className)}>
      {children}
    </span>
  );
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

  useRegisterPageTitle(chiffrage ? chiffrage.dossierNom || 'Sans réf.' : null);

  if (!pageReady || !chiffrage) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className={cn('flex h-12 items-center gap-3 border-b border-hairline px-3 sm:px-5', BAR_BLEED)}>
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-5 w-20 rounded-full" />
        </div>
        <div className="mx-auto max-w-5xl">
          <div className="paper p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-[10px]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const done = chiffrage.status === 'done';

  return (
    <div className="space-y-6">
      {/* Sticky identity bar — mirrors components/dossiers/record-bar.tsx. */}
      <div className={cn('sticky top-0 z-40 flex min-h-[48px] items-center gap-2 glass-bar border-b border-hairline px-3 sm:px-5', BAR_BLEED)} data-record-bar>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-ink-3 hover:text-ink" asChild>
              <Link href="/assignations-chiffrage" aria-label="Retour aux assignations au chiffrage">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Assignations au chiffrage</TooltipContent>
        </Tooltip>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
          <h1 className="t-mono min-w-0 truncate font-semibold tracking-tight">{chiffrage.dossierNom || 'Sans réf.'}</h1>
          {chiffrage.assignedChiffreurNom && (
            <span className="t-body min-w-0 truncate font-medium">{chiffrage.assignedChiffreurNom}</span>
          )}
          <StatusChip tone={done ? 'success' : 'info'}>{done ? 'Terminé' : 'En cours'}</StatusChip>
        </div>
      </div>

      <div className="mx-auto max-w-5xl">
        <Card role="region" aria-label="Fichiers" className="overflow-hidden">
          <header className="flex min-h-[48px] items-center justify-between gap-3 border-b border-hairline px-6 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="t-heading truncate">Fichiers</h2>
              <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-2">{chiffrage.files.length}</span>
            </div>
          </header>
          <div className="p-6">
            {/* One caption for the whole board instead of the same sentence under every file. */}
            <p className="t-caption mb-4">
              Mode &quot;Correction Native&quot; : Utilisez l&apos;éditeur pour barrer les erreurs et ajouter vos corrections directement sur le document.
            </p>
            {chiffrage.files.length === 0 ? (
              <EmptyState
                icon={<FileType />}
                title="Aucun fichier"
                description="Aucun fichier n'a encore été associé à ce chiffrage."
                dashed={false}
              />
            ) : (
              // Document sockets (slot-card convention): a filled socket is a raised tile.
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {chiffrage.files.map((file, i) => {
                  const isImage = !!downloadUrls[i] && (file.type === "photo" || /\.(jpg|jpeg|png)$/i.test(file.name));
                  const open = () => router.push(`/viewer?chiffrageId=${id}&dossierId=${chiffrage.dossierId}&fileIndex=${i}`);
                  return (
                    <li key={`${file.storagePath}-${i}`}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={open}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            open();
                          }
                        }}
                        className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-[10px] bg-card shadow-card transition-[transform,box-shadow] duration-150 hover:scale-[1.02] hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transform-none motion-reduce:hover:scale-100 dark:ring-1 dark:ring-hairline"
                      >
                        <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-surface-2">
                          {isImage ? (
                            <img
                              src={downloadUrls[i]}
                              alt={file.name}
                              loading="lazy"
                              decoding="async"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <FileType className="h-8 w-8 text-ink-4" />
                              <span className="t-label">{file.type === 'photo' ? 'Image' : 'PDF/Doc'}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <span className="t-heading min-w-0 break-words">{file.name}</span>
                            <StatusBadge status={file.status} hasAnnotations={!!file.annotations?.length} />
                          </div>
                          {file.pdfUrl && (
                            <div className="mt-auto">
                              <Button size="sm" variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                                <a href={file.pdfUrl} target="_blank" rel="noopener noreferrer">Voir le PDF Exporté</a>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status, hasAnnotations }: { status: string; hasAnnotations: boolean }) {
  if (hasAnnotations) {
    return <StatusChip tone="success">Corrigé</StatusChip>;
  }
  if (status === 'processing') {
    return <StatusChip tone="info">En traitement</StatusChip>;
  }
  if (status === 'error') {
    return <StatusChip tone="danger">Erreur</StatusChip>;
  }
  if (status === 'done') {
    return <StatusChip tone="success">Terminé</StatusChip>;
  }
  return <StatusChip tone="neutral">En attente</StatusChip>;
}
