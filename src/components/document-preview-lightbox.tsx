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
 */

import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

export interface DocumentPreviewLightboxDoc {
  url: string;
  nom: string;
}

interface DocumentPreviewLightboxProps {
  doc: DocumentPreviewLightboxDoc | null;
  onClose: () => void;
  /** Optional. When set, shows a download button in the header. */
  onDownload?: (doc: DocumentPreviewLightboxDoc) => void;
}

function isImageName(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(name || '');
}

export function DocumentPreviewLightbox({ doc, onClose, onDownload }: DocumentPreviewLightboxProps) {
  if (!doc) return null;
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b shrink-0 flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-sm truncate flex-1">{doc.nom}</DialogTitle>
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
        <div className="flex-1 overflow-hidden bg-slate-900 flex items-center justify-center">
          {isImageName(doc.nom) ? (
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
                <img src={doc.url} className="max-w-full max-h-full object-contain select-none" alt={doc.nom} draggable={false} />
              </TransformComponent>
            </TransformWrapper>
          ) : (
            <iframe src={doc.url} className="w-full h-full border-none" title={doc.nom} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
