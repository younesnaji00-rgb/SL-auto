'use client';

// C2 — pdfjs canvas pane for the compare panel (chiffrage-redesign-spec).
// PDFs used to render in a bare <iframe> (dead zoom); this viewer mirrors the
// /viewer pdfjs-dist setup (same worker, same hi-res backing-store pattern)
// inside the SAME chrome ZoomableImage gives images: −/%/+ pill, wheel notch
// ×1.3 (100 px deltaY accumulation), drag pan when zoomed, rotate 90°, plus
// ‹ n/N › page nav. Current page only is rendered; the backing store follows
// zoom × devicePixelRatio (capped at 2), debounced like /viewer. On any pdfjs
// failure the caller-provided `fallback` (the old iframe) renders instead.

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

export const VIEWER_ZOOM_MIN = 1;
export const VIEWER_ZOOM_MAX = 4;

/**
 * Wheel notch gate shared by ZoomableImage and PdfCanvas (owner zoom ruling:
 * one notch ≈ ×1.3; deltaY accumulated to 100 px so multi-event wheels count
 * once). Native listener because React wheel events are passive.
 */
export function useWheelZoomNotch(
  ref: React.RefObject<HTMLElement | null>,
  onNotch: (direction: 1 | -1) => void,
) {
  const onNotchRef = useRef(onNotch);
  onNotchRef.current = onNotch;
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) < 100) return;
      const direction = acc < 0 ? 1 : -1;
      acc = 0;
      onNotchRef.current(direction);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [ref]);
}

/**
 * The on-canvas − / % / + pill (lightbox ZoomControls anatomy) + rotate,
 * factored out of ZoomableImage so the PDF pane reuses the exact chrome.
 * `children` renders extra controls (page nav) at the right end.
 */
export function ViewerZoomPill({
  zoom,
  onZoomTo,
  onRotate,
  children,
}: {
  zoom: number;
  onZoomTo: (next: number) => void;
  onRotate: () => void;
  children?: React.ReactNode;
}) {
  const t = useT();
  return (
    <div
      className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-card/95 px-1 py-0.5 shadow-raised ring-1 ring-hairline"
      role="group"
      aria-label={t('Zoom')}
      title={t('Molette pour zoomer progressivement, double-clic pour agrandir')}
    >
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onZoomTo(zoom - 0.25)} aria-label={t('Zoom arrière')} disabled={zoom <= VIEWER_ZOOM_MIN}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <button type="button" className="t-caption min-w-[3.25rem] rounded px-1 text-center tabular-nums hover:bg-surface-2" onClick={() => onZoomTo(1)} aria-label={`${t('Zoom')} ${Math.round(zoom * 100)} % — ${t('réinitialiser')}`}>
        {Math.round(zoom * 100)} %
      </button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onZoomTo(zoom + 0.25)} aria-label={t('Zoom avant')} disabled={zoom >= VIEWER_ZOOM_MAX}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onRotate} aria-label={t('Pivoter de 90°')} title={t('Pivoter de 90°')}>
        <RotateCw className="h-4 w-4" />
      </Button>
      {children}
    </div>
  );
}

interface PdfCanvasProps {
  src: string;
  title?: string;
  /** Rendered when pdfjs fails to load or parse the file (graceful iframe). */
  fallback?: React.ReactNode;
}

