'use client';

/**
 * Shared in-app lightbox for previewing a single document (image or PDF/iframe).
 *
 * Hosts that want eye-icon "preview" affordances should:
 *   1. Keep a local `useState<{ url, nom } | null>` for the active doc.
 *   2. Set it from their `onOpenDocument` handler (instead of `window.open`).
 *   3. Render `<DocumentPreviewLightbox doc={state} onClose={...} onDownload={...} />`.
 *
 * Images are rendered with `<img>`, everything else with `<iframe>` so the
 * browser's native PDF viewer takes over. No external dependencies.
 *
 * The window follows the media's orientation: a portrait image (or a PDF —
 * assumed A4 portrait) opens a tall window sized from the viewport height;
 * a landscape image opens a wide window whose height follows its ratio.
 */

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, Trash2, X, ZoomIn, ZoomOut } from 'lucide-react';
import { TransformWrapper, TransformComponent, useControls, useTransformEffect } from 'react-zoom-pan-pinch';
import { cn } from '@/lib/utils';

/**
 * Zoom toolbar rendered inside the TransformWrapper (hooks need its context):
 * − / percentage / + / fit. Buttons step 25 %; the wheel is configured on the
 * wrapper to zoom gradually (a few % per notch) instead of jumping.
 */
function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  const [scale, setScale] = React.useState(1);
  useTransformEffect(({ state }) => {
    setScale(state.scale);
  });
  return (
    <div
      className="pointer-events-auto absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full bg-card/95 px-1 py-0.5 shadow-raised ring-1 ring-hairline"
      role="group"
      aria-label="Zoom"
      title="Molette pour zoomer progressivement, double-clic pour agrandir"
    >
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomOut(0.3, 150)} aria-label="Zoom arrière" disabled={scale <= 1}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <button type="button" className="t-caption min-w-[3.25rem] rounded px-1 text-center tabular-nums hover:bg-surface-2" onClick={() => resetTransform(150)} aria-label={`Zoom ${Math.round(scale * 100)} % — réinitialiser`}>
        {Math.round(scale * 100)} %
      </button>
      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomIn(0.3, 150)} aria-label="Zoom avant" disabled={scale >= 8}>
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}

export interface DocumentPreviewLightboxDoc {
  url: string;
  nom: string;
}

interface DocumentPreviewLightboxProps {
  doc: DocumentPreviewLightboxDoc | null;
  onClose: () => void;
  /** Optional. When set, shows a download button in the header. */
  onDownload?: (doc: DocumentPreviewLightboxDoc) => void;
  onDelete?: (doc: DocumentPreviewLightboxDoc) => void;
  /**
   * Multi-page documents (carte grise recto/verso, a devis photographed in
   * two shots…): the sibling files of `doc`. Enables ‹ › paging, arrow keys
   * and a "i / n" counter; `doc` must be one of them.
   */
  pages?: DocumentPreviewLightboxDoc[];
  /** Called when the user pages; the host updates `doc`. */
  onPageChange?: (doc: DocumentPreviewLightboxDoc, index: number) => void;
}

function isImageName(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name || '');
}

/** Header row height (px) — used to derive the content box from the viewport. */
const HEADER_H = 52;
/** A4 portrait width/height — default for PDFs and unknown documents. */
const A4_RATIO = 210 / 297;

