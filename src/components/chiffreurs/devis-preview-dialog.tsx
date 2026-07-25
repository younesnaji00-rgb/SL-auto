'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
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
import { useFirestore } from '@/firebase';
import { useT } from '@/i18n';

export interface DevisPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snapshot: DevisSnapshot;
  docType: 'Devis Garage' | 'Facture Garage';
  /** Optional — only when saving an accord clone. */
  accordKind?: 'accord' | 'proposition-accord';
  /** Optional — info only, NOT used in the PDF title (title is normalized). */
  ordinal?: number;
  /**
   * Mirrors the editor's Sans-TVA checkbox. When the snapshot has accord/
   * proposition extras, the save-time PDF collapses each 3-column triple to a
   * single "Prix Total Accordé/Proposé" column whose value is HT (sansTva=true)
   * or TTC (sansTva=false). Default false → TTC.
   */
  sansTva?: boolean;
  onConfirm: (payload: { blob: Blob; stampId: string | null }) => void | Promise<void>;
  onEdit: () => void;
}

const NONE_VALUE = '__none__';
const STAMP_DEFAULT_WIDTH_MM = 40;
const STAMP_MIN_WIDTH_MM = 10;

interface StampImage {
  dataUrl: string;
  width: number;
  height: number;
}

interface StampPlacement {
  page: number;
  xMm: number;
  yMm: number;
  widthMm: number;
}

