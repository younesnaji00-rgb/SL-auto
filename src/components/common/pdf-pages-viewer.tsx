'use client';

/**
 * PdfPagesViewer — the phone way to read a PDF inside the app
 * (docs/research/mobile-record-pages.md §E8; mobile-synthesis §6 « Lightbox »).
 *
 * Why not an `<iframe>`: mobile Safari renders an embedded PDF as an IMAGE of
 * its FIRST PAGE only (Apple developer forum), and the "open the file instead"
 * workaround puts a home-screen web app in a navigation dead-end. Chrome
 * Android opens its native viewer in the SAME tab, which loses the record the
 * user was reading. So on phones we render the pages ourselves.
 *
 * Rules taken from the sources and implemented here:
 *   - pdf.js FAQ: "create and render only visible pages"; a page is
 *     `816×1056 px at 96 DPI … multiply each dimension by devicePixelRatio`.
 *     → scale = container width / page width, times a devicePixelRatio CAPPED
 *       AT 2 (iOS 15 crashes when many big canvases live at once — react-pdf
 *       issue; "limit the number of documents rendered simultaneously").
 *   - react-pdf discussion: "virtualization to display only 3-4 pages at a
 *     time" → only the visible page ± 1 keeps a canvas; the others collapse
 *     back to a sized placeholder (memory is released, scroll position is
 *     preserved because the placeholder keeps the page's height).
 *
 * The loader mirrors `pdf-thumbnail.tsx` exactly (legacy single-file build +
 * `/pdf.worker.min.mjs`), so Turbopack never splits pdf.mjs into a chunk whose
 * hash goes stale between rebuilds.
 */

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

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

/** Never rasterise above 2× — iOS drops big canvases (react-pdf #1120). */
const MAX_DPR = 2;
/** Hard ceiling on a single canvas edge (WebKit refuses ~4 096 px+ textures). */
const MAX_CANVAS_EDGE = 4096;

export interface PdfPagesViewerProps {
  url: string;
  /** Reported as the reader scrolls: 1-based current page + total. */
  onPageChange?: (page: number, total: number) => void;
  /** Extra classes on the scroll container. */
  className?: string;
}

interface PageState {
  /** Height / width of page 1, used to size every placeholder before render. */
  ratio: number;
  total: number;
}

/**
 * One page. Mounts a canvas only while `active`; otherwise it is an empty box
 * of the right height so the scroller never jumps.
 */
