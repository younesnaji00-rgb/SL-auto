'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

const stepFieldLabels: Record<number, string[]> = {
  2: ['Expert', 'Type Dossier', 'Nature', 'Mode', 'Compagnie', 'Intermédiaire', 'Ref Expert', 'Ref Compagnie', 'N° Police', 'Date Requête', 'Réparateur', 'Adversaire', 'Assuré', 'Téléphone', 'Marque', 'Modèle', 'Matricule', 'Date Sinistre', 'Date MEC'],
  3: ['Agent de Terrain', 'Type Mission', 'Date RDV', 'Heure', 'Zone', 'Adresse', 'Observation'],
};

export default function DocumentViewer({ files, currentStep, visible, onToggle }: DocumentViewerProps) {
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [zoom, setZoom] = useState(100);

  if (files.length === 0) return null;

  const currentFile = files[currentFileIndex];
  const isPdf = currentFile?.file.type === 'application/pdf';
  const labels = stepFieldLabels[currentStep] || [];

  return (
    <div className="relative h-full flex flex-col">
      {/* Toggle Button (always visible) */}
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
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold truncate max-w-[150px]">{currentFile?.file.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {currentFileIndex + 1}/{files.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.max(50, z - 25))} disabled={zoom <= 50}>
                <ZoomOut className="h-3 w-3" />
              </Button>
              <span className="text-[10px] font-mono w-8 text-center">{zoom}%</span>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.min(200, z + 25))} disabled={zoom >= 200}>
                <ZoomIn className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* File Navigation */}
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

          {/* Document Display */}
          <div className="flex-1 overflow-auto bg-muted/10 p-2">
            <div style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center', transition: 'transform 0.2s' }}>
              {isPdf ? (
                <iframe
                  src={URL.createObjectURL(currentFile.file)}
                  className="w-full border-0 rounded"
                  style={{ height: '600px' }}
                  title="Document PDF"
                />
              ) : currentFile.preview ? (
                <img
                  src={currentFile.preview}
                  alt="Document"
                  className="w-full rounded shadow-sm"
                />
              ) : (
                <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                  Aperçu non disponible
                </div>
              )}
            </div>
          </div>

          {/* Current Step Field Indicators */}
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
}