// PDF.js loader — same pattern as src/components/common/pdf-thumbnail.tsx.
// Use the legacy single-file build to avoid Turbopack splitting pdf.mjs into
// a dynamic chunk whose hash mismatches after rebuilds.
let pdfJsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (!pdfJsPromise) {
    pdfJsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjsLib) => {
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
  sansTva,
  onConfirm,
  onEdit,
}: DevisPreviewDialogProps) {
  const { stamps } = useStamps({ mineOnly: true });
  const db = useFirestore();
  const t = useT();
  const [selectedStampId, setSelectedStampId] = useState<string>(NONE_VALUE);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [stampWarning, setStampWarning] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [renderTick, setRenderTick] = useState(0);

  // Click-to-place stamp state.
  const [stampPlacement, setStampPlacement] = useState<StampPlacement | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [stampImage, setStampImage] = useState<StampImage | null>(null);

  // pdf.js viewer state.
  const viewerContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const [pageMetas, setPageMetas] = useState<PageMeta[]>([]);
  const [viewerReady, setViewerReady] = useState(false);

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
      setStampImage(null);
      setCursorPos(null);
    }
  }, [open]);

  // Resolve stamp data URL & enter/exit placing mode when the dropdown changes.
  useEffect(() => {
    let cancelled = false;
    if (selectedStampId === NONE_VALUE) {
      setStampImage(null);
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
        setStampImage(img);
        setStampPlacement(null);
        setIsPlacing(true);
      } else {
        setStampImage(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedStampId, stamps]);

  // Render pipeline: produce the *preview* PDF blob WITHOUT the stamp baked in.
  // The stamp is overlaid as an HTML <img> over the page canvas so drag/resize
  // stay snappy. The final PDF (with the stamp) is only rendered on confirm.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setRendering(true);
      setRenderError(null);
      setStampWarning(null);
      try {
        if (cancelled) return;
        const blob = renderDevisPdf(snapshot, {
          docType,
          stampImage: null,
          stampPlacement: null,
          titleOverride,
          collapseAccordToTotal: true,
          sansTva: !!sansTva,
        });
        if (cancelled) return;
        setCurrentBlob(blob);
      } catch (err) {
        if (cancelled) return;
        console.error('DevisPreviewDialog renderDevisPdf failed', err);
        setRenderError(
          err instanceof Error ? err.message : t('Erreur lors du rendu du PDF.')
        );
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, snapshot, docType, titleOverride, renderTick, sansTva]);

  // Parse the blob into pageMetas. Canvases mount AFTER pageMetas updates
  // (driven by the JSX map below), so the actual canvas paint happens in a
  // separate effect that depends on pageMetas.
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
        for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber++) {
          const page = await pdfDoc.getPage(pageNumber);
          if (cancelled) return;
          const baseViewport = page.getViewport({ scale: 1 });
          metas.push({
            pageNumber,
            pageWidthMm: (baseViewport.width * 25.4) / 72,
            pageHeightMm: (baseViewport.height * 25.4) / 72,
          });
        }
        if (cancelled) return;
        setPageMetas(metas);
      } catch (err) {
        if (cancelled) return;
        console.error('DevisPreviewDialog pdf.js parse failed', err);
        setRenderError(
          err instanceof Error ? err.message : t('Erreur lors de l\'affichage du PDF.')
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, currentBlob]);

  // Paint each canvas. Track active RenderTasks so we can cancel them on
  // cleanup — pdfjs errors out ("Cannot use the same canvas during multiple
  // render() operations") if a previous task is still in flight when a new
  // render starts on the same canvas.
  useEffect(() => {
    if (!open || !currentBlob || pageMetas.length === 0) return;
    let cancelled = false;
    const activeTasks: Array<{ cancel: () => void }> = [];
    setViewerReady(false);
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const buf = await currentBlob.arrayBuffer();
        if (cancelled) return;
        const pdfDoc = await pdfjs.getDocument({ data: buf }).promise;
        if (cancelled) return;
        const renderScale = 1.5;
        for (const meta of pageMetas) {
          if (cancelled) return;
          const canvas = canvasRefs.current.get(meta.pageNumber);
          if (!canvas) continue;
          const page = await pdfDoc.getPage(meta.pageNumber);
          if (cancelled) return;
          const viewport = page.getViewport({ scale: renderScale });
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          const task = page.render({ canvasContext: ctx, viewport });
          activeTasks.push(task);
          try {
            await task.promise;
          } catch (e: any) {
            if (cancelled || e?.name === 'RenderingCancelledException') return;
            throw e;
          }
        }
        if (!cancelled) setViewerReady(true);
      } catch (err) {
        if (cancelled) return;
        console.error('DevisPreviewDialog pdf.js paint failed', err);
        setRenderError(
          err instanceof Error ? err.message : t('Erreur lors de l\'affichage du PDF.')
        );
      }
    })();
    return () => {
      cancelled = true;
      for (const t of activeTasks) {
        try { t.cancel(); } catch { /* noop */ }
      }
    };
  }, [open, currentBlob, pageMetas]);

  // Reset blob/viewer state when the dialog closes.
  useEffect(() => {
    if (!open) {
      setCurrentBlob(null);
      setPageMetas([]);
      setViewerReady(false);
      canvasRefs.current.clear();
    }
  }, [open]);

  // Track the cursor at the window level while in placing mode so the
  // mouse-follow stamp preview keeps up across the entire viewport — not just
  // the viewer container (the dialog only spans part of the screen).
  useEffect(() => {
    if (!isPlacing) {
      setCursorPos(null);
      return;
    }
    const handler = (e: MouseEvent) => setCursorPos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [isPlacing]);

  const handleCanvasClick = (
    e: React.MouseEvent<HTMLCanvasElement>,
    meta: PageMeta,
  ) => {
    if (!isPlacing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    const fracX = (e.clientX - rect.left) / rect.width;
    const fracY = (e.clientY - rect.top) / rect.height;
    const clickXMm = fracX * meta.pageWidthMm;
    const clickYMm = fracY * meta.pageHeightMm;
    // The cursor preview shows the stamp CENTERED on the cursor (via
    // translate(-50%, -50%)). The PDF renderer paints at the top-left
    // corner, so shift the stored placement by half the stamp size to keep
    // the stamp aligned with where the user clicked.
    const widthMm = STAMP_DEFAULT_WIDTH_MM;
    const aspect = stampImage && stampImage.height > 0
      ? stampImage.width / stampImage.height
      : 1;
    const heightMm = aspect > 0 ? widthMm / aspect : widthMm;
    setStampPlacement({
      page: meta.pageNumber,
      xMm: clickXMm - widthMm / 2,
      yMm: clickYMm - heightMm / 2,
      widthMm,
    });
    setIsPlacing(false);
    setCursorPos(null);
  };

  const handleConfirm = async () => {
    if (!currentBlob || confirming) return;
    setConfirming(true);
    try {
      let blobToSave: Blob = currentBlob;
      if (
        selectedStampId !== NONE_VALUE &&
        stampPlacement &&
        stampImage
      ) {
        blobToSave = renderDevisPdf(snapshot, {
          docType,
          stampImage,
          stampPlacement,
          titleOverride,
          collapseAccordToTotal: true,
          sansTva: !!sansTva,
        });
      }
      await onConfirm({
        blob: blobToSave,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t('Aperçu avant enregistrement')}</DialogTitle>
        </DialogHeader>

        <div
          ref={viewerContainerRef}
          className="relative w-full h-[70vh] rounded-md border overflow-auto bg-muted/20"
          style={isPlacing ? { cursor: 'none' } : undefined}
        >
          {!renderError && (
            <div className="flex flex-col items-center gap-3 p-3">
              {pageMetas.map((meta) => (
                <div key={meta.pageNumber} className="relative">
                  <canvas
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
                  {stampPlacement &&
                    stampPlacement.page === meta.pageNumber &&
                    stampImage &&
                    !isPlacing && (
                      <StampOverlay
                        meta={meta}
                        placement={stampPlacement}
                        stampImage={stampImage}
                        onChange={setStampPlacement}
                        onDelete={() => setStampPlacement(null)}
                        getCanvas={() => canvasRefs.current.get(meta.pageNumber) ?? null}
                      />
                    )}
                </div>
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
                {t('Erreur lors du rendu du PDF :')} {renderError}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenderTick((t) => t + 1)}
              >
                {t('Réessayer')}
              </Button>
            </div>
          )}
        </div>

        {/* Mouse-follow stamp preview. PORTALED to document.body so it escapes
            DialogContent's `translate(-50%, -50%)` transform — without the
            portal, `position: fixed` would resolve relative to the dialog's
            transformed box (CSS quirk), shifting the preview off the cursor
            by the dialog's offset. With the portal, viewport coords from
            mousemove map 1:1 to the preview's screen position. */}
        {isPlacing && stampImage && cursorPos && typeof document !== 'undefined' &&
          createPortal(
            (() => {
              const firstMeta = pageMetas[0];
              const firstCanvas = firstMeta ? canvasRefs.current.get(firstMeta.pageNumber) : null;
              const rectWidth = firstCanvas?.getBoundingClientRect().width ?? 0;
              const pxPerMm = rectWidth > 0 && firstMeta && firstMeta.pageWidthMm > 0
                ? rectWidth / firstMeta.pageWidthMm
                : 3.5;
              const previewPxWidth = Math.max(40, STAMP_DEFAULT_WIDTH_MM * pxPerMm);
              return (
                <img
                  src={stampImage.dataUrl}
                  alt=""
                  aria-hidden
                  style={{
                    position: 'fixed',
                    left: cursorPos.x,
                    top: cursorPos.y,
                    width: previewPxWidth,
                    height: 'auto',
                    opacity: 0.7,
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 9999,
                  }}
                />
              );
            })(),
            document.body,
          )}

        {stampWarning && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {stampWarning}
          </p>
        )}

        {isPlacing && selectedStampId !== NONE_VALUE && (
          <p className="text-xs text-muted-foreground">
            {t('Cliquez sur le rapport pour poser le tampon.')}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:min-w-[320px]">
            <label className="text-sm text-muted-foreground whitespace-nowrap">
              {t('Tampon')}
            </label>
            <Select
              value={selectedStampId}
              onValueChange={setSelectedStampId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('Sans tampon')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>{t('Sans tampon')}</SelectItem>
                {stamps.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name || s.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleEdit}>
              {t('Modifier')}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={!currentBlob || rendering || confirming || !!renderError}
            >
              {confirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('Enregistrement…')}
                </>
              ) : (
                t('Confirmer & enregistrer')
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Draggable + resizable HTML overlay for the placed stamp. Lives over the
 * page canvas during preview only — the stamp is baked into the PDF only on
 * confirm. mm <-> px conversions use the live displayed canvas size, so the
 * overlay tracks responsive resize of the canvas naturally.
 */
type StampCorner = 'tl' | 'tr' | 'bl' | 'br';

interface StampOverlayProps {
  meta: PageMeta;
  placement: StampPlacement;
  stampImage: StampImage;
  onChange: (next: StampPlacement) => void;
  onDelete: () => void;
  getCanvas: () => HTMLCanvasElement | null;
}

function StampOverlay({
  meta,
  placement,
  stampImage,
  onChange,
  onDelete,
  getCanvas,
}: StampOverlayProps) {
  const t = useT();
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);

  // Re-measure on window resize so the overlay tracks responsive canvas changes.
  const [, setMeasureTick] = useState(0);
  useEffect(() => {
    const handler = () => setMeasureTick((t) => t + 1);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const canvas = getCanvas();
  const rect = canvas?.getBoundingClientRect();
  if (!canvas || !rect || rect.width <= 0 || rect.height <= 0) {
    return null;
  }
  const pxPerMm = rect.width / meta.pageWidthMm;
  const aspect =
    stampImage.width > 0 && stampImage.height > 0
      ? stampImage.width / stampImage.height
      : 1;
  const widthPx = placement.widthMm * pxPerMm;
  const heightMm = aspect > 0 ? placement.widthMm / aspect : placement.widthMm;
  const heightPx = heightMm * pxPerMm;
  const leftPx = placement.xMm * pxPerMm;
  const topPx = placement.yMm * pxPerMm;

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (resizing) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startXMm = placement.xMm;
    const startYMm = placement.yMm;
    setDragging(true);

    const onMove = (ev: MouseEvent) => {
      const c = getCanvas();
      const r = c?.getBoundingClientRect();
      if (!c || !r || r.width <= 0) return;
      const ratio = meta.pageWidthMm / r.width;
      const dxMm = (ev.clientX - startX) * ratio;
      const dyMm = (ev.clientY - startY) * ratio;
      const maxXMm = Math.max(0, meta.pageWidthMm - placement.widthMm);
      const hMm = aspect > 0 ? placement.widthMm / aspect : placement.widthMm;
      const maxYMm = Math.max(0, meta.pageHeightMm - hMm);
      const nextXMm = Math.min(Math.max(startXMm + dxMm, 0), maxXMm);
      const nextYMm = Math.min(Math.max(startYMm + dyMm, 0), maxYMm);
      onChange({ ...placement, xMm: nextXMm, yMm: nextYMm });
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // Aspect-locked resize from any corner. The OPPOSITE corner stays anchored
  // in mm coords; the dragged corner follows the cursor. The new width is
  // driven by max(|dx|, |dy| * aspect) so dragging in either direction grows
  // the stamp naturally.
  const handleResizeStart =
    (corner: StampCorner) =>
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setResizing(true);

      const startWidthMm = placement.widthMm;
      const startHeightMm = aspect > 0 ? startWidthMm / aspect : startWidthMm;
      let anchorXMm: number;
      let anchorYMm: number;
      switch (corner) {
        case 'tl':
          anchorXMm = placement.xMm + startWidthMm;
          anchorYMm = placement.yMm + startHeightMm;
          break;
        case 'tr':
          anchorXMm = placement.xMm;
          anchorYMm = placement.yMm + startHeightMm;
          break;
        case 'bl':
          anchorXMm = placement.xMm + startWidthMm;
          anchorYMm = placement.yMm;
          break;
        case 'br':
        default:
          anchorXMm = placement.xMm;
          anchorYMm = placement.yMm;
          break;
      }

      const onMove = (ev: MouseEvent) => {
        const c = getCanvas();
        const r = c?.getBoundingClientRect();
        if (!c || !r || r.width <= 0) return;
        const ratio = meta.pageWidthMm / r.width;
        const cursorXMm = (ev.clientX - r.left) * ratio;
        const cursorYMm = (ev.clientY - r.top) * ratio;
        const dxMm = Math.abs(cursorXMm - anchorXMm);
        const dyMm = Math.abs(cursorYMm - anchorYMm);
        const candidateWidthMm = Math.max(dxMm, dyMm * aspect);
        // Per-corner page-bound constraints — keep the new bounding box on page.
        const headroomLeft = anchorXMm;
        const headroomRight = meta.pageWidthMm - anchorXMm;
        const headroomTop = anchorYMm;
        const headroomBottom = meta.pageHeightMm - anchorYMm;
        const maxByX =
          corner === 'tl' || corner === 'bl' ? headroomLeft : headroomRight;
        const maxByY =
          (corner === 'tl' || corner === 'tr' ? headroomTop : headroomBottom) * aspect;
        const maxWidthMm = Math.max(
          STAMP_MIN_WIDTH_MM,
          Math.min(maxByX, maxByY),
        );
        const newWidthMm = Math.min(
          Math.max(candidateWidthMm, STAMP_MIN_WIDTH_MM),
          maxWidthMm,
        );
        const newHeightMm = aspect > 0 ? newWidthMm / aspect : newWidthMm;

        let newXMm: number;
        let newYMm: number;
        switch (corner) {
          case 'tl':
            newXMm = anchorXMm - newWidthMm;
            newYMm = anchorYMm - newHeightMm;
            break;
          case 'tr':
            newXMm = anchorXMm;
            newYMm = anchorYMm - newHeightMm;
            break;
          case 'bl':
            newXMm = anchorXMm - newWidthMm;
            newYMm = anchorYMm;
            break;
          case 'br':
          default:
            newXMm = anchorXMm;
            newYMm = anchorYMm;
            break;
        }
        onChange({
          ...placement,
          xMm: newXMm,
          yMm: newYMm,
          widthMm: newWidthMm,
        });
      };
      const onUp = () => {
        setResizing(false);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };

  const cornerHandleStyle = (corner: StampCorner): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 12,
      height: 12,
      background: 'white',
      border: '1px solid rgba(0,0,0,0.6)',
      borderRadius: 2,
      boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
    };
    switch (corner) {
      case 'tl': return { ...base, left: -6, top: -6, cursor: 'nwse-resize' };
      case 'tr': return { ...base, right: -6, top: -6, cursor: 'nesw-resize' };
      case 'bl': return { ...base, left: -6, bottom: -6, cursor: 'nesw-resize' };
      case 'br': return { ...base, right: -6, bottom: -6, cursor: 'nwse-resize' };
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseDown={handleDragStart}
      style={{
        position: 'absolute',
        left: leftPx,
        top: topPx,
        width: widthPx,
        height: heightPx,
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        touchAction: 'none',
        // Outline (not border) so the dashed selection frame doesn't take up
        // 2px of inner space. With border + box-sizing:border-box the inner
        // <img> would render 4px smaller than the wrapper, and the cursor
        // preview would no longer match the placed stamp's size. Outline
        // is drawn outside the box and doesn't affect layout.
        outline: '2px dashed rgba(20,184,166,0.7)',
        outlineOffset: 0,
      }}
    >
      <img
        src={stampImage.dataUrl}
        alt=""
        aria-hidden
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          pointerEvents: 'none',
        }}
      />
      {!dragging && (
        <>
          <div
            onMouseDown={handleResizeStart('tl')}
            style={cornerHandleStyle('tl')}
            aria-label={t('Redimensionner depuis le coin haut-gauche')}
          />
          <div
            onMouseDown={handleResizeStart('tr')}
            style={cornerHandleStyle('tr')}
            aria-label={t('Redimensionner depuis le coin haut-droit')}
          />
          <div
            onMouseDown={handleResizeStart('bl')}
            style={cornerHandleStyle('bl')}
            aria-label={t('Redimensionner depuis le coin bas-gauche')}
          />
          <div
            onMouseDown={handleResizeStart('br')}
            style={cornerHandleStyle('br')}
            aria-label={t('Redimensionner depuis le coin bas-droit')}
          />
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            aria-label={t('Retirer le tampon du rapport')}
            title={t('Retirer du rapport')}
            style={{
              position: 'absolute',
              top: -10,
              right: -10,
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
              padding: 0,
            }}
          >
            <X style={{ width: 12, height: 12 }} aria-hidden />
          </button>
        </>
      )}
    </div>
  );
}
