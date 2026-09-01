'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Download,
  Save,
  Type,
  Minus,
  MousePointer2,
  Square,
  X,
  Undo2,
  Trash2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { useFirestore, useStorage } from '@/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { enqueueUpload } from '@/lib/offline/upload-queue';
import { cn } from '@/lib/utils';

type Tool = 'select' | 'line' | 'text';

interface Annotation {
  id: string;
  type: 'line' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  color: string;
  hasBorder?: boolean;
}

interface PdfEditorProps {
  chiffrageId: string;
  fileIndex: number;
  fileName: string;
  fileUrl: string;
  onClose: () => void;
}

// DOCUMENT ink, not UI colour: these hexes are what the chiffreur draws on the
// scanned page and they are burned into the exported PDF (html2canvas →
// jsPDF), so they are deliberately outside the token system. The one named
// constant every swatch and stroke reads from.
const DOCUMENT_INK_COLORS = [
  { name: 'Rouge', value: '#dc2626' },
  { name: 'Bleu', value: '#2563eb' },
  { name: 'Noir', value: '#000000' },
  { name: 'Vert', value: '#16a34a' },
];

// Zoom — owner ruling: buttons step 25 %, the percentage resets to fit
// (100 %), Ctrl + wheel ≈ ×1.3 per notch.
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2;
const ZOOM_STEP = 0.25;

type ToolButtonProps = Omit<React.ComponentProps<typeof Button>, 'variant' | 'size'> & {
  /** Tooltip text — names the ACTION (M3 icon buttons); doubles as the aria-label. */
  label: string;
  /** Toggle state: pressed = tonal fill + aria-pressed (two cues, never colour alone). */
  active?: boolean;
};

/**
 * Toolbar icon button — element-specs §18 (Apple HIG toolbars: symbols with
 * a tooltip) + Material 3 icon buttons ("the tooltip describes its action"):
 * 36 px `ghost`, `tonal` when pressed.
 */
const ToolButton = React.forwardRef<HTMLButtonElement, ToolButtonProps>(function ToolButton(
  { label, active, className, children, ...props },
  ref,
) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant={active ? 'tonal' : 'ghost'}
          size="icon"
          className={cn('h-9 w-9', className)}
          aria-label={label}
          aria-pressed={active}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
});