export function DocumentPreviewLightbox({ doc, onClose, onDownload, onDelete, pages, onPageChange }: DocumentPreviewLightboxProps) {
  const isImage = doc ? isImageName(doc.nom) : false;
  // width / height of the media; null until a raster image reports its
  // natural size. Non-images assume A4 portrait immediately.
  const [imgRatio, setImgRatio] = React.useState<number | null>(null);
  React.useEffect(() => {
    setImgRatio(null);
  }, [doc?.url]);

  // Paging across sibling files of the same document.
  const pageList = pages && pages.length > 1 ? pages : null;
  const pageIndex = pageList && doc ? Math.max(0, pageList.findIndex((p) => p.url === doc.url)) : 0;
  const goTo = React.useCallback(
    (i: number) => {
      if (!pageList || !onPageChange) return;
      const next = (i + pageList.length) % pageList.length;
      onPageChange(pageList[next], next);
    },
    [pageList, onPageChange],
  );
  React.useEffect(() => {
    if (!pageList || !doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(pageIndex + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(pageIndex - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pageList, doc, pageIndex, goTo]);

  // Wheel notch gate: some mice and every trackpad emit several wheel events
  // per physical notch/gesture. Let one event through per ~100 px of
  // accumulated deltaY (one notch) and swallow the rest in the capture phase
  // so the zoom library only ever sees one step at a time.
  const mediaRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = mediaRef.current;
    if (!el || !isImage) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      acc += Math.abs(e.deltaY);
      if (acc >= 100) {
        acc = 0;
        return; // passes through to the zoom library
      }
      e.preventDefault();
      e.stopPropagation();
    };
    el.addEventListener('wheel', onWheel, { capture: true, passive: false });
    return () => el.removeEventListener('wheel', onWheel, { capture: true } as EventListenerOptions);
  }, [isImage, doc?.url]);

  if (!doc) return null;

  const ratio = isImage ? imgRatio : A4_RATIO;
  const portrait = ratio !== null && ratio < 1;
  const landscape = ratio !== null && ratio >= 1;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        hideCloseButton
        className={cn(
          // Below lg the dialog base renders a full-width bottom sheet; the
          // orientation-aware sizing only applies to the centred lg+ modal
          // (lg-prefixed so it outranks the base's `lg:max-w-lg`).
          // `lightbox-calm` = calm scoped entrance (globals.css) instead of
          // the shadcn zoom+slide default.
          'lightbox-calm flex h-[calc(85dvh/var(--app-zoom))] flex-col overflow-hidden p-0',
          // Ratio unknown yet (image still loading): the previous neutral box.
          ratio === null && 'lg:h-[calc(85svh/var(--app-zoom))] lg:max-w-4xl',
          // Portrait media → tall window: height leads, width follows the ratio.
          portrait && 'lg:h-[calc(92svh/var(--app-zoom))] lg:w-auto lg:min-w-[420px] lg:max-w-[calc(96vw/var(--app-zoom))]',
          // Landscape media → wide window: width leads, height follows.
          landscape && 'lg:h-auto lg:max-h-[calc(92svh/var(--app-zoom))] lg:w-[min(calc(96vw/var(--app-zoom)),1200px)] lg:max-w-[calc(96vw/var(--app-zoom))]',
        )}
        style={ratio !== null ? ({ ['--ar' as string]: String(ratio) } as React.CSSProperties) : undefined}
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <DialogTitle className="flex-1 truncate text-sm">{doc.nom}</DialogTitle>
          {pageList && (
            <div className="flex shrink-0 items-center gap-1" aria-label="Pages du document">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goTo(pageIndex - 1)} title="Page précédente" aria-label="Page précédente">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="t-caption tabular-nums" aria-live="polite">{pageIndex + 1} / {pageList.length}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => goTo(pageIndex + 1)} title="Page suivante" aria-label="Page suivante">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
          {onDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDownload(doc)}
              title="Telecharger"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(doc)}
              title="Supprimer"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title="Fermer"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        <div
          ref={mediaRef}
          className={cn(
            'relative flex max-w-full items-center justify-center overflow-hidden bg-ink-solid',
            ratio === null && 'flex-1',
            portrait && 'min-h-0 flex-1 lg:aspect-[var(--ar)]',
            landscape && 'min-h-0 flex-1 lg:flex-none lg:w-full lg:aspect-[var(--ar)]',
          )}
          style={landscape ? { maxHeight: `calc((92svh - ${HEADER_H}px) / var(--app-zoom))` } : undefined}
        >
          {isImage ? (
            <TransformWrapper
              minScale={1}
              maxScale={8}
              doubleClick={{ mode: 'zoomIn', step: 0.5, animationTime: 200 }}
              // One wheel notch = +30 %. `smooth` MUST be off: with it on the
              // library multiplies `step` by |deltaY| (≈100 per notch on a
              // mouse), which is what made a single notch jump to 600 %.
              smooth={false}
              wheel={{ step: 0.3 }}
              pinch={{ step: 5 }}
              zoomAnimation={{ animationTime: 150 }}
              centerZoomedOut
            >
              <ZoomControls />
              <TransformComponent
                wrapperClass="!w-full !h-full"
                contentClass="!w-full !h-full flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.url}
                  className="max-h-full max-w-full select-none object-contain"
                  alt={doc.nom}
                  draggable={false}
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    if (el.naturalWidth > 0 && el.naturalHeight > 0) {
                      setImgRatio(el.naturalWidth / el.naturalHeight);
                    }
                  }}
                />
              </TransformComponent>
            </TransformWrapper>
          ) : (
            <iframe src={doc.url} className="h-full w-full border-none" title={doc.nom} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
