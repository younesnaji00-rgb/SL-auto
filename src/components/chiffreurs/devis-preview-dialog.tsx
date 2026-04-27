'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Upload, MapPin } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useStamps, loadStampImage } from '@/hooks/use-stamps';
import { renderDevisPdf } from '@/lib/devis-pdf';
import type { DevisSnapshot } from '@/lib/devis-schema';
import { useFirestore, useStorage } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useToast } from '@/hooks/use-toast';

export interface DevisPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: DevisSnapshot;
  docType: 'Devis Garage' | 'Facture Garage';
  /** Optional — only when saving an accord clone. */
  accordKind?: 'accord' | 'proposition-accord';
  /** Optional — info only, NOT used in the PDF title (title is normalized). */
  ordinal?: number;
  onConfirm: (payload: { blob: Blob; stampId: string | null }) => void | Promise<void>;
  onEdit: () => void;
}

const NONE_VALUE = '__none__';
const STAMP_DEFAULT_WIDTH_MM = 40;

// PDF.js loader — same pattern as src/components/common/pdf-thumbnail.tsx.
let pdfJsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist').then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      return pdfjsLib;
    });
  }
  return pdfJsPromise;
}

interface PageMeta {
  pageNumber: number;
  pageWidthMm: number;
  pageHeightMm: number;
}

