'use client';

import { PageHeader } from '@/components/layout/page-header';
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
import { Card } from '@/components/ui/card';
import { FileType } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { useT } from '@/i18n';
import Loading from './loading';

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
  const t = useT();

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
          toast({ variant: 'destructive', title: t("Chiffrage introuvable.") });
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
    // Loading (element-specs §15): the route skeleton mirrors this exact layout.
    return <Loading />;
  }

  const done = chiffrage.status === 'done';

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Page header (element-specs §1: Polaris Page ✓ breadcrumb back to the
          parent, compact t-title on a record page; meta chip §11 for the
          correction state — success once done, neutral while open). No
          filled button: this page has no page-level action. */}
      <PageHeader
        size="compact"
        backHref="/assignations-chiffrage"
        backLabel={t('Assignations au chiffrage')}
        title={chiffrage.dossierNom || t('Sans réf.')}
        titleText={chiffrage.dossierNom || t('Sans réf.')}
        subtitle={<>{t('Correcteur assigné :')} <span className="font-semibold text-ink">{chiffrage.assignedChiffreurNom || '—'}</span></>}
        meta={
          <Badge variant={done ? 'success' : 'neutral'}>
            {done ? t('Terminé') : t('En cours')}
          </Badge>
        }
      />

      {/* One caption for the whole board — the same sentence under every file
          was the "repeated title" anti-pattern (blueprint). */}
      {chiffrage.files.length > 0 && (
        <p className="t-caption">
          {t("Mode « Correction native » : utilisez l'éditeur pour barrer les erreurs et ajouter vos corrections directement sur le document.")}
        </p>
      )}

      <div className="grid gap-6">
        {chiffrage.files.length === 0 && (
          // Empty state (element-specs §12: NN/g ✓ state + reason; Polaris ✓
          // one line). No action: files are attached upstream by the
          // gestionnaire. Flat well, not dashed — dashed is the drop cue.
          <EmptyState
            icon={<FileType />}
            title={t("Aucun fichier")}
            description={t("Aucun fichier n'a encore été associé à ce chiffrage.")}
            dashed={false}
          />
        )}
        {chiffrage.files.map((file, i) => {
          const isImage = !!downloadUrls[i] && (file.type === "photo" || /\.(jpg|jpeg|png)$/i.test(file.name));
          const open = () => router.push(`/viewer?chiffrageId=${id}&dossierId=${chiffrage.dossierId}&fileIndex=${i}`);
          return (
            // Clickable list card (element-specs §5: NN/g cards ✓ "whole card
            // clickable when it links"; Material 3 cards ✓ container is the
            // only required element; Carbon tile ✓ no drop shadow to reveal
            // more). One horizontal paper per file, padding 24, hover =
            // surface-2, keyboard-operable; no scale on hover.
            <Card
              key={`${file.storagePath}-${i}`}
              role="button"
              tabIndex={0}
              aria-label={`${t("Ouvrir")} ${file.name} ${t("dans l'éditeur")}`}
              onClick={open}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  open();
                }
              }}
              className="flex cursor-pointer flex-col items-start gap-4 p-6 transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row"
            >
              {/* Leading anchor (§4: 36–40 px+ media on `surface-2` with the rim). */}
              <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2 shadow-rim">
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
                    <FileType className="h-8 w-8 text-ink-4" aria-hidden />
                    <span className="t-label">{file.type === "photo" ? t("Image") : t("PDF/Doc")}</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                {/* Name 14/600 ink + status chip (§11). */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 break-words text-sm font-semibold text-ink">{file.name}</span>
                  <StatusBadge status={file.status} hasAnnotations={!!file.annotations?.length} />
                </div>

                {/* Secondary action (§8: `outline` — the card itself is the primary
                    path); stopPropagation keeps it from also opening the editor. */}
                {file.pdfUrl && (
                  <Button variant="outline" asChild onClick={(e) => e.stopPropagation()}>
                    <a href={file.pdfUrl} target="_blank" rel="noopener noreferrer">{t("Voir le PDF exporté")}</a>
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/** Status chip (element-specs §11): one helper, same state → same pair; no pulse. */
function StatusBadge({ status, hasAnnotations }: { status: string; hasAnnotations: boolean }) {
  const t = useT();
  if (hasAnnotations) {
    return <Badge variant="success">{t('Corrigé')}</Badge>;
  }
  if (status === 'processing') {
    return <Badge variant="info">{t("En traitement")}</Badge>;
  }
  if (status === 'error') {
    return <Badge variant="danger">{t("Erreur")}</Badge>;
  }
  if (status === 'done') {
    return <Badge variant="success">{t('Terminé')}</Badge>;
  }
  return <Badge variant="neutral">{t("En attente")}</Badge>;
}