function PdfPage({
  pdfDoc,
  pageNumber,
  active,
  width,
  ratio,
  onObserve,
}: {
  pdfDoc: any;
  pageNumber: number;
  active: boolean;
  width: number;
  ratio: number;
  onObserve: (el: HTMLElement) => () => void;
}) {
  const holderRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [height, setHeight] = React.useState<number>(Math.round(width * ratio));

  React.useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    return onObserve(el);
  }, [onObserve]);

  React.useEffect(() => {
    setHeight((h) => (h > 0 ? h : Math.round(width * ratio)));
  }, [width, ratio]);

  React.useEffect(() => {
    if (!active || !pdfDoc || width <= 0) return;
    let cancelled = false;
    let task: any = null;
    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNumber);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const cssScale = width / base.width;
        const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, MAX_DPR);
        let scale = cssScale * dpr;
        // Guard the texture ceiling on very tall pages (A0 plans, long scans).
        const longEdge = Math.max(base.width, base.height) * scale;
        if (longEdge > MAX_CANVAS_EDGE) scale *= MAX_CANVAS_EDGE / longEdge;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const cssHeight = Math.round(width * (base.height / base.width));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${cssHeight}px`;
        setHeight(cssHeight);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        task = page.render({ canvasContext: ctx, viewport });
        await task.promise;
      } catch (e: any) {
        // A cancelled render (fast scrolling past a page) is not an error.
        if (e?.name !== 'RenderingCancelledException') console.warn('[pdf-pages-viewer] page render failed:', e);
      }
    })();
    return () => {
      cancelled = true;
      try { task?.cancel(); } catch { /* ignore */ }
    };
  }, [active, pdfDoc, pageNumber, width]);

  return (
    <div
      ref={holderRef}
      data-pdf-page={pageNumber}
      className="relative mx-auto bg-white"
      style={{ width, height }}
    >
      {active ? (
        <canvas ref={canvasRef} className="block h-full w-full" aria-label={`Page ${pageNumber}`} />
      ) : (
        <div className="h-full w-full" aria-hidden />
      )}
    </div>
  );
}

export function PdfPagesViewer({ url, onPageChange, className }: PdfPagesViewerProps) {
  const t = useT();
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = React.useState<any>(null);
  const [meta, setMeta] = React.useState<PageState | null>(null);
  const [error, setError] = React.useState(false);
  const [width, setWidth] = React.useState(0);
  const [visible, setVisible] = React.useState<Set<number>>(() => new Set([1]));

  // ── Load the document once per url.
  React.useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setPdfDoc(null);
    setMeta(null);
    setError(false);
    setVisible(new Set([1]));
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const res = await fetch(url);
        if (!res.ok) throw new Error(`fetch ${res.status}`);
        const buf = await res.arrayBuffer();
        const docu = await pdfjs.getDocument({ data: buf }).promise;
        if (cancelled) { try { docu.destroy(); } catch { /* ignore */ } return; }
        const first = await docu.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        setPdfDoc(docu);
        setMeta({ ratio: vp.height / vp.width, total: docu.numPages });
      } catch (e) {
        console.warn('[pdf-pages-viewer] load failed:', e);
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  // ── Scale to width (page fills the scroller, 8 px breathing room each side).
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(0, el.clientWidth - 16));
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pdfDoc]);

  // ── Visibility: one observer for every page holder.
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  React.useEffect(() => {
    const root = scrollerRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        setVisible((prev) => {
          const next = new Set(prev);
          let changed = false;
          for (const e of entries) {
            const n = Number((e.target as HTMLElement).dataset.pdfPage);
            if (!n) continue;
            if (e.isIntersecting && !next.has(n)) { next.add(n); changed = true; }
            if (!e.isIntersecting && next.has(n)) { next.delete(n); changed = true; }
          }
          return changed ? next : prev;
        });
      },
      { root, rootMargin: '0px', threshold: 0.01 },
    );
    observerRef.current = io;
    return () => { io.disconnect(); observerRef.current = null; };
  }, [pdfDoc]);

  // Pages register themselves; the returned callback unobserves on unmount.
  // `observerEpoch` re-runs every page's registration effect after the
  // observer is rebuilt (new document), so no page is left unwatched.
  const [observerEpoch, setObserverEpoch] = React.useState(0);
  React.useEffect(() => { setObserverEpoch((n) => n + 1); }, [pdfDoc]);
  const observe = React.useCallback(
    (el: HTMLElement) => {
      const io = observerRef.current;
      if (!io) return () => {};
      io.observe(el);
      return () => io.unobserve(el);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [observerEpoch],
  );

  // Current page = the lowest visible one (what the reader is on).
  const current = React.useMemo(() => {
    if (visible.size === 0) return 1;
    return Math.min(...Array.from(visible));
  }, [visible]);

  const changeRef = React.useRef(onPageChange);
  changeRef.current = onPageChange;
  React.useEffect(() => {
    if (meta) changeRef.current?.(current, meta.total);
  }, [current, meta]);

  // Visible ± 1 keeps a canvas (react-pdf: 3–4 pages at a time, never more).
  const isActive = React.useCallback(
    (n: number) => {
      if (visible.size === 0) return n === 1;
      const min = Math.min(...Array.from(visible));
      const max = Math.max(...Array.from(visible));
      return n >= min - 1 && n <= max + 1;
    },
    [visible],
  );

  if (error) {
    return (
      <div className={cn('flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center', className)}>
        <p className="text-[15px] text-white/80">{t('Aperçu indisponible sur cet appareil.')}</p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center rounded-md bg-white/10 px-4 text-[15px] font-semibold text-white"
        >
          {t('Ouvrir')}
        </a>
      </div>
    );
  }

  return (
    <div
      ref={scrollerRef}
      className={cn('h-full w-full overflow-y-auto overscroll-contain bg-black', className)}
      role="document"
    >
      {!pdfDoc || !meta ? (
        <div className="flex h-full w-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white/60" aria-label={t('Chargement…')} />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-2">
          {Array.from({ length: meta.total }, (_, i) => i + 1).map((n) => (
            <PdfPage
              key={n}
              pdfDoc={pdfDoc}
              pageNumber={n}
              active={isActive(n)}
              width={width}
              ratio={meta.ratio}
              onObserve={observe}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default PdfPagesViewer;
