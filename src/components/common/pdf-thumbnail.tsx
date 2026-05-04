'use client';
import React, { useEffect, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Module-level cache: url → dataUrl. Survives across mounts within the session.
const thumbnailCache = new Map<string, string>();

let pdfJsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (!pdfJsPromise) {
    // Use the legacy single-file build to avoid Turbopack splitting pdf.mjs
    // into a dynamic chunk whose hash mismatches after rebuilds (manifests as
    // "Failed to load chunk node_modules_pdfjs-dist_build_pdf_mjs_*.js").
    pdfJsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjsLib) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      return pdfjsLib;
    });
  }
  return pdfJsPromise;
}

export function PdfThumbnail({ url, className, width = 96 }: { url: string; className?: string; width?: number }) {
  const [dataUrl, setDataUrl] = useState<string | null>(thumbnailCache.get(url) || null);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    if (dataUrl || errored || !url) return;
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await loadPdfJs();
        const response = await fetch(url);
        if (!response.ok) throw new Error(`fetch ${response.status}`);
        const buf = await response.arrayBuffer();
        const pdfDoc = await pdfjs.getDocument({ data: buf }).promise;
        const page = await pdfDoc.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const scale = width / baseViewport.width;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no 2d context');
        await page.render({ canvasContext: ctx, viewport }).promise;
        const result = canvas.toDataURL('image/png');
        thumbnailCache.set(url, result);
        if (!cancelled) setDataUrl(result);
      } catch (e) {
        console.warn('[pdf-thumbnail] render failed:', e);
        if (!cancelled) setErrored(true);
      }
    })();
    return () => { cancelled = true; };
  }, [url, width, dataUrl, errored]);

  if (errored || !url) {
    return (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }
  if (!dataUrl) {
    return (
      <div className={cn('flex items-center justify-center bg-muted', className)}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/50" />
      </div>
    );
  }
  return <img src={dataUrl} alt="" className={cn('object-cover w-full h-full', className)} loading="lazy" />;
}
