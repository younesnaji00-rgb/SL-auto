'use client';

import * as React from 'react';
import { useMemo, useState, forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Eye, EyeOff, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TransformWrapper as RawTransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
// v4 render-prop typings are too strict; cast so the documented children-function API works.
const TransformWrapper = RawTransformWrapper as unknown as React.ComponentType<any>;

interface UploadedFile {
  file: File;
  preview: string;
}

interface DocumentViewerProps {
  files: UploadedFile[];
  currentStep: number;
  visible: boolean;
  onToggle: () => void;
}

export interface DocumentViewerHandle {
  /** Pan/zoom the viewer to a normalized region (0-1 coords) of the current file */
  focusRegion: (region: { xMin: number; yMin: number; xMax: number; yMax: number }) => void;
  setCurrentFile: (index: number) => void;
}

const stepFieldLabels: Record<number, string[]> = {
  2: ['Expert', 'Type Dossier', 'Nature du dossier', 'Mode', 'Compagnie', 'Intermédiaire', 'Ref Expert', 'Ref Compagnie', 'N° Police', 'Date Requête', 'Réparateur', 'Adversaire', 'Assuré', 'Téléphone', 'Marque', 'Modèle', 'Matricule', 'Date Sinistre', 'Date MEC'],
  3: ['Agent de Terrain', 'Type Mission', 'Date RDV', 'Heure', 'Zone', 'Adresse', 'Observation'],
};

const DocumentViewer = forwardRef<DocumentViewerHandle, DocumentViewerProps>(function DocumentViewer(
  { files, currentStep, visible, onToggle },
  ref
) {
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const transformRef = useRef<any>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);

  const blobUrls = useMemo(() => {
    return files.map(f => {
      if (f.file.type === 'application/pdf') {
        return URL.createObjectURL(f.file);
      }
      return f.preview;
    });
  }, [files]);

  // Reset zoom when switching files
  useEffect(() => {
    transformRef.current?.resetTransform();
  }, [currentFileIndex]);

  useImperativeHandle(ref, () => ({
    setCurrentFile: (index: number) => {
      if (index >= 0 && index < files.length) setCurrentFileIndex(index);
    },
    focusRegion: ({ xMin, yMin, xMax, yMax }) => {
      const ctrl = transformRef.current;
      const target = imageRef.current || pdfContainerRef.current;
      if (!ctrl || !target) return;
      const box = target.getBoundingClientRect();
      const parent = target.parentElement?.parentElement; // TransformComponent wrapper
      if (!parent) return;
      const viewport = parent.getBoundingClientRect();
      const regionW = (xMax - xMin) * box.width;
      const regionH = (yMax - yMin) * box.height;
      if (regionW <= 0 || regionH <= 0) return;
      const scale = Math.min(viewport.width / regionW, viewport.height / regionH, 3);
      const regionCenterX = (xMin + xMax) / 2 * box.width;
      const regionCenterY = (yMin + yMax) / 2 * box.height;
      const x = viewport.width / 2 - regionCenterX * scale;
      const y = viewport.height / 2 - regionCenterY * scale;
      ctrl.setTransform(x, y, scale, 300);
    },
  }), [files.length]);

  if (files.length === 0) return null;

  const currentFile = files[currentFileIndex];
  const isPdf = currentFile?.file.type === 'application/pdf';
  const labels = stepFieldLabels[currentStep] || [];
  const currentUrl = blobUrls[currentFileIndex] || '';

  return (
    <div className="relative h-full flex flex-col">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="absolute -left-10 top-4 z-10 h-8 w-8 p-0 rounded-l-md rounded-r-none border-r-0 shadow-md"
        title={visible ? 'Masquer le document' : 'Afficher le document'}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>

      {visible && (
        <div className="flex flex-col h-full border rounded-lg bg-card shadow-sm overflow-hidden">
          <TransformWrapper
            ref={transformRef}
            minScale={0.5}
            maxScale={5}
            initialScale={1}
            centerOnInit
            limitToBounds={false}
            doubleClick={{ mode: 'zoomIn', step: 0.7 }}
            wheel={{ step: 0.15 }}
            pinch={{ step: 5 }}
            panning={{ velocityDisabled: true }}
            onTransformed={(_: any, state: any) => setScale(state.scale)}
          >
            {({ zoomIn, zoomOut, resetTransform }: any) => (
              <>
                <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-semibold truncate max-w-[200px]">{currentFile?.file.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {currentFileIndex + 1}/{files.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => zoomOut()} title="Zoom arrière">
                      <ZoomOut className="h-3 w-3" />
                    </Button>
                    <span className="text-[10px] font-mono w-10 text-center">
                      {Math.round(scale * 100)}%
                    </span>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => zoomIn()} title="Zoom avant">
                      <ZoomIn className="h-3 w-3" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => resetTransform()} title="Ajuster">
                      <Maximize2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {files.length > 1 && (
                  <div className="flex items-center justify-center gap-2 py-1.5 border-b shrink-0">
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentFileIndex(i => Math.max(0, i - 1))} disabled={currentFileIndex === 0}>
                      <ChevronLeft className="h-3 w-3" />
                    </Button>
                    {files.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentFileIndex(i)}
                        className={cn(
                          "w-2 h-2 rounded-full transition-colors",
                          i === currentFileIndex ? "bg-blue-600" : "bg-muted-foreground/30"
                        )}
                      />
                    ))}
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentFileIndex(i => Math.min(files.length - 1, i + 1))} disabled={currentFileIndex === files.length - 1}>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                )}

                <div className="flex-1 bg-muted/10 overflow-hidden">
                  <TransformComponent
                    wrapperClass="!w-full !h-full"
                    contentClass="!w-full !h-full flex items-start justify-center"
                  >
                    {isPdf ? (
                      <div ref={pdfContainerRef} className="w-full h-full">
                        <iframe
                          src={currentUrl}
                          className="border-0 w-full h-full pointer-events-none"
                          title="Document PDF"
                        />
                      </div>
                    ) : currentFile.preview ? (
                      <img
                        ref={imageRef}
                        src={currentUrl}
                        alt="Document"
                        className="rounded shadow-sm max-w-full h-auto select-none"
                        draggable={false}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                        Aperçu non disponible
                      </div>
                    )}
                  </TransformComponent>
                </div>
              </>
            )}
          </TransformWrapper>

          {labels.length > 0 && (
            <div className="shrink-0 px-3 py-2 border-t bg-muted/20">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Champs de cette étape</p>
              <div className="flex flex-wrap gap-1">
                {labels.map(label => (
                  <span key={label} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default DocumentViewer;