export default function PdfCanvas({ src, title, fallback }: PdfCanvasProps) {
  const t = useT();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageNum, setPageNum] = useState(1); // 1-based
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  // Container size (ResizeObserver) drives the fit-to-pane base scale.
  const [paneSize, setPaneSize] = useState({ w: 0, h: 0 });

  const draggingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const renderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRenderRef = useRef(true);
  const lastParamsRef = useRef<{ page: number; rot: number } | null>(null);

  // Load the document (same worker setup as /viewer).
  useEffect(() => {
    let cancelled = false;
    let loadedDoc: any = null;
    setStatus('loading');
    setPdfDoc(null);
    setPageCount(0);
    setPageNum(1);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
    firstRenderRef.current = true;
    lastParamsRef.current = null;
    (async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        const response = await fetch(src);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        if (cancelled) { doc.destroy?.(); return; }
        loadedDoc = doc;
        setPdfDoc(doc);
        setPageCount(doc.numPages);
        setStatus('ready');
      } catch (e) {
        console.warn('[pdf-canvas] pdfjs load failed, falling back:', e);
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      loadedDoc?.destroy?.();
    };
  }, [src]);

  // Track the pane size so the base scale fits the page into the viewer.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setPaneSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Render the CURRENT page only. CSS box stays at the fit size; the backing
  // store is fit × zoom × dpr (capped) so the CSS `scale(zoom)` transform on
  // the wrapper stays crisp — the /viewer pattern. Zoom-driven re-renders are
  // debounced 250 ms; page/rotation/size changes render immediately.
  useEffect(() => {
    if (!pdfDoc || paneSize.w <= 0 || paneSize.h <= 0) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const base = page.getViewport({ scale: 1 });
        // Fit accounts for the quarter-turn: sideways pages fit their rotated
        // bounding box into the pane.
        const sideways = ((rotation % 180) + 180) % 180 !== 0;
        const boxW = sideways ? base.height : base.width;
        const boxH = sideways ? base.width : base.height;
        const pad = 16;
        const fit = Math.max(
          0.1,
          Math.min((paneSize.w - pad) / boxW, (paneSize.h - pad) / boxH),
        );
        const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2);
        const renderScale = fit * Math.max(1, zoom) * dpr;
        const hires = page.getViewport({ scale: renderScale });
        canvas.width = Math.floor(hires.width);
        canvas.height = Math.floor(hires.height);
        canvas.style.width = `${base.width * fit}px`;
        canvas.style.height = `${base.height * fit}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        renderTaskRef.current?.cancel();
        const task = page.render({ canvasContext: ctx, viewport: hires });
        renderTaskRef.current = task;
        await task.promise;
      } catch (e: any) {
        // RenderingCancelledException is expected on rapid zoom/page changes.
        if (e?.name !== 'RenderingCancelledException') {
          console.warn('[pdf-canvas] page render failed:', e);
        }
      }
    };

    // Page / rotation changes render immediately; zoom and pane-size changes
    // (divider drag) are debounced 250 ms like /viewer.
    const prev = lastParamsRef.current;
    const debounced = !!prev && prev.page === pageNum && prev.rot === rotation && !firstRenderRef.current;
    lastParamsRef.current = { page: pageNum, rot: rotation };
    if (!debounced) {
      firstRenderRef.current = false;
      renderPage();
      return;
    }
    if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    renderTimeoutRef.current = setTimeout(renderPage, 250);
    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [pdfDoc, pageNum, zoom, rotation, paneSize]);

  const applyZoom = (next: number) => {
    const clamped = Math.min(VIEWER_ZOOM_MAX, Math.max(VIEWER_ZOOM_MIN, +next.toFixed(3)));
    setZoom(clamped);
    if (clamped === 1) setPan({ x: 0, y: 0 });
  };

  useWheelZoomNotch(wrapRef, (direction) => {
    setZoom((prev) => {
      const next = Math.min(VIEWER_ZOOM_MAX, Math.max(VIEWER_ZOOM_MIN, +(direction > 0 ? prev * 1.3 : prev / 1.3).toFixed(3)));
      if (next === 1) setPan({ x: 0, y: 0 });
      return next;
    });
  });

  const goToPage = (next: number) => {
    const clamped = Math.min(pageCount, Math.max(1, next));
    if (clamped === pageNum) return;
    setPageNum(clamped);
    setPan({ x: 0, y: 0 });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (zoom === 1) {
      setZoom(2.5);
    } else {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  };
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom === 1) return;
    draggingRef.current = true;
    lastRef.current = { x: e.clientX, y: e.clientY };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current || !lastRef.current) return;
    const dx = e.clientX - lastRef.current.x;
    const dy = e.clientY - lastRef.current.y;
    lastRef.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };
  const stopDrag = () => {
    draggingRef.current = false;
    lastRef.current = null;
  };

  if (status === 'error') {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <p className="text-xs text-on-ink/70">{t('Impossible de charger le fichier')}</p>
    );
  }

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <div
        className={cn(
          'flex h-full w-full select-none items-center justify-center overflow-hidden',
          zoom > 1 ? (draggingRef.current ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-default',
        )}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
        role="img"
        aria-label={title || t('Document PDF')}
      >
        <div
          className="transition-transform duration-150 ease-standard motion-reduce:transition-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          }}
        >
          {/* The page is the document (white by nature) on the dark backdrop. */}
          <canvas ref={canvasRef} className="block bg-white shadow-raised" />
        </div>
      </div>
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="animate-pulse text-xs text-on-ink/70">{t('Chargement du PDF…')}</span>
        </div>
      )}
      {status === 'ready' && (
        <ViewerZoomPill zoom={zoom} onZoomTo={applyZoom} onRotate={() => setRotation((r) => (r + 90) % 360)}>
          {pageCount > 1 && (
            <>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => goToPage(pageNum - 1)} aria-label={t('Page précédente')} disabled={pageNum <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="t-caption min-w-[3rem] px-1 text-center tabular-nums" aria-live="polite">
                {pageNum} / {pageCount}
              </span>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => goToPage(pageNum + 1)} aria-label={t('Page suivante')} disabled={pageNum >= pageCount}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
        </ViewerZoomPill>
      )}
    </div>
  );
}
