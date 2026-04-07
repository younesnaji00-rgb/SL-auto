'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, Download, Loader2, Type, Minus,
  MousePointer2, Trash2, ZoomIn, ZoomOut, Eraser,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useFirestore, useStorage } from '@/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────
type Tool = 'select' | 'line' | 'text';

interface Annotation {
  id: string;
  type: 'line' | 'text';
  /** page index (0-based) */
  page: number;
  x: number;
  y: number;
  width?: number;
  thickness?: number;
  fontSize?: number;
  text?: string;
  color: string;
}

const COLORS = [
  { name: 'Rouge', value: '#dc2626' },
  { name: 'Bleu', value: '#2563eb' },
  { name: 'Noir', value: '#000000' },
  { name: 'Vert', value: '#16a34a' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Violet', value: '#7c3aed' },
];

// ── Main Page ────────────────────────────────────────────────────────────────
export default function EditorPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const chiffrageId = searchParams.get('chiffrageId') || '';
  const fileIndex = parseInt(searchParams.get('fileIndex') || '0', 10);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  // State
  const [fileName, setFileName] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState<Tool>('select');
  const [color, setColor] = useState(COLORS[0].value);
  const [fontSize, setFontSize] = useState(16);
  const [lineThickness, setLineThickness] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // PDF state
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageDimensions, setPageDimensions] = useState<{ width: number; height: number }[]>([]);
  const [isImage, setIsImage] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({ width: 794, height: 1123 });

  // Drag state
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  // Line drawing state
  const [lineStart, setLineStart] = useState<{ x: number; y: number; page: number } | null>(null);
  const [linePreview, setLinePreview] = useState<{ x: number; y: number; width: number } | null>(null);

  // ── Load PDF.js ────────────────────────────────────────────────────────────
  const pdfJsRef = useRef<any>(null);

  useEffect(() => {
    const loadPdfJs = async () => {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      pdfJsRef.current = pdfjsLib;
    };
    loadPdfJs();
  }, []);

  // ── Load file data ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!db || !storage || !chiffrageId) return;
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'chiffrages', chiffrageId));
        if (!snap.exists()) return;
        const data = snap.data();
        const file = data.files?.[fileIndex];
        if (!file) return;
        setFileName(file.name || '');
        if (file.annotations?.length) setAnnotations(file.annotations);
        const url = await getDownloadURL(ref(storage, file.storagePath));
        setFileUrl(url);

        const isPdfFile = (file.name || '').toLowerCase().endsWith('.pdf');
        setIsImage(!isPdfFile);

        if (isPdfFile) {
          // Wait for pdfjs to load
          let attempts = 0;
          while (!pdfJsRef.current && attempts < 20) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
          }
          if (pdfJsRef.current) {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const pdfDocument = await pdfJsRef.current.getDocument({ data: arrayBuffer }).promise;
            setPdfDoc(pdfDocument);
            setPageCount(pdfDocument.numPages);

            // Get dimensions for all pages
            const dims: { width: number; height: number }[] = [];
            for (let i = 1; i <= pdfDocument.numPages; i++) {
              const page = await pdfDocument.getPage(i);
              const viewport = page.getViewport({ scale: 1.5 });
              dims.push({ width: viewport.width, height: viewport.height });
            }
            setPageDimensions(dims);
          }
        } else {
          // Image file
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            setPageCount(1);
            setPageDimensions([{ width: img.naturalWidth, height: img.naturalHeight }]);
          };
          img.src = url;
        }
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Erreur de chargement du fichier' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [db, storage, chiffrageId, fileIndex]);

  // ── Render PDF pages (re-render at higher scale when zooming) ────────────
  const renderScale = Math.max(1.5, zoom * 1.5); // ensure crisp at any zoom
  useEffect(() => {
    if (!pdfDoc || isImage) return;
    const renderPages = async () => {
      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const baseViewport = page.getViewport({ scale: 1.5 });
        const hiresViewport = page.getViewport({ scale: renderScale });
        const canvas = pageCanvasRefs.current.get(i - 1);
        if (!canvas) continue;
        // Render at high resolution but display at base size via CSS
        canvas.width = hiresViewport.width;
        canvas.height = hiresViewport.height;
        canvas.style.width = `${baseViewport.width}px`;
        canvas.style.height = `${baseViewport.height}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        await page.render({ canvasContext: ctx, viewport: hiresViewport }).promise;
      }
    };
    renderPages();
  }, [pdfDoc, isImage, pageCount, renderScale]);

  // ── Get position relative to a page ────────────────────────────────────────
  const getPagePos = useCallback((e: React.MouseEvent, pageIndex: number) => {
    const pageEl = document.getElementById(`editor-page-${pageIndex}`);
    if (!pageEl) return { x: 0, y: 0 };
    const rect = pageEl.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }, [zoom]);

  // ── Mouse handlers (per page) ──────────────────────────────────────────────
  const handlePageMouseDown = (e: React.MouseEvent, pageIndex: number) => {
    if ((e.target as HTMLElement).closest('[data-annotation]')) return;

    const pos = getPagePos(e, pageIndex);

    if (tool === 'select') {
      setSelectedId(null);
      return;
    }

    if (tool === 'line') {
      setLineStart({ ...pos, page: pageIndex });
      setLinePreview({ x: pos.x, y: pos.y, width: 0 });
      return;
    }

    if (tool === 'text') {
      const newA: Annotation = {
        id: crypto.randomUUID(),
        type: 'text',
        page: pageIndex,
        x: pos.x,
        y: pos.y,
        text: '',
        color,
        fontSize,
      };
      setAnnotations(prev => [...prev, newA]);
      setSelectedId(newA.id);
      setTool('select'); // auto-switch back to select
    }
  };

  const handlePageMouseMove = (e: React.MouseEvent, pageIndex: number) => {
    if (lineStart && tool === 'line' && lineStart.page === pageIndex) {
      const pos = getPagePos(e, pageIndex);
      setLinePreview({ x: lineStart.x, y: lineStart.y, width: pos.x - lineStart.x });
      return;
    }

    if (dragState) {
      const dx = (e.clientX - dragState.startX) / zoom;
      const dy = (e.clientY - dragState.startY) / zoom;
      setAnnotations(prev =>
        prev.map(a =>
          a.id === dragState.id
            ? { ...a, x: dragState.origX + dx, y: dragState.origY + dy }
            : a
        )
      );
    }
  };

  const handlePageMouseUp = () => {
    if (lineStart && linePreview && tool === 'line') {
      const w = linePreview.width;
      if (Math.abs(w) > 5) {
        const newA: Annotation = {
          id: crypto.randomUUID(),
          type: 'line',
          page: lineStart.page,
          x: w >= 0 ? lineStart.x : lineStart.x + w,
          y: lineStart.y,
          width: Math.abs(w),
          thickness: lineThickness,
          color,
        };
        setAnnotations(prev => [...prev, newA]);
      }
      setLineStart(null);
      setLinePreview(null);
      setTool('select'); // auto-switch back to select
      return;
    }

    if (dragState) setDragState(null);
  };

  // ── Annotation interaction ─────────────────────────────────────────────────
  const startDrag = (e: React.MouseEvent, a: Annotation) => {
    e.stopPropagation();
    if (tool !== 'select') return;
    setSelectedId(a.id);
    setDragState({
      id: a.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: a.x,
      origY: a.y,
    });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setAnnotations(prev => prev.filter(a => a.id !== selectedId));
    setSelectedId(null);
  };

  const clearAll = () => {
    setAnnotations([]);
    setSelectedId(null);
  };

  const updateSelected = (patch: Partial<Annotation>) => {
    if (!selectedId) return;
    setAnnotations(prev =>
      prev.map(a => (a.id === selectedId ? { ...a, ...patch } : a))
    );
  };

  // ── Save ───────────────────────────────────────────────────────────────────
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
          toast({ title: 'Sauvegardé avec succès' });
        }
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Export PDF (original + annotations) ────────────────────────────────────
  const handleExport = async () => {
    if (!fileUrl) return;
    setIsExporting(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib');

      let exportPdf: InstanceType<typeof PDFDocument>;

      if (isImage) {
        // Create a new PDF with the image
        exportPdf = await PDFDocument.create();
        const response = await fetch(fileUrl);
        const imgBytes = new Uint8Array(await response.arrayBuffer());
        const isJpg = fileName.match(/\.(jpg|jpeg)$/i);
        const img = isJpg
          ? await exportPdf.embedJpg(imgBytes)
          : await exportPdf.embedPng(imgBytes);
        const page = exportPdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
      } else {
        // Load the original PDF
        const response = await fetch(fileUrl);
        const pdfBytes = new Uint8Array(await response.arrayBuffer());
        exportPdf = await PDFDocument.load(pdfBytes);
      }

      const font = await exportPdf.embedFont(StandardFonts.Helvetica);
      const pages = exportPdf.getPages();

      // Draw annotations onto each page
      for (const a of annotations) {
        const pageIdx = a.page || 0;
        if (pageIdx >= pages.length) continue;
        const page = pages[pageIdx];
        const { width: pageW, height: pageH } = page.getSize();

        // The rendered canvas scale is 1.5x for PDF pages
        const scale = isImage ? 1 : 1.5;
        // Convert screen coords to PDF coords (PDF origin is bottom-left)
        const pdfX = (a.x / scale);
        const pdfY = pageH - (a.y / scale);

        // Parse hex color to rgb
        const hexToRgb = (hex: string) => {
          const r = parseInt(hex.slice(1, 3), 16) / 255;
          const g = parseInt(hex.slice(3, 5), 16) / 255;
          const b = parseInt(hex.slice(5, 7), 16) / 255;
          return rgb(r, g, b);
        };

        if (a.type === 'line') {
          const lineW = (a.width || 0) / scale;
          const thickness = a.thickness || 3;
          page.drawRectangle({
            x: pdfX,
            y: pdfY - thickness / 2,
            width: lineW,
            height: thickness / scale,
            color: hexToRgb(a.color),
          });
        } else if (a.type === 'text' && a.text) {
          const fs = (a.fontSize || 16) / scale;
          page.drawText(a.text, {
            x: pdfX,
            y: pdfY - fs,
            size: fs,
            font,
            color: hexToRgb(a.color),
          });
        }
      }

      const finalBytes = await exportPdf.save();
      const pdfBlob = new Blob([finalBytes], { type: 'application/pdf' });

      // Upload to storage
      if (storage && db) {
        const storagePath = `chiffrages/${chiffrageId}/correction_${Date.now()}.pdf`;
        const storageRef = ref(storage!, storagePath);
        await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
        const exportUrl = await getDownloadURL(storageRef);

        const docRef = doc(db, 'chiffrages', chiffrageId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const updatedFiles = [...(data.files || [])];
          updatedFiles[fileIndex] = {
            ...updatedFiles[fileIndex],
            pdfUrl: exportUrl,
            status: 'done',
            annotations,
          };
          await updateDoc(docRef, { files: updatedFiles, status: 'done', updatedAt: serverTimestamp() });
        }
      }

      // Download
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pdfBlob);
      a.download = `Correction_${fileName.split('.')[0]}.pdf`;
      a.click();

      toast({ title: 'PDF exporté avec succès' });
    } catch (e: any) {
      console.error(e);
      toast({ variant: 'destructive', title: "Erreur d'exportation", description: e.message });
    } finally {
      setIsExporting(false);
    }
  };

  // ── Selected annotation ref ────────────────────────────────────────────────
  const selectedAnnotation = annotations.find(a => a.id === selectedId);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-slate-900 select-none">
      {/* ── Top toolbar ─────────────────────────────────────────────────────── */}
      <div className="bg-card border-b px-4 py-2 flex items-center gap-3 shrink-0 z-50 shadow-sm">
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => router.back()}>
          <ArrowLeft className="h-3.5 w-3.5" /> Retour
        </Button>

        <div className="h-6 w-px bg-border" />

        <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">{fileName}</span>
        {pageCount > 0 && (
          <span className="text-[10px] text-muted-foreground">({pageCount} page{pageCount > 1 ? 's' : ''})</span>
        )}

        <div className="h-6 w-px bg-border" />

        {/* Tools */}
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          <Button variant={tool === 'select' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setTool('select')} title="Sélectionner / Déplacer">
            <MousePointer2 className="h-4 w-4" />
          </Button>
          <Button variant={tool === 'text' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setTool('text')} title="Ajouter du texte">
            <Type className="h-4 w-4" />
          </Button>
          <Button variant={tool === 'line' ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => setTool('line')} title="Tracer une ligne">
            <Minus className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {COLORS.map(c => (
            <button
              key={c.value}
              onClick={() => {
                setColor(c.value);
                if (selectedId) updateSelected({ color: c.value });
              }}
              className={cn(
                'w-6 h-6 rounded-full border-2 transition-all hover:scale-110',
                color === c.value ? 'border-foreground scale-110 ring-2 ring-primary/30' : 'border-transparent'
              )}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Font size */}
        <div className="flex items-center gap-2">
          <Type className="h-3.5 w-3.5 text-muted-foreground" />
          <Slider
            value={[selectedAnnotation?.type === 'text' ? (selectedAnnotation.fontSize || 16) : fontSize]}
            onValueChange={([v]) => {
              setFontSize(v);
              if (selectedId && selectedAnnotation?.type === 'text') updateSelected({ fontSize: v });
            }}
            min={10}
            max={48}
            step={1}
            className="w-24"
          />
          <span className="text-[10px] font-mono text-muted-foreground w-6 text-right">
            {selectedAnnotation?.type === 'text' ? (selectedAnnotation.fontSize || 16) : fontSize}
          </span>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Line thickness */}
        <div className="flex items-center gap-2">
          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
          <Slider value={[lineThickness]} onValueChange={([v]) => setLineThickness(v)} min={1} max={8} step={1} className="w-16" />
          <span className="text-[10px] font-mono text-muted-foreground w-4">{lineThickness}</span>
        </div>

        <div className="flex-1" />

        {/* Delete / Clear */}
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={deleteSelected} disabled={!selectedId}>
          <Trash2 className="h-3.5 w-3.5" /> Supprimer
        </Button>
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={clearAll} disabled={annotations.length === 0}>
          <Eraser className="h-3.5 w-3.5" /> Tout effacer
        </Button>

        <div className="h-6 w-px bg-border" />

        {/* Zoom */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-2 py-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] font-bold w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setZoom(z => Math.min(3, z + 0.1))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Save & Export */}
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Enregistrer
        </Button>
        <Button variant="default" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExport} disabled={isExporting}>
          {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Exporter PDF
        </Button>
      </div>

      {/* ── Canvas area — all pages stacked ─────────────────────────────────── */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex flex-col items-center gap-6 p-8 bg-slate-200 dark:bg-slate-800"
      >
        {/* Image file — single page */}
        {isImage && fileUrl && (
          <PageWrapper
            key={0}
            pageIndex={0}
            width={imageDimensions.width}
            height={imageDimensions.height}
            zoom={zoom}
            tool={tool}
            annotations={annotations.filter(a => (a.page || 0) === 0)}
            selectedId={selectedId}
            lineThickness={lineThickness}
            linePreview={lineStart?.page === 0 ? linePreview : null}
            lineColor={color}
            onMouseDown={e => handlePageMouseDown(e, 0)}
            onMouseMove={e => handlePageMouseMove(e, 0)}
            onMouseUp={handlePageMouseUp}
            onAnnotationMouseDown={startDrag}
            onAnnotationClick={id => setSelectedId(id)}
            onAnnotationTextChange={(id, text) =>
              setAnnotations(prev => prev.map(a => (a.id === id ? { ...a, text } : a)))
            }
            onDeleteSelected={deleteSelected}
          >
            <img
              src={fileUrl}
              alt={fileName}
              className="w-full h-full object-contain"
              crossOrigin="anonymous"
              draggable={false}
            />
          </PageWrapper>
        )}

        {/* PDF pages */}
        {!isImage && pageDimensions.map((dim, i) => (
          <PageWrapper
            key={i}
            pageIndex={i}
            width={dim.width}
            height={dim.height}
            zoom={zoom}
            tool={tool}
            annotations={annotations.filter(a => (a.page || 0) === i)}
            selectedId={selectedId}
            lineThickness={lineThickness}
            linePreview={lineStart?.page === i ? linePreview : null}
            lineColor={color}
            onMouseDown={e => handlePageMouseDown(e, i)}
            onMouseMove={e => handlePageMouseMove(e, i)}
            onMouseUp={handlePageMouseUp}
            onAnnotationMouseDown={startDrag}
            onAnnotationClick={id => setSelectedId(id)}
            onAnnotationTextChange={(id, text) =>
              setAnnotations(prev => prev.map(a => (a.id === id ? { ...a, text } : a)))
            }
            onDeleteSelected={deleteSelected}
          >
            <canvas
              ref={el => { if (el) pageCanvasRefs.current.set(i, el); }}
              className="w-full h-full"
            />
            {/* Page number label */}
            <div className="absolute bottom-2 right-3 text-[10px] text-slate-400 font-mono pointer-events-none">
              Page {i + 1} / {pageCount}
            </div>
          </PageWrapper>
        ))}
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div className="bg-card border-t px-4 py-1.5 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
        <div className="flex items-center gap-4">
          <span>{annotations.length} élément{annotations.length !== 1 ? 's' : ''}</span>
          {selectedId && <span className="text-primary font-semibold">1 sélectionné — glissez pour déplacer</span>}
        </div>
        <div className="flex items-center gap-4">
          <span>Outil : {tool === 'select' ? 'Sélection' : tool === 'text' ? 'Texte' : 'Ligne'}</span>
          <span>Zoom : {Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

// ── Page wrapper component ─────────────────────────────────────────────────
interface PageWrapperProps {
  pageIndex: number;
  width: number;
  height: number;
  zoom: number;
  tool: Tool;
  annotations: Annotation[];
  selectedId: string | null;
  lineThickness: number;
  linePreview: { x: number; y: number; width: number } | null;
  lineColor: string;
  children: React.ReactNode;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onAnnotationMouseDown: (e: React.MouseEvent, a: Annotation) => void;
  onAnnotationClick: (id: string) => void;
  onAnnotationTextChange: (id: string, text: string) => void;
  onDeleteSelected: () => void;
}

function PageWrapper({
  pageIndex, width, height, zoom, tool, annotations, selectedId,
  lineThickness, linePreview, lineColor, children,
  onMouseDown, onMouseMove, onMouseUp,
  onAnnotationMouseDown, onAnnotationClick, onAnnotationTextChange, onDeleteSelected,
}: PageWrapperProps) {
  return (
    <div
      id={`editor-page-${pageIndex}`}
      className={cn(
        'relative bg-white shadow-2xl origin-top',
        tool === 'text' && 'cursor-crosshair',
        tool === 'line' && 'cursor-crosshair',
        tool === 'select' && 'cursor-default'
      )}
      style={{
        width,
        height,
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
        marginBottom: (zoom - 1) * height,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      {children}

      {/* Line preview */}
      {linePreview && tool === 'line' && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: linePreview.width >= 0 ? linePreview.x : linePreview.x + linePreview.width,
            top: linePreview.y - lineThickness / 2,
            width: Math.abs(linePreview.width),
            height: lineThickness,
            backgroundColor: lineColor,
            opacity: 0.5,
          }}
        />
      )}

      {/* Annotations for this page */}
      {annotations.map(a => (
        <AnnotationElement
          key={a.id}
          annotation={a}
          isSelected={selectedId === a.id}
          tool={tool}
          onMouseDown={e => onAnnotationMouseDown(e, a)}
          onClick={() => onAnnotationClick(a.id)}
          onTextChange={text => onAnnotationTextChange(a.id, text)}
          onDelete={onDeleteSelected}
        />
      ))}
    </div>
  );
}

// ── Single annotation element ──────────────────────────────────────────────
interface AnnotationElementProps {
  annotation: Annotation;
  isSelected: boolean;
  tool: Tool;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: () => void;
  onTextChange: (text: string) => void;
  onDelete: () => void;
}

function AnnotationElement({ annotation: a, isSelected, tool, onMouseDown, onClick, onTextChange, onDelete }: AnnotationElementProps) {
  const textRef = useRef<HTMLDivElement>(null);

  // Auto-focus when newly created (empty text)
  useEffect(() => {
    if (isSelected && a.type === 'text' && a.text === '' && textRef.current) {
      textRef.current.focus();
    }
  }, [isSelected, a.type, a.text]);

  const thickness = a.thickness || 3;
  // Lines get a bigger invisible hit area (min 20px tall) for easier hover/click
  const hitPadding = a.type === 'line' ? Math.max(10, (20 - thickness) / 2) : 0;

  return (
    <div
      data-annotation
      className={cn(
        'absolute group',
        tool === 'select' && 'cursor-move',
      )}
      style={{
        left: a.x,
        top: a.type === 'line' ? a.y - thickness / 2 - hitPadding : a.y,
        width: a.type === 'line' ? a.width : 'auto',
        // For lines: visible line + invisible padding above and below
        height: a.type === 'line' ? thickness + hitPadding * 2 : 'auto',
        zIndex: isSelected ? 1000 : 100,
      }}
      onMouseDown={onMouseDown}
      onClick={e => { e.stopPropagation(); onClick(); }}
    >
      {a.type === 'line' && (
        <>
          {/* The visible line */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: hitPadding,
              height: thickness,
              backgroundColor: a.color,
            }}
          />
          {/* Hover highlight */}
          <div
            className={cn(
              'absolute inset-0 rounded transition-colors',
              isSelected ? 'bg-blue-500/10 ring-2 ring-blue-500' : 'hover:bg-blue-500/5'
            )}
          />
        </>
      )}

      {a.type === 'text' && (
        <div
          ref={textRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={e => onTextChange(e.currentTarget.innerText)}
          onMouseDown={e => { if (isSelected) e.stopPropagation(); }}
          className={cn(
            'px-1 py-0.5 font-semibold whitespace-pre-wrap outline-none',
            isSelected ? 'border border-dashed rounded' : 'border border-transparent'
          )}
          style={{
            color: a.color,
            fontSize: `${a.fontSize || 16}px`,
            lineHeight: 1.3,
            borderColor: isSelected ? a.color : 'transparent',
            minWidth: 20,
            minHeight: (a.fontSize || 16) * 1.3,
            background: 'transparent',
            caretColor: a.color,
          }}
        >
          {a.text}
        </div>
      )}

      {/* Delete button — visible on hover or selection */}
      {(isSelected || a.type === 'line') && (
        <button
          className={cn(
            'absolute -top-3 -right-3 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-lg hover:scale-110 transition-all',
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={e => { e.stopPropagation(); onDelete(); }}
        >
          ×
        </button>
      )}
    </div>
  );
}