export function DevisPreviewDialog({
  open,
  onOpenChange,
  snapshot,
  docType,
  accordKind,
  onConfirm,
  onEdit,
}: DevisPreviewDialogProps) {
  const { stamps } = useStamps();
  const db = useFirestore();
  const storage = useStorage();
  const { profile } = useCurrentUser();
  const { toast } = useToast();
  const stampFileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedStampId, setSelectedStampId] = useState<string>(NONE_VALUE);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [stampWarning, setStampWarning] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [renderTick, setRenderTick] = useState(0);
  const [importingStamp, setImportingStamp] = useState(false);

  // Click-to-place stamp state.
  const [stampPlacement, setStampPlacement] = useState<
    { page: number; xMm: number; yMm: number } | null
  >(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [stampDataUrl, setStampDataUrl] = useState<string | null>(null);

  // pdf.js viewer state.
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [pageMetas, setPageMetas] = useState<PageMeta[]>([]);
  const [viewerReady, setViewerReady] = useState(false);

  const handleImportStamp = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file || !db || !storage) return;
    setImportingStamp(true);
    try {
      const uuid =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const nameExt = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
      const ext =
        nameExt ||
        (file.type === 'image/png' ? 'png' :
         file.type === 'image/jpeg' ? 'jpg' :
         file.type === 'image/webp' ? 'webp' :
         file.type === 'image/svg+xml' ? 'svg' : 'img');
      const storagePath = `stamps/${uuid}.${ext}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, { contentType: file.type || undefined });
      const url = await getDownloadURL(storageRef);
      const baseName = file.name.replace(/\.[^.]+$/, '').trim() || 'Tampon';
      const docRef = await addDoc(collection(db, 'stamps'), {
        name: baseName,
        storagePath,
        url,
        active: true,
        createdAt: serverTimestamp(),
        createdBy: profile?.uid || '',
      });
      setSelectedStampId(docRef.id);
      toast({ title: 'Tampon importé', description: baseName });
    } catch (err: any) {
      console.error('stamp import failed', err);
      toast({ variant: 'destructive', title: 'Import impossible', description: err?.message || 'Erreur inconnue.' });
    } finally {
      setImportingStamp(false);
    }
  };

  const titleOverride = useMemo<
    'Devis' | 'Facture' | 'Accord' | "Proposition d'accord"
  >(() => {
    if (accordKind === 'accord') return 'Accord';
    if (accordKind === 'proposition-accord') return "Proposition d'accord";
    return docType === 'Facture Garage' ? 'Facture' : 'Devis';
  }, [accordKind, docType]);

  // Reset state each time the dialog is opened.
  useEffect(() => {
    if (open) {
      setSelectedStampId(NONE_VALUE);
      setRenderError(null);
      setStampWarning(null);
      setStampPlacement(null);
      setIsPlacing(false);
      setStampDataUrl(null);
      setCursorPos(null);
    }
  }, [open]);

  // Resolve stamp data URL & enter/exit placing mode when the dropdown changes.
  useEffect(() => {
    let cancelled = false;
    if (selectedStampId === NONE_VALUE) {
      setStampDataUrl(null);
      setStampPlacement(null);
      setIsPlacing(false);
      return;
    }
    const stamp = stamps.find((s) => s.id === selectedStampId);
    if (!stamp?.url) return;
    (async () => {
      const img = await loadStampImage(stamp.url);
      if (cancelled) return;
      if (img) {
        setStampDataUrl(img.dataUrl);
        setStampPlacement(null);
        setIsPlacing(true);
      } else {
        setStampDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedStampId, stamps]);

  // Render pipeline: debounce stamp/placement change, resolve stamp image, run renderer,
  // publish blob. Re-render on placement change so the stamp lands at the click point.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setRendering(true);
      setRenderError(null);
      setStampWarning(null);
      try {
        let stampImage: { dataUrl: string; width: number; height: number } | null = null;
        if (selectedStampId !== NONE_VALUE) {
          const stamp = stamps.find((s) => s.id === selectedStampId);
          if (stamp?.url) {
            stampImage = await loadStampImage(stamp.url);
            if (!cancelled && !stampImage) {
              setStampWarning(
                "Impossible de charger l'image du tampon. Rendu sans tampon."
              );
            }
          }
        }
        if (cancelled) return;
        const blob = renderDevisPdf(snapshot, {
          docType,
          stampImage,
          stampPlacement: stampPlacement
            ? { ...stampPlacement, widthMm: STAMP_DEFAULT_WIDTH_MM }
            : null,
          titleOverride,
        });
        if (cancelled) return;
        setCurrentBlob(blob);
      } catch (err) {
        if (cancelled) return;
        console.error('DevisPreviewDialog renderDevisPdf failed', err);
        setRenderError(
          err instanceof Error ? err.message : 'Erreur lors du rendu du PDF.'
        );
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, selectedStampId, snapshot, docType, titleOverride, stamps, renderTick, stampPlacement]);

  // Render the current blob to canvases via pdf.js whenever the blob changes.
  useEffect(() => {
    if (!open || !currentBlob) return;
    let cancelled = false;
    setViewerReady(false);
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const buf = await currentBlob.arrayBuffer();
        if (cancelled) return;
        const pdfDoc = await pdfjs.getDocument({ data: buf }).promise;
        if (cancelled) return;
        const metas: PageMeta[] = [];
        const renderScale = 1.5;
        for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
          const page = await pdfDoc.getPage(pageNumber);
          if (cancelled) return;
          const baseViewport = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: renderScale });
          const canvas = canvasRefs.current.get(pageNumber);
          if (!canvas) {
            // Canvas element may not be mounted yet on the very first render —
            // we'll catch up on the next effect tick once metas trigger a re-render.
            metas.push({
              pageNumber,
              pageWidthMm: (baseViewport.width * 25.4) / 72,
              pageHeightMm: (baseViewport.height * 25.4) / 72,
            });
            continue;
          }
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;
          metas.push({
            pageNumber,
            pageWidthMm: (baseViewport.width * 25.4) / 72,
            pageHeightMm: (baseViewport.height * 25.4) / 72,
          });
        }
        if (cancelled) return;
        setPageMetas(metas);
        setViewerReady(true);
      } catch (err) {
        if (cancelled) return;
        console.error('DevisPreviewDialog pdf.js render failed', err);
        setRenderError(
          err instanceof Error ? err.message : 'Erreur lors de l\'affichage du PDF.'
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, currentBlob]);

  // Second pass: if pageMetas changed and the canvases now exist, render again.
  // This handles the "first blob → no canvases yet" race.
  useEffect(() => {
    if (!open || !currentBlob || pageMetas.length === 0 || viewerReady) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const buf = await currentBlob.arrayBuffer();
        if (cancelled) return;
        const pdfDoc = await pdfjs.getDocument({ data: buf }).promise;
        const renderScale = 1.5;
        for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
          const page = await pdfDoc.getPage(pageNumber);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: renderScale });
          const canvas = canvasRefs.current.get(pageNumber);
          if (!canvas) continue;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
        }
        if (!cancelled) setViewerReady(true);
      } catch (err) {
        if (!cancelled) console.warn('DevisPreviewDialog second-pass render failed', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, currentBlob, pageMetas.length, viewerReady]);

  // Reset blob/viewer state when the dialog closes.
  useEffect(() => {
    if (!open) {
      setCurrentBlob(null);
      setPageMetas([]);
      setViewerReady(false);
      canvasRefs.current.clear();
    }
  }, [open]);

  const handleViewerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacing) return;
    setCursorPos({ x: e.clientX, y: e.clientY });
  };

  const handleViewerMouseLeave = () => {
    setCursorPos(null);
  };

  const handleCanvasClick = (
    e: React.MouseEvent<HTMLCanvasElement>,
    meta: PageMeta,
  ) => {
    if (!isPlacing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const fracX = (e.clientX - rect.left) / rect.width;
    const fracY = (e.clientY - rect.top) / rect.height;
    const xMm = fracX * meta.pageWidthMm;
    const yMm = fracY * meta.pageHeightMm;
    setStampPlacement({ page: meta.pageNumber, xMm, yMm });
    setIsPlacing(false);
    setCursorPos(null);
  };

  const handleConfirm = async () => {
    if (!currentBlob || confirming) return;
    setConfirming(true);
    try {
      await onConfirm({
        blob: currentBlob,
        stampId: selectedStampId === NONE_VALUE ? null : selectedStampId,
      });
    } finally {
      setConfirming(false);
    }
  };

  const handleEdit = () => {
    onEdit();
    onOpenChange(false);
  };

  const handleReplaceStamp = () => {
    setStampPlacement(null);
    setIsPlacing(true);
  };

  const stampSelected = selectedStampId !== NONE_VALUE;
  const showReplaceButton = stampSelected && stampPlacement !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Aperçu avant enregistrement</DialogTitle>
        </DialogHeader>

        <div
          ref={viewerContainerRef}
          className="relative w-full h-[70vh] rounded-md border overflow-auto bg-muted/20"
          style={isPlacing ? { cursor: 'none' } : undefined}
          onMouseMove={handleViewerMouseMove}
          onMouseLeave={handleViewerMouseLeave}
        >
          {!renderError && (
            <div className="flex flex-col items-center gap-3 p-3">
              {pageMetas.map((meta) => (
                <canvas
                  key={meta.pageNumber}
                  ref={(el) => {
                    if (el) canvasRefs.current.set(meta.pageNumber, el);
                    else canvasRefs.current.delete(meta.pageNumber);
                  }}
                  onClick={(e) => handleCanvasClick(e, meta)}
                  className="shadow-sm bg-white max-w-full h-auto"
                  style={{
                    cursor: isPlacing ? 'none' : 'default',
                    display: 'block',
                  }}
                />
              ))}
            </div>
          )}
          {(rendering || (!viewerReady && !renderError)) && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {renderError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background p-6 text-center">
              <p className="text-sm text-destructive">
                Erreur lors du rendu du PDF : {renderError}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenderTick((t) => t + 1)}
              >
                Réessayer
              </Button>
            </div>
          )}
        </div>

        {/* Mouse-follow stamp preview. Rendered as a portal-less fixed-position
            element; pointer-events: none so it never swallows clicks. */}
        {isPlacing && stampDataUrl && cursorPos && (
          <img
            src={stampDataUrl}
            alt=""
            aria-hidden
            style={{
              position: 'fixed',
              left: cursorPos.x,
              top: cursorPos.y,
              width: 90,
              height: 'auto',
              opacity: 0.7,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 9999,
            }}
          />
        )}

        {stampWarning && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {stampWarning}
          </p>
        )}

        {isPlacing && stampSelected && (
          <p className="text-xs text-muted-foreground">
            Cliquez sur le rapport pour poser le tampon.
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:min-w-[320px]">
            <label className="text-sm text-muted-foreground whitespace-nowrap">
              Tampon
            </label>
            <Select
              value={selectedStampId}
              onValueChange={setSelectedStampId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sans tampon" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sans tampon</SelectItem>
                {stamps.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name || s.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={stampFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImportStamp}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5"
              onClick={() => stampFileInputRef.current?.click()}
              disabled={importingStamp}
              title="Importer un nouveau tampon"
            >
              {importingStamp ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Importer
            </Button>
            {showReplaceButton && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5"
                onClick={handleReplaceStamp}
                title="Replacer le tampon"
              >
                <MapPin className="h-3.5 w-3.5" />
                Replacer
              </Button>
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleEdit}>
              Modifier
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!currentBlob || rendering || confirming || !!renderError}
            >
              {confirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement…
                </>
              ) : (
                'Confirmer & enregistrer'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