export function PdfEditor({ chiffrageId, fileIndex, fileName, fileUrl, onClose }: PdfEditorProps) {
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState(DOCUMENT_INK_COLORS[0].value);
  const [hasBorder, setHasBorder] = useState(true);
  const [zoom, setZoom] = useState(1);

  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentLine, setCurrentLine] = useState<{ x: number; y: number; width: number } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!db || !chiffrageId) return;
    const fetchExisting = async () => {
      const snap = await getDoc(doc(db, 'chiffrages', chiffrageId));
      if (snap.exists()) {
        const data = snap.data();
        const fileData = data.files?.[fileIndex];
        if (fileData?.annotations) {
          setAnnotations(fileData.annotations);
        }
      }
    };
    fetchExisting();
  }, [db, chiffrageId, fileIndex]);

  // Ctrl/⌘ + wheel zoom on the canvas: one notch (100 px of accumulated
  // deltaY, so multi-event wheels and trackpads count once) = ×1.3 / ÷1.3.
  // Native listener because React wheel events are passive. Pattern:
  // dossier-timeline/step-2-information.tsx compare pane.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) < 100) return;
      const direction = acc < 0 ? 1 : -1;
      acc = 0;
      setZoom((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(direction > 0 ? prev * 1.3 : prev / 1.3).toFixed(3))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'select') return;
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (tool === 'line') {
      setIsDrawing(true);
      setCurrentLine({ x, y, width: 0 });
    } else if (tool === 'text') {
      const newAnnotation: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        x,
        y,
        text: 'Correction...',
        color,
        hasBorder,
      };
      setAnnotations([...annotations, newAnnotation]);
      setSelectedId(newAnnotation.id);
      setTool('select');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || tool !== 'line' || !currentLine || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / zoom;
    const width = currentX - currentLine.x;

    setCurrentLine({ ...currentLine, width });
  };

  const handleMouseUp = () => {
    if (isDrawing && tool === 'line' && currentLine) {
      const newAnnotation: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'line',
        x: currentLine.x,
        y: currentLine.y,
        width: Math.abs(currentLine.width),
        color,
      };
      if (currentLine.width < 0) {
        newAnnotation.x = currentLine.x + currentLine.width;
      }
      setAnnotations([...annotations, newAnnotation]);
    }
    setIsDrawing(false);
    setCurrentLine(null);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setAnnotations(annotations.filter(a => a.id !== selectedId));
    setSelectedId(null);
  };

  const handleSave = async () => {
    if (!db || !chiffrageId) return;
    setIsSaving(true);
    try {
      const docRef = doc(db, 'chiffrages', chiffrageId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const updatedFiles = [...(data.files || [])];
        if (updatedFiles[fileIndex]) {
          updatedFiles[fileIndex].annotations = annotations;
          updatedFiles[fileIndex].status = 'done';
          await updateDoc(docRef, { files: updatedFiles, updatedAt: serverTimestamp() });
          toast({ title: 'Correction enregistrée' });
        }
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);

    try {
      const originalZoom = zoom;
      setZoom(1); // Reset zoom for high-res capture
      await new Promise(r => setTimeout(r, 100));

      const element = canvasRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      const pageHeight = 297;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output('blob');
      const storagePath = `chiffrages/${chiffrageId}/correction_manual_${Date.now()}.pdf`;

      if (navigator.onLine) {
        try {
          const storageRef = ref(storage!, storagePath);
          await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
          const exportUrl = await getDownloadURL(storageRef);

          const docRef = doc(db!, 'chiffrages', chiffrageId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            const updatedFiles = [...(data.files || [])];
            updatedFiles[fileIndex] = { ...updatedFiles[fileIndex], pdfUrl: exportUrl, status: 'done', annotations };
            await updateDoc(docRef, { files: updatedFiles, status: 'done', updatedAt: serverTimestamp() });
          }
        } catch {
          await enqueueUpload({
            fileBlob: pdfBlob,
            fileName: `correction_manual_${Date.now()}.pdf`,
            fileSize: pdfBlob.size,
            contentType: 'application/pdf',
            storagePath,
            firestoreDocPath: 'chiffrages',
            firestoreMetadata: { _chiffrageId: chiffrageId, _fileIndex: fileIndex, _type: 'chiffrage-correction', annotations },
          });
          toast({ title: 'Fichier mis en file d\'attente', description: 'Il sera synchronisé une fois en ligne.' });
        }
      } else {
        await enqueueUpload({
          fileBlob: pdfBlob,
          fileName: `correction_manual_${Date.now()}.pdf`,
          fileSize: pdfBlob.size,
          contentType: 'application/pdf',
          storagePath,
          firestoreDocPath: 'chiffrages',
          firestoreMetadata: { _chiffrageId: chiffrageId, _fileIndex: fileIndex, _type: 'chiffrage-correction', annotations },
        });
        toast({ title: 'Fichier mis en file d\'attente', description: 'Il sera synchronisé une fois en ligne.' });
      }

      const a = document.createElement('a');
      a.href = URL.createObjectURL(pdfBlob);
      a.download = `Correction_Manuelle_${fileName.split('.')[0]}.pdf`;
      a.click();

      setZoom(originalZoom);
      toast({ title: 'PDF exporté avec succès' });
      onClose();
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: "Erreur d'exportation" });
    } finally {
      setIsExporting(false);
    }
  };

  const isPdf = fileName.toLowerCase().endsWith('.pdf');

  return (
    <Dialog open onOpenChange={onClose}>
      {/* Full-viewport workspace; the dialog base already frosts (glass-strong)
          and turns into a bottom sheet below lg. */}
      <DialogContent
        hideCloseButton
        className="flex h-[calc(92dvh/var(--app-zoom))] w-full flex-col gap-0 overflow-hidden p-0 lg:h-[calc(96svh/var(--app-zoom))] lg:max-w-[calc(98vw/var(--app-zoom))]"
      >
        {/* Toolbar — element-specs §18 (Apple HIG toolbars: leading =
            identity, centre = ≤ 3 tool groups on hairline Separators —
            [tools] | [ink: colour · bordure] | [edit: supprimer · annuler] —
            trailing = Enregistrer `tonal` + the ONE filled Exporter PDF).
            Icon buttons 36 px `ghost` with tooltips (M3 icon buttons).
            Gutters 16/24 (no 20 px). */}
        <DialogHeader className="shrink-0 space-y-0 border-b border-hairline px-4 py-2 sm:px-6">
          <TooltipProvider delayDuration={300}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex min-w-0 items-center gap-3">
                <DialogTitle className="t-heading whitespace-nowrap">Correcteur Professionnel</DialogTitle>
                <span className="t-mono min-w-0 truncate text-ink-3" title={fileName}>{fileName}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-0.5" role="group" aria-label="Outils">
                  <ToolButton label="Sélectionner" active={tool === 'select'} onClick={() => setTool('select')}>
                    <MousePointer2 className="h-4 w-4" />
                  </ToolButton>
                  <ToolButton label="Barrer (horizontal)" active={tool === 'line'} onClick={() => setTool('line')}>
                    <Minus className="h-4 w-4" />
                  </ToolButton>
                  <ToolButton label="Texte de correction" active={tool === 'text'} onClick={() => setTool('text')}>
                    <Type className="h-4 w-4" />
                  </ToolButton>
                </div>

                <Separator orientation="vertical" className="h-6" aria-hidden />

                {/* Ink — colour swatches (Apple HIG colour wells: the well shows
                    the current colour; M3 toggle buttons: selection by two cues,
                    ring + aria-pressed) and the border toggle. */}
                <div className="flex items-center gap-2" role="group" aria-label="Encre">
                  <div className="flex items-center gap-1.5" role="group" aria-label="Couleur">
                    {DOCUMENT_INK_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setColor(c.value)}
                        className={cn(
                          "h-5 w-5 rounded-full shadow-rim transition-[box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          color === c.value && "ring-2 ring-ring ring-offset-2 ring-offset-card"
                        )}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                        aria-label={c.name}
                        aria-pressed={color === c.value}
                      />
                    ))}
                  </div>
                  <Button
                    variant={hasBorder ? 'tonal' : 'ghost'}
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setHasBorder(!hasBorder)}
                    aria-pressed={hasBorder}
                  >
                    <Square className={cn("h-3.5 w-3.5", !hasBorder && "opacity-30")} />
                    Bordure
                  </Button>
                </div>

                <Separator orientation="vertical" className="h-6" aria-hidden />

                <div className="flex items-center gap-0.5" role="group" aria-label="Annotations">
                  <ToolButton label="Supprimer la sélection" className="text-ink-3 hover:text-destructive" onClick={deleteSelected} disabled={!selectedId}>
                    <Trash2 className="h-4 w-4" />
                  </ToolButton>
                  <ToolButton label="Annuler la dernière annotation" onClick={() => setAnnotations(annotations.slice(0, -1))} disabled={annotations.length === 0}>
                    <Undo2 className="h-4 w-4" />
                  </ToolButton>
                </div>
              </div>

              <div className="flex-1" />

              <div className="flex items-center gap-2">
                {/* Zoom pill — owner ruling: −/%/+, 25 % steps, % = fit,
                    Ctrl + wheel ≈ ×1.3 per notch (shortcut shown as <Kbd>). */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-0.5 rounded-md bg-surface-2 px-0.5" role="group" aria-label="Zoom">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(ZOOM_MIN, +(zoom - ZOOM_STEP).toFixed(2)))} disabled={zoom <= ZOOM_MIN} aria-label="Zoom arrière"><ZoomOut className="h-3.5 w-3.5" /></Button>
                      <button type="button" className="t-caption min-w-[3rem] rounded px-1 text-center tabular-nums hover:bg-surface-3" onClick={() => setZoom(1)} aria-label={`Zoom ${Math.round(zoom * 100)} % — réinitialiser`}>
                        {Math.round(zoom * 100)} %
                      </button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(ZOOM_MAX, +(zoom + ZOOM_STEP).toFixed(2)))} disabled={zoom >= ZOOM_MAX} aria-label="Zoom avant"><ZoomIn className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-2">
                    <span>Zoom — cliquer le % pour réinitialiser</span>
                    <Kbd>Ctrl</Kbd><span>+ molette</span>
                  </TooltipContent>
                </Tooltip>
                {/* §8 emphasis ladder: Enregistrer `tonal`, Exporter PDF the ONE filled. */}
                <Button variant="tonal" size="sm" className="gap-1.5" onClick={handleSave} loading={isSaving}>
                  {isSaving ? null : <Save className="h-4 w-4" />}
                  Enregistrer
                </Button>
                <Button variant="default" size="sm" className="gap-1.5" onClick={handleExportPdf} loading={isExporting}>
                  {isExporting ? null : <Download className="h-4 w-4" />}
                  Exporter PDF
                </Button>
              </div>
            </div>
          </TooltipProvider>
        </DialogHeader>

        {/* Dark functional backdrop (lightbox media area); the page is the document. */}
        <div className="flex flex-1 justify-center overflow-auto bg-ink-solid p-10" ref={containerRef}>
          <div
            ref={canvasRef}
            className="relative origin-top cursor-crosshair overflow-hidden bg-white shadow-raised transition-transform duration-200 ease-standard motion-reduce:transition-none"
            style={{
              width: '210mm',
              minHeight: '297mm',
              backgroundImage: isPdf ? 'none' : `url(${fileUrl})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center top',
              transform: `scale(${zoom})`
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {isPdf && (
              <iframe
                src={`${fileUrl}#toolbar=0&view=FitH`}
                className="absolute inset-0 w-full h-full pointer-events-none"
                title="Background PDF"
              />
            )}

            {isDrawing && currentLine && tool === 'line' && (
              <div
                className="absolute pointer-events-none"
                style={{
                  left: currentLine.width >= 0 ? currentLine.x : currentLine.x + currentLine.width,
                  top: currentLine.y,
                  width: Math.abs(currentLine.width),
                  height: '2px',
                  backgroundColor: color,
                  opacity: 0.6
                }}
              />
            )}

            {annotations.map((a) => (
              <div
                key={a.id}
                className={cn(
                  "absolute group",
                  selectedId === a.id && "ring-2 ring-ring ring-offset-2"
                )}
                style={{
                  left: a.x,
                  top: a.y,
                  width: a.type === 'line' ? a.width : 'auto',
                  height: a.type === 'line' ? '2px' : 'auto',
                  backgroundColor: a.type === 'line' ? a.color : 'transparent',
                  zIndex: 100
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(a.id);
                }}
              >
                {a.type === 'text' && (
                  // Document content: white box + coloured border is what gets
                  // exported, so it stays literal (not a UI surface).
                  <div
                    contentEditable={selectedId === a.id}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const newText = e.currentTarget.innerText;
                      setAnnotations(annotations.map(anno =>
                        anno.id === a.id ? { ...anno, text: newText } : anno
                      ));
                    }}
                    className={cn(
                      "px-2 py-1 text-xs font-bold whitespace-nowrap outline-none",
                      a.hasBorder ? "bg-white border-2" : "bg-transparent border-none"
                    )}
                    style={{
                      color: a.color,
                      borderColor: a.color,
                      fontSize: '13px',
                      fontFamily: 'Inter, sans-serif'
                    }}
                  >
                    {a.text}
                  </div>
                )}
                {selectedId === a.id && (
                  <div className="absolute -top-6 -right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-5 w-5 rounded-full"
                      onClick={deleteSelected}
                      aria-label="Supprimer l'annotation"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer — §13 dismissive action (`outline`) at the edge; the status
            hint is a `t-caption`. Gutters 16/24. */}
        <DialogFooter className="shrink-0 border-t border-hairline px-4 py-2 sm:justify-between sm:px-6">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <p className="t-caption text-ink-4">
              DashFlow Canvas Engine — Mode "Correction Native" Manuel
            </p>
            <div className="flex items-center gap-4">
              <span className="t-caption hidden sm:inline">
                Cliquez pour modifier un texte. Utilisez l'outil "Barre" pour corriger les prix originaux.
              </span>
              <Button variant="outline" size="sm" onClick={onClose}>Fermer</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
