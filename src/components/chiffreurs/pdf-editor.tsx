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
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Save, 
  Loader2, 
  Type, 
  Minus, 
  MousePointer2, 
  Palette,
  Square,
  X,
  Undo2,
  Trash2,
  Maximize2,
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

const COLORS = [
  { name: 'Rouge', value: '#dc2626' },
  { name: 'Bleu', value: '#2563eb' },
  { name: 'Noir', value: '#000000' },
  { name: 'Vert', value: '#16a34a' },
];

export function PdfEditor({ chiffrageId, fileIndex, fileName, fileUrl, onClose }: PdfEditorProps) {
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState(COLORS[0].value);
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
      <DialogContent className="max-w-[calc(98vw/var(--app-zoom))] w-full h-[calc(98vh/var(--app-zoom))] flex flex-col p-0 gap-0 border-none shadow-2xl overflow-hidden rounded-none bg-slate-100">
        <DialogHeader className="px-6 py-3 border-b bg-card shrink-0 z-50 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Correcteur Professionnel
              </DialogTitle>
              <Badge variant="outline" className="font-mono text-[11px]">{fileName}</Badge>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <div className="flex items-center border-r pr-3 gap-1">
                <Button 
                  variant={tool === 'select' ? 'default' : 'ghost'} 
                  size="sm" className="h-8 w-8 p-0" 
                  onClick={() => setTool('select')} title="Sélectionner"
                >
                  <MousePointer2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant={tool === 'line' ? 'default' : 'ghost'} 
                  size="sm" className="h-8 w-8 p-0" 
                  onClick={() => setTool('line')} title="Barrer (Horizontal)"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Button 
                  variant={tool === 'text' ? 'default' : 'ghost'} 
                  size="sm" className="h-8 w-8 p-0" 
                  onClick={() => setTool('text')} title="Texte de correction"
                >
                  <Type className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center border-r pr-3 gap-1.5">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className={cn(
                      "w-5 h-5 rounded-full border-2 transition-all",
                      color === c.value ? "border-slate-900 scale-125" : "border-transparent"
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>

              <div className="flex items-center border-r pr-3 gap-2">
                <Button
                  variant={hasBorder ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-[11px] px-2"
                  onClick={() => setHasBorder(!hasBorder)}
                >
                  <Square className={cn("h-3 w-3 mr-1", !hasBorder && "opacity-30")} />
                  Bordure
                </Button>
              </div>

              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={deleteSelected} disabled={!selectedId}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setAnnotations(annotations.slice(0, -1))}>
                  <Undo2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-50 border rounded-lg px-2 mr-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}><ZoomOut className="h-3.5 w-3.5" /></Button>
                <span className="text-[11px] font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(2, zoom + 0.1))}><ZoomIn className="h-3.5 w-3.5" /></Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                Enregistrer
              </Button>
              <Button variant="default" size="sm" className="bg-primary shadow-lg shadow-primary/20" onClick={handleExportPdf} disabled={isExporting}>
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
                Exporter PDF
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-10 flex justify-center bg-slate-200" ref={containerRef}>
          <div 
            ref={canvasRef}
            className="relative bg-white shadow-2xl overflow-hidden cursor-crosshair origin-top transition-transform duration-200"
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
                  "absolute group transition-shadow",
                  selectedId === a.id && "ring-2 ring-blue-400 ring-offset-2"
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
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="px-6 py-2 border-t bg-card shrink-0">
          <div className="flex items-center justify-between w-full">
            <p className="text-[11px] text-muted-foreground uppercase font-black tracking-widest opacity-40">
              DashFlow Canvas Engine — Mode "Correction Native" Manuel
            </p>
            <div className="flex gap-4">
              <span className="text-[11px] text-muted-foreground italic">
                Cliquez pour modifier un texte. Utilisez l'outil "Barre" pour corriger les prix originaux.
              </span>
              <Button variant="ghost" size="sm" onClick={onClose} className="font-bold text-xs h-7">Fermer</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
