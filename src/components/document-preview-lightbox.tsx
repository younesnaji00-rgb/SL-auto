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
import { Download, Trash2, X } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { cn } from '@/lib/utils';

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
}

function isImageName(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name || '');
}

/** Header row height (px) — used to derive the content box from the viewport. */
const HEADER_H = 52;
/** A4 portrait width/height — default for PDFs and unknown documents. */
const A4_RATIO = 210 / 297;

export function DocumentPreviewLightbox({ doc, onClose, onDownload, onDelete }: DocumentPreviewLightboxProps) {
  const isImage = doc ? isImageName(doc.nom) : false;
  // width / height of the media; null until a raster image reports its
  // natural size. Non-images assume A4 portrait immediately.
  const [imgRatio, setImgRatio] = React.useState<number | null>(null);
  React.useEffect(() => {
    setImgRatio(null);
  }, [doc?.url]);

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
          'flex h-[85dvh] flex-col overflow-hidden p-0',
          // Ratio unknown yet (image still loading): the previous neutral box.
          ratio === null && 'lg:h-[85svh] lg:max-w-4xl',
          // Portrait media → tall window: height leads, width follows the ratio.
          portrait && 'lg:h-[92svh] lg:w-auto lg:min-w-[420px] lg:max-w-[96vw]',
          // Landscape media → wide window: width leads, height follows.
          landscape && 'lg:h-auto lg:max-h-[92svh] lg:w-[min(96vw,1200px)] lg:max-w-[96vw]',
        )}
        style={ratio !== null ? ({ ['--ar' as string]: String(ratio) } as React.CSSProperties) : undefined}
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between gap-2 border-b px-4 py-3">
          <DialogTitle className="flex-1 truncate text-sm">{doc.nom}</DialogTitle>
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
          className={cn(
            'flex max-w-full items-center justify-center overflow-hidden bg-ink-solid',
            ratio === null && 'flex-1',
            portrait && 'min-h-0 flex-1 lg:aspect-[var(--ar)]',
            landscape && 'min-h-0 flex-1 lg:flex-none lg:w-full lg:aspect-[var(--ar)]',
          )}
          style={landscape ? { maxHeight: `calc(92svh - ${HEADER_H}px)` } : undefined}
        >
          {isImage ? (
            <TransformWrapper
              minScale={1}
              maxScale={5}
              doubleClick={{ mode: 'zoomIn', step: 0.7 }}
              wheel={{ step: 0.2 }}
            >
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
