'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
  const [selectedStampId, setSelectedStampId] = useState<string>(NONE_VALUE);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [currentBlob, setCurrentBlob] = useState<Blob | null>(null);
  const [rendering, setRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [stampWarning, setStampWarning] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [renderTick, setRenderTick] = useState(0);

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
    }
  }, [open]);

  // Render pipeline: debounce stamp change, resolve stamp image, run renderer,
  // publish blob URL. Revoke previous blob URL when superseded / on unmount.
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
        const blob = renderDevisPdf(snapshot, { docType, stampImage, titleOverride });
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setCurrentBlob(blob);
        setIframeUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
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
  }, [open, selectedStampId, snapshot, docType, titleOverride, stamps, renderTick]);

  // Revoke the last iframe URL when the dialog closes / on unmount.
  useEffect(() => {
    if (!open && iframeUrl) {
      URL.revokeObjectURL(iframeUrl);
      setIframeUrl(null);
      setCurrentBlob(null);
    }
  }, [open, iframeUrl]);
  useEffect(() => {
    return () => {
      if (iframeUrl) URL.revokeObjectURL(iframeUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Aperçu avant enregistrement</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[70vh] rounded-md border overflow-hidden bg-muted/20">
          {iframeUrl && !renderError ? (
            <iframe
              title="Aperçu du devis"
              src={iframeUrl}
              className="w-full h-full"
            />
          ) : null}
          {(rendering || (!iframeUrl && !renderError)) && (
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

        {stampWarning && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {stampWarning}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 sm:min-w-[260px]">
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
